import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const outputPath = resolve(projectRoot, "client/src/data/archive-diwans.json");
const auditPath = "/home/ubuntu/archive_diwan_dataset_audit.json";
const endpoint = "https://archive.org/advancedsearch.php";
const fields = ["identifier", "title", "creator", "year", "date", "publicdate", "language", "subject", "description", "collection", "mediatype"];
const pageSize = 75;
const maxPagesPerQuery = 4;
const requestPlan = [
  { name: "عنوان عربي يحمل ديوان", query: "mediatype:texts AND language:ara AND title:ديوان" },
  { name: "عنوان عربي يحمل ديوان", query: "mediatype:texts AND language:Arabic AND title:ديوان" },
  { name: "وصف أو موضوع عربي يثبت الديوان", query: "mediatype:texts AND language:ara AND (subject:ديوان OR description:ديوان)" },
  { name: "وصف أو موضوع عربي يثبت الديوان", query: "mediatype:texts AND language:Arabic AND (subject:ديوان OR description:ديوان)" },
];

const rejectTitle = /(?:دراسه|رساله|اطروحه|بحث|شرح|فهرس|معجم|نقد|تحليل|قراءه|موازنه|ببليوغرافيا|مكتبه|موسوعه|تاريخ|سجل|اداره|ديوان\s+(?:المبتدا|المبتدأ|الخبر|العبر|الانشاء|الإنشاء|الرسائل|الخراج|المحاسبه|المحاسبة|المظالم|العدل|الخدمه|الخدمة|المال|الماليه|المالية|الشكاوي|الشكاوى|الوزاره|الوزارة|الدوله|الدولة|الوقف|الحساب|الاموال|الأموال|العقارات|الضرائب)|ديوان\s+(?:الشعر\s+العربي|الشعر\s+العربى|اللصوص|الفكاهه|الفكاهة|الادب|الأدب))/u;
const genericPoet = /^(?:الشعر\s+العربي|الشعر\s+العربى|الادب|الأدب|الحماسه|الحماسة|القصائد|المختارات)$/u;

function asList(value) { return Array.isArray(value) ? value.flatMap(asList) : value == null ? [] : [String(value)]; }
function compact(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
function norm(value) {
  return compact(value).normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "").replace(/[\[\]{}()"'`*_،؛:!?.,/\\|+\-=—–]/g, " ")
    .replace(/\s+/g, " ").trim().toLowerCase();
}
function cleanTitle(value) {
  return compact(value).replace(/[\u200e\u200f\u202a-\u202e]/g, "").replace(/^[\s._\-—–·•ـ]+/u, "")
    .replace(/^\d{3,7}[_\-\s]*/u, "").replace(/^book\s+/iu, "").replace(/^\d+\s+(?:كتاب|book)\s+/iu, "")
    .replace(/\s*\[[^\]]{1,80}\]\s*(?:---|–|—)\s*.*/u, "").replace(/\s+(?:pdf|word|htm|html)$/iu, "").trim();
}
function cleanPerson(value) { return compact(value).replace(/["“”]/g, "").replace(/\([^)]*\)/g, "").replace(/،?\s*\d{3,4}(?:\s*[-–]\s*\d{0,4})?\.?$/u, "").trim(); }
function hasArabicTitle(value) {
  const letters = String(value).match(/[\u0621-\u064A]/g) ?? [];
  const visible = String(value).replace(/\s|[\d٠-٩\W_]/g, "");
  return letters.length >= 3 && letters.length / Math.max(visible.length, 1) >= 0.55;
}
function hasWord(value, word) { return new RegExp(`(^|\\s)${word}(?=\\s|$)`, "u").test(norm(value)); }
function canonicalTitle(value) {
  let result = norm(cleanTitle(value)).replace(/^\d+\s*/u, "");
  result = result.replace(/(?:\s|[-–—،:])(?:ت\.?|تحقيق|طبعه|طبعة|نشر|مراجعه|مراجعة|شرح|دراسه|دراسة).*/u, "").trim();
  return result;
}
function derivePoet(title, creator) {
  const match = cleanTitle(title).match(/(?:^|\s)ديوان\s+(.+)/u);
  if (match) {
    const candidate = cleanPerson(match[1].replace(/(?:\s|[-–—،:])(?:ت\.?|تحقيق|طبعه|طبعة|نشر|مراجعه|مراجعة).*/u, ""));
    if (candidate && !genericPoet.test(norm(candidate)) && !rejectTitle.test(norm(candidate))) return candidate;
  }
  const creatorName = cleanPerson(asList(creator)[0] ?? "");
  return hasArabicTitle(creatorName) ? creatorName : "";
}
function metadataNamesDiwan(title, subject, description) {
  const clean = norm(title);
  const subjectText = norm(subject);
  const descriptionText = norm(description);
  return hasWord(title, "ديوان") || (clean.length > 3 && (subjectText.includes(`ديوان ${clean}`) || descriptionText.includes(`ديوان ${clean}`)));
}
function classify(doc) {
  const title = cleanTitle(doc.title);
  const subject = asList(doc.subject).join(" · ");
  const description = asList(doc.description).join(" ");
  const titleKey = norm(title);
  const isDiwan = metadataNamesDiwan(title, subject, description);
  const isPoetic = /(شعر|قصيد|قصائد|شاعر|شعرية|ديوان)/u.test(`${norm(subject)} ${norm(description)} ${titleKey}`);
  const falsePositive = rejectTitle.test(titleKey);
  const evidence = hasWord(title, "ديوان") ? "العنوان" : "الوصف أو الموضوع المقترن بعنوان السجل";
  const eligible = Boolean(title && hasArabicTitle(title) && isDiwan && isPoetic && !falsePositive);
  return { doc, title, subject, description, author: cleanPerson(asList(doc.creator)[0] ?? ""), poet: derivePoet(title, doc.creator), canonical: canonicalTitle(title), evidence, eligible,
    rejectedBecause: !title ? "عنوان مفقود" : !hasArabicTitle(title) ? "عنوان غير عربي" : !isDiwan ? "البيانات لا تثبت أن السجل هو الديوان" : !isPoetic ? "لا يوجد سياق شعري" : falsePositive ? "دراسة أو سجل غير ديواني" : "" };
}
function score(item) { return (hasWord(item.title, "ديوان") ? 8 : 4) + (item.poet ? 4 : 0) + (item.subject.length > 10 ? 2 : 0) + (item.description.length > 30 ? 1 : 0) + (String(item.doc.language).toLowerCase() === "ara" ? 1 : 0); }
async function fetchPage(query, page) {
  const url = new URL(endpoint); url.searchParams.set("q", query);
  for (const field of fields) url.searchParams.append("fl[]", field);
  url.searchParams.set("rows", String(pageSize)); url.searchParams.set("page", String(page)); url.searchParams.set("output", "json"); url.searchParams.append("sort[]", "downloads desc");
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Arabic-Language-Thesaurus/1.0 (metadata-only)" }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}

const docs = new Map(); const requests = []; const failures = [];
for (const plan of requestPlan) {
  for (let page = 1; page <= maxPagesPerQuery; page += 1) {
    try {
      const payload = await fetchPage(plan.query, page);
      const current = payload.response?.docs ?? [];
      for (const doc of current) if (doc.identifier) docs.set(doc.identifier, doc);
      requests.push({ name: plan.name, query: plan.query, page, returned: current.length, numFound: payload.response?.numFound ?? 0 });
      if (current.length < pageSize) break;
    } catch (error) {
      failures.push({ name: plan.name, page, message: String(error) });
      break;
    }
  }
}

const classified = [...docs.values()].filter((doc) => doc.mediatype === "texts").map(classify);
const candidates = classified.filter((item) => item.eligible);
const rejected = classified.filter((item) => !item.eligible);
const chosen = new Map();
for (const item of candidates) {
  const key = `${item.canonical}::${norm(item.poet) || "poet-unavailable"}`;
  const previous = chosen.get(key); if (!previous || score(item) > score(previous)) chosen.set(key, item);
}
const materials = [...chosen.values()].sort((a, b) => a.title.localeCompare(b.title, "ar")).map((item) => ({
  id: `archive-${item.doc.identifier}`, title: item.title, author: item.poet || item.author || "لم يُثبت اسم الشاعر في السجل", source: "Internet Archive", relativePath: item.doc.identifier,
  sourceUrl: `https://archive.org/details/${encodeURIComponent(item.doc.identifier)}`, primaryCategory: "diwans", tags: ["ديوان شعري"],
  matchEvidence: { strongSignals: ["ديوان شعري", `دليل البيانات الوصفية: ${item.evidence}`], supportingSignals: item.subject ? [item.subject.slice(0, 180)] : [], explicitLanguageSource: true },
}));
const counts = {}; for (const item of rejected) counts[item.rejectedBecause || "غير محدد"] = (counts[item.rejectedBecause || "غير محدد"] ?? 0) + 1;
const generatedAt = new Date().toISOString();
const payload = { metadata: { sourceName: "Internet Archive", sourceIndexUrl: "https://archive.org/search?tab=all&query=%D8%AF%D9%8A%D9%88%D8%A7%D9%86&and%5B%5D=mediatype%3A%22texts%22", generatedAt, selectionMethod: "سجلات عربية نصية ذات دليل وصفي على الديوان، منتقاة من صفحات البحث الأعلى تداولاً مع استبعاد الدراسات والسجلات المؤسسية.", collectionScope: "دفعة مراجعة مرحلية من نتائج الأرشيف مرتبة بحسب التداول؛ ستتوسع لاحقاً من دون تكرار.", requests }, materials };
const audit = { generatedAt, requests, failures, fetchedUniqueIdentifiers: docs.size, eligibleBeforeDeduplication: candidates.length, selectedAfterDeduplication: materials.length, duplicateCandidatesRemoved: candidates.length - materials.length, rejectedByReason: Object.entries(counts).sort((a,b)=>b[1]-a[1]), selectedSample: materials.slice(0, 40), rejectedSample: rejected.slice(0,40).map((item)=>({identifier:item.doc.identifier,title:item.title,author:item.author,rejectedBecause:item.rejectedBecause})) };
mkdirSync(dirname(outputPath), { recursive: true }); writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`); writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`); console.log(JSON.stringify({ selected: materials.length, fetched: docs.size, failures: failures.length, outputPath, auditPath }, null, 2));

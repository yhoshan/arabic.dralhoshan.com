import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const outputPath = resolve(projectRoot, "client/src/data/archive-diwans.json");
const auditPath = "/home/ubuntu/archive_diwan_dataset_audit.json";
const endpoint = "https://archive.org/advancedsearch.php";
const fields = [
  "identifier",
  "title",
  "creator",
  "year",
  "date",
  "publicdate",
  "language",
  "subject",
  "description",
  "collection",
  "mediatype",
];
const queryBase = "mediatype:texts AND (title:ديوان OR subject:ديوان OR description:ديوان)";
const queries = [`${queryBase} AND language:ara`, `${queryBase} AND language:Arabic`];

const researchOrContainerSignal = /(?:دراسه|رساله|اطروحه|بحث|شرح|فهرس|معجم|نقد|تحليل|قراءه|موازنه|ببليوغرافيا|مكتبه|موسوعه|تاريخ|سجل|اداره|موظف|وظائف|ديوان\s+(?:المبتدا|المبتدأ|الخبر|العبر|الانشاء|الإنشاء|الرسائل|الخراج|المحاسبه|المحاسبة|المظالم|العدل|الخدمه|الخدمة|المال|الماليه|المالية|الشكاوي|الشكاوى|الوزاره|الوزارة|الدوله|الدولة|الوقف|الحساب|الاموال|الأموال|العقارات|الضرائب)|ديوان\s+الشعر\s+العربي|ديوان\s+اللصوص|ديوان\s+الفكاهه|ديوان\s+الفكاهة|ديوان\s+الادب|ديوان\s+الأدب)/u;
const partSignal = /(?:الجزء|جزء|المجلد|مجلد|ج\.?\s*\d+|الجزءان|الجزئين|القسم)\s*(?:الاول|الأول|الثاني|الثالث|الرابع|[0-9٠-٩]+)?(?:\s+من)?/gu;
const trailingEditionSignal = /(?:\s|[-–—،:])(?:ت\.?|تحقيق|طبعه|طبعة|نشر|مراجعه|مراجعة|شرح|دراسه|دراسة|pdf|word|htm|html).*/u;

function asList(value) {
  if (Array.isArray(value)) return value.flatMap(asList);
  if (value === null || value === undefined) return [];
  return [String(value)];
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeArabic(value) {
  return compact(value)
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/[\[\]{}()"'`*_،؛:!?.,/\\|+\-=—–]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanTitle(value) {
  return compact(value)
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/^[\s._\-—–·•ـ]+/u, "")
    .replace(/^\d{3,7}[_\-\s]*/u, "")
    .replace(/^book\s+/iu, "")
    .replace(/^\d+\s+(?:كتاب|book)\s+/iu, "")
    .replace(/\s*\[[^\]]{1,80}\]\s*(?:---|–|—)\s*.*/u, "")
    .replace(/\s+(?:pdf|word|htm|html)$/iu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAuthor(value) {
  return compact(value)
    .replace(/["“”]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/،?\s*\d{3,4}(?:\s*[-–]\s*\d{0,4})?\.?$/u, "")
    .trim();
}

function hasArabicTitle(title) {
  const letters = String(title).match(/[\u0621-\u064A]/g) ?? [];
  const visible = String(title).replace(/\s|[\d٠-٩\W_]/g, "");
  return letters.length >= 3 && letters.length / Math.max(visible.length, 1) >= 0.55;
}

function isArabicRecord(language) {
  return asList(language).some((item) => ["ara", "arabic", "العربيه", "العربية"].includes(normalizeArabic(item)));
}

function hasStandaloneWord(text, word) {
  return new RegExp(`(^|\\s)${word}(?=\\s|$)`, "u").test(normalizeArabic(text));
}

function canonicalizeTitle(title) {
  let value = normalizeArabic(cleanTitle(title));
  value = value.replace(/^\d+\s*/u, "").trim();
  value = value.replace(partSignal, " ").replace(/\s+/g, " ").trim();
  const diwanAtEnd = value.match(/(?:^|\s)(ديوان\s+.+)$/u);
  if (diwanAtEnd) value = diwanAtEnd[1];
  return value.replace(trailingEditionSignal, "").replace(/\s+/g, " ").trim();
}

function derivePoet(title, creator) {
  const clean = cleanTitle(title);
  const titleMatch = clean.match(/(?:^|\s)ديوان\s+(.+)/u);
  if (titleMatch) {
    const candidate = cleanAuthor(titleMatch[1].replace(partSignal, " ").replace(trailingEditionSignal, "").trim());
    const generic = /^(?:الشعر العربي|الشعر العربى|الادب|الأدب|الحماسه|الحماسة|المختارات|القصائد)$/u.test(normalizeArabic(candidate));
    if (candidate && !generic && !researchOrContainerSignal.test(normalizeArabic(candidate))) return candidate;
  }
  const author = cleanAuthor(asList(creator)[0] ?? "");
  return hasArabicTitle(author) ? author : "";
}

function containsSpecificDiwanReference(title, subject, description) {
  const titleKey = normalizeArabic(title);
  if (!titleKey || titleKey.split(" ").length < 2) return false;
  const context = `${normalizeArabic(subject)} ${normalizeArabic(description)}`;
  return context.includes(`ديوان ${titleKey}`) || context.includes(`${titleKey} ديوان`);
}

function classify(doc) {
  const title = cleanTitle(doc.title);
  const subject = asList(doc.subject).join(" · ");
  const description = asList(doc.description).join(" ");
  const titleNorm = normalizeArabic(title);
  const subjectNorm = normalizeArabic(subject);
  const descriptionNorm = normalizeArabic(description);
  const explicitInTitle = hasStandaloneWord(title, "ديوان");
  const specificNonTitleEvidence = !explicitInTitle && containsSpecificDiwanReference(title, subject, description);
  const poetryContext = /(شعر|قصيد|قصائد|شاعر|شعرية|ديوان)/u.test(`${subjectNorm} ${descriptionNorm}`);
  const falsePositive = researchOrContainerSignal.test(titleNorm);
  const arabicTitle = hasArabicTitle(title);
  const evidence = explicitInTitle ? "العنوان" : specificNonTitleEvidence ? "الوصف أو الموضوع المقترن بعنوان السجل" : "";
  const eligible = Boolean(title && arabicTitle && (explicitInTitle || specificNonTitleEvidence) && poetryContext && !falsePositive);
  const poet = derivePoet(title, doc.creator);
  const canonicalTitle = canonicalizeTitle(title);

  let rejectedBecause = "";
  if (!title) rejectedBecause = "عنوان مفقود";
  else if (!arabicTitle) rejectedBecause = "عنوان السجل ليس عربياً بما يكفي";
  else if (!explicitInTitle && !specificNonTitleEvidence) rejectedBecause = "لا يثبت العنوان أو الوصف المقترن أن السجل هو الديوان نفسه";
  else if (!poetryContext) rejectedBecause = "لا يوجد سياق شعري في البيانات الوصفية";
  else if (falsePositive) rejectedBecause = "العنوان يدل على دراسة أو سجل مؤسسي أو موضوع غير ديواني";

  return {
    doc,
    title,
    subject,
    description,
    author: cleanAuthor(asList(doc.creator)[0] ?? ""),
    poet,
    canonicalTitle,
    evidence,
    explicitInTitle,
    specificNonTitleEvidence,
    eligible,
    rejectedBecause,
  };
}

function score(candidate) {
  return (candidate.explicitInTitle ? 16 : 10)
    + (candidate.specificNonTitleEvidence ? 8 : 0)
    + (candidate.poet ? 4 : 0)
    + (candidate.subject.length > 10 ? 2 : 0)
    + (candidate.description.length > 50 ? 1 : 0)
    + (String(candidate.doc.language).toLowerCase() === "ara" ? 1 : 0);
}

async function fetchAll(query) {
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  for (const field of fields) url.searchParams.append("fl[]", field);
  url.searchParams.set("rows", "5000");
  url.searchParams.set("page", "1");
  url.searchParams.set("output", "json");
  const response = await fetch(url, { headers: { "user-agent": "Arabic-Language-Thesaurus/1.0 (metadata-only)" } });
  if (!response.ok) throw new Error(`Archive API ${response.status}: ${response.statusText}`);
  const payload = await response.json();
  return { total: Number(payload.response?.numFound ?? 0), docs: payload.response?.docs ?? [] };
}

const sourceTotals = [];
const uniqueDocs = new Map();
for (const query of queries) {
  const { total, docs } = await fetchAll(query);
  sourceTotals.push({ query, total });
  for (const doc of docs) if (doc.identifier) uniqueDocs.set(doc.identifier, doc);
}

const classified = [...uniqueDocs.values()]
  .filter((doc) => doc.mediatype === "texts" && isArabicRecord(doc.language))
  .map(classify);
const candidates = classified.filter((item) => item.eligible);
const rejected = classified.filter((item) => !item.eligible);

const selectedByKey = new Map();
for (const candidate of candidates) {
  const key = `${candidate.canonicalTitle}::${normalizeArabic(candidate.poet) || "poet-unavailable"}`;
  const previous = selectedByKey.get(key);
  if (!previous || score(candidate) > score(previous)) selectedByKey.set(key, candidate);
}

const selected = [...selectedByKey.values()]
  .sort((a, b) => a.title.localeCompare(b.title, "ar"))
  .map((candidate) => ({
    id: `archive-${candidate.doc.identifier}`,
    title: candidate.title,
    author: candidate.poet || candidate.author || "لم يُثبت اسم الشاعر في السجل",
    source: "Internet Archive",
    relativePath: candidate.doc.identifier,
    sourceUrl: `https://archive.org/details/${encodeURIComponent(candidate.doc.identifier)}`,
    primaryCategory: "diwans",
    tags: ["ديوان شعري"],
    matchEvidence: {
      strongSignals: ["ديوان شعري", `دليل البيانات الوصفية: ${candidate.evidence}`],
      supportingSignals: candidate.subject ? [candidate.subject.slice(0, 180)] : [],
      explicitLanguageSource: true,
    },
  }));

const payload = {
  metadata: {
    sourceName: "Internet Archive",
    sourceIndexUrl: "https://archive.org/search?tab=all&query=%D8%AF%D9%8A%D9%88%D8%A7%D9%86&and%5B%5D=mediatype%3A%22texts%22",
    generatedAt: new Date().toISOString(),
    selectionMethod: "دواوين عربية تُثبتها بيانات السجل، مع استبعاد الدراسات والسجلات المؤسسية والعناوين غير العربية وتوحيد العنوان واسم الشاعر عند توافره.",
    sourceQueries: sourceTotals,
  },
  materials: selected,
};

const rejectedByReason = {};
for (const item of rejected) rejectedByReason[item.rejectedBecause || "غير محدد"] = (rejectedByReason[item.rejectedBecause || "غير محدد"] ?? 0) + 1;
const audit = {
  generatedAt: payload.metadata.generatedAt,
  sourceTotals,
  fetchedUniqueIdentifiers: uniqueDocs.size,
  arabicTextRecords: classified.length,
  eligibleBeforeDeduplication: candidates.length,
  selectedAfterDeduplication: selected.length,
  duplicateCandidatesRemoved: candidates.length - selected.length,
  rejectedByReason: Object.entries(rejectedByReason).sort((a, b) => b[1] - a[1]),
  selectedSample: selected.slice(0, 40).map((item) => ({ id: item.id, title: item.title, author: item.author, sourceUrl: item.sourceUrl, matchEvidence: item.matchEvidence })),
  rejectedSample: rejected.slice(0, 40).map((item) => ({ identifier: item.doc.identifier, title: item.title, author: item.author, rejectedBecause: item.rejectedBecause })),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ selected: selected.length, outputPath, auditPath }, null, 2));

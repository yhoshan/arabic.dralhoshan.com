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

// استكمال أعمق للنتائج: صفحات من 1000 سجل ومسارات موحّدة للوسوم العربية المتباينة.
const pageSize = 1000;
const maxPagesPerQuery = 5;
const languageClause = "(language:ara OR language:Arabic)";
const requestPlan = [
  {
    name: "عناوين عربية تصرح بكلمة ديوان",
    query: `mediatype:texts AND ${languageClause} AND title:ديوان`,
  },
  {
    name: "بيانات وصفية عربية تذكر الديوان",
    query: `mediatype:texts AND ${languageClause} AND (subject:ديوان OR description:ديوان)`,
  },
  {
    name: "قصائد ومجموعات شعرية عربية تحتاج إلى تحقق وصفي",
    query: `mediatype:texts AND ${languageClause} AND (subject:قصائد OR subject:شعر OR description:قصائد OR description:شعري)`,
    timeoutMs: 90000,
  },
];

// تستبعد هذه الأنماط المادة التي تتناول ديواناً أو تستعمل كلمة «ديوان» بمعناها الإداري، لا الديوان نفسه.
const rejectTitle = /(?:دراسه|رساله|اطروحه|بحث|شرح|فهرس|معجم|نقد|تحليل|قراءه|موازنه|ببليوغرافيا|مكتبه|موسوعه|تاريخ|سجل|اداره|مجله|صحيفه|جريده|مقال|مقدمه|بحوث|ملحوظات|(?:ذيل|تكمله|تكملة)\s+ديوان|ديوان\s+(?:السنن|الاثار|الآثار|الضعفاء|المتروكين|الزكاه|الزكاة|العرب)(?:\s|$)|و(?:ما\s+وصل\s+الينا\s+من\s+)?نثره|ورسائله|واخباره|ديوان\s+(?:المبتدا|المبتدأ|الخبر|العبر|الانشاء|الإنشاء|الرسائل|الخراج|المحاسبه|المحاسبة|المظالم|العدل|الخدمه|الخدمة|المال|الماليه|المالية|الشكاوي|الشكاوى|الوزاره|الوزارة|الدوله|الدولة|الوقف|الحساب|الاموال|الأموال|العقارات|الضرائب)|ديوان\s+(?:الشعر\s+العربي|الشعر\s+العربى|اللصوص|الفكاهه|الفكاهة|الادب|الأدب|النثر\s+العربي|المعاني))/u;
const genericPoet = /^(?:الشعر\s+العربي|الشعر\s+العربى|الادب|الأدب|الحماسه|الحماسة|القصائد|المختارات|الاشعار|الأشعار)$/u;
const foreignScript = /[پچژگکۍێی]/u;
const foreignLanguageSignal = /(?:فارسي|فارسية|الأدب\s+الفارسي|شعر\s+فارسي|تركي|تركية|اردو|إنجليزي|انجليزي|فرنسي|كردي)/u;

function asList(value) {
  return Array.isArray(value) ? value.flatMap(asList) : value == null ? [] : [String(value)];
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function norm(value) {
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
    .replace(/^pdf\s+/iu, "")
    .replace(/^\d+\s+(?:كتاب|book)\s+/iu, "")
    .replace(/^(?:اقرا|اقرأ)\s+اونلاين(?:\s+(?:pdf|كتاب|\d+))*\s*/iu, "")
    .replace(/\s+(?:كتاب\s+)?(?:اقرا|اقرأ)\s+اونلاين.*$/iu, "")
    .replace(/\s+كتاب\s+صي(?:غه|غة)\s+بي\s+دي\s+اف(?:\s+(?:اقرا|اقرأ)\s+اونلاين)?(?:\s+pdf)?(?:\s+\d+)?$/iu, "")
    .replace(/\s+pdf\s*\d*$/iu, "")
    .replace(/pdf$/iu, "")
    .replace(/\s+ketabypdf\.com$/iu, "")
    .replace(/\s*\[[^\]]{1,80}\]\s*(?:---|–|—)\s*.*/u, "")
    .replace(/\s+(?:pdf|word|htm|html)$/iu, "")
    .trim();
}

function cleanPerson(value) {
  return compact(value)
    .replace(/["“”]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/،?\s*\d{3,4}(?:\s*[-–]\s*\d{0,4})?\.?$/u, "")
    .trim();
}

function hasArabicText(value) {
  const raw = compact(value);
  if (!raw || foreignScript.test(raw)) return false;
  const letters = raw.match(/[\u0621-\u064A]/g) ?? [];
  const visible = raw.replace(/\s|[\d٠-٩\W_]/g, "");
  return letters.length >= 3 && letters.length / Math.max(visible.length, 1) >= 0.55;
}

function hasWord(value, word) {
  return new RegExp(`(^|\\s)${word}(?=\\s|$)`, "u").test(norm(value));
}

function canonicalTitle(value) {
  return norm(cleanTitle(value))
    .replace(/(?:\s|[-–—،:])(?:ت\.?|تحقيق|طبعه|طبعة|نشر|مراجعه|مراجعة).*/u, "")
    .trim();
}

function plausiblePerson(value) {
  const person = cleanPerson(value);
  const key = norm(person);
  return Boolean(person && hasArabicText(person) && !genericPoet.test(key) && !rejectTitle.test(key));
}

function derivePoet(title, creator) {
  const creatorName = cleanPerson(asList(creator)[0] ?? "");
  if (plausiblePerson(creatorName)) return creatorName;

  const cleaned = cleanTitle(title);
  const startsWithDiwan = cleaned.match(/^ديوان\s+(.+)/u);
  if (startsWithDiwan) {
    const candidate = cleanPerson(
      startsWithDiwan[1].replace(/(?:\s|[-–—،:])(?:ت\.?|تحقيق|طبعه|طبعة|نشر|مراجعه|مراجعة).*/u, ""),
    );
    if (plausiblePerson(candidate) && candidate.split(/\s+/).length <= 5) return candidate;
  }

  const beforeDiwan = cleaned.match(/^(.{3,70}?)\s*(?:[:\-—–]\s*|\s+)ديوان\s+/u);
  if (beforeDiwan) {
    const candidate = cleanPerson(beforeDiwan[1]);
    if (plausiblePerson(candidate) && candidate.split(/\s+/).length <= 6) return candidate;
  }

  return "";
}

function titleIsReferencedByMetadata(title, subject, description) {
  const titleKey = norm(title);
  const metadataKey = norm(`${subject} ${description}`);
  return titleKey.length >= 6 && metadataKey.includes(titleKey);
}

function looksLikeNonIndependentCollection(title) {
  const key = norm(title);
  return /(?:^|\s)(?:الجزء|المجلد(?:ين)?|ج|مجلد(?:ين)?|part|volume)(?:\s|$)|^\d{1,3}\s+|(?:مختارات|مجموعه|منتخبات|مختار|اعمال\s+شعريه\s+كامله|الاعمال\s+الشعريه\s+الكامله)(?:\s|$)/u.test(key);
}

function determineEvidence(title, subject, description, creator) {
  const titleKey = norm(title);
  const metadata = norm(`${subject} ${description}`);
  const titleNamesDiwan = hasWord(title, "ديوان");
  const metadataNamesDiwan = hasWord(metadata, "ديوان");
  const metadataNamesIndependentCollection = /(?:ديوان\s+شعري|مجموعه\s+شعريه|مجموعه\s+من\s+القصائد|قصائد\s+الشاعر|اشعار\s+الشاعر|شعر\s+الشاعر)/u.test(metadata);
  const titleNamesPoetry = hasWord(title, "قصائد") || hasWord(title, "اشعار") || hasWord(title, "شعر");
  const creatorIsArabic = plausiblePerson(cleanPerson(asList(creator)[0] ?? ""));
  const titleReferenced = titleIsReferencedByMetadata(title, subject, description);

  if (titleNamesDiwan) return "العنوان يصرح بأن السجل ديوان";
  if (metadataNamesDiwan && titleReferenced && titleNamesPoetry) {
    return "البيانات الوصفية تثبت أن عنوان السجل ديوان مستقل";
  }
  if (metadataNamesIndependentCollection && titleReferenced && creatorIsArabic && titleNamesPoetry) {
    return "البيانات الوصفية تربط عنوان السجل بمجموعة شعرية مستقلة";
  }
  return "";
}

function classify(doc) {
  const title = cleanTitle(doc.title);
  const subject = asList(doc.subject).join(" · ");
  const description = asList(doc.description).join(" ");
  const titleKey = norm(title);
  const contextKey = norm(`${subject} ${description}`);
  const evidence = determineEvidence(title, subject, description, doc.creator);
  const falsePositive = rejectTitle.test(titleKey);
  const nonIndependentCollection = looksLikeNonIndependentCollection(title);
  const foreignContext = foreignLanguageSignal.test(contextKey) || foreignLanguageSignal.test(titleKey);
  const eligible = Boolean(title && hasArabicText(title) && evidence && !falsePositive && !nonIndependentCollection && !foreignContext);

  let rejectedBecause = "";
  if (!title) rejectedBecause = "عنوان مفقود";
  else if (!hasArabicText(title)) rejectedBecause = "عنوان غير عربي";
  else if (foreignContext) rejectedBecause = "لغة أو سياق غير عربي";
  else if (falsePositive) rejectedBecause = "دراسة أو سجل غير ديواني";
  else if (nonIndependentCollection) rejectedBecause = "مجموعة أو جزء غير مستقل";
  else if (!evidence) rejectedBecause = "البيانات لا تثبت أن السجل ديواناً مستقلاً";

  return {
    doc,
    title,
    subject,
    description,
    author: cleanPerson(asList(doc.creator)[0] ?? ""),
    poet: derivePoet(title, doc.creator),
    canonical: canonicalTitle(title),
    evidence,
    eligible,
    rejectedBecause,
  };
}

function score(item) {
  const evidenceScore = item.evidence.startsWith("العنوان") ? 10 : item.evidence.startsWith("الوصف أو الموضوع") ? 8 : 6;
  const languageScore = asList(item.doc.language).some((value) => ["ara", "arabic"].includes(String(value).toLowerCase())) ? 1 : 0;
  return evidenceScore + (item.poet ? 4 : 0) + (item.subject.length > 10 ? 2 : 0) + (item.description.length > 30 ? 1 : 0) + languageScore;
}

async function fetchPage(query, page, timeoutMs = 30000) {
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  for (const field of fields) url.searchParams.append("fl[]", field);
  url.searchParams.set("rows", String(pageSize));
  url.searchParams.set("page", String(page));
  url.searchParams.set("output", "json");
  url.searchParams.append("sort[]", "downloads desc");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Arabic-Language-Thesaurus/1.1 (metadata-only)" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 600 * attempt));
    }
  }
  throw new Error("تعذر جلب صفحة البحث");
}

const docs = new Map();
const requests = [];
const failures = [];
for (const plan of requestPlan) {
  for (let page = 1; page <= maxPagesPerQuery; page += 1) {
    try {
      const payload = await fetchPage(plan.query, page, plan.timeoutMs);
      const current = payload.response?.docs ?? [];
      for (const doc of current) if (doc.identifier) docs.set(doc.identifier, doc);
      requests.push({
        name: plan.name,
        query: plan.query,
        page,
        returned: current.length,
        numFound: payload.response?.numFound ?? 0,
      });
      if (current.length < pageSize) break;
    } catch (error) {
      failures.push({ name: plan.name, page, message: String(error) });
      break;
    }
  }
}

const classified = [...docs.values()]
  .filter((doc) => doc.mediatype === "texts")
  .map(classify);
const candidates = classified.filter((item) => item.eligible);
const rejected = classified.filter((item) => !item.eligible);
const chosen = new Map();
for (const item of candidates) {
  const key = `${item.canonical}::${norm(item.poet) || "poet-unavailable"}`;
  const previous = chosen.get(key);
  if (!previous || score(item) > score(previous)) chosen.set(key, item);
}

const materials = [...chosen.values()]
  .sort((a, b) => a.title.localeCompare(b.title, "ar"))
  .map((item) => ({
    id: `archive-${item.doc.identifier}`,
    title: item.title,
    author: item.poet || item.author || "لم يُثبت اسم الشاعر في السجل",
    source: "Internet Archive",
    relativePath: item.doc.identifier,
    sourceUrl: `https://archive.org/details/${encodeURIComponent(item.doc.identifier)}`,
    primaryCategory: "diwans",
    tags: ["ديوان شعري"],
    matchEvidence: {
      strongSignals: ["ديوان شعري", `دليل البيانات الوصفية: ${item.evidence}`],
      supportingSignals: item.subject ? [item.subject.slice(0, 220)] : [],
      explicitLanguageSource: true,
    },
  }));

const rejectedCounts = {};
for (const item of rejected) {
  const reason = item.rejectedBecause || "غير محدد";
  rejectedCounts[reason] = (rejectedCounts[reason] ?? 0) + 1;
}
const evidenceCounts = {};
for (const item of candidates) evidenceCounts[item.evidence] = (evidenceCounts[item.evidence] ?? 0) + 1;

const generatedAt = new Date().toISOString();
const payload = {
  metadata: {
    sourceName: "Internet Archive",
    sourceIndexUrl: "https://archive.org/search?tab=all&query=%D8%AF%D9%8A%D9%88%D8%A7%D9%86&and%5B%5D=mediatype%3A%22texts%22",
    generatedAt,
    selectionMethod: "استكمال موسع لسجلات عربية نصية؛ يقبل الديوان إذا صرّح العنوان به أو ربطت البيانات الوصفية عنوان السجل نفسه بديوان مستقل، مع استبعاد الدراسات والسجلات الإدارية والمجاميع أو الأجزاء غير المستقلة والمواد غير العربية.",
    collectionScope: "دفعة موسعة من صفحات نتائج Internet Archive الأعلى تداولاً عبر ثلاثة مسارات بحث، مع إزالة التكرار داخلياً قبل الدمج مع المصدر الثاني.",
    paging: { pageSize, maxPagesPerQuery, plannedQueries: requestPlan.length },
    requests,
  },
  materials,
};

const audit = {
  generatedAt,
  requestPlan,
  requests,
  failures,
  fetchedUniqueIdentifiers: docs.size,
  eligibleBeforeDeduplication: candidates.length,
  selectedAfterDeduplication: materials.length,
  duplicateCandidatesRemoved: candidates.length - materials.length,
  acceptedByEvidence: Object.entries(evidenceCounts).sort((a, b) => b[1] - a[1]),
  rejectedByReason: Object.entries(rejectedCounts).sort((a, b) => b[1] - a[1]),
  selectedSample: materials.slice(0, 60),
  rejectedSample: rejected.slice(0, 60).map((item) => ({
    identifier: item.doc.identifier,
    title: item.title,
    author: item.author,
    rejectedBecause: item.rejectedBecause,
  })),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({
  selected: materials.length,
  fetched: docs.size,
  failures: failures.length,
  outputPath,
  auditPath,
}, null, 2));

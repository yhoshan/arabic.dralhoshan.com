import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const outputPath = resolve(projectRoot, "client/src/data/archive-diwans.json");
const auditPath = "/home/ubuntu/archive_diwan_dataset_audit.json";
const searchEndpoint = "https://archive.org/advancedsearch.php";
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
const queries = [
  `${queryBase} AND language:ara`,
  `${queryBase} AND language:Arabic`,
];
const rowsPerPage = 1000;

function asList(value) {
  if (Array.isArray(value)) return value.flatMap(asList);
  if (value === null || value === undefined) return [];
  return [String(value)];
}

function normalizeArabic(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ـ]/g, "")
    .replace(/[\[\]{}()"'`*_،؛:!?.,/\\|+\-=—–]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(value) {
  return compactText(value)
    .replace(/^book\s+/i, "")
    .replace(/^\d+\s+(?:كتاب|book)\s+/i, "")
    .replace(/\s*\[[^\]]+\]\s*(?:---|–|—)\s*.*/u, "")
    .replace(/\s+(?:pdf|word|htm|html)$/i, "")
    .trim();
}

function cleanAuthor(value) {
  return compactText(value)
    .replace(/["“”]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/،?\s*\d{3,4}(?:\s*[-–]\s*\d{0,4})?\.?$/u, "")
    .trim();
}

function isArabicRecord(language) {
  return asList(language).some((entry) => {
    const value = normalizeArabic(entry);
    return value === "ara" || value === "arabic" || value === "العربيه" || value === "العربية";
  });
}

function hasWord(text, word) {
  return new RegExp(`(^|\\s)${word}(?=\\s|$)`, "u").test(normalizeArabic(text));
}

function getMetadataText(doc) {
  return [doc.title, ...asList(doc.subject), ...asList(doc.description)].join(" ");
}

function classify(doc) {
  const title = cleanTitle(doc.title);
  const author = cleanAuthor(asList(doc.creator)[0] ?? "");
  const subject = asList(doc.subject).join(" · ");
  const description = asList(doc.description).join(" ");
  const titleNorm = normalizeArabic(title);
  const subjectNorm = normalizeArabic(subject);
  const descriptionNorm = normalizeArabic(description);
  const metadataNorm = normalizeArabic(getMetadataText(doc));
  const titleStatesDiwan = hasWord(title, "ديوان");
  const subjectStatesDiwan = hasWord(subject, "ديوان");
  const descriptionStatesDiwan = hasWord(description, "ديوان");
  const hasDiwanEvidence = titleStatesDiwan || subjectStatesDiwan || descriptionStatesDiwan;
  const nonStandaloneSignals = /(دراسه|رساله|اطروحه|بحث|شرح|فهرس|معجم|نقد|تحليل|قراءه|موازنه|ببليوغرافيا|مختارات|مجموعه\s+(?:من\s+)?(?:ديوان|دواوين)|ديوانين|دواوين|في\s+ديوان)/u;
  const isNonStandalone = nonStandaloneSignals.test(titleNorm);
  const hasPoetryContext = /(شعر|قصائد|شاعر|ديوان)/u.test(metadataNorm);
  const titleLooksLikeContainer = /^(كتاب|مكتبه|مجموعه|سلسله|ملف)\s+/u.test(titleNorm);
  const eligible = Boolean(title && hasDiwanEvidence && hasPoetryContext && !isNonStandalone && !titleLooksLikeContainer);
  const basis = titleStatesDiwan
    ? "العنوان"
    : subjectStatesDiwan
      ? "الموضوع"
      : descriptionStatesDiwan
        ? "الوصف"
        : "";

  return {
    eligible,
    title,
    author,
    subject,
    description,
    titleStatesDiwan,
    subjectStatesDiwan,
    descriptionStatesDiwan,
    basis,
    rejectedBecause: !title
      ? "عنوان مفقود"
      : !hasDiwanEvidence
        ? "لا يثبت أي حقل وصفي أنه ديوان"
        : isNonStandalone
          ? "عنوان دراسة أو شرح أو فهرس أو مجموعة لا تمثل ديواناً مستقلاً"
          : titleLooksLikeContainer
            ? "عنوان حاوية أو ملف لا يمثل ديواناً مستقلاً"
            : !hasPoetryContext
              ? "لا يوجد سياق شعري كافٍ في البيانات الوصفية"
              : "",
  };
}

function scoreCandidate(candidate) {
  const detailScore = candidate.description.length > 40 ? 2 : candidate.description.length ? 1 : 0;
  const subjectScore = candidate.subject.length > 10 ? 1 : 0;
  return (candidate.titleStatesDiwan ? 8 : 0)
    + (candidate.subjectStatesDiwan ? 4 : 0)
    + (candidate.descriptionStatesDiwan ? 3 : 0)
    + (candidate.author ? 3 : 0)
    + detailScore
    + subjectScore
    + (String(candidate.language).toLowerCase() === "ara" ? 1 : 0);
}

async function fetchQuery(query) {
  const first = new URL(searchEndpoint);
  first.searchParams.set("q", query);
  for (const field of fields) first.searchParams.append("fl[]", field);
  first.searchParams.set("rows", String(rowsPerPage));
  first.searchParams.set("page", "1");
  first.searchParams.set("output", "json");

  const request = async (url) => {
    const response = await fetch(url, {
      headers: { "user-agent": "Arabic-Language-Thesaurus/1.0 (metadata-only; contact: archive-research)" },
    });
    if (!response.ok) throw new Error(`Archive API ${response.status}: ${response.statusText}`);
    return response.json();
  };

  const firstPayload = await request(first);
  const total = Number(firstPayload.response?.numFound ?? 0);
  const docs = [...(firstPayload.response?.docs ?? [])];
  const pages = Math.ceil(total / rowsPerPage);

  for (let page = 2; page <= pages; page += 1) {
    const url = new URL(first);
    url.searchParams.set("page", String(page));
    const payload = await request(url);
    docs.push(...(payload.response?.docs ?? []));
  }

  return { total, docs };
}

const fetchedByIdentifier = new Map();
const sourceTotals = [];
for (const query of queries) {
  const { total, docs } = await fetchQuery(query);
  sourceTotals.push({ query, total });
  for (const doc of docs) {
    if (doc.identifier) fetchedByIdentifier.set(doc.identifier, doc);
  }
}

const classified = [...fetchedByIdentifier.values()]
  .filter((doc) => doc.mediatype === "texts" && isArabicRecord(doc.language))
  .map((doc) => ({ doc, ...classify(doc) }));

const rejected = classified.filter((candidate) => !candidate.eligible);
const eligible = classified.filter((candidate) => candidate.eligible);
const byCanonicalKey = new Map();
for (const candidate of eligible) {
  const titleKey = normalizeArabic(candidate.title);
  const authorKey = normalizeArabic(candidate.author);
  const canonicalKey = `${titleKey}::${authorKey || "unknown-author"}`;
  const previous = byCanonicalKey.get(canonicalKey);
  if (!previous || scoreCandidate(candidate) > scoreCandidate(previous)) {
    byCanonicalKey.set(canonicalKey, candidate);
  }
}

const selected = [...byCanonicalKey.values()]
  .sort((a, b) => a.title.localeCompare(b.title, "ar"))
  .map((candidate) => ({
    id: `archive-${candidate.doc.identifier}`,
    title: candidate.title,
    author: candidate.author || "لم يُثبت اسم الشاعر في السجل",
    source: "Internet Archive",
    relativePath: candidate.doc.identifier,
    sourceUrl: `https://archive.org/details/${encodeURIComponent(candidate.doc.identifier)}`,
    primaryCategory: "diwans",
    tags: ["ديوان شعري"],
    matchEvidence: {
      strongSignals: ["ديوان شعري", `دليل البيانات الوصفية: ${candidate.basis}`],
      supportingSignals: candidate.subject ? [candidate.subject.slice(0, 180)] : [],
      explicitLanguageSource: true,
    },
  }));

const payload = {
  metadata: {
    sourceName: "Internet Archive",
    sourceIndexUrl: "https://archive.org/search?tab=all&query=%D8%AF%D9%8A%D9%88%D8%A7%D9%86&and%5B%5D=mediatype%3A%22texts%22",
    generatedAt: new Date().toISOString(),
    selectionMethod: "سجلات عربية نصية تثبت بياناتها الوصفية أنها دواوين، مع استبعاد الدراسات والفهارس والمجموعات وتوحيد العنوان واسم الشاعر عند توافره.",
    sourceQueries: sourceTotals,
  },
  materials: selected,
};

const audit = {
  generatedAt: payload.metadata.generatedAt,
  sourceTotals,
  fetchedUniqueIdentifiers: fetchedByIdentifier.size,
  arabicTextRecords: classified.length,
  eligibleBeforeDeduplication: eligible.length,
  selectedAfterDeduplication: selected.length,
  duplicateCandidatesRemoved: eligible.length - selected.length,
  rejectedByReason: Object.entries(
    rejected.reduce((accumulator, candidate) => {
      const reason = candidate.rejectedBecause || "غير محدد";
      accumulator[reason] = (accumulator[reason] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).sort((a, b) => b[1] - a[1]),
  selectedSample: selected.slice(0, 30).map(({ id, title, author, sourceUrl, matchEvidence }) => ({
    id,
    title,
    author,
    sourceUrl,
    matchEvidence,
  })),
  rejectedSample: rejected.slice(0, 30).map((candidate) => ({
    identifier: candidate.doc.identifier,
    title: candidate.title,
    author: candidate.author,
    rejectedBecause: candidate.rejectedBecause,
  })),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, auditPath, selected: selected.length }, null, 2));

import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2] ?? "/home/ubuntu/archive-diwans-api-expanded.json";
const reportPath = process.argv[3] ?? "/home/ubuntu/archive_diwan_api_expansion_quality.json";
const dataset = JSON.parse(readFileSync(inputPath, "utf8"));
const materials = Array.isArray(dataset.materials) ? dataset.materials : [];

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const riskRules = [
  ["بحث أو دراسة ظاهرة", /(?:دراسه|رساله|اطروحه|بحث|شرح|نقد|تحليل|منهج|اتجاهات|قراءه|مقاربه|موازنه)/u],
  ["سجل أو مؤسسة إدارية", /(?:سجل|ديوان\s+(?:الوزاره|الوزارة|الدوله|الدولة|المال|المالية|الخراج|الوقف|الحساب|الرسائل|الانشاء|الإنشاء|المظالم|العدل))/u],
  ["مجموعة أو جزء غير مستقل", /(?:الجزء|المجلد|مجموعه|مختارات|منتخبات|الاعمال\s+الشعريه\s+الكامله)/u],
  ["مجال ديني أو تاريخي غير شعري", /(?:ديوان\s+(?:السنه|السنة|السنن|الحديث|الاحاديث|الآثار|الاثار|العرب|الخبر|العبر))/u],
  ["تلوث عنوان تحميل", /(?:كتاب\s+اقرا|اونلاين|online|pdf|epub)/u],
];

const evidenceCounts = {};
const flagged = [];
const missingAuthor = [];
const titleDerivedAuthor = [];
const metadataOnly = [];
const deterministicSample = [];

for (const material of materials) {
  const titleKey = normalize(material.title);
  const authorKey = normalize(material.author);
  const evidence = material.matchEvidence?.strongSignals?.[1] ?? "";
  evidenceCounts[evidence] = (evidenceCounts[evidence] ?? 0) + 1;

  const reasons = riskRules.filter(([, rule]) => rule.test(titleKey)).map(([label]) => label);
  if (reasons.length) {
    flagged.push({
      id: material.id,
      title: material.title,
      author: material.author,
      sourceUrl: material.sourceUrl,
      evidence,
      reasons,
    });
  }
  if (!material.author || /لم\s+يثبت\s+اسم\s+الشاعر/u.test(authorKey)) {
    missingAuthor.push({ id: material.id, title: material.title, sourceUrl: material.sourceUrl });
  } else if (authorKey.includes("ديوان")) {
    titleDerivedAuthor.push({ id: material.id, title: material.title, author: material.author, sourceUrl: material.sourceUrl });
  }
  if (/يثبت أن عنوان السجل|تربط عنوان السجل/u.test(evidence)) {
    metadataOnly.push({ id: material.id, title: material.title, author: material.author, sourceUrl: material.sourceUrl, evidence });
  }
  if (stableHash(material.id) % 37 === 0) {
    deterministicSample.push({ id: material.id, title: material.title, author: material.author, sourceUrl: material.sourceUrl, evidence });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  inputPath,
  materialsCount: materials.length,
  flaggedCount: flagged.length,
  missingAuthorCount: missingAuthor.length,
  titleDerivedAuthorCount: titleDerivedAuthor.length,
  metadataOnlyCount: metadataOnly.length,
  acceptedByEvidence: Object.entries(evidenceCounts).sort((a, b) => b[1] - a[1]),
  flagged: flagged.slice(0, 400),
  metadataOnly,
  deterministicSample: deterministicSample.slice(0, 120),
  missingAuthorSample: missingAuthor.slice(0, 120),
  titleDerivedAuthorSample: titleDerivedAuthor.slice(0, 120),
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  materialsCount: report.materialsCount,
  flaggedCount: report.flaggedCount,
  missingAuthorCount: report.missingAuthorCount,
  titleDerivedAuthorCount: report.titleDerivedAuthorCount,
  metadataOnlyCount: report.metadataOnlyCount,
  reportPath,
}, null, 2));

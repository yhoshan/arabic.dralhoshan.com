import { readFileSync, writeFileSync } from "node:fs";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const datasetPath = `${projectRoot}/client/src/data/archive-diwans.json`;
const reportPath = "/home/ubuntu/archive_diwan_quality_report.json";
const dataset = JSON.parse(readFileSync(datasetPath, "utf8"));
const materials = dataset.materials ?? [];

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const suspiciousPatterns = [
  ["دراسة أو بحث ظاهر", /(?:دراسه|رساله|اطروحه|بحث|شرح|نقد|تحليل|منهج|حياته)/u],
  ["فهرس أو معجم أو سجل ظاهر", /(?:فهرس|معجم|سجل|موسوعه|مجله|صحيفه|جريده)/u],
  ["مجموع أو جزء ظاهر", /(?:الجزء|مجلد|مجموعه|مختارات|منتخبات|الاعمال الشعريه الكامله)/u],
  ["تلوث بعنوان التحميل أو القراءة", /(?:كتاب اقرا|اونلاين|online|pdf)/u],
];

const suspicious = [];
for (const material of materials) {
  const title = normalize(material.title);
  const reasons = suspiciousPatterns
    .filter(([, pattern]) => pattern.test(title))
    .map(([reason]) => reason);
  if (reasons.length) {
    suspicious.push({
      id: material.id,
      title: material.title,
      sourceUrl: material.sourceUrl,
      evidence: material.matchEvidence?.strongSignals?.[1] ?? "",
      reasons,
    });
  }
}

const metadataAccepted = materials
  .filter((material) => /(?:يثبت أن عنوان السجل|تربط عنوان السجل)/u.test(material.matchEvidence?.strongSignals?.[1] ?? ""))
  .map((material) => ({
    id: material.id,
    title: material.title,
    author: material.author,
    sourceUrl: material.sourceUrl,
    evidence: material.matchEvidence?.strongSignals?.[1] ?? "",
    supportingSignals: material.matchEvidence?.supportingSignals ?? [],
  }));

const report = {
  generatedAt: new Date().toISOString(),
  materialsCount: materials.length,
  suspiciousCount: suspicious.length,
  metadataAcceptedCount: metadataAccepted.length,
  suspicious: suspicious.slice(0, 200),
  metadataAccepted,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  materialsCount: report.materialsCount,
  suspiciousCount: report.suspiciousCount,
  metadataAcceptedCount: report.metadataAcceptedCount,
  reportPath,
}, null, 2));

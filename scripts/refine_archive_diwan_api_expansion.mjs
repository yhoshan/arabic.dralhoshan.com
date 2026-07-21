import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2] ?? "/home/ubuntu/archive-diwans-api-expanded.json";
const outputPath = process.argv[3] ?? "/home/ubuntu/archive-diwans-api-expanded-refined.json";
const auditPath = process.argv[4] ?? "/home/ubuntu/archive_diwan_api_refinement_audit.json";

const input = JSON.parse(readFileSync(inputPath, "utf8"));
const materials = Array.isArray(input.materials) ? input.materials : [];

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return compact(value)
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

function cleanTitle(value) {
  return compact(value)
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/^[\s._\-—–·•ـ]+/u, "")
    .replace(/^\d{3,7}[_\-\s]*/u, "")
    .replace(/^\d+[a-z]?\s+pdf\s+/iu, "")
    .replace(/^كتاب\s+صيغة\s+(?:وورد|word)\s+(?:(?:ورد|word)\s+)?/iu, "")
    .replace(/^كتاب\s+pdf\s+/iu, "")
    .replace(/^pdf\s+/iu, "")
    .replace(/^book\s+/iu, "")
    .replace(/^\d+\s+(?:كتاب|book)\s+/iu, "")
    .replace(/\s+(?:www\.)?(?:ketabypdf\.com|booksjadid\.blogspot\.com).*$/iu, "")
    .replace(/\s+pdf\s*\d*$/iu, "")
    .replace(/\s+(?:pdf|word|htm|html)$/iu, "")
    .trim();
}

const reject = /(?:^|\s)(?:دراسات|التكوينات|توظيف|الفائزون|جائزه|جائزة)(?:\s|$).*?\bديوان\b|(?:^|\s)(?:مع\s+)?تحقيق\s+ديوان(?:\s|$)|ديوان\s+(?:الاساطير|الأَساطير|الاحكام|الأحكام|اسماء\s+(?:الضعفاء|المتروكين))(?:\s|$)|ديوان(?:\s|$).*?رواياتي(?:\s|$)|(?:^|\s)(?:كتاب\s+)?(?:صيغه|صيغة)\s+(?:وورد|word)(?:\s|$)/u;
const obviousDownloadNoise = /(?:^|\s)(?:pdf|epub|online|اونلاين)(?:\s|$)/iu;

function confidence(material) {
  const title = cleanTitle(material.title);
  const author = compact(material.author);
  const evidence = material.matchEvidence?.strongSignals?.[1] ?? "";
  return (evidence.includes("العنوان يصرح") ? 8 : 5)
    + (author && !/لم\s+يثبت/u.test(author) ? 3 : 0)
    + (title.length > 8 ? 1 : 0)
    + (material.sourceUrl ? 1 : 0);
}

const acceptedByKey = new Map();
const rejected = [];
const duplicateReplacements = [];
for (const material of materials) {
  const title = cleanTitle(material.title);
  const titleKey = normalize(title);
  const authorKey = normalize(material.author).replace(/^لم يثبت اسم الشاعر في السجل$/u, "");
  const matchesReject = reject.test(titleKey);
  const noisy = obviousDownloadNoise.test(titleKey) && !/^ديوان\s+/u.test(titleKey);
  if (!title || matchesReject || noisy) {
    rejected.push({
      id: material.id,
      originalTitle: material.title,
      cleanedTitle: title,
      reason: !title ? "عنوان فارغ بعد التنظيف" : matchesReject ? "دراسة أو سجل غير ديواني" : "ضجيج تنزيل ظاهر",
      sourceUrl: material.sourceUrl,
    });
    continue;
  }

  const candidate = { ...material, title };
  const key = `${titleKey}|${authorKey}`;
  const previous = acceptedByKey.get(key);
  if (!previous || confidence(candidate) > confidence(previous)) {
    if (previous) duplicateReplacements.push({ kept: candidate.id, removed: previous.id, key });
    acceptedByKey.set(key, candidate);
  } else {
    duplicateReplacements.push({ kept: previous.id, removed: candidate.id, key });
  }
}

const refinedMaterials = [...acceptedByKey.values()].sort((a, b) => a.title.localeCompare(b.title, "ar"));
const generatedAt = new Date().toISOString();
const output = {
  ...input,
  metadata: {
    ...(input.metadata ?? {}),
    generatedAt,
    selectionMethod: "جمع موسع عبر واجهة Internet Archive البرمجية، ثم تنقية محلية للعناوين وحذف الدراسات والسجلات غير الشعرية وضجيج التنزيل، مع توحيد العناوين قبل الدمج.",
    qualityRefinement: {
      inputMaterials: materials.length,
      retainedMaterials: refinedMaterials.length,
      rejectedMaterials: rejected.length,
      duplicateCandidatesRemovedAfterCleaning: duplicateReplacements.length,
      auditPath,
    },
  },
  materials: refinedMaterials,
};

const audit = {
  generatedAt,
  inputPath,
  outputPath,
  inputMaterials: materials.length,
  retainedMaterials: refinedMaterials.length,
  rejectedMaterials: rejected.length,
  duplicateCandidatesRemovedAfterCleaning: duplicateReplacements.length,
  rejected,
  duplicateReplacements: duplicateReplacements.slice(0, 300),
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({
  inputMaterials: materials.length,
  retainedMaterials: refinedMaterials.length,
  rejectedMaterials: rejected.length,
  duplicateCandidatesRemovedAfterCleaning: duplicateReplacements.length,
  outputPath,
  auditPath,
}, null, 2));

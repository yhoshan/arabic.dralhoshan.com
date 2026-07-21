/*
 * استيراد محافظ لرسائل قناة «جامعة الرسائل العلمية».
 * يحافظ على مواد المكنز القائمة، ويضيف فقط الرسائل العربية المنتقاة ذات روابط تيليجرام المباشرة.
 */
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = "/home/ubuntu/arabic-language-thesaurus";
const CORPUS_PATH = path.join(PROJECT_ROOT, "client/src/data/arabic-materials.json");
const CANDIDATES_PATH = "/home/ubuntu/telegram_theses_candidates_v4.json";
const AUDIT_PATH = "/home/ubuntu/telegram_theses_merge_audit.json";
const CHANNEL_URL = "https://t.me/Arsail2020";
const CHANNEL_NAME = "جامعة الرسائل العلمية (تيليجرام)";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const WHITESPACE = /\s+/g;

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\u0621-\u063A\u0641-\u064A0-9\s]/g, " ")
    .replace(WHITESPACE, " ")
    .trim()
    .toLowerCase();
}

function titleKey(material) {
  return normalize(material.title);
}

function isDirectChannelPost(url) {
  return /^https:\/\/t\.me\/Arsail2020\/\d+$/.test(String(url || ""));
}

function thesisLevel(title) {
  const normalized = normalize(title);
  if (normalized.includes("دكتوراه")) return "رسالة دكتوراه";
  if (normalized.includes("ماجستير")) return "رسالة ماجستير";
  return "رسالة علمية";
}

function levelRank(tags) {
  if (tags.includes("رسالة دكتوراه")) return 0;
  if (tags.includes("رسالة ماجستير")) return 1;
  return 2;
}

function safeTitleForPath(title) {
  return String(title || "رسالة علمية")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
const candidatesPayload = JSON.parse(fs.readFileSync(CANDIDATES_PATH, "utf8"));
const candidates = Array.isArray(candidatesPayload)
  ? candidatesPayload
  : candidatesPayload.materials;

if (!Array.isArray(candidates)) {
  throw new Error("ملف المرشحين لا يحتوي مصفوفة رسائل صالحة.");
}

const existingByTitle = new Set(corpus.materials.map(titleKey));
const batchByTitle = new Set();
const imported = [];
const skippedExisting = [];
const skippedInvalid = [];
const skippedBatchDuplicate = [];

for (const candidate of candidates) {
  const key = titleKey(candidate);
  const messageId = Number(candidate.messageId);

  if (!key || !Number.isInteger(messageId) || !isDirectChannelPost(candidate.sourceUrl)) {
    skippedInvalid.push({
      id: candidate?.id || null,
      title: candidate?.title || null,
      reason: "بيانات العنوان أو رابط المنشور غير مكتملة",
    });
    continue;
  }

  if (existingByTitle.has(key)) {
    skippedExisting.push({
      id: candidate.id,
      title: candidate.title,
      messageId,
      sourceUrl: candidate.sourceUrl,
    });
    continue;
  }

  if (batchByTitle.has(key)) {
    skippedBatchDuplicate.push({
      id: candidate.id,
      title: candidate.title,
      messageId,
      sourceUrl: candidate.sourceUrl,
    });
    continue;
  }

  batchByTitle.add(key);
  const topicalTags = Array.isArray(candidate.tags) ? candidate.tags.filter(Boolean) : [];
  const level = thesisLevel(candidate.title);
  const tags = [...new Set([level, ...topicalTags])];

  imported.push({
    id: candidate.id,
    title: String(candidate.title).trim(),
    author: candidate.author || null,
    source: CHANNEL_NAME,
    relativePath: `الرسائل العلمية/${level}/${messageId}/${safeTitleForPath(candidate.title)}.pdf`,
    sourceUrl: candidate.sourceUrl,
    primaryCategory: "academic_theses",
    tags,
    matchEvidence: {
      strongSignals: Array.isArray(candidate.matchEvidence?.strongSignals)
        ? candidate.matchEvidence.strongSignals
        : [],
      supportingSignals: [
        ...new Set([
          ...(Array.isArray(candidate.matchEvidence?.supportingSignals)
            ? candidate.matchEvidence.supportingSignals
            : []),
          "رسالة علمية منتقاة من قناة جامعة الرسائل العلمية",
          "رابط مباشر إلى منشور القناة",
        ]),
      ],
      explicitLanguageSource: Boolean(candidate.matchEvidence?.explicitLanguageSource),
    },
  });
}

imported.sort((a, b) => {
  const rankDifference = levelRank(a.tags) - levelRank(b.tags);
  if (rankDifference !== 0) return rankDifference;
  const tagA = a.tags[1] || "";
  const tagB = b.tags[1] || "";
  const tagDifference = tagA.localeCompare(tagB, "ar");
  if (tagDifference !== 0) return tagDifference;
  return a.title.localeCompare(b.title, "ar");
});

const finalMaterials = [...corpus.materials, ...imported];
const originalStatistics = corpus.metadata.statistics || {};
const importedByTopic = Object.fromEntries(
  ["دراسات لغوية", "نحو", "صرف", "بلاغة", "معجم لغوي", "شعر وأدب"].map((topic) => [
    topic,
    imported.filter((material) => material.tags.includes(topic)).length,
  ]),
);
const importedByLevel = Object.fromEntries(
  ["رسالة دكتوراه", "رسالة ماجستير", "رسالة علمية"].map((level) => [
    level,
    imported.filter((material) => material.tags.includes(level)).length,
  ]),
);

const output = {
  ...corpus,
  metadata: {
    ...corpus.metadata,
    selectionMethod: `${corpus.metadata.selectionMethod} أضيفت الرسائل العلمية المنتقاة من قناة جامعة الرسائل العلمية بعد التحقق من رابط المنشور المباشر وإزالة تطابقات العنوان.`,
    statistics: {
      ...originalStatistics,
      academicTheses: imported.length,
      totalMaterials: finalMaterials.length,
    },
    academicThesesSource: {
      name: CHANNEL_NAME,
      channelUrl: CHANNEL_URL,
      importedCount: imported.length,
      selectionMethod: "مطابقة موضوعية محافظة للغة العربية وعلومها مع رابط مباشر لكل منشور في القناة.",
    },
  },
  materials: finalMaterials,
};

fs.writeFileSync(CORPUS_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const audit = {
  generatedAt: new Date().toISOString(),
  channel: {
    name: CHANNEL_NAME,
    url: CHANNEL_URL,
  },
  candidatesReceived: candidates.length,
  imported: imported.length,
  skippedExistingCount: skippedExisting.length,
  skippedBatchDuplicateCount: skippedBatchDuplicate.length,
  skippedInvalidCount: skippedInvalid.length,
  importedByTopic,
  importedByLevel,
  directTelegramLinks: imported.every((material) => isDirectChannelPost(material.sourceUrl)),
  catalogMaterialsAfterImport: finalMaterials.length,
  existingOverlapSample: skippedExisting.slice(0, 20),
  invalidSample: skippedInvalid.slice(0, 20),
  importedSample: imported.slice(0, 25),
};

fs.writeFileSync(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify(audit, null, 2));

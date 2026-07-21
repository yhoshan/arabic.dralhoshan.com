/*
 * استيراد محافظ لرسائل قناة «جامعة الرسائل العلمية».
 * يحافظ على مواد المكنز القائمة ويضيف فقط الرسائل العربية المنتقاة ذات روابط تيليجرام المباشرة.
 * يمنع التكرار بالتسلسل: رابط المنشور/رقمه، المعرّف الداخلي، العنوان والمؤلف، ثم العنوان المطبّع عند غياب المؤلف.
 */
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = "/home/ubuntu/arabic-language-thesaurus";
const CORPUS_PATH = process.env.CORPUS_PATH || path.join(PROJECT_ROOT, "client/src/data/arabic-materials.json");
const CANDIDATES_PATH = process.env.CANDIDATES_PATH || "/home/ubuntu/telegram_theses_candidates_v4.json";
const AUDIT_PATH = process.env.AUDIT_PATH || "/home/ubuntu/telegram_theses_merge_audit.json";
const DRY_RUN = process.env.DRY_RUN === "1";
const CHANNEL_URL = "https://t.me/Arsail2020";
const CHANNEL_NAME = "جامعة الرسائل العلمية (تيليجرام)";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const WHITESPACE = /\s+/g;
const DIRECT_POST_PATTERN = /^https:\/\/t\.me\/Arsail2020\/(\d+)\/?$/i;

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .replace(/[^\u0621-\u063A\u0641-\u064A0-9\s]/g, " ")
    .replace(WHITESPACE, " ")
    .trim()
    .toLowerCase();
}

function titleKey(material) {
  return normalize(material?.title);
}

function authorKey(material) {
  return normalize(material?.author);
}

function titleAuthorKey(material) {
  const title = titleKey(material);
  const author = authorKey(material);
  return title && author ? `${title}::${author}` : "";
}

function materialIdKey(material) {
  return String(material?.id || "").trim();
}

function sourceUrlKey(material) {
  return String(material?.sourceUrl || "").trim().replace(/\/+$/, "");
}

function telegramPostKey(material) {
  const match = sourceUrlKey(material).match(DIRECT_POST_PATTERN);
  return match ? match[1] : "";
}

function isDirectChannelPost(url) {
  return Boolean(String(url || "").trim().match(DIRECT_POST_PATTERN));
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

function details(candidate, reason) {
  return {
    id: candidate?.id || null,
    title: candidate?.title || null,
    author: candidate?.author || null,
    messageId: Number(candidate?.messageId) || null,
    sourceUrl: candidate?.sourceUrl || null,
    reason,
  };
}

const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
const candidatesPayload = JSON.parse(fs.readFileSync(CANDIDATES_PATH, "utf8"));
const candidates = Array.isArray(candidatesPayload)
  ? candidatesPayload
  : candidatesPayload.materials;

if (!Array.isArray(candidates)) {
  throw new Error("ملف المرشحين لا يحتوي مصفوفة رسائل صالحة.");
}

const existingByTitle = new Set(corpus.materials.map(titleKey).filter(Boolean));
const existingByTitleAuthor = new Set(corpus.materials.map(titleAuthorKey).filter(Boolean));
const existingById = new Set(corpus.materials.map(materialIdKey).filter(Boolean));
const existingBySourceUrl = new Set(corpus.materials.map(sourceUrlKey).filter(Boolean));
const existingByTelegramPost = new Set(corpus.materials.map(telegramPostKey).filter(Boolean));

const batchByTitle = new Set();
const batchByTitleAuthor = new Set();
const batchById = new Set();
const batchBySourceUrl = new Set();
const batchByTelegramPost = new Set();

const imported = [];
const skippedInvalid = [];
const skippedExistingById = [];
const skippedExistingBySourceUrl = [];
const skippedExistingByTelegramPost = [];
const skippedExistingByTitleAuthor = [];
const skippedExistingByTitle = [];
const skippedBatchDuplicate = [];

for (const candidate of candidates) {
  const title = titleKey(candidate);
  const sourceUrl = sourceUrlKey(candidate);
  const id = materialIdKey(candidate);
  const post = telegramPostKey(candidate);
  const titleAuthor = titleAuthorKey(candidate);
  const messageId = Number(candidate?.messageId);

  if (!title || !Number.isInteger(messageId) || !isDirectChannelPost(candidate?.sourceUrl)) {
    skippedInvalid.push(details(candidate, "بيانات العنوان أو رابط المنشور غير مكتملة"));
    continue;
  }

  // مفاتيح مؤكدة: نفس المادة أو نفس منشور تيليجرام، مهما اختلف نص العنوان.
  if (id && existingById.has(id)) {
    skippedExistingById.push(details(candidate, "المعرّف الداخلي موجود في الكتالوج"));
    continue;
  }
  if (sourceUrl && existingBySourceUrl.has(sourceUrl)) {
    skippedExistingBySourceUrl.push(details(candidate, "رابط المنشور موجود في الكتالوج"));
    continue;
  }
  if (post && existingByTelegramPost.has(post)) {
    skippedExistingByTelegramPost.push(details(candidate, "رقم منشور تيليجرام موجود في الكتالوج"));
    continue;
  }
  if (titleAuthor && existingByTitleAuthor.has(titleAuthor)) {
    skippedExistingByTitleAuthor.push(details(candidate, "العنوان والمؤلف متطابقان بعد التطبيع"));
    continue;
  }

  // العنوان وحده مرشح محافظ لمنع إعادة إدخال المادة عند غياب اسم المؤلف.
  if (existingByTitle.has(title)) {
    skippedExistingByTitle.push(details(candidate, "العنوان موجود في الكتالوج بعد التطبيع"));
    continue;
  }

  // تطابقات الدفعة نفسها تُستبعد وفق المفاتيح ذاتها.
  if (
    (id && batchById.has(id)) ||
    (sourceUrl && batchBySourceUrl.has(sourceUrl)) ||
    (post && batchByTelegramPost.has(post)) ||
    (titleAuthor && batchByTitleAuthor.has(titleAuthor)) ||
    batchByTitle.has(title)
  ) {
    skippedBatchDuplicate.push(details(candidate, "تطابق مع سجل سابق داخل الدفعة"));
    continue;
  }

  batchById.add(id);
  batchBySourceUrl.add(sourceUrl);
  batchByTelegramPost.add(post);
  if (titleAuthor) batchByTitleAuthor.add(titleAuthor);
  batchByTitle.add(title);

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
const skippedExisting = [
  ...skippedExistingById,
  ...skippedExistingBySourceUrl,
  ...skippedExistingByTelegramPost,
  ...skippedExistingByTitleAuthor,
  ...skippedExistingByTitle,
];

const output = {
  ...corpus,
  metadata: {
    ...corpus.metadata,
    selectionMethod: `${corpus.metadata.selectionMethod} أضيفت الرسائل العلمية المنتقاة من قناة جامعة الرسائل العلمية بعد التحقق من رابط المنشور المباشر وإزالة تطابقات الرابط والمعرّف والعنوان.`.trim(),
    statistics: {
      ...originalStatistics,
      academicTheses: (originalStatistics.academicTheses || 0) + imported.length,
      totalMaterials: finalMaterials.length,
    },
    academicThesesSource: {
      name: CHANNEL_NAME,
      channelUrl: CHANNEL_URL,
      importedCount: (corpus.metadata.academicThesesSource?.importedCount || 0) + imported.length,
      selectionMethod: "مطابقة موضوعية محافظة للغة العربية وعلومها مع رابط مباشر لكل منشور في القناة ومنع التكرار متعدد المفاتيح.",
    },
  },
  materials: finalMaterials,
};

if (!DRY_RUN) {
  fs.writeFileSync(CORPUS_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

const audit = {
  dryRun: DRY_RUN,
  generatedAt: new Date().toISOString(),
  channel: {
    name: CHANNEL_NAME,
    url: CHANNEL_URL,
  },
  candidatesReceived: candidates.length,
  imported: imported.length,
  duplicatePolicy: [
    "رابط منشور تيليجرام أو رقمه",
    "المعرّف الداخلي",
    "العنوان والمؤلف بعد التطبيع عند توافر المؤلف",
    "العنوان المطبّع كحاجز محافظ عند غياب المؤلف",
  ],
  skippedExistingCount: skippedExisting.length,
  skippedExistingByReason: {
    id: skippedExistingById.length,
    sourceUrl: skippedExistingBySourceUrl.length,
    telegramPost: skippedExistingByTelegramPost.length,
    titleAuthor: skippedExistingByTitleAuthor.length,
    title: skippedExistingByTitle.length,
  },
  skippedBatchDuplicateCount: skippedBatchDuplicate.length,
  skippedInvalidCount: skippedInvalid.length,
  importedByTopic,
  importedByLevel,
  directTelegramLinks: imported.every((material) => isDirectChannelPost(material.sourceUrl)),
  catalogMaterialsAfterImport: finalMaterials.length,
  existingOverlapSample: skippedExisting.slice(0, 20),
  batchDuplicateSample: skippedBatchDuplicate.slice(0, 20),
  invalidSample: skippedInvalid.slice(0, 20),
  importedSample: imported.slice(0, 25),
};

fs.writeFileSync(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify(audit, null, 2));

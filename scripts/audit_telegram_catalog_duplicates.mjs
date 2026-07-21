/*
 * تدقيق التكرار لدفعة الرسائل العلمية وكتالوج المكنز.
 * لا يغير أي بيانات؛ يعزل فقط التطابقات المؤكدة والمحتملة للمراجعة.
 */
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = "/home/ubuntu/arabic-language-thesaurus";
const CORPUS_PATH = path.join(PROJECT_ROOT, "client/src/data/arabic-materials.json");
const CANDIDATES_PATH = "/home/ubuntu/telegram_theses_candidates_v4.json";
const OUTPUT_PATH = "/home/ubuntu/telegram_theses_duplicate_audit.json";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const WHITESPACE = /\s+/g;
const TELEGRAM_POST = /^https:\/\/t\.me\/Arsail2020\/(\d+)\/?$/i;

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ـ]/g, "")
    .replace(/[^\u0621-\u063A\u0641-\u064A0-9\s]/g, " ")
    .replace(WHITESPACE, " ")
    .trim()
    .toLowerCase();
}

function getTelegramPostId(value) {
  const match = String(value || "").trim().match(TELEGRAM_POST);
  return match ? match[1] : null;
}

function titleKey(record) {
  return normalize(record?.title);
}

function authorKey(record) {
  return normalize(record?.author);
}

function titleAuthorKey(record) {
  const title = titleKey(record);
  const author = authorKey(record);
  return title && author ? `${title}::${author}` : null;
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function duplicateGroups(items, getKey) {
  return [...groupBy(items, getKey).entries()]
    .filter(([, records]) => records.length > 1)
    .map(([key, records]) => ({
      key,
      count: records.length,
      records: records.map((record) => ({
        id: record.id || null,
        title: record.title || null,
        author: record.author || null,
        primaryCategory: record.primaryCategory || null,
        sourceUrl: record.sourceUrl || null,
        telegramPostId: getTelegramPostId(record.sourceUrl),
      })),
    }));
}

function intersectionCount(leftKeys, rightSet) {
  let count = 0;
  for (const key of leftKeys) {
    if (rightSet.has(key)) count += 1;
  }
  return count;
}

const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
const candidatesPayload = JSON.parse(fs.readFileSync(CANDIDATES_PATH, "utf8"));
const candidates = Array.isArray(candidatesPayload) ? candidatesPayload : candidatesPayload.materials;
const catalog = Array.isArray(corpus.materials) ? corpus.materials : [];
const telegramCatalog = catalog.filter((record) => Boolean(getTelegramPostId(record.sourceUrl)));

const catalogPostIds = new Set(telegramCatalog.map((record) => getTelegramPostId(record.sourceUrl)).filter(Boolean));
const catalogTitles = new Set(catalog.map(titleKey).filter(Boolean));
const catalogTitleAuthors = new Set(catalog.map(titleAuthorKey).filter(Boolean));
const candidatePostIds = new Set(candidates.map((record) => getTelegramPostId(record.sourceUrl)).filter(Boolean));
const candidateTitles = new Set(candidates.map(titleKey).filter(Boolean));
const candidateTitleAuthors = new Set(candidates.map(titleAuthorKey).filter(Boolean));

const titleOnlyCandidateCollisions = duplicateGroups(candidates, titleKey);
const titleAuthorCandidateCollisions = duplicateGroups(candidates, titleAuthorKey);
const candidateUrlDuplicateGroups = duplicateGroups(candidates, (record) => getTelegramPostId(record.sourceUrl));
const catalogUrlDuplicateGroups = duplicateGroups(telegramCatalog, (record) => getTelegramPostId(record.sourceUrl));
const catalogTitleAuthorDuplicateGroups = duplicateGroups(catalog, titleAuthorKey);
const telegramTitleDuplicateGroups = duplicateGroups(telegramCatalog, titleKey);
const catalogIdDuplicateGroups = duplicateGroups(catalog, (record) => String(record.id || "").trim());

const candidatesAlreadyByPost = candidates.filter((record) => catalogPostIds.has(getTelegramPostId(record.sourceUrl))).length;
const candidatesAlreadyByTitle = candidates.filter((record) => catalogTitles.has(titleKey(record))).length;
const candidatesAlreadyByTitleAuthor = candidates.filter((record) => {
  const key = titleAuthorKey(record);
  return key && catalogTitleAuthors.has(key);
}).length;

const audit = {
  generatedAt: new Date().toISOString(),
  rules: {
    definiteDuplicate: [
      "تطابق رابط منشور تيليجرام أو رقم الرسالة",
      "تطابق المعرف الداخلي غير الفارغ",
      "تطابق العنوان والمؤلف بعد التطبيع متى توافر المؤلف",
    ],
    reviewOnly: [
      "تطابق العنوان بعد التطبيع مع اختلاف المؤلف أو غيابه؛ لا يحذف تلقائياً",
    ],
  },
  inventory: {
    catalogMaterials: catalog.length,
    telegramMaterialsInCatalog: telegramCatalog.length,
    candidateMaterials: candidates.length,
    distinctCandidateTelegramPosts: candidatePostIds.size,
  },
  currentCatalog: {
    definiteDuplicateTelegramPostGroups: catalogUrlDuplicateGroups,
    duplicateCatalogIdGroups: catalogIdDuplicateGroups,
    duplicateTitleAuthorGroups: catalogTitleAuthorDuplicateGroups,
    telegramTitleCollisionGroupsForReview: telegramTitleDuplicateGroups,
  },
  incomingBatch: {
    duplicateTelegramPostGroups: candidateUrlDuplicateGroups,
    duplicateTitleAuthorGroups: titleAuthorCandidateCollisions,
    titleCollisionGroupsForReview: titleOnlyCandidateCollisions,
  },
  overlapWithCurrentCatalog: {
    incomingRecordsAlreadyPresentByTelegramPost: candidatesAlreadyByPost,
    incomingRecordsAlreadyPresentByNormalizedTitle: candidatesAlreadyByTitle,
    incomingRecordsAlreadyPresentByTitleAndAuthor: candidatesAlreadyByTitleAuthor,
    uniqueCandidatePostIdsPresentInCatalog: intersectionCount(candidatePostIds, catalogPostIds),
    uniqueCandidateTitlesPresentInCatalog: intersectionCount(candidateTitles, catalogTitles),
    uniqueCandidateTitleAuthorsPresentInCatalog: intersectionCount(candidateTitleAuthors, catalogTitleAuthors),
  },
  verdict: {
    automaticDeletionRecommended:
      catalogUrlDuplicateGroups.length > 0 ||
      catalogIdDuplicateGroups.length > 0 ||
      titleAuthorCandidateCollisions.length > 0 ||
      candidateUrlDuplicateGroups.length > 0,
    note: "العناوين المتشابهة بلا مؤلف أو مع اختلافه تُعرض للمراجعة ولا تُحذف آلياً حفاظاً على مواد قد تكون مستقلة.",
  },
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  inventory: audit.inventory,
  currentCatalog: {
    definiteDuplicateTelegramPostGroups: audit.currentCatalog.definiteDuplicateTelegramPostGroups.length,
    duplicateCatalogIdGroups: audit.currentCatalog.duplicateCatalogIdGroups.length,
    duplicateTitleAuthorGroups: audit.currentCatalog.duplicateTitleAuthorGroups.length,
    telegramTitleCollisionGroupsForReview: audit.currentCatalog.telegramTitleCollisionGroupsForReview.length,
  },
  incomingBatch: {
    duplicateTelegramPostGroups: audit.incomingBatch.duplicateTelegramPostGroups.length,
    duplicateTitleAuthorGroups: audit.incomingBatch.duplicateTitleAuthorGroups.length,
    titleCollisionGroupsForReview: audit.incomingBatch.titleCollisionGroupsForReview.length,
  },
  overlapWithCurrentCatalog: audit.overlapWithCurrentCatalog,
  automaticDeletionRecommended: audit.verdict.automaticDeletionRecommended,
}, null, 2));

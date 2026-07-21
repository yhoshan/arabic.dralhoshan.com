import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const INPUT_PATH = "/home/ubuntu/upload/result.json";
const CANDIDATES_PATH = "/home/ubuntu/telegram_theses_candidates_v4.json";
const AUDIT_PATH = "/home/ubuntu/telegram_theses_selection_audit_v4.json";
const CHANNEL_URL = "https://t.me/Arsail2020";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

function toText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(" ");
  if (value && typeof value === "object") return toText(value.text ?? "");
  return "";
}

function normalize(value) {
  return toText(value)
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\u0621-\u063A\u0641-\u064A0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanTitle(value) {
  return toText(value)
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/(?:^|\s)(?:noor[ _-]?book[ _-]?com|www\.[^\s]+|https?:\/\/[^\s]+|تحميل|download)(?:\s|$)/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[-–—\s❀✦•]+|[-–—\s❀✦•]+$/g, "")
    .trim();
}

const SIGNALS = [
  { name: "اللغة العربية", tag: "دراسات لغوية", score: 6, test: (t) => t.includes("اللغة العربية") || t.includes("اللغوية العربية") },
  { name: "علم اللغة", tag: "دراسات لغوية", score: 6, test: (t) => t.includes("علم اللغة") || /(^| )اللساني(?:ة|ات|ين)?(?: |$)/.test(t) },
  { name: "نحو", tag: "نحو", score: 6, test: (t) => /(^| )النحو(?: |$)/.test(t) || /(^| )النحوي(?:ة|ين|ات)?(?: |$)/.test(t) || /(^| )نحوي(?:ة|ين|ات)?(?: |$)/.test(t) },
  { name: "صرف", tag: "صرف", score: 6, test: (t) => /(^| )الصرف(?: |$)/.test(t) || /(^| )الصرفي(?:ة|ين|ات)?(?: |$)/.test(t) || /(^| )صرفي(?:ة|ين|ات)?(?: |$)/.test(t) },
  { name: "بلاغة", tag: "بلاغة", score: 6, test: (t) => /(^| )البلاغ(?:ة|ي(?:ة|ين|ات)?)(?: |$)/.test(t) },
  { name: "معجم لغوي", tag: "معجم لغوي", score: 6, test: (t) => /(^| )(المعجم|المعاجم|معجمي(?:ة|ين|ات)?)(?: |$)/.test(t) },
  { name: "الدلالة", tag: "دراسات لغوية", score: 6, test: (t) => /(^| )الدلال(?:ة|ي(?:ة|ين|ات)?)(?: |$)/.test(t) },
  { name: "الصوتيات", tag: "دراسات لغوية", score: 5, test: (t) => /(^| )(الصوت(?:ي(?:ة|ين|ات)?)?|الاصوات)(?: |$)/.test(t) },
  { name: "الإملاء", tag: "دراسات لغوية", score: 5, test: (t) => /(^| )(الاملاء|الاملائي(?:ة|ين|ات)?)(?: |$)/.test(t) },
  { name: "اللهجات", tag: "دراسات لغوية", score: 5, test: (t) => /(^| )(اللهج(?:ة|ات)|اللهجي(?:ة|ين|ات)?)(?: |$)/.test(t) },
  { name: "القراءات", tag: "دراسات لغوية", score: 4, test: (t) => /(^| )القراءات(?: |$)/.test(t) },
  { name: "الترجمة", tag: "دراسات لغوية", score: 4, test: (t) => /(^| )(الترجم(?:ة|ات|ي(?:ة|ين|ات)?))(?: |$)/.test(t) },
  { name: "الأسلوبية", tag: "دراسات لغوية", score: 4, test: (t) => /(^| )(الاسلوبي(?:ة|ين|ات)?)(?: |$)/.test(t) },
  { name: "الخطاب", tag: "دراسات لغوية", score: 4, test: (t) => t.includes("تحليل الخطاب") || t.includes("الخطاب اللغوي") || t.includes("الخطاب الادبي") || t.includes("الخطاب الشعري") },
  { name: "النص", tag: "دراسات لغوية", score: 4, test: (t) => t.includes("النصية") || t.includes("تحليل النص") || t.includes("النص الادبي") || t.includes("النصوص الادبية") },
  { name: "التعريب", tag: "دراسات لغوية", score: 4, test: (t) => /(^| )التعريب(?: |$)/.test(t) },
  { name: "العروض", tag: "شعر وأدب", score: 5, test: (t) => /(^| )(العروض|العروضي(?:ة|ين|ات)?)(?: |$)/.test(t) },
  { name: "ديوان", tag: "شعر وأدب", score: 5, test: (t) => /(^| )ديوان(?: |$)/.test(t) },
  { name: "الشعر", tag: "شعر وأدب", score: 5, test: (t) => /(^| )(الشعر|الشعرية|القصيدة|القصائد|الشاعر)(?: |$)/.test(t) },
  { name: "الأدب", tag: "شعر وأدب", score: 5, test: (t) => /(^| )(الادب|الادبية|النقد الادبي)(?: |$)/.test(t) },
  { name: "الرواية", tag: "شعر وأدب", score: 5, test: (t) => /(^| )(الرواية|الروايات|الروائي(?:ة|ين|ات)?)(?: |$)/.test(t) },
  { name: "السرد", tag: "شعر وأدب", score: 4, test: (t) => t.includes("البناء السردي") || t.includes("الخطاب السردي") || t.includes("النقد السردي") || t.includes("التحليل السردي") || t.includes("السرد في") },
];

const STRONG_EXCLUSIONS = [
  "الهندسة", "الطب", "التمريض", "الصيدلة", "الكيمياء", "الفيزياء", "الزراعة", "المحاسبة", "الادارة", "القانون", "الاقتصاد", "الرياضيات", "الحاسوب", "التصميم الداخلي", "العمارة", "التمويل", "المصارف", "المعاملات", "العقيدة", "الفقه", "الاحكام", "البيئة", "الطاقة", "الطب الشرعي"
];

const TOPIC_FALSE_POSITIVES = [
  /ازالة الشعر/, /زراعة الشعر/, /تساقط الشعر/, /الشعر بالليزر/, /الشعر الجلدي/, /القراءة الصولفائية/
];

function findSignals(title) {
  const normalized = normalize(title);
  return SIGNALS.filter((signal) => signal.test(normalized));
}

function scoreTitle(title) {
  const normalized = normalize(title);
  const found = findSignals(title);
  const score = found.reduce((sum, signal) => sum + signal.score, 0);
  const hasStrongExclusion = STRONG_EXCLUSIONS.some((term) => normalized.includes(term));
  const hasTopicFalsePositive = TOPIC_FALSE_POSITIVES.some((pattern) => pattern.test(normalized));
  const hasVeryStrongLanguageEvidence = found.some((signal) => signal.score >= 6);
  return {
    title,
    normalized,
    found,
    score: hasTopicFalsePositive || (hasStrongExclusion && !hasVeryStrongLanguageEvidence) ? -10 : score,
  };
}

function chooseTitle(message) {
  const options = [cleanTitle(message.file_name), cleanTitle(message.text)]
    .filter((title, index, array) => title && array.indexOf(title) === index)
    .map(scoreTitle)
    .sort((a, b) => b.score - a.score || b.title.length - a.title.length);
  return options[0] ?? null;
}

function isIncompleteTitle(title) {
  const trimmed = title.replace(/\s+/g, " ").trim();
  return trimmed.length < 12 || /(?:^|\s)(?:في|عن|من|على|إلى|الى|لدى|عند|دراسة|رسالة|الباب|الفصل|الجزء|القرن|كتاب)\s*$/u.test(trimmed);
}

function thesisLevel(title, text) {
  const value = normalize(`${title} ${text}`);
  if (value.includes("دكتوراه")) return "دكتوراه";
  if (value.includes("ماجستير")) return "ماجستير";
  return "رسالة علمية";
}

function buildRecord(message) {
  const hasPdf = message.mime_type === "application/pdf" || /\.pdf$/i.test(message.file_name ?? "");
  if (message.type !== "message" || !hasPdf || !message.file_name) return null;

  const selected = chooseTitle(message);
  if (!selected || selected.score < 4 || !/[\u0621-\u063A\u0641-\u064A]/.test(selected.title) || isIncompleteTitle(selected.title)) return null;
  const strongSignals = selected.found.map((signal) => signal.name);
  const tags = [...new Set(selected.found.map((signal) => signal.tag))];
  const level = thesisLevel(selected.title, message.text);
  const titleKey = selected.normalized;

  return {
    id: `telegram-arsail-${createHash("sha256").update(titleKey).digest("hex").slice(0, 16)}`,
    messageId: message.id,
    title: selected.title,
    titleKey,
    author: null,
    source: "جامعة الرسائل العلمية (تيليجرام)",
    relativePath: `الرسائل العلمية/${level}/${message.id}/${message.file_name}`,
    sourceUrl: `${CHANNEL_URL}/${message.id}`,
    primaryCategory: "references",
    tags,
    thesisLevel: level,
    confidence: selected.score >= 6 ? "مرتفع" : "متوسط",
    matchEvidence: {
      strongSignals,
      supportingSignals: ["رسالة علمية من قناة جامعة الرسائل العلمية"],
      explicitLanguageSource: false,
    },
  };
}

const payload = JSON.parse(await readFile(INPUT_PATH, "utf8"));
const messages = Array.isArray(payload.messages) ? payload.messages : [];
const byTitle = new Map();
const rejected = { notMessage: 0, noPdfFile: 0, notArabicOrRelevant: 0, duplicates: 0 };

for (const message of messages) {
  if (message.type !== "message") {
    rejected.notMessage += 1;
    continue;
  }
  if (!(message.mime_type === "application/pdf" || /\.pdf$/i.test(message.file_name ?? ""))) {
    rejected.noPdfFile += 1;
    continue;
  }
  const record = buildRecord(message);
  if (!record) {
    rejected.notArabicOrRelevant += 1;
    continue;
  }
  const prior = byTitle.get(record.titleKey);
  if (prior) {
    rejected.duplicates += 1;
    if (record.matchEvidence.strongSignals.length > prior.matchEvidence.strongSignals.length) byTitle.set(record.titleKey, record);
  } else {
    byTitle.set(record.titleKey, record);
  }
}

const materials = [...byTitle.values()]
  .map(({ titleKey, confidence, thesisLevel: _thesisLevel, ...material }) => material)
  .sort((a, b) => a.title.localeCompare(b.title, "ar"));

function countBy(values) {
  return Object.fromEntries(
    [...new Set(values)].sort((a, b) => a.localeCompare(b, "ar")).map((value) => [value, values.filter((item) => item === value).length]),
  );
}

const allRecords = [...byTitle.values()];
const audit = {
  generatedAt: new Date().toISOString(),
  source: {
    channelName: payload.name ?? "جامعة الرسائل العلمية",
    channelUrl: CHANNEL_URL,
    messageCount: messages.length,
  },
  selection: {
    acceptedUniqueCandidates: materials.length,
    byTag: countBy(materials.flatMap((record) => record.tags)),
    byLevel: countBy(allRecords.map((record) => record.thesisLevel)),
    byConfidence: countBy(allRecords.map((record) => record.confidence)),
    rejected,
    method: "انتقاء محافظ يعتمد مصطلحات لغوية وأدبية صريحة في عنوان الملف أو النص المرافق، مع استبعاد المطابقات الشكلية والعناوين المبتورة وتوحيد العناوين وربط كل سجل بمنشور القناة نفسه.",
  },
  sampleByTag: Object.fromEntries(
    [...new Set(materials.flatMap((record) => record.tags))].map((tag) => [tag, materials.filter((record) => record.tags.includes(tag)).slice(0, 25)]),
  ),
};

await writeFile(CANDIDATES_PATH, `${JSON.stringify({ metadata: audit.source, materials }, null, 2)}\n`);
await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ candidates: materials.length, ...audit.selection }, null, 2));

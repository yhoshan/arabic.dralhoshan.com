import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const INPUT_PATH = "/home/ubuntu/upload/result.json";
const CANDIDATES_PATH = "/home/ubuntu/telegram_theses_candidates.json";
const AUDIT_PATH = "/home/ubuntu/telegram_theses_selection_audit.json";
const CHANNEL_URL = "https://t.me/Arsail2020";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

function textValue(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(" ");
  if (value && typeof value === "object") return textValue(value.text ?? value.href ?? "");
  return "";
}

function normalize(value) {
  return textValue(value)
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
  return textValue(value)
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/(?:^|\s)(?:noor[ _-]?book[ _-]?com|www\.[^\s]+|تحميل|download)(?:\s|$)/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[-–—\s]+|[-–—\s]+$/g, "")
    .trim();
}

const LINGUISTIC_PATTERNS = [
  ["اللغة العربية", /اللغة\s+العربية|اللغ[ةوي]+\s+العربية/],
  ["علم اللغة", /علم\s+اللغ[ةوي]+|اللسانيات|لساني/],
  ["نحو", /\bالنحو\b|نحوي/],
  ["صرف", /\bالصرف\b|صرفي/],
  ["بلاغة", /\bالبلاغة\b|بلاغي/],
  ["معجم لغوي", /\bالمعجم\b|معجمي/],
  ["الدلالة", /\bالدلالة\b|دلالي/],
  ["الصوتيات", /صوتي|الأصوات/],
  ["إملاء", /إملاء|املاء/],
  ["الترجمة", /ترجمة|ترجمي/],
  ["الخطاب", /الخطاب|تداولي/],
  ["النص", /نصي|النصوص/],
  ["الأسلوب", /أسلوبي/],
  ["القراءة", /القراءات|القراءة/],
  ["الكتابة", /الكتابة|الخط العربي/],
  ["التعريب", /التعريب|المعرّب|المعرب/],
  ["القواعد", /قواعد\s+(?:اللغة|العربية|النحو|الإملاء|الاملاء)/],
];

const LITERARY_PATTERNS = [
  ["شعر وأدب", /\bالشعر\b|شعرية|قصيدة|القصائد|ديوان|الشاعر|أدب عربي|الأدب العربي|سردي|السرد|الرواية|روائي|مسرحية|مسرحيات|نقد أدبي/],
];

const NON_LINGUISTIC_CONTEXT = /\b(?:الهندسة|الطب|التمريض|الصيدلة|الكيمياء|الفيزياء|الزراعة|المحاسبة|الإدارة|القانون|الفقه|العقيدة|الاقتصاد|الرياضيات|الحاسوب|الحاسب|التربية الرياضية|التصميم الداخلي|العمارة|البيئة|البيولوجيا|الطاقة|التمويل|المصارف|الطب الشرعي)\b/;

function signalsFor(title) {
  const normalized = normalize(title);
  const linguistic = LINGUISTIC_PATTERNS
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([signal]) => signal);
  const literary = LITERARY_PATTERNS
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([signal]) => signal);

  return { normalized, linguistic, literary };
}

function categoryFor(signals) {
  if (signals.linguistic.length) {
    const tags = [];
    if (signals.linguistic.some((item) => item === "نحو")) tags.push("نحو");
    if (signals.linguistic.some((item) => item === "صرف")) tags.push("صرف");
    if (signals.linguistic.some((item) => item === "بلاغة")) tags.push("بلاغة");
    if (signals.linguistic.some((item) => item === "معجم لغوي")) tags.push("معجم لغوي");
    if (!tags.length) tags.push("دراسات لغوية");
    return { primaryCategory: "references", tags };
  }

  return { primaryCategory: "references", tags: ["شعر وأدب"] };
}

function candidateFromMessage(message) {
  const hasFile = typeof message.file_name === "string" && message.file_name.trim();
  const isPdf = message.mime_type === "application/pdf" || /\.pdf$/i.test(message.file_name ?? "");
  if (!hasFile || !isPdf || message.type !== "message") return null;

  const titleFromFile = cleanTitle(message.file_name);
  const titleFromText = cleanTitle(message.text);
  const title = titleFromFile.length >= 10 ? titleFromFile : titleFromText;
  if (title.length < 8 || !/[\u0621-\u063A\u0641-\u064A]/.test(title)) return null;

  const signals = signalsFor(`${title} ${titleFromText}`);
  const hasRelevantSignal = signals.linguistic.length > 0 || signals.literary.length > 0;
  if (!hasRelevantSignal) return null;

  const clearlyUnrelated = NON_LINGUISTIC_CONTEXT.test(signals.normalized) && signals.linguistic.length === 0 && signals.literary.length === 0;
  if (clearlyUnrelated) return null;

  const category = categoryFor(signals);
  const titleKey = normalize(title);
  const level = /دكتوراه|دكتوراه/.test(normalize(`${title} ${titleFromText}`))
    ? "دكتوراه"
    : /ماجستير/.test(normalize(`${title} ${titleFromText}`))
      ? "ماجستير"
      : "رسالة علمية";

  return {
    id: `telegram-arsail-${message.id}`,
    messageId: message.id,
    title,
    titleKey,
    author: null,
    source: "جامعة الرسائل العلمية (تيليجرام)",
    relativePath: `الرسائل العلمية/${level}/${message.id}/${message.file_name}`,
    sourceUrl: `${CHANNEL_URL}/${message.id}`,
    primaryCategory: category.primaryCategory,
    tags: category.tags,
    thesisLevel: level,
    matchEvidence: {
      strongSignals: [...signals.linguistic, ...signals.literary],
      supportingSignals: ["رسالة علمية من قناة جامعة الرسائل العلمية"],
      explicitLanguageSource: false,
    },
  };
}

function canonicalId(record) {
  return createHash("sha256").update(record.titleKey).digest("hex").slice(0, 16);
}

const payload = JSON.parse(await readFile(INPUT_PATH, "utf8"));
const messages = Array.isArray(payload.messages) ? payload.messages : [];
const candidates = [];
const byTitle = new Map();
const rejected = { notMessage: 0, noPdfFile: 0, noArabicTitle: 0, noRelevantSignal: 0 };

for (const message of messages) {
  if (message.type !== "message") {
    rejected.notMessage += 1;
    continue;
  }
  if (!(typeof message.file_name === "string" && message.file_name.trim()) || !(message.mime_type === "application/pdf" || /\.pdf$/i.test(message.file_name ?? ""))) {
    rejected.noPdfFile += 1;
    continue;
  }
  const rawTitle = cleanTitle(message.file_name);
  if (!/[\u0621-\u063A\u0641-\u064A]/.test(rawTitle)) {
    rejected.noArabicTitle += 1;
    continue;
  }
  const record = candidateFromMessage(message);
  if (!record) {
    rejected.noRelevantSignal += 1;
    continue;
  }

  const previous = byTitle.get(record.titleKey);
  if (!previous || record.matchEvidence.strongSignals.length > previous.matchEvidence.strongSignals.length) {
    byTitle.set(record.titleKey, record);
  }
}

for (const record of byTitle.values()) {
  record.id = `telegram-arsail-${canonicalId(record)}`;
  delete record.titleKey;
  candidates.push(record);
}

candidates.sort((a, b) => a.title.localeCompare(b.title, "ar"));
const byTag = Object.fromEntries(
  [...new Set(candidates.flatMap((record) => record.tags))]
    .sort((a, b) => a.localeCompare(b, "ar"))
    .map((tag) => [tag, candidates.filter((record) => record.tags.includes(tag)).length]),
);
const byLevel = Object.fromEntries(
  ["دكتوراه", "ماجستير", "رسالة علمية"].map((level) => [
    level,
    candidates.filter((record) => record.thesisLevel === level).length,
  ]),
);

const audit = {
  generatedAt: new Date().toISOString(),
  source: {
    channelName: payload.name ?? "جامعة الرسائل العلمية",
    channelUrl: CHANNEL_URL,
    messageCount: messages.length,
  },
  selection: {
    acceptedUniqueCandidates: candidates.length,
    byTag,
    byLevel,
    rejected,
    method: "استبعاد غير ملفات PDF، ثم انتقاء العناوين العربية ذات الإشارات اللغوية أو الأدبية الواضحة، مع توحيد العنوان المتكرر وربط كل سجل بمنشور القناة نفسه.",
  },
  sample: candidates.slice(0, 80),
};

await writeFile(CANDIDATES_PATH, `${JSON.stringify({ metadata: audit.source, materials: candidates }, null, 2)}\n`);
await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ candidates: candidates.length, byTag, byLevel, rejected }, null, 2));

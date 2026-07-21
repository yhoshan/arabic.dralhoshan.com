/*
 * استيراد محافظ لدفعات المواد العربية متعددة الأقسام من Internet Archive.
 * لا يضيف مادة إلا إذا ثبتت عربيتها من حقل اللغة أو بيانات وصفية عربية واضحة،
 * وتحققت صلتها بأحد أقسام علوم العربية، ثم يضعها في القسم الأدق مع منع التكرار بالمعرّف والرابط والعنوان المطبّع.
 * التشغيل الافتراضي تجريبي؛ يلزم APPLY=1 لكتابة كتالوج المكنز.
 */
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = "/home/ubuntu/arabic-language-thesaurus";
const INPUT_PATH = process.env.INPUT_PATH || "/home/ubuntu/upload/pasted_file_F0bOzj_archive_arabic_literature_book_titles.json";
const CORPUS_PATH = process.env.CORPUS_PATH || path.join(PROJECT_ROOT, "client/src/data/arabic-materials.json");
const DIWAN_CATALOG_PATH = process.env.DIWAN_CATALOG_PATH || path.join(PROJECT_ROOT, "client/src/data/diwans.json");
const AUDIT_PATH = process.env.AUDIT_PATH || "/home/ubuntu/archive_literature_import_audit.json";
const CACHE_PATH = process.env.CACHE_PATH || "/home/ubuntu/archive_literature_metadata_cache.json";
const APPLY = process.env.APPLY === "1";
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 6));

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const WHITESPACE = /\s+/g;
const ARABIC_LETTERS = /[\u0621-\u063A\u0641-\u064A]/g;
const LATIN_LETTERS = /[A-Za-z]/g;
const HTML_TAGS = /<[^>]*>/g;

const RHETORIC_PATTERN = /بلاغ(?:ة|ي|يه)|بيان|بديع|معان[يى]|فصاح(?:ة|ه)|مجاز|تشبيه|استعار(?:ة|ه)|كناي(?:ة|ه)|إعجاز|ايجاز|إطناب|اطناب|اسلوب(?:ية|ي)?|خطاب|تلخيص المفتاح|مختصر السعد|المطول|ايضاح|إيضاح|أسرار البلاغة|دلائل الإعجاز|جواهر البلاغة|البلاغة الواضحة|عروس الأفراح|عقود الجمان|مفتاح العلوم|المثل السائر|الطراز/i;
const GRAMMAR_PATTERN = /نحو|إعراب|اعراب|نحوي|النحو العربي/i;
const NAHW_IRAB_PATTERN = /نحو|إعراب|اعراب|نحوي|النحو العربي|الآجرومية|الاجرومية|ألفية ابن مالك|الألفية|ابن هشام|المفصل|الجمل في النحو|الكافية في النحو|عوامل النحو|قواعد النحو|منصوبات|مرفوعات|مجرورات|تيسير النحو|النحو التطبيقي|معاني النحو|شرح قطر الندى|شذور الذهب/i;
const MORPHOLOGY_PATTERN = /(?:ال)?صرف|صرف(?:ي|ية)?|تصريف|تصاريف|بنية الكلمة|اشتقاق/i;
// فلسفة الانتقاء: لا يكفي وجود كلمة «معجم»؛ يجب أن يثبت أنه معجم لغة أو مصطلحات من علوم العربية.
const DICTIONARY_CUE_PATTERN = /(?:معجم|قاموس|معاجم|قواميس|مصطلحات)/i;
const LEXICAL_DICTIONARY_CONTEXT_PATTERN = /لغة|لغوي|العربية|عربي|ألفاظ|الالفاظ|كلمات|مفردات|معاني|دلالة|جذور|تراكيب|تعبيرات|أمثال|امثال|أضداد|اضداد|مترادفات|لهجات|عامية|فصحى|غريب|نحو|صرف|تصريف|بلاغة|عروض|قافية|شعر|أدب|ادب|نقد|لسانيات|أصوات|اصوات|صوتيات|أوزان|اوزان|استشهادات|مسائل/i;
const LEXICAL_DICTIONARY_PATTERN = /(?:لسان العرب|تاج العروس|القاموس المحيط|الصحاح|العين|مقاييس اللغة|أساس البلاغة|تهذيب اللغة|جمهرة اللغة|المحكم والمحيط الأعظم|المعجم الوسيط|المعجم الوجيز|المعجم الكبير|المعجم العربي الأساسي)/i;
const NON_LANGUAGE_DICTIONARY_PATTERN = /(?:معجم|قاموس)\s+(?:شيوخ|رجال|الصحابة|الرواة|البلدان|الأنساب|القبائل|الفتاوى|الفقه|الفقهاء|القراءات|المؤلفين|المخطوطات|الطرق الصوفية|تراجم|أعلام|اعلام|مدن|قرى|جغرافية|مترولوجيا|مصطلحات تاريخية|سياسية|قانونية|طبية|طب|هندسة|اقتصاد)/i;
const LITERARY_BIOGRAPHY_PATTERN = /(?:شعراء|أدباء|ادباء|شعر|أدب|ادب|نقد|ديوان|قصائد|قافية|عروض)/i;
const NON_CORE_REFERENCE_PATTERN = /(?:المترولوجيا|معالم جغرافية|المعالم الجغرافية|مصطلحات تاريخية|التعريفات الفقهية|لغة الفقهاء|تاريخ مصر الحديث)/i;
const LINGUISTICS_PATTERN = /لسان(?:ي|يات)|لغوي|لغة عربية|اللغة العربية|دلالة|صوتيات|أصوات|صوتي|تداولي|نص(?:ي|ية)|لسانيات/i;
const LITERATURE_PATTERN = /أدب|ادب|شعر|عروض|قافية|نقد أدبي|النقد الأدبي|ديوان|رواية|قصة|مسرح|مسرحية|مقامة|مقامات|سيرة|ترجمة أدبية|تاريخ الأدب|مختارات/i;
const THESIS_PATTERN = /رسالة (?:ماجستير|دكتوراه)|أطروحة|اطروحة|دراسة ماجستير|دراسة دكتوراه|master thesis|doctoral dissertation/i;
const ARABIC_TOPIC_PATTERN = new RegExp(
  [
    RHETORIC_PATTERN.source,
    GRAMMAR_PATTERN.source,
    MORPHOLOGY_PATTERN.source,
    DICTIONARY_CUE_PATTERN.source,
    LINGUISTICS_PATTERN.source,
    LITERATURE_PATTERN.source,
  ].join("|"),
  "i",
);
const EXCLUDED_TOPIC_PATTERN = /طب|هندسة|اقتصاد|محاسبة|إدارة أعمال|قانون|سياسة|كيمياء|فيزياء|رياضيات|تمريض|زراعة|جغرافيا/i;
const NON_ARABIC_SUBJECT_PATTERN = /اللغة (?:الفارسية|الإنجليزية|الانجليزية|الفرنسية|التركية|الأردية|الاردية)|(?:الفارسية|الإنجليزية|الانجليزية|الفرنسية|التركية|الأردية|الاردية)\s+(?:للمبتدئين|لغير الناطقين|قواعد|نحو|صرف)/i;
const NON_PROSODY_AROOD_PATTERN = /(?:العروض|عروض)\s+(?:المسرح(?:ية)?|التجاري(?:ة)?|الضوئي(?:ة)?|السينمائي(?:ة)?|الفني(?:ة)?|الموسيقي(?:ة)?|العسكري(?:ة)?|الطبي(?:ة)?|السعري(?:ة)?|على\s+الأرض|على\s+خشبات|في\s+المسرح)|عروض\s+مسرح|زكاة\s+العروض|المضاربة\s+على\s+العروض|عروض\s+التجارة/i;
const EDUCATIONAL_WORKSHEET_PATTERN = /مراجعة(?:\s+نهائية)?|اختبار(?:ات)?|امتحان(?:ات)?|(?:إ|ا)جاب(?:ة|ات)(?:ها)?(?:\s+(?:نموذجية|الامتحان|الاسترشادية))?|الأسئلة\s+المتكررة|تصحيح\s+موضوع|شهادة\s+التعليم|الثانوية\s+العامة|الصف\s+(?:الأول|الاول|أول|اول|الثاني|الثانى|ثاني|ثانى|الثالث|ثالث|الرابع|رابع|الخامس|خامس|السادس|سادس|السابع|الثامن|التاسع|العاشر|الحادي|الحادى|\d+)|\bصف\s+(?:الأول|الاول|أول|اول|الثاني|الثانى|ثاني|ثانى|الثالث|ثالث|الرابع|رابع|الخامس|خامس|السادس|سادس|\d+)|بكالوريا|(?:^|\s)(?:مذكرة|ال?ملزمة|تحضير|تدريبات|تمارين|نشاط|أنشطة|واجبات)(?:\s|$)|أوراق?\s*عمل|كتاب\s*(?:الطالب|التلميذ)|دليل\s*(?:المعلم|الطالب)|الفصل\s+الدراسي|الترم|وزارة\s+التربية|التقويم\s+التشخيصي|المنهج\s+الجديد|(?:^|\s)(?:السنة\s+)?(?:الأولى|الاولى|الأول|الاول|أول|اول|الثانية|الثاني|الثانى|ثاني|ثانى|الثالثة|الثالث|ثالث|الرابعة|الرابع|رابع|الخامسة|الخامس|خامس|السادسة|السادس|سادس|اولى|ثانية|ثانى|ثالثة|ثالث|رابعة|رابع|خامسة|خامس|سادسة|سادس|\d+)\s+(?:ابتدائي(?:ة)?|إعدادي(?:ة)?|اعدادي(?:ة)?|ثانوي(?:ة)?)|تلاميذ|توزيع\s+مناهج|ملخص\s+رسالة|النموذج\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس)\s+(?:بالإجابات|بالاجابات|الاسترشادي|الرسمي)/i;
const ARABIC_LANGUAGE_PATTERN = /^(?:ar|ara|arabic|arab|العربية|اللغة العربية)$/i;
const ARABIC_LANGUAGE_TEXT_PATTERN = /اللغة العربية|لغة عربية|نص عربي|arabic language|in arabic|arabic text/i;
const NON_ARABIC_LANGUAGE_PATTERN = /^(?:en|eng|english|fr|fra|fre|french|de|ger|german|tr|tur|turkish|fa|fas|per|persian|ur|urd|urdu|es|spa|spanish|it|ita|italian|ru|rus|russian)$/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalized(value) {
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

function canonicalTitle(value) {
  return normalized(
    String(value || "")
      .replace(/[_]+/g, " ")
      .replace(/^\s*(?:\d{3,8}|\d{1,4}\s*(?:كتاب|book|bok|pdf|word|htm))\s*/i, "")
      .replace(/^\s*(?:كتاب|book|bok)\s+/i, "")
      .replace(/\s*\[\d{4,}\]\s*(?:---|–|-).*$/u, "")
      .replace(/(?:^|\s)(?:اقرا اونلاين|اقرأ اونلاين|صيغة|ورد|وورد|word|pdf|htm|html|txt|text|www|بوك|bok|ويب|اتش تي ام|اكـس ام ال|اكس ام ال)(?=$|\s)/giu, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function cleanedDisplayTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[_]+/g, " ")
    .replace(/^\s*(?:[○♣♦•·◆◇★☆▪▫]+|[-–—]+)\s*/u, "")
    .replace(/^\s*\d{3,8}(?:\s*[_\-.:/]|\s+u200f)\s*/iu, "")
    .replace(/^\s*[A-Za-z]{1,12}-\d{3,8}\s*/u, "")
    .replace(/^\s*www\.[^\s]+\s*/iu, "")
    .replace(/^\s*\d{1,6}\s*(?:pdf|htm|html|word|bok|book)\s+(?:كتاب\s+)?/iu, "")
    .replace(/^\s*\d{1,5}\s+كتاب\s+(?:اقرا|اقرأ)\s+اونلاين\s+(?:pdf|htm|html|word)\s*/iu, "")
    .replace(/^\s*كتاب\s+(?:اقرا|اقرأ)\s+اونلاين\s+(?:pdf|htm|html|word)\s*/iu, "")
    .replace(/^\s*كتاب\s+(?:pdf|htm|html|word)\s+(?:اقرا|اقرأ)\s+اونلاين\s*/iu, "")
    .replace(/^\s*كتاب\s+صيغة\s+(?:ويب\s+اتش\s+تي\s+ام\s*)?(?:pdf|htm|html|word|وورد|ورد|بي\s*دي\s*اف)\s*/iu, "")
    .replace(/^\s*\d+\s*(?=[\u0621-\u063A\u0641-\u064A])/u, "")
    .replace(/\s*\(\s*upscaled\s*\)\s*$/iu, "")
    .replace(/^\s*\[\s*(.*?)\s*\]\s*$/u, "$1")
    .replace(WHITESPACE, " ")
    .trim();
}

function titleKey(material) {
  return canonicalTitle(material?.title);
}

function authorKey(material) {
  return normalized(material?.author);
}

function titleAuthorKey(material) {
  const title = titleKey(material);
  const author = authorKey(material);
  return title && author ? `${title}::${author}` : "";
}

function compactTitleKey(value) {
  return String(value || "").replace(/\s+/g, "");
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    for (let index = 0; index < previous.length; index += 1) previous[index] = current[index];
  }
  return previous[right.length];
}

function nearTitleMatch(candidateTitle, comparisonTitles) {
  const compactCandidate = compactTitleKey(candidateTitle);
  if (compactCandidate.length < 18) return null;
  for (const comparisonTitle of comparisonTitles) {
    const compactComparison = compactTitleKey(comparisonTitle);
    if (Math.abs(compactCandidate.length - compactComparison.length) > 2) continue;
    if (editDistance(compactCandidate, compactComparison) <= 2) return comparisonTitle;
  }
  return null;
}

function idKey(material) {
  return String(material?.id || material?.identifier || "").trim();
}

function urlKey(material) {
  return String(material?.sourceUrl || material?.archive_item_url || "").trim().replace(/\/+$/, "");
}

function textify(value) {
  if (Array.isArray(value)) return value.map(textify).filter(Boolean).join(" | ");
  if (value && typeof value === "object") return Object.values(value).map(textify).filter(Boolean).join(" | ");
  return String(value || "").replace(HTML_TAGS, " ").replace(/&nbsp;/gi, " ").replace(WHITESPACE, " ").trim();
}

function values(value) {
  if (Array.isArray(value)) return value.flatMap(values);
  if (value === null || value === undefined) return [];
  return [String(value).trim()].filter(Boolean);
}

function hasArabicTitle(value) {
  const text = String(value || "");
  const arabicCount = (text.match(ARABIC_LETTERS) || []).length;
  const latinCount = (text.match(LATIN_LETTERS) || []).length;
  return arabicCount >= 6 && arabicCount > latinCount;
}

function isArabicOnlyLanguage(languageValues) {
  const compact = languageValues.map((value) => value.trim()).filter(Boolean);
  if (compact.length === 0) return false;
  return compact.every((value) => ARABIC_LANGUAGE_PATTERN.test(value));
}

function hasExplicitNonArabicLanguage(languageValues) {
  return languageValues.some((value) => NON_ARABIC_LANGUAGE_PATTERN.test(value.trim()));
}

function safeTitleForPath(title) {
  return String(title || "مادة عربية")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

function isLexicalDictionary(text) {
  return (
    LEXICAL_DICTIONARY_PATTERN.test(text) ||
    (DICTIONARY_CUE_PATTERN.test(text) && LEXICAL_DICTIONARY_CONTEXT_PATTERN.test(text) && !NON_LANGUAGE_DICTIONARY_PATTERN.test(text))
  );
}

function classifyTags(text) {
  const tags = [];
  if (isLexicalDictionary(text)) tags.push("معجم لغوي");
  if (RHETORIC_PATTERN.test(text)) tags.push("بلاغة");
  if (GRAMMAR_PATTERN.test(text)) tags.push("نحو");
  if (MORPHOLOGY_PATTERN.test(text)) tags.push("صرف");
  if (LINGUISTICS_PATTERN.test(text) && !tags.includes("بلاغة")) tags.push("دراسات لغوية");
  if (LITERATURE_PATTERN.test(text)) tags.push("شعر وأدب");
  if (THESIS_PATTERN.test(text)) tags.push("رسالة علمية");
  return [...new Set(tags)];
}

function primaryCategory(tags) {
  if (tags.includes("رسالة علمية")) return "academic_theses";
  return tags.includes("معجم لغوي") ? "dictionaries" : "references";
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function fetchMetadataBatch(identifiers) {
  const params = new URLSearchParams();
  const quotedIdentifiers = identifiers.map((identifier) => `\"${String(identifier).replace(/[\\\"]/g, "\\$&")}\"`);
  params.set("q", `identifier:(${quotedIdentifiers.join(" OR ")})`);
  for (const field of ["identifier", "language", "subject", "description", "creator", "title", "mediatype"]) {
    params.append("fl[]", field);
  }
  params.set("rows", String(identifiers.length));
  params.set("output", "json");

  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const records = {};
      for (const document of payload?.response?.docs || []) {
        if (!document?.identifier) continue;
        records[document.identifier] = {
          language: document.language ?? null,
          subject: document.subject ?? null,
          description: document.description ?? null,
          creator: document.creator ?? null,
          title: document.title ?? null,
          mediatype: document.mediatype ?? null,
        };
      }
      return records;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  return Object.fromEntries(identifiers.map((identifier) => [identifier, { _fetchError: lastError }]));
}

async function hydrateMetadata(books, cache) {
  const missing = [...new Set(books.map((book) => String(book?.identifier || "").trim()).filter((identifier) => identifier && !cache[identifier]))];
  const batches = chunks(missing, 25);
  for (const batchGroup of chunks(batches, CONCURRENCY)) {
    const fetchedGroups = await Promise.all(batchGroup.map(fetchMetadataBatch));
    for (let index = 0; index < batchGroup.length; index += 1) {
      for (const identifier of batchGroup[index]) {
        cache[identifier] = fetchedGroups[index][identifier] || { _fetchError: "لم يعثر بحث أرشيف على بيانات وصفية للسجل" };
      }
    }
    writeJson(CACHE_PATH, cache);
  }
}

function details(record, reason, metadata = null) {
  return {
    id: record?.identifier || record?.id || null,
    title: record?.title || null,
    sourceUrl: record?.archive_item_url || record?.sourceUrl || null,
    reason,
    language: metadata ? values(metadata.language) : [],
    subject: metadata ? textify(metadata.subject).slice(0, 300) : "",
  };
}

const input = readJson(INPUT_PATH);
const corpus = readJson(CORPUS_PATH);
const diwanCatalog = readJson(DIWAN_CATALOG_PATH);
const inputBooks = Array.isArray(input) ? input : input.books;
if (!Array.isArray(inputBooks)) throw new Error("ملف دفعة الأدب العربي لا يحتوي مصفوفة books صالحة.");

const cache = fs.existsSync(CACHE_PATH) ? readJson(CACHE_PATH) : {};
await hydrateMetadata(inputBooks, cache);
const snapshot = inputBooks.map((book) => ({
  book,
  metadata: cache[String(book?.identifier || "").trim()] || { _fetchError: "بيانات أرشيف غير متاحة" },
}));
writeJson(CACHE_PATH, cache);

const catalogMaterials = [
  ...(Array.isArray(corpus.materials) ? corpus.materials : []),
  ...(Array.isArray(diwanCatalog.materials) ? diwanCatalog.materials : []),
];
const existingById = new Set(catalogMaterials.map(idKey).filter(Boolean));
const existingByUrl = new Set(catalogMaterials.map(urlKey).filter(Boolean));
const existingByTitle = new Set(catalogMaterials.map(titleKey).filter(Boolean));
const existingByTitleAuthor = new Set(catalogMaterials.map(titleAuthorKey).filter(Boolean));
const existingTitleKeys = [...existingByTitle];

const batchById = new Set();
const batchByUrl = new Set();
const batchByTitle = new Set();
const batchByTitleAuthor = new Set();
const batchTitleKeys = [];
const accepted = [];
const rejected = [];
const duplicates = [];
const metadataFailures = [];

for (const { book, metadata } of snapshot) {
  const rawTitle = String(book?.title || "").trim();
  const archiveTitle = String(metadata?.title || "").trim();
  const title = archiveTitle && hasArabicTitle(archiveTitle) ? archiveTitle : rawTitle;
  const displayTitle = cleanedDisplayTitle(title) || title;
  const identifier = String(book?.identifier || "").trim();
  const sourceUrl = String(book?.archive_item_url || "").trim();
  if (!rawTitle || !identifier || !/^https:\/\/archive\.org\/details\//i.test(sourceUrl)) {
    rejected.push(details(book, "بيانات العنوان أو معرّف أرشيف أو الرابط غير مكتملة"));
    continue;
  }
  if (metadata?._fetchError) {
    metadataFailures.push(details(book, `تعذر جلب بيانات أرشيف: ${metadata._fetchError}`));
    continue;
  }

  const languageValues = values(metadata.language);
  const subjectText = textify(metadata.subject);
  const descriptionText = textify(metadata.description);
  const creatorText = textify(metadata.creator);
  // نبني التصنيف من العنوان والموضوع المفهرس فقط؛ وصف أرشيف الحر قد يحوي كلمات بحث عامة لا تصف المادة نفسها.
  const titleSubjectText = [title, rawTitle, archiveTitle, subjectText].join(" ");
  const classificationText = titleSubjectText;
  const subjectClassification = classifyTags(subjectText);
  const tags = classifyTags(classificationText);
  if (tags.length === 0) tags.push(...subjectClassification);
  const catalogText = [titleSubjectText, descriptionText, creatorText].join(" ");
  const titleNormalized = normalized(title);
  const author = creatorText || null;
  const titleAuthor = author ? `${titleNormalized}::${normalized(author)}` : "";

  if (!hasArabicTitle(title)) {
    rejected.push(details(book, "عنوان غير عربي أو لا يكفي لإثبات عربية المادة", metadata));
    continue;
  }
  if (EDUCATIONAL_WORKSHEET_PATTERN.test([title, rawTitle, subjectText].join(" "))) {
    rejected.push(details(book, "مادة مراجعة أو اختبار مدرسي وليست مرجعاً مناسباً للمكنز", metadata));
    continue;
  }
  if (hasExplicitNonArabicLanguage(languageValues)) {
    rejected.push(details(book, "حقل اللغة في أرشيف يثبت لغة غير عربية", metadata));
    continue;
  }
  if (NON_ARABIC_SUBJECT_PATTERN.test(catalogText)) {
    rejected.push(details(book, "المادة تتصل بلغة غير عربية ولا تدخل ضمن نطاق المكنز", metadata));
    continue;
  }
  if (
    (NON_LANGUAGE_DICTIONARY_PATTERN.test(titleSubjectText) || NON_CORE_REFERENCE_PATTERN.test(titleSubjectText)) &&
    !LITERARY_BIOGRAPHY_PATTERN.test(titleSubjectText)
  ) {
    rejected.push(details(book, "معجم أو مرجع متخصص خارج علوم العربية ولا يمثل قسماً من أقسام المكنز", metadata));
    continue;
  }
  if (NON_PROSODY_AROOD_PATTERN.test(catalogText.replace(/_/g, " "))) {
    rejected.push(details(book, "تستعمل كلمة العروض في سياق مسرحي أو تجاري أو فقهي لا يتصل بعروض الشعر", metadata));
    continue;
  }

  const hasArabicLanguageEvidence =
    isArabicOnlyLanguage(languageValues) ||
    ARABIC_LANGUAGE_TEXT_PATTERN.test(subjectText) ||
    ARABIC_LANGUAGE_TEXT_PATTERN.test(descriptionText);
  if (!hasArabicLanguageEvidence) {
    rejected.push(details(book, "لا تثبت بيانات أرشيف أن المادة عربية", metadata));
    continue;
  }
  if (tags.length === 0 || !ARABIC_TOPIC_PATTERN.test(titleSubjectText) || EXCLUDED_TOPIC_PATTERN.test(catalogText)) {
    rejected.push(details(book, "لا يثبت العنوان والبيانات صلة المادة بأحد أقسام علوم العربية في المكنز", metadata));
    continue;
  }

  const candidate = {
    id: `archive-${identifier}`,
    title: displayTitle,
    author,
    source: "Internet Archive",
    relativePath: `أرشيف/مواد عربية/${identifier}/${safeTitleForPath(displayTitle)}.pdf`,
    sourceUrl,
    primaryCategory: primaryCategory(tags),
    tags,
    matchEvidence: {
      strongSignals: [
        "مطابقة موضوعية مثبتة لعلوم العربية في بيانات أرشيف",
        isArabicOnlyLanguage(languageValues)
          ? "حقل لغة أرشيف يثبت العربية"
          : "وصف أو موضوع أرشيف يثبت سياق العربية",
      ],
      supportingSignals: [
        "رابط مباشر إلى Internet Archive",
        ...languageValues.map((value) => `لغة أرشيف: ${value}`),
      ],
      explicitLanguageSource: isArabicOnlyLanguage(languageValues),
    },
  };
  const candidateId = idKey(candidate);
  const candidateUrl = urlKey(candidate);
  const candidateTitle = canonicalTitle(title);
  const candidateTitleAuthor = author && candidateTitle ? `${candidateTitle}::${normalized(author)}` : "";

  const nearExistingTitle = nearTitleMatch(candidateTitle, existingTitleKeys);
  if (
    existingById.has(candidateId) ||
    existingByUrl.has(candidateUrl) ||
    existingByTitle.has(candidateTitle) ||
    (candidateTitleAuthor && existingByTitleAuthor.has(candidateTitleAuthor)) ||
    nearExistingTitle
  ) {
    duplicates.push(details(book, nearExistingTitle ? "عنوان قريب جداً من سجل قائم؛ حُجب احتياطياً" : "مطابق لسجل قائم بالمعرّف أو الرابط أو العنوان المطبّع", metadata));
    continue;
  }
  const nearBatchTitle = nearTitleMatch(candidateTitle, batchTitleKeys);
  if (
    batchById.has(candidateId) ||
    batchByUrl.has(candidateUrl) ||
    batchByTitle.has(candidateTitle) ||
    (candidateTitleAuthor && batchByTitleAuthor.has(candidateTitleAuthor)) ||
    nearBatchTitle
  ) {
    duplicates.push(details(book, nearBatchTitle ? "عنوان قريب جداً من سجل سابق داخل الدفعة؛ حُجب احتياطياً" : "مطابق لسجل سابق داخل الدفعة", metadata));
    continue;
  }

  batchById.add(candidateId);
  batchByUrl.add(candidateUrl);
  batchByTitle.add(candidateTitle);
  batchTitleKeys.push(candidateTitle);
  if (candidateTitleAuthor) batchByTitleAuthor.add(candidateTitleAuthor);
  accepted.push(candidate);
}

accepted.sort((a, b) => a.title.localeCompare(b.title, "ar"));
const finalMaterials = [...corpus.materials, ...accepted];
const acceptedByTag = Object.fromEntries(
  ["بلاغة", "نحو", "صرف", "معجم لغوي", "دراسات لغوية", "شعر وأدب", "رسالة علمية"].map((tag) => [
    tag,
    accepted.filter((material) => material.tags.includes(tag)).length,
  ]),
);
const output = {
  ...corpus,
  metadata: {
    ...corpus.metadata,
    selectionMethod: `${corpus.metadata.selectionMethod} أضيفت مواد عربية منتقاة من Internet Archive، ووُزعت على أقسام علوم العربية بحسب صلة العنوان والبيانات الوصفية، بعد التحقق من اللغة والموضوع ومنع التكرار متعدد المفاتيح.`.trim(),
    statistics: {
      ...(corpus.metadata.statistics || {}),
      totalMaterials: finalMaterials.length,
    },
  },
  materials: finalMaterials,
};

if (APPLY) writeJson(CORPUS_PATH, output);

const audit = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? "applied" : "dry-run",
  input: {
    catalogTitle: input.catalog_title || null,
    records: inputBooks.length,
    sourceSearchMatches: input.summary?.source_search_matches_count ?? null,
  },
  metadata: {
    fetchedOrCached: snapshot.length,
    failures: metadataFailures.length,
  },
  policy: {
    arabicOnly: "يُقبل السجل إذا كان عنوانه عربياً وتثبت العربية من حقل اللغة أو من وصف/موضوع أرشيف صريح، ويُرفض أي حقل لغة غير عربي.",
    topical: "تُقبل المواد المتصلة مباشرة بأحد أقسام علوم العربية، وتُسند إلى القسم الأدق بحسب العنوان والبيانات الوصفية.",
    educationalExclusions: "تُستبعد أوراق العمل والاختبارات والمذكرات والمواد الصفية الآنية؛ ولا تُستبعد المؤلفات التعليمية العامة أو التراثية لمجرد صلتها بالتدريس.",
    displayTitle: "يُنقّى عنوان العرض من تلوث أسماء الملفات، بينما يبقى كشف التكرار معتمداً على العنوان الأصلي المطبع.",
    deduplication: ["معرّف أرشيف", "الرابط المباشر", "العنوان المطبّع", "العنوان والمؤلف عند توافرهما"],
  },
  accepted: accepted.length,
  acceptedByTag,
  rejected: rejected.length,
  duplicates: duplicates.length,
  metadataFailures: metadataFailures.length,
  catalogMaterialsAfterImport: finalMaterials.length,
  acceptedRecords: accepted,
  acceptedSample: accepted.slice(0, 40),
  rejectedSample: rejected.slice(0, 40),
  duplicateSample: duplicates.slice(0, 40),
  metadataFailureSample: metadataFailures.slice(0, 20),
};
writeJson(AUDIT_PATH, audit);
console.log(JSON.stringify(audit, null, 2));

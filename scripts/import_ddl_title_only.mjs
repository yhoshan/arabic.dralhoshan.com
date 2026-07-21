/*
 * استيراد محافظ لدفعات العناوين العربية الصادرة من مركز المعرفة الرقمي (ddl.ae).
 *
 * سياسة المصدر:
 * - الملف الوارد لا يحوي معرّفات مواد أو روابط مفردة أو مؤلفين؛ لذلك لا يُنشئ
 *   المستورد روابط كتب مفترضة. كل سجل مقبول يحمل إحالة بحث صريحة بالعنوان في DDL.
 * - لا تُقبل العناوين المبهمة أو غير العربية أو الخارجة بوضوح عن علوم العربية وآدابها.
 * - لا يُعامل تصنيف الملف الأولي دليلاً كافياً وحده، بل يُستأنس به في توزيع الوسم
 *   بعد إثبات الصلة من العنوان نفسه.
 * - يكشف التكرار داخل الدفعة ومع كتالوج المكنز بالعناوين المطبعة والعناوين القريبة.
 *
 * التشغيل تجريبي افتراضاً؛ يلزم APPLY=1 لكتابة بيانات الكتالوج.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = "/home/ubuntu/arabic-language-thesaurus";
const INPUT_PATH =
  process.env.INPUT_PATH ||
  "/home/ubuntu/upload/pasted_file_N85XT5_maknaz_arabic_language_sciences_ddl_new_titles_only.json";
const CORPUS_PATH =
  process.env.CORPUS_PATH || path.join(PROJECT_ROOT, "client/src/data/arabic-materials.json");
const DIWAN_CATALOG_PATH =
  process.env.DIWAN_CATALOG_PATH || path.join(PROJECT_ROOT, "client/src/data/diwans.json");
const AUDIT_PATH = process.env.AUDIT_PATH || "/home/ubuntu/ddl_title_only_import_audit.json";
const APPLY = process.env.APPLY === "1";

const SOURCE_NAME = "مركز المعرفة الرقمي (بحث)";
const SOURCE_HOME = "https://ddl.ae/";
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const ARABIC_LETTERS = /[\u0621-\u063A\u0641-\u064A]/g;
const LATIN_LETTERS = /[A-Za-z]/g;
const WHITESPACE = /\s+/g;

const RHETORIC_PATTERN = /بلاغ(?:ة|ي|يه)|بيان|بديع|معان[يى]|فصاح(?:ة|ه)|مجاز|تشبيه|استعار(?:ة|ه)|كناي(?:ة|ه)|إعجاز|إيجاز|ايجاز|إطناب|اطناب|أسلوب(?:ية|ي)?|اسلوب(?:ية|ي)?|نظم|حجاج/i;
const GRAMMAR_PATTERN = /نحو|إعراب|اعراب|نحوي|النحو العربي|أقسام الكلام|الجمل(?:ة|)|جملة|العوامل|المعمولات|الحال|النعت|المفعول|العطف|اسم الفاعل|الحروف الناسخة|ظن وأخواتها|كاد وأخواتها|كان وأخواتها|التابع|المتبوع|حرف الوصل|التذكير والتأنيث|التعريف والتنكير|النداء|لو الامتناع|القياس الإعرابي|القياس الاعرابي|اللاحقة الإسنادية|اللاحقة الاسنادية|الماضي|الفعل الثلاثي|المشتقات|ضمائر/i;
const MORPHOLOGY_PATTERN = /(?:ال)?صرف|صرف(?:ي|ية)?|تصريف|تصاريف|بنية الكلمة|اشتقاق|الإبدال|الابدال|الإعلال|الاعلال|الإدغام|الادغام|الإمالة|الامالة|التصغير|اسم الآلة|اسم الاله|فعيل|فعال|النسب|المشتقات/i;
const DICTIONARY_PATTERN = /(?:معجم|قاموس|معاجم|قواميس|الصحاح|المفردات|ترجمة المفردات|غريب السيرة|غريب|ألفاظ|الالفاظ|مفردات)/i;
const LINGUISTICS_PATTERN = /لسان(?:ي|يات)|لغوي|لغة عربية|اللغة العربية|لغة العلم|لغة الحوار|لغة أجنبية|اللغة الأجنبية|إزدواجية اللغة|ازدواجية اللغة|أقدم اللغات|التنبيه في اللغة|دلالة|دلالي|صوت(?:ي|يات|يّة)|مخارج الأصوات|مخارج الاصوات|لهج(?:ة|ات)|عامية|فصحى|إملاء|املاء|رسم|الخط العربي|الخطوط|خطوط|تعريب|مصطلح|مصطلحات|التشامي في اللغة|التصحيح|تصويب قول العامة|التصحيف|التقاء الساكنين|الياء|كسر ياء|أبجدية عربية|ابجدية عربيه|القرائية|القرائيه|مقارنة لغوية|مقارنه لغويه|التطور الدلالي|التوزيع|التوزبع|التداولية|التداوليه|النصي|النصيّة/i;
const LITERATURE_PATTERN = /شعر|أشعار|اشعار|شاعر|شعراء|أدب|ادب|قصيدة|قصيده|ديوان|دواوين|نقد أدبي|النقد الأدبي|النقد الادبي|رواية|روايه|قصة|قصه|مقامة|مقامات|التناص|الانزياح|المنامات|مدحة|مدحه|غزلية|غزليه|الحماسة|الحماسه|حازم القرطاجني|الجاحظ|ابن الرومي|المتنبي|المعري|امرئ القيس|امرؤ القيس|أمرؤ القيس|ابو نواس|أبو نواس|شكري فيصل|ابن زيدون|الناشئ|الشعر الجاهلي|شعر الجاهلي|شعراء عباسيون|المقدمة الغزلية|المقدمه الغزليه/i;
const EDUCATION_LANGUAGE_PATTERN = /تعليم العربية|التدريس بالعربية|التدريس بالعربيه|معالجة الضعف الكتابي|المهارات القرائية|المهارات القرائيه|العملية التعليمية|العمليه التعليميه|تدريس علم الأصوات|تدريس علم الاصوات/i;
const EXPLICIT_EXCLUSION_PATTERN = /^(?:أحاديث|أخبار مجمعية|استدراك|استشارة واستناره|إضافة الجهات الأربع|الأجرام السماوية|الاندلس في المغرب|الاوقاف الاسلامية بجوار المسجد الاقصى|البطريرك بعقوب الثالث.*|التأثير الإسلامي في كوميديا دانتي.*|التأويل الإرشادي عند الصوفية.*|التأويل الإشاري عند الصوفية.*|الفتح والأرض في الأندلس|القمر وأسماؤه في أطواره وأحواله|المرجئة بخراسان.*|المستعمرات الألمانية في فلسطين|المؤتمرات والندوات والمحاضرات|بناء الأسطول الأموي.*|تساؤلات|تعليقان|تعليقات ومناقشات|تعليق على تعليقات على كتاب المقنع في الفلاحة|تقريظ للمفتي ابن عمار.*|حول المقربصات.*|حول كتاب حساب التفاصل والتكامل|حول كتاب حساب التفاضل والتكامل|دراسات في النظم والعقائد الاباضية|رأي$|رسالة رئيس مجلس الأعيان|رسائل أبي الحسن العامري.*|سلوة الحزين في موت البنين|شفيق جبري في ذمه الله|عقيدة الخيام|فلا وربك لا يؤمنون$|في أيام غسان.*|قراءة في سورة القمر|قصة حي بن يقظان في تراثنا القديم.*|كتب الانساب وتاريخ الجزيزة|كشف الخفار في البيعه لعلي الرضا|كلمة مندوب جلالة الملك.*|مع الصحف|مخطوطة كتاب المثالب.*|نهايه الثغور الشامية|يوم الأرض|إدارة التغيير التنظيمي|كوميديا دانتي.*|السرد والتكنولوجيا.*|طبائع النساء وما جاء فيها.*|مجتمعات التعلم المهنية.*|زيارة وفد جزائري.*|رد على استيضاح الاخ.*|تأهيل اعضاء هيأه التدريس.*)$/i;
const VAGUE_TITLE_PATTERN = /^(?:تساؤلات|استدراك|استشارة واستناره|تعليقات ومناقشات|تعليقان|رأي|ذيول وملاحظات|مع الصحف|تيسير على قاعدة|بل الواجب أن تكون بالعربية|وقفة مع اللغة|رأى في تحديد عصر الراغب الاصفهاني|كتاب نهاية السؤل والأمنية|الوقف|النسب|الرسائل والأطاريح الجامعية|المصطلح العلمي|المعجم الحديث|القيمة الموسيقية للتكرار في شعر الصاحب بن عباد)$/i;
const NON_LANGUAGE_CONTEXT_PATTERN = /إدارة التغيير|حساب التفاضل|حساب التفاصل|الأجرام السماوية|الأسطول|الأوقاف|المستعمرات|حصار غزة|يوم الأرض|العقائد|البيعة|الأنساب|السياسية|الجغرافية|الفلاحة|الكهربا|التصوف|الحديث(?:ة)?$|سورة|الرسول صلي الله عليه وسلم لأهل المدينة|الملك المعظم|مكتبة.*الفرج بعد الشدة/i;

const CATEGORY_TAG = new Map([
  ["الإملاء والرسم والخط", "دراسات لغوية"],
  ["البلاغة والأسلوبية", "بلاغة"],
  ["التعريب والمصطلح", "دراسات لغوية"],
  ["الصرف والاشتقاق", "صرف"],
  ["اللهجات واللغة الاجتماعية", "دراسات لغوية"],
  ["المعاجم والقواميس", "معجم لغوي"],
  ["النحو والإعراب", "نحو"],
  ["تاريخ اللغة والمقارنة", "دراسات لغوية"],
  ["تعليم العربية واللسانيات التطبيقية", "دراسات لغوية"],
  ["علم الأصوات", "دراسات لغوية"],
  ["علم الدلالة", "دراسات لغوية"],
  ["فقه اللغة واللسانيات", "دراسات لغوية"],
]);

const HARD_TO_DETECT_BUT_RELEVANT = new Set([
  "بين الكوفيين والبصريين",
  "تأملات في كتاب الخاطريات لابن جني",
  "التبيين في فوائد القدماء والعصريين",
  "تذكرة النحاة لأبي حيان بن يوسف الغرناطي الأندلسي ت 745ه نقد واستدراك",
  "مراجعة البحث الموسوم ب تذكرة النحاة لأبي حيان محمد بن يوسف الغرناطي الأندلسي ت 745ه نقد واستدراك",
  "فيعل ام فعيل",
  "مع مؤيدي المجاز ومنكريه",
  "مقابسة في جملة الصلة هل تقع شرطا",
  "مناقشة رأي في علامة التأنيث",
  "موقف من يونس بن حبيب",
  "قراءة في كتاب التبيين عن مذاهب النحويين البصريين والكوفيين",
  "تقعيد قاعدة نحوية إضافة الجهات الأربع",
  "تقعيد قاعدة نحوية تعليق على تعليق",
  "ملاحظات حول عديد بمعنى معدود",
  "ما جاء على فعال من اسم الآلة",
  "مع الياء من اسم العلم العاصي",
  "تحرير اسم الفاعل من مزاعم المجاراه",
  "حتي العاطفة علي غير مذكور",
  "كلمات في الصحاح",
  "من الاحتباك إلى الاعتداد بالمبني العدمي",
  "اللغة الشاعرة",
  "التشامي في اللغة",
]);

const MANUAL_TITLE_TAGS = new Map(
  [
    ["استدراك وتعليق على كتاب حروف الممدود والمقصود لابن السكيت المتوفى 244ه", ["صرف"]],
    ["استدراك وتعليق على كتاب حروف الممدود والمقصور لابن السكيت المتوفي 244 هحريا", ["صرف"]],
    ["إصلاح كتاب الحيوان", ["شعر وأدب"]],
    ["إصلاح أمالي القالي وما ألحق به", ["شعر وأدب"]],
    ["كتاب الآمل والمأمول المنسوب للجاحظ", ["شعر وأدب"]],
    ["بين الكوفيين والبصريين", ["نحو"]],
    ["تأملات في كتاب الخاطريات لابن جني", ["دراسات لغوية"]],
    ["تأملات في كتاب الخاطريات لابن جني القسم الأول", ["دراسات لغوية"]],
    ["حتي العاطفة علي غير مذكور", ["نحو"]],
    ["حول كتاب سيبويه", ["نحو"]],
    ["شرح جمل الزجاجي لأبي الحسن علي بن محمد بن علي بن خروف الإشبيلي ت609 تحقيق ودراسة القسم الأول", ["نحو"]],
    ["شرح جمل الزجاجي لأبي السحن علي بن محمد بن علي بن خروف الاشبيلي تحقيق ودراسة القسم الثاني", ["نحو"]],
    ["ضبط أوزان منظومات وأشعار في كتاب الروض المغطار في خبر الأقطار", ["شعر وأدب"]],
    ["تنبيهات علي كتاب مثلثات قطرب المطبوع بتحقيق الدكتور رضا السويسي / عبد الله بن عمر الحاجة إبراهيم", ["معجم لغوي"]],
  ].map(([title, tags]) => [canonicalTitle(title), tags]),
);

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
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function cleanedDisplayTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeTitleForPath(value) {
  return String(value || "مادة عربية")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

function hasArabicTitle(value) {
  const text = String(value || "");
  const arabicCount = (text.match(ARABIC_LETTERS) || []).length;
  const latinCount = (text.match(LATIN_LETTERS) || []).length;
  return arabicCount >= 6 && arabicCount > latinCount;
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
  const maximumDistance = compactCandidate.length >= 42 ? 3 : compactCandidate.length >= 25 ? 2 : 1;
  for (const comparisonTitle of comparisonTitles) {
    const compactComparison = compactTitleKey(comparisonTitle);
    if (Math.abs(compactCandidate.length - compactComparison.length) > maximumDistance) continue;
    if (editDistance(compactCandidate, compactComparison) <= maximumDistance) return comparisonTitle;
  }
  return null;
}

function titleFromMaterial(material) {
  return canonicalTitle(material?.title);
}

function sourceSearchUrl(title) {
  const query = new URLSearchParams({ queries: `or|all|${title}` });
  return `https://ddl.ae/search/results/1?${query.toString()}`;
}

function makeStableId(titleKey) {
  return `ddl-title-${crypto.createHash("sha256").update(titleKey).digest("hex").slice(0, 18)}`;
}

function titleIsHardToDetectButRelevant(title) {
  const key = canonicalTitle(title);
  return (
    MANUAL_TITLE_TAGS.has(key) ||
    [...HARD_TO_DETECT_BUT_RELEVANT].some((candidate) => canonicalTitle(candidate) === key)
  );
}

function classifyTags(title, sourceCategory) {
  const tags = [...(MANUAL_TITLE_TAGS.get(canonicalTitle(title)) || [])];
  if (DICTIONARY_PATTERN.test(title)) tags.push("معجم لغوي");
  if (RHETORIC_PATTERN.test(title)) tags.push("بلاغة");
  if (GRAMMAR_PATTERN.test(title)) tags.push("نحو");
  if (MORPHOLOGY_PATTERN.test(title)) tags.push("صرف");
  if (LINGUISTICS_PATTERN.test(title) || EDUCATION_LANGUAGE_PATTERN.test(title)) tags.push("دراسات لغوية");
  if (LITERATURE_PATTERN.test(title)) tags.push("شعر وأدب");

  const fallback = CATEGORY_TAG.get(sourceCategory);
  if (fallback && tags.length > 0 && !tags.includes(fallback)) tags.push(fallback);
  if (fallback && titleIsHardToDetectButRelevant(title) && !tags.includes(fallback)) tags.push(fallback);

  return [...new Set(tags)];
}

function primaryCategory(tags) {
  return tags.includes("معجم لغوي") ? "dictionaries" : "references";
}

function candidateIsTopicallyRelevant(title, sourceCategory) {
  const titleKey = canonicalTitle(title);
  if (VAGUE_TITLE_PATTERN.test(title) || VAGUE_TITLE_PATTERN.test(titleKey)) return false;
  if (
    EXPLICIT_EXCLUSION_PATTERN.test(title) ||
    EXPLICIT_EXCLUSION_PATTERN.test(titleKey) ||
    NON_LANGUAGE_CONTEXT_PATTERN.test(title)
  ) {
    return false;
  }
  if (titleIsHardToDetectButRelevant(title)) return true;
  if (
    RHETORIC_PATTERN.test(title) ||
    GRAMMAR_PATTERN.test(title) ||
    MORPHOLOGY_PATTERN.test(title) ||
    DICTIONARY_PATTERN.test(title) ||
    LINGUISTICS_PATTERN.test(title) ||
    LITERATURE_PATTERN.test(title) ||
    EDUCATION_LANGUAGE_PATTERN.test(title)
  ) {
    return true;
  }
  // التصنيف الأولي لا يكفي للقبول، لكنه يعين في قراءة صيغ نحوية موجزة معروفة.
  return sourceCategory === "النحو والإعراب" && /^(?:أقسام الكلام|العوامل وهي قسمان لفظية ومعنوية|المعمولات وهي قسمان أسماء وأفعال مضارعة)$/i.test(title);
}

function detail(entry, reason, relatedTitle = null) {
  return {
    title: entry.title,
    sourceCategory: entry.sourceCategory,
    reason,
    relatedTitle,
  };
}

const input = readJson(INPUT_PATH);
const corpus = readJson(CORPUS_PATH);
const diwanCatalog = readJson(DIWAN_CATALOG_PATH);
const groups = input?.titles_by_category;
if (!groups || typeof groups !== "object" || Array.isArray(groups)) {
  throw new Error("ملف DDL لا يحتوي كائناً صالحاً باسم titles_by_category.");
}

const sourceEntries = Object.entries(groups).flatMap(([sourceCategory, titles]) => {
  if (!Array.isArray(titles)) return [];
  return titles.map((title) => ({ title: String(title || "").trim(), sourceCategory }));
});

const catalogMaterials = [
  ...(Array.isArray(corpus.materials) ? corpus.materials : []),
  ...(Array.isArray(diwanCatalog.materials) ? diwanCatalog.materials : []),
];
const existingById = new Set(catalogMaterials.map((material) => String(material?.id || "").trim()).filter(Boolean));
const existingByUrl = new Set(catalogMaterials.map((material) => String(material?.sourceUrl || "").replace(/\/+$/, "")).filter(Boolean));
const existingByTitle = new Set(catalogMaterials.map(titleFromMaterial).filter(Boolean));
const existingTitleKeys = [...existingByTitle];

const accepted = [];
const rejected = [];
const duplicates = [];
const batchById = new Set();
const batchByUrl = new Set();
const batchByTitle = new Set();
const batchTitleKeys = [];

for (const entry of sourceEntries) {
  const rawTitle = entry.title;
  const displayTitle = cleanedDisplayTitle(rawTitle);
  const titleKey = canonicalTitle(displayTitle);

  if (!displayTitle || !titleKey) {
    rejected.push(detail(entry, "عنوان فارغ أو لا ينتج مفتاح تطبيع صالحاً"));
    continue;
  }
  if (!hasArabicTitle(displayTitle)) {
    rejected.push(detail(entry, "عنوان غير عربي أو لا يكفي لإثبات عربية المادة"));
    continue;
  }
  if (!candidateIsTopicallyRelevant(displayTitle, entry.sourceCategory)) {
    rejected.push(detail(entry, "العنوان مبهم أو لا يثبت صلته بعلوم العربية وآدابها دون افتراضات"));
    continue;
  }

  const tags = classifyTags(displayTitle, entry.sourceCategory);
  if (tags.length === 0) {
    rejected.push(detail(entry, "تعذر إسناد وسم موضوعي صالح من العنوان"));
    continue;
  }

  const candidate = {
    id: makeStableId(titleKey),
    title: displayTitle,
    author: null,
    source: SOURCE_NAME,
    relativePath: `مركز المعرفة الرقمي/بحث بالعنوان/${safeTitleForPath(displayTitle)}.html`,
    sourceUrl: sourceSearchUrl(displayTitle),
    primaryCategory: primaryCategory(tags),
    tags,
    matchEvidence: {
      strongSignals: [
        "عنوان عربي وارد في فهرس مركز المعرفة الرقمي",
        `إشارات عنوانية صريحة: ${tags.join("، ")}`,
      ],
      supportingSignals: [
        "إحالة بحث بالعنوان في مركز المعرفة الرقمي لعدم توافر معرّف مادة مفرد في الملف الوارد",
        `تصنيف الملف الأولي: ${entry.sourceCategory}`,
      ],
      explicitLanguageSource: false,
    },
  };
  const candidateUrl = candidate.sourceUrl.replace(/\/+$/, "");
  const nearExistingTitle = nearTitleMatch(titleKey, existingTitleKeys);
  if (
    existingById.has(candidate.id) ||
    existingByUrl.has(candidateUrl) ||
    existingByTitle.has(titleKey) ||
    nearExistingTitle
  ) {
    duplicates.push(
      detail(
        entry,
        nearExistingTitle
          ? "عنوان قريب جداً من سجل قائم؛ حُجب احتياطياً"
          : "مطابق لسجل قائم بالمعرّف أو رابط الإحالة أو العنوان المطبّع",
        nearExistingTitle,
      ),
    );
    continue;
  }
  const nearBatchTitle = nearTitleMatch(titleKey, batchTitleKeys);
  if (
    batchById.has(candidate.id) ||
    batchByUrl.has(candidateUrl) ||
    batchByTitle.has(titleKey) ||
    nearBatchTitle
  ) {
    duplicates.push(
      detail(
        entry,
        nearBatchTitle
          ? "عنوان قريب جداً من سجل سابق داخل الدفعة؛ حُجب احتياطياً"
          : "مطابق لسجل سابق داخل الدفعة",
        nearBatchTitle,
      ),
    );
    continue;
  }

  batchById.add(candidate.id);
  batchByUrl.add(candidateUrl);
  batchByTitle.add(titleKey);
  batchTitleKeys.push(titleKey);
  accepted.push(candidate);
}

accepted.sort((left, right) => left.title.localeCompare(right.title, "ar"));
const acceptedByTag = Object.fromEntries(
  ["معجم لغوي", "بلاغة", "نحو", "صرف", "دراسات لغوية", "شعر وأدب"].map((tag) => [
    tag,
    accepted.filter((material) => material.tags.includes(tag)).length,
  ]),
);
const acceptedByPrimaryCategory = Object.fromEntries(
  ["references", "dictionaries"].map((category) => [
    category,
    accepted.filter((material) => material.primaryCategory === category).length,
  ]),
);
const finalMaterials = [...corpus.materials, ...accepted];

if (APPLY) {
  const selectionNote =
    "أضيفت عناوين عربية منتقاة من مركز المعرفة الرقمي (DDL) بعد تدقيق العربية والموضوع ومنع التكرار متعدد المفاتيح؛ ولأن ملف الدفعة لا يحتوي معرّفات مواد أو روابط مفردة، أُسندت إلى كل سجل إحالة بحث صريحة بالعنوان في المصدر.";
  const currentSelectionMethod = String(corpus?.metadata?.selectionMethod || "").trim();
  const output = {
    ...corpus,
    metadata: {
      ...corpus.metadata,
      selectionMethod: currentSelectionMethod.includes("مركز المعرفة الرقمي (DDL)")
        ? currentSelectionMethod
        : `${currentSelectionMethod} ${selectionNote}`.trim(),
      statistics: {
        ...(corpus.metadata?.statistics || {}),
        totalMaterials: finalMaterials.length,
      },
      ddlTitleOnlySource: {
        name: "مركز المعرفة الرقمي (DDL)",
        indexUrl: SOURCE_HOME,
        inputTitleOccurrences: sourceEntries.length,
        importedCount: accepted.length,
        selectionMethod:
          "انتقاء محافظ بالعناوين العربية وإحالات بحث شفافة؛ لا يدّعي السجل توافر رابط مادة مفرد أو بيانات مؤلف عند غيابها من الملف المرفوع.",
      },
    },
    materials: finalMaterials,
  };
  writeJson(CORPUS_PATH, output);
}

const audit = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? "applied" : "dry-run",
  input: {
    schemaVersion: input.schema_version || null,
    declaredRecords: Number(input.included_new_record_count || 0),
    titleOccurrences: sourceEntries.length,
    sourceCategories: Object.keys(groups).length,
  },
  source: {
    name: "مركز المعرفة الرقمي (DDL)",
    homeUrl: SOURCE_HOME,
    recordLinkPolicy:
      "إحالة إلى صفحة بحث العنوان في DDL فقط؛ لا تُنشأ روابط مواد مفردة عندما لا يورد الملف معرّفاً يمكن التحقق منه.",
  },
  policy: {
    arabicOnly: "لا يُقبل إلا عنوان عربي ظاهر بعدد حروف عربية كافٍ.",
    topical:
      "لا يكفي التصنيف الأولي وحده؛ يلزم أن يثبت العنوان صلته بالنحو أو الصرف أو البلاغة أو المعجم أو اللغويات أو الأدب العربي أو تعليم العربية.",
    excluded:
      "تُستبعد العناوين المبهمة والموضوعات التاريخية والسياسية والدينية والعلمية العامة التي لا تثبت صلتها بالمكنز.",
    deduplication: ["المعرّف الاصطناعي الثابت للعُنوان", "رابط إحالة البحث", "العنوان المطبّع", "عنوان قريب جداً"],
  },
  accepted: accepted.length,
  rejected: rejected.length,
  duplicates: duplicates.length,
  catalogMaterialsBeforeImport: corpus.materials.length,
  catalogMaterialsAfterImport: finalMaterials.length,
  acceptedByPrimaryCategory,
  acceptedByTag,
  acceptedRecords: accepted,
  acceptedSample: accepted.slice(0, 50),
  rejectedSample: rejected.slice(0, 80),
  duplicateSample: duplicates.slice(0, 80),
};

writeJson(AUDIT_PATH, audit);
console.log(JSON.stringify(audit, null, 2));

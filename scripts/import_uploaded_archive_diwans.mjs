import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const inputPath = process.env.INPUT_FILE || "/home/ubuntu/upload/archive_org_diwans_all_6009.json.gz";
const archivePath = resolve(projectRoot, "client/src/data/archive-diwans.json");
const dryRun = process.env.APPLY !== "1";
const auditPath = dryRun
  ? "/home/ubuntu/archive_uploaded_diwans_dry_run_audit.json"
  : "/home/ubuntu/archive_uploaded_diwans_merge_audit.json";
const previousMergeAuditPath = "/home/ubuntu/archive_uploaded_diwans_merge_audit.json";

const foreignScript = /[پچژگکۍێی\u0700-\u074f]/u;
const foreignLanguageSignal = /(?:فارسي|فارسية|الأدب\s+الفارسي|شعر\s+فارسي|تركي|تركية|اردو|إنجليزي|انجليزي|فرنسي|كردي|سرياني|السرياني|محمد\s+اقبال|عرفي)/u;
const rejectTitle = /(?:دراسه|رساله|اطروحه|بحث|شرح|فهرس|معجم|نقد|تحليل|قراءه|موازنه|اتجاهات|ببليوغرافيا|مكتبه|موسوعه|تاريخ|سجل|اداره|مجله|صحيفه|جريده|مقال|مقدمه|بحوث|ملحوظات|جماليه|اسلوبيه|(?:ذيل|تكمله|تكملة|مستدرك|استدراك)\s+(?:على\s+)?ديوان|ديوان\s+(?:السنه|السنة|السنن|الحديث|الاحاديث|الأحاديث|الاثار|الآثار|الضعفاء|المتروكين|الزكاه|الزكاة|العرب)(?:\s|$)|و(?:ما\s+وصل\s+الينا\s+من\s+)?نثره|ورسائله|واخباره|ديوان\s+(?:المبتدا|المبتدأ|الخبر|العبر|الانشاء|الإنشاء|الرسائل|الخراج|المحاسبه|المحاسبة|المظالم|العدل|الخدمه|الخدمة|المال|الماليه|المالية|الشكاوي|الشكاوى|الوزاره|الوزارة|الدوله|الدولة|الوقف|الحساب|الاموال|الأموال|العقارات|الضرائب)|ديوان\s+(?:الشعر\s+العربي|الشعر\s+العربى|اللصوص|الفكاهه|الفكاهة|الادب|الأدب|النثر\s+العربي|المعاني))/u;
const contextualRejectTitle = /(?:^|\s)(?:دراسات|التكوينات|توظيف|الفائزون|جائزه)(?:\s|$).*?(?:^|\s)ديوان(?:\s|$)|(?:^|\s)(?:مع\s+)?تحقيق\s+ديوان(?:\s|$)|(?:^|\s)جزء\s+من\s+ديوان(?:\s|$)|ديوان\s+(?:الاساطير|الاحكام|اسماء\s+(?:الضعفاء|المتروكين)|اهل\s+البيت|الائمه|الأئمة)(?:\s|$)|ديوان(?:\s|$).*?(?:رواياتي|روايات)(?:\s|$)|^ديوان\s+علي$/u;
const genericPerson = /^(?:الشعر\s+العربي|الشعر\s+العربى|الادب|الأدب|الحماسه|الحماسة|القصائد|المختارات|الاشعار|الأشعار|مجموعه\s+من|عدة\s+مؤلفين|مجهول|غير\s+معروف|لم\s+يثبت)/u;
const ARABIC_LANGUAGE_VALUES = new Set(["ara", "arabic", "العربية", "اللغه العربية", "اللغة العربية"]);

function asList(value) {
  return Array.isArray(value) ? value.flatMap(asList) : value == null ? [] : [String(value)];
}

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
    .replace(/\bابي\b/g, "ابو")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/[\[\]{}()"'`*_،؛:!?.,/\\|+\-=—–]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanTitle(value) {
  return compact(value)
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/^[\s._\-—–·•ـ]+/u, "")
    .replace(/^\d{3,7}[_\-\s]*/u, "")
    .replace(/^book\s+/iu, "")
    .replace(/^\d+[a-z]?\s+pdf\s+/iu, "")
    .replace(/^كتاب\s+pdf\s+/iu, "")
    .replace(/^pdf\s+/iu, "")
    .replace(/^\d+\s+(?:كتاب|book)\s+/iu, "")
    .replace(/^(?:اقرا|اقرأ)\s+اونلاين(?:\s+(?:pdf|كتاب|\d+))*\s*/iu, "")
    .replace(/\s+(?:كتاب\s+)?(?:اقرا|اقرأ)\s+اونلاين.*$/iu, "")
    .replace(/\s+كتاب\s+صي(?:غه|غة)\s+بي\s+دي\s+اف(?:\s+(?:اقرا|اقرأ)\s+اونلاين)?(?:\s+pdf)?(?:\s+\d+)?$/iu, "")
    .replace(/\s+pdf\s*\d*$/iu, "")
    .replace(/pdf$/iu, "")
    .replace(/\s+(?:www\.)?(?:ketabypdf\.com|booksjadid\.blogspot\.com).*$/iu, "")
    .replace(/\s+ketabypdf\.com$/iu, "")
    .replace(/\s*\[[^\]]{1,80}\]\s*(?:---|–|—)\s*.*/u, "")
    .replace(/\s+(?:pdf|word|htm|html)$/iu, "")
    .trim();
}

function cleanPerson(value) {
  return compact(value)
    .replace(/["“”]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/،?\s*\d{3,4}(?:\s*[-–]\s*\d{0,4})?\.?$/u, "")
    .trim();
}

function hasArabicText(value) {
  const raw = compact(value);
  if (!raw || foreignScript.test(raw)) return false;
  const letters = raw.match(/[\u0621-\u064A]/g) ?? [];
  const visible = raw.replace(/\s|[\d٠-٩\W_]/g, "");
  return letters.length >= 3 && letters.length / Math.max(visible.length, 1) >= 0.55;
}

function hasWord(value, word) {
  return new RegExp(`(^|\\s)${word}(?=\\s|$)`, "u").test(normalize(value));
}

function hasExplicitArabicLanguage(doc) {
  return asList(doc.language).some((value) => ARABIC_LANGUAGE_VALUES.has(normalize(value)));
}

function hasArabicMetadataContext(doc) {
  const context = normalize(`${asList(doc.subjects ?? doc.subject).join(" ")} ${asList(doc.description).join(" ")}`);
  return /(?:العربيه|العربي|الادب\s+والشعر\s+العربي|شعر\s+عربي|ديوان\s+عربي)/u.test(context);
}

function hasArabicProof(doc) {
  return hasExplicitArabicLanguage(doc) || hasArabicMetadataContext(doc);
}

function canonicalTitle(value) {
  return normalize(cleanTitle(value))
    .replace(/(?:\s|[-–—،:])(?:ت\.?|تحقيق|طبعه|طبعة|نشر|مراجعه|مراجعة).*/u, "")
    .trim();
}

function canonicalPerson(value) {
  const person = normalize(cleanPerson(value));
  return genericPerson.test(person) ? "" : person;
}

function plausiblePerson(value) {
  const person = cleanPerson(value);
  return Boolean(person && hasArabicText(person) && !genericPerson.test(normalize(person)) && !rejectTitle.test(normalize(person)));
}

function derivePoet(title, creator) {
  const creatorName = cleanPerson(asList(creator)[0] ?? "");
  if (plausiblePerson(creatorName)) return creatorName;

  const cleaned = cleanTitle(title);
  const startsWithDiwan = cleaned.match(/^ديوان\s+(.+)/u);
  if (startsWithDiwan) {
    const candidate = cleanPerson(startsWithDiwan[1].replace(/(?:\s|[-–—،:])(?:ت\.?|تحقيق|طبعه|طبعة|نشر|مراجعه|مراجعة).*/u, ""));
    if (plausiblePerson(candidate) && candidate.split(/\s+/).length <= 5) return candidate;
  }
  return "";
}

function titleReferencedByMetadata(title, subject, description) {
  const titleKey = normalize(title);
  const metadataKey = normalize(`${subject} ${description}`);
  return titleKey.length >= 6 && metadataKey.includes(titleKey);
}

function looksLikeCollection(title) {
  const key = normalize(title);
  return /(?:^|\s)(?:الجزء|المجلد(?:ين)?|ج|مجلد(?:ين)?|part|volume)(?:\s|$)|^\d{1,3}\s+|(?:مختارات|مجموعه|منتخبات|مختار|اعمال\s+شعريه\s+كامله|الاعمال\s+الشعريه\s+الكامله)(?:\s|$)/u.test(key);
}

function classify(doc) {
  const title = cleanTitle(doc.title);
  const subject = asList(doc.subjects ?? doc.subject).join(" · ");
  const description = asList(doc.description).join(" ");
  const context = normalize(`${subject} ${description}`);
  const titleKey = normalize(title);
  const titleNamesDiwan = hasWord(title, "ديوان");
  const metadataNamesDiwan = hasWord(context, "ديوان");
  const titleNamesPoetry = hasWord(title, "قصائد") || hasWord(title, "اشعار") || hasWord(title, "شعر");
  const titleReferenced = titleReferencedByMetadata(title, subject, description);
  const metadataNamesCollection = /(?:ديوان\s+شعري|مجموعه\s+شعريه|مجموعه\s+من\s+القصائد|قصائد\s+الشاعر|اشعار\s+الشاعر|شعر\s+الشاعر)/u.test(context);
  const author = cleanPerson(asList(doc.creator)[0] ?? "");
  const poet = derivePoet(title, doc.creator);
  const falsePositive = rejectTitle.test(titleKey) || contextualRejectTitle.test(titleKey);
  const foreignContext = foreignLanguageSignal.test(`${titleKey} ${context}`);
  const evidence = titleNamesDiwan
    ? "العنوان يصرح بأن السجل ديوان"
    : metadataNamesDiwan && titleReferenced && titleNamesPoetry
      ? "البيانات الوصفية تثبت أن عنوان السجل ديوان مستقل"
      : metadataNamesCollection && titleReferenced && plausiblePerson(author) && titleNamesPoetry
        ? "البيانات الوصفية تربط عنوان السجل بمجموعة شعرية مستقلة"
        : "";
  let rejectedBecause = "";
  if (!doc.identifier) rejectedBecause = "معرّف أرشيف مفقود";
  else if (!title) rejectedBecause = "عنوان مفقود";
  else if (!hasArabicText(title)) rejectedBecause = "عنوان غير عربي";
  else if (foreignContext) rejectedBecause = "لغة أو سياق غير عربي";
  else if (!hasArabicProof(doc)) rejectedBecause = "العربية غير مثبتة في بيانات أرشيف";
  else if (falsePositive) rejectedBecause = "دراسة أو سجل غير ديواني";
  else if (looksLikeCollection(title)) rejectedBecause = "مجموعة أو جزء غير مستقل";
  else if (!evidence) rejectedBecause = "البيانات لا تثبت أن السجل ديواناً مستقلاً";
  return {
    doc,
    title,
    author,
    poet,
    subject,
    canonicalTitle: canonicalTitle(title),
    canonicalAuthor: canonicalPerson(poet || author),
    evidence,
    eligible: !rejectedBecause,
    rejectedBecause,
  };
}

function score(item) {
  const evidenceScore = item.evidence.startsWith("العنوان") ? 10 : item.evidence.startsWith("البيانات الوصفية تثبت") ? 8 : 6;
  const languageScore = hasArabicProof(item.doc) ? 1 : 0;
  return evidenceScore + (item.poet ? 4 : 0) + (item.subject.length > 10 ? 2 : 0) + (item.doc.description ? 1 : 0) + languageScore;
}

function materialFrom(item) {
  const identifier = String(item.doc.identifier).trim();
  return {
    id: `archive-${identifier}`,
    title: item.title,
    author: item.poet || item.author || "لم يُثبت اسم الشاعر في السجل",
    source: "Internet Archive",
    relativePath: identifier,
    sourceUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
    primaryCategory: "diwans",
    tags: ["ديوان شعري"],
    matchEvidence: {
      strongSignals: ["ديوان شعري", `دليل البيانات الوصفية: ${item.evidence}`],
      supportingSignals: item.subject ? [item.subject.slice(0, 220)] : [],
      explicitLanguageSource: hasExplicitArabicLanguage(item.doc),
    },
  };
}

function identityForMaterial(material) {
  const title = canonicalTitle(material.title);
  const author = canonicalPerson(material.author);
  return author ? `title-author::${title}::${author}` : `title-only::${title}`;
}

function countBy(items, field) {
  const counts = new Map();
  for (const item of items) {
    const key = item[field] || "غير محدد";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

const uploadedPayload = JSON.parse(gunzipSync(readFileSync(inputPath)).toString("utf8"));
const rawRecords = Array.isArray(uploadedPayload.records) ? uploadedPayload.records : [];
const existingPayload = JSON.parse(readFileSync(archivePath, "utf8"));
const existingMaterials = Array.isArray(existingPayload.materials) ? existingPayload.materials : [];
const previousMergeAudit = existsSync(previousMergeAuditPath)
  ? JSON.parse(readFileSync(previousMergeAuditPath, "utf8"))
  : {};
const previouslyAddedIdentifiers = new Set(
  (Array.isArray(previousMergeAudit.selectedIdentifiers)
    ? previousMergeAudit.selectedIdentifiers
    : Array.isArray(previousMergeAudit.selectedSample)
      ? previousMergeAudit.selectedSample.map((item) => item.relativePath || String(item.id ?? "").replace(/^archive-/, ""))
      : [])
    .map(compact)
    .filter(Boolean),
);

const recordsByIdentifier = new Map();
for (const record of rawRecords) {
  const identifier = compact(record?.identifier);
  if (!identifier) continue;
  const previous = recordsByIdentifier.get(identifier);
  const candidate = classify(record);
  if (!previous || score(candidate) > score(previous)) recordsByIdentifier.set(identifier, candidate);
}

const classified = [...recordsByIdentifier.values()];
const eligible = classified.filter((item) => item.eligible);
const rejected = classified.filter((item) => !item.eligible);
const currentlyEligibleIdentifiers = new Set(eligible.map((item) => compact(item.doc.identifier)));
const removedPreviouslyAddedNonArabic = existingMaterials.filter((material) => {
  const identifier = compact(material.relativePath || material.id.replace(/^archive-/, ""));
  return previouslyAddedIdentifiers.has(identifier) && !currentlyEligibleIdentifiers.has(identifier);
});
const retainedExistingMaterials = existingMaterials.filter((material) => {
  const identifier = compact(material.relativePath || material.id.replace(/^archive-/, ""));
  return !previouslyAddedIdentifiers.has(identifier) || currentlyEligibleIdentifiers.has(identifier);
});
const retainedPreviouslyAddedArabic = retainedExistingMaterials.filter((material) => {
  const identifier = compact(material.relativePath || material.id.replace(/^archive-/, ""));
  return previouslyAddedIdentifiers.has(identifier);
});
const bestWithinBatch = new Map();
for (const item of eligible) {
  // العنوان المطبّع هو الحاجز الآمن داخل دفعة المصدر؛ اختلاف الاسم لا يبرر إضافة
  // بطاقتين آلياً قبل مراجعة بشرية، لأن سجلات أرشيف قد تختلف فيها صيغ اسم الشاعر.
  const key = `title::${item.canonicalTitle}`;
  const previous = bestWithinBatch.get(key);
  if (!previous || score(item) > score(previous)) bestWithinBatch.set(key, item);
}

const existingIdentifiers = new Set(existingMaterials.map((material) => compact(material.relativePath || material.id.replace(/^archive-/, ""))));
const existingByIdentity = new Map(existingMaterials.map((material) => [identityForMaterial(material), material]));
const existingTitleAuthors = new Map();
for (const material of existingMaterials) {
  const titleKey = canonicalTitle(material.title);
  const authorKey = canonicalPerson(material.author);
  if (!existingTitleAuthors.has(titleKey)) existingTitleAuthors.set(titleKey, new Set());
  existingTitleAuthors.get(titleKey).add(authorKey);
}

const selected = [];
const duplicates = [];
for (const item of bestWithinBatch.values()) {
  const identifier = compact(item.doc.identifier);
  const material = materialFrom(item);
  const identity = identityForMaterial(material);
  const titleAuthors = existingTitleAuthors.get(item.canonicalTitle) ?? new Set();
  if (existingIdentifiers.has(identifier)) {
    duplicates.push({ identifier, title: item.title, reason: "معرّف أرشيف موجود في الكتالوج" });
  } else if (existingByIdentity.has(identity)) {
    duplicates.push({ identifier, title: item.title, reason: "العنوان والشاعر موجودان في الكتالوج" });
  } else if (titleAuthors.size > 0) {
    duplicates.push({ identifier, title: item.title, reason: "عنوان مطابق في الكتالوج؛ حُجب احتياطياً لتفادي التكرار" });
  } else {
    selected.push(material);
  }
}

const mergedMaterials = [...retainedExistingMaterials, ...selected].sort((a, b) => a.title.localeCompare(b.title, "ar"));
const audit = {
  generatedAt: new Date().toISOString(),
  mode: dryRun ? "dry-run" : "applied",
  inputPath,
  inputRecords: rawRecords.length,
  uniqueInputIdentifiers: recordsByIdentifier.size,
  repeatedInputRowsRemoved: rawRecords.length - recordsByIdentifier.size,
  eligibleBeforeSemanticDeduplication: eligible.length,
  rejectedByReason: countBy(rejected, "rejectedBecause"),
  duplicateCandidatesInsideUpload: eligible.length - bestWithinBatch.size,
  candidatesAfterInternalDeduplication: bestWithinBatch.size,
  existingArchiveMaterials: existingMaterials.length,
  retainedExistingArchiveMaterials: retainedExistingMaterials.length,
  removedPreviouslyAddedNonArabic: removedPreviouslyAddedNonArabic.length,
  excludedAsExisting: duplicates.length,
  addedMaterials: selected.length,
  retainedPreviouslyAddedArabic: retainedPreviouslyAddedArabic.length,
  mergedArchiveMaterials: mergedMaterials.length,
  selectedIdentifiers: selected.map((item) => item.relativePath),
  selectedSample: selected.slice(0, 40),
  retainedArabicSample: retainedPreviouslyAddedArabic.slice(0, 40),
  removedNonArabicSample: removedPreviouslyAddedNonArabic.slice(0, 40),
  duplicateSample: duplicates.slice(0, 80),
  rejectedSample: rejected.slice(0, 80).map((item) => ({
    identifier: item.doc.identifier,
    title: item.title,
    reason: item.rejectedBecause,
  })),
};

if (!dryRun) {
  const generatedAt = audit.generatedAt;
  const nextPayload = {
    metadata: {
      ...existingPayload.metadata,
      generatedAt,
      selectionMethod: "دواوين عربية فقط من موقع أرشيف؛ لا يُقبل السجل إلا إذا أثبتت بيانات أرشيف العربية صراحةً بوسم اللغة أو بسياق وصفي عربي واضح، مع ثبوت كونه ديواناً مستقلاً واستبعاد غير العربي وغير الديواني والمكرر.",
      batches: {
        ...(existingPayload.metadata?.batches ?? {}),
        uploadedRecords: rawRecords.length,
        uploadedUniqueIdentifiers: recordsByIdentifier.size,
        uploadedAcceptedMaterials: retainedPreviouslyAddedArabic.length,
        uploadedRemovedForArabicOnly: removedPreviouslyAddedNonArabic.length,
        uploadedExcludedAsExisting: duplicates.length,
        uniqueArchiveRecords: mergedMaterials.length,
      },
    },
    materials: mergedMaterials,
  };
  writeFileSync(archivePath, `${JSON.stringify(nextPayload, null, 2)}\n`);
}

writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({
  mode: audit.mode,
  inputRecords: audit.inputRecords,
  uniqueIdentifiers: audit.uniqueInputIdentifiers,
  eligible: audit.eligibleBeforeSemanticDeduplication,
  candidatesAfterInternalDeduplication: audit.candidatesAfterInternalDeduplication,
  excludedAsExisting: audit.excludedAsExisting,
  addedMaterials: audit.addedMaterials,
  mergedArchiveMaterials: audit.mergedArchiveMaterials,
  auditPath,
}, null, 2));

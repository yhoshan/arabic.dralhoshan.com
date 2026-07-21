#!/usr/bin/env node
/**
 * تحقق مستقل من دمج دفعة العناوين الوصفية لمركز المعرفة الرقمي (DDL).
 * يقيس هذا البرنامج سلامة السجلات المدرجة ولا يفترض وجود روابط مواد مفردة،
 * إذ تعتمد سياسة المصدر على إحالات بحث شفافة بالعنوان.
 */
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = "/home/ubuntu/arabic-language-thesaurus";
const CORPUS_PATH = path.join(PROJECT_ROOT, "client/src/data/arabic-materials.json");
const AUDIT_PATH = "/home/ubuntu/ddl_title_only_import_audit.json";
const SOURCE_NAME = "مركز المعرفة الرقمي (بحث)";
const ALLOWED_TAGS = new Set(["معجم لغوي", "بلاغة", "نحو", "صرف", "دراسات لغوية", "شعر وأدب"]);
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const WHITESPACE = /\s+/g;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizedTitle(value) {
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

function countDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function parseDdlSearchUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.origin !== "https://ddl.ae" || url.pathname !== "/search/results/1") return null;
    const query = url.searchParams.get("queries");
    if (!query || !query.startsWith("or|all|")) return null;
    return query.slice("or|all|".length).trim() || null;
  } catch {
    return null;
  }
}

const corpus = readJson(CORPUS_PATH);
const audit = readJson(AUDIT_PATH);
const allMaterials = Array.isArray(corpus.materials) ? corpus.materials : [];
const ddlMaterials = allMaterials.filter((material) => material?.source === SOURCE_NAME);
const nonDdlMaterials = allMaterials.filter((material) => material?.source !== SOURCE_NAME);
const failures = [];
const warnings = [];

if (audit.mode !== "applied") {
  failures.push("تقرير DDL ليس في وضع applied؛ لا يمكن اعتماد نتيجة الدمج.");
}
if (ddlMaterials.length !== audit.accepted) {
  failures.push(`عدد سجلات DDL في الكتالوج (${ddlMaterials.length}) لا يطابق المقبول في التقرير (${audit.accepted}).`);
}
if (allMaterials.length !== audit.catalogMaterialsAfterImport) {
  failures.push(`عدد مواد الكتالوج (${allMaterials.length}) لا يطابق العدد المتوقع بعد الدمج (${audit.catalogMaterialsAfterImport}).`);
}
if (Number(corpus?.metadata?.statistics?.totalMaterials) !== allMaterials.length) {
  failures.push("عداد metadata.statistics.totalMaterials لا يطابق عدد مواد الكتالوج الفعلي.");
}
if (Number(corpus?.metadata?.ddlTitleOnlySource?.importedCount) !== ddlMaterials.length) {
  failures.push("عداد ddlTitleOnlySource.importedCount لا يطابق سجلات DDL الموجودة.");
}

const ddlIds = ddlMaterials.map((material) => String(material?.id || "").trim());
const ddlUrls = ddlMaterials.map((material) => String(material?.sourceUrl || "").replace(/\/+$/, ""));
const ddlTitles = ddlMaterials.map((material) => normalizedTitle(material?.title));
const duplicateIds = countDuplicates(ddlIds);
const duplicateUrls = countDuplicates(ddlUrls);
const duplicateTitles = countDuplicates(ddlTitles);
if (duplicateIds.length) failures.push(`معرّفات DDL مكررة: ${duplicateIds.join("، ")}`);
if (duplicateUrls.length) failures.push(`إحالات بحث DDL مكررة: ${duplicateUrls.join("، ")}`);
if (duplicateTitles.length) failures.push(`عناوين DDL مطبعة مكررة: ${duplicateTitles.join("، ")}`);

const nonDdlTitleKeys = new Set(nonDdlMaterials.map((material) => normalizedTitle(material?.title)).filter(Boolean));
const crossCatalogTitleCollisions = ddlTitles.filter((title) => title && nonDdlTitleKeys.has(title));
if (crossCatalogTitleCollisions.length) {
  failures.push(`وجدت عناوين DDL مطابقة لسجلات سابقة: ${[...new Set(crossCatalogTitleCollisions)].join("، ")}`);
}

for (const material of ddlMaterials) {
  const title = String(material?.title || "").trim();
  const titleKey = normalizedTitle(title);
  const searchTitle = parseDdlSearchUrl(material?.sourceUrl);
  if (!String(material?.id || "").startsWith("ddl-title-")) failures.push(`معرّف غير متوقع: ${title || "(دون عنوان)"}`);
  if (!titleKey) failures.push("سجل DDL بلا عنوان عربي صالح.");
  if (material?.author !== null) failures.push(`السجل «${title}» يحمل مؤلفاً غير موثق في دفعة عناوين فقط.`);
  if (material?.primaryCategory !== "references" && material?.primaryCategory !== "dictionaries") {
    failures.push(`السجل «${title}» يحمل تصنيفاً أولياً غير مسموح.`);
  }
  if (!Array.isArray(material?.tags) || material.tags.length === 0 || material.tags.some((tag) => !ALLOWED_TAGS.has(tag))) {
    failures.push(`السجل «${title}» يحمل وسوماً مفقودة أو غير معتمدة.`);
  }
  if (!searchTitle) {
    failures.push(`السجل «${title}» لا يحمل إحالة بحث DDL صالحة.`);
  } else if (normalizedTitle(searchTitle) !== titleKey) {
    failures.push(`إحالة بحث DDL لا تطابق عنوان السجل: «${title}».`);
  }
  if (!String(material?.relativePath || "").startsWith("مركز المعرفة الرقمي/بحث بالعنوان/")) {
    failures.push(`المسار النسبي للسجل «${title}» لا يثبت سياق إحالة البحث.`);
  }
  if (material?.matchEvidence?.explicitLanguageSource !== false) {
    warnings.push(`السجل «${title}» لا يصرّح بأن المصدر عنواني فقط.`);
  }
}

const auditIds = new Set((Array.isArray(audit.acceptedRecords) ? audit.acceptedRecords : []).map((material) => material?.id));
const missingFromAudit = ddlIds.filter((id) => id && !auditIds.has(id));
if (missingFromAudit.length) failures.push(`سجلات DDL مفقودة من acceptedRecords في تقرير التدقيق: ${missingFromAudit.join("، ")}`);

const result = {
  status: failures.length ? "failed" : "passed",
  generatedAt: new Date().toISOString(),
  summary: {
    totalMaterials: allMaterials.length,
    ddlImported: ddlMaterials.length,
    auditAccepted: audit.accepted,
    auditRejected: audit.rejected,
    auditDuplicatesBlocked: audit.duplicates,
  },
  failures,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = failures.length ? 1 : 0;

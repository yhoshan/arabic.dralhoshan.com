import fs from "node:fs";

const corpusPath = process.env.CORPUS_PATH || "/home/ubuntu/arabic-language-thesaurus/client/src/data/arabic-materials.json";
const auditPath = process.env.AUDIT_PATH || "/home/ubuntu/archive_literature_import_audit.json";
const cachePath = process.env.CACHE_PATH || "/home/ubuntu/archive_literature_metadata_cache.json";

const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));

const imported = corpus.materials.filter((material) => audit.acceptedRecords.some((record) => record.id === material.id));
const archiveImported = imported.filter((material) => material.source === "Internet Archive");
const ids = archiveImported.map((material) => material.id);
const urls = archiveImported.map((material) => material.sourceUrl.replace(/\/+$/, ""));
const duplicateIds = ids.length - new Set(ids).size;
const duplicateUrls = urls.length - new Set(urls).size;
const acceptedWithNonArabicLanguage = archiveImported.filter((material) => {
  const identifier = material.id.replace(/^archive-/, "");
  const language = cache[identifier]?.language;
  const values = Array.isArray(language) ? language : language ? [language] : [];
  return values.some((value) => /^(?:en|eng|english|fr|fra|fre|french|de|ger|german|tr|tur|turkish|fa|fas|per|persian|ur|urd|urdu|es|spa|spanish|it|ita|italian|ru|rus|russian)$/i.test(String(value).trim()));
});
const byCategory = Object.fromEntries(
  ["references", "dictionaries", "academic_theses"].map((category) => [
    category,
    archiveImported.filter((material) => material.primaryCategory === category).length,
  ]),
);
const byTag = Object.fromEntries(
  ["بلاغة", "نحو", "صرف", "معجم لغوي", "دراسات لغوية", "شعر وأدب", "رسالة علمية"].map((tag) => [
    tag,
    archiveImported.filter((material) => material.tags.includes(tag)).length,
  ]),
);

const result = {
  auditMode: audit.mode,
  inputRecords: audit.input.records,
  acceptedInAudit: audit.accepted,
  importedRecordsFoundInCatalog: archiveImported.length,
  corpusMaterials: corpus.materials.length,
  auditCatalogMaterialsAfterImport: audit.catalogMaterialsAfterImport,
  duplicateImportedIds: duplicateIds,
  duplicateImportedUrls: duplicateUrls,
  importedWithExplicitNonArabicLanguage: acceptedWithNonArabicLanguage.length,
  importedByPrimaryCategory: byCategory,
  importedByTag: byTag,
  checksPassed:
    audit.mode === "applied" &&
    archiveImported.length === audit.accepted &&
    corpus.materials.length === audit.catalogMaterialsAfterImport &&
    duplicateIds === 0 &&
    duplicateUrls === 0 &&
    acceptedWithNonArabicLanguage.length === 0,
};

console.log(JSON.stringify(result, null, 2));
if (!result.checksPassed) process.exitCode = 1;

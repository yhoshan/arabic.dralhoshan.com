import { readFileSync, writeFileSync } from "node:fs";

const previousPath = process.argv[2] ?? "/home/ubuntu/archive-diwans-previous.json";
const expandedPath = process.argv[3] ?? "/home/ubuntu/archive-diwans-api-expanded-refined.json";
const outputPath = process.argv[4] ?? "/home/ubuntu/arabic-language-thesaurus/client/src/data/archive-diwans.json";
const auditPath = process.argv[5] ?? "/home/ubuntu/archive_diwan_batch_union_audit.json";

const previous = JSON.parse(readFileSync(previousPath, "utf8"));
const expanded = JSON.parse(readFileSync(expandedPath, "utf8"));
const previousMaterials = Array.isArray(previous.materials) ? previous.materials : [];
const expandedMaterials = Array.isArray(expanded.materials) ? expanded.materials : [];

const byId = new Map();
for (const material of previousMaterials) {
  if (material?.id) byId.set(material.id, material);
}
let overlappingIds = 0;
for (const material of expandedMaterials) {
  if (!material?.id) continue;
  if (byId.has(material.id)) overlappingIds += 1;
  byId.set(material.id, material);
}

const materials = [...byId.values()].sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""), "ar"));
const generatedAt = new Date().toISOString();
const payload = {
  metadata: {
    sourceName: "Internet Archive",
    sourceIndexUrl: "https://archive.org/search?tab=all&query=%D8%AF%D9%8A%D9%88%D8%A7%D9%86&and%5B%5D=mediatype%3A%22texts%22",
    generatedAt,
    selectionMethod: "اتحاد دفعة الأرشيف السابقة مع دفعة موسعة جُمعت عبر واجهة Internet Archive البرمجية، ثم نُقّحت العناوين واستُبعدت الدراسات والسجلات غير الشعرية. يحفظ الاتحاد كل السجلات السابقة ويستبدل التكرار المعرّفي بالسجل المنقح الأحدث.",
    collectionScope: "العناوين والموضوعات والأوصاف المرتبطة بالدواوين العربية، مع إبقاء بطاقات المصدر المباشرة ومنع التكرار لاحقاً في الكتالوج الموحد.",
    batches: {
      previousMaterials: previousMaterials.length,
      expandedRefinedMaterials: expandedMaterials.length,
      overlappingIds,
      uniqueArchiveRecords: materials.length,
    },
  },
  materials,
};
const audit = {
  generatedAt,
  previousPath,
  expandedPath,
  outputPath,
  previousMaterials: previousMaterials.length,
  expandedRefinedMaterials: expandedMaterials.length,
  overlappingIds,
  uniqueArchiveRecords: materials.length,
  newlyAddedIdentifiers: expandedMaterials.filter((item) => item?.id && !new Set(previousMaterials.map((previousItem) => previousItem?.id)).has(item.id)).length,
};

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit, null, 2));

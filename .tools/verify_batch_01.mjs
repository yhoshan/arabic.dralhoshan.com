import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const catalogPath = join(
  projectRoot,
  "client/src/data/uploaded-linguistic-lists-batch-01.json",
);
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const vite = await createServer({
  root: projectRoot,
  configFile: join(projectRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { MATERIALS, normalizeArabic } = await vite.ssrLoadModule("/client/src/lib/materials.ts");
  const batch = MATERIALS.filter((material) => material.id.startsWith("upload-b01-"));
  const ids = batch.map((material) => material.id);
  const urls = batch.map((material) => material.sourceUrl).filter(Boolean);
  const titles = batch.map((material) => normalizeArabic(material.title)).filter(Boolean);
  const sectionCounts = batch.reduce((counts, material) => {
    const label = material.matchEvidence.strongSignals[0] ?? "غير مصنف";
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});
  const categoryCounts = batch.reduce((counts, material) => {
    counts[material.primaryCategory] = (counts[material.primaryCategory] ?? 0) + 1;
    return counts;
  }, {});
  const unique = (items) => new Set(items).size === items.length;
  const errors = [];
  if (batch.length !== catalog.metadata.importedCount) {
    errors.push(`عدد مواد الدفعة الحية (${batch.length}) لا يساوي العدد المستورد (${catalog.metadata.importedCount}).`);
  }
  if (!unique(ids)) errors.push("ظهر تكرار في معرّفات الدفعة بعد الدمج.");
  if (!unique(urls)) errors.push("ظهر تكرار في روابط الدفعة غير الفارغة بعد الدمج.");
  if (!unique(titles)) errors.push("ظهر تكرار في عناوين الدفعة بعد التطبيع.");
  const result = {
    expectedImportedCount: catalog.metadata.importedCount,
    runtimeImportedCount: batch.length,
    totalMaterials: MATERIALS.length,
    uniqueIds: unique(ids),
    uniqueNonEmptyUrls: unique(urls),
    uniqueNormalizedTitles: unique(titles),
    categoryCounts,
    sectionCounts,
    errors,
  };
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {
  await vite.close();
}

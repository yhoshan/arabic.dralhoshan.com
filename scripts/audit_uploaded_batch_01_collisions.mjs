import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const catalog = JSON.parse(
  await readFile(join(projectRoot, "client/src/data/uploaded-linguistic-lists-batch-01.json"), "utf8"),
);
const vite = await createServer({
  root: projectRoot,
  configFile: join(projectRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { MATERIALS, normalizeArabic } = await vite.ssrLoadModule("/client/src/lib/materials.ts");
  const viteCatalogModule = await vite.ssrLoadModule(
    "/client/src/data/uploaded-linguistic-lists-batch-01.json",
  );
  const viteCatalog = viteCatalogModule.default ?? viteCatalogModule;
  const batch = MATERIALS.filter((material) => material.id.startsWith("upload-b01-"));
  const batchIds = new Set(catalog.materials.map((material) => material.id));
  const beforeBatch = MATERIALS.filter((material) => !batchIds.has(material.id));
  const existingIds = new Set(beforeBatch.map((material) => material.id));
  const existingUrls = new Set(beforeBatch.map((material) => material.sourceUrl).filter(Boolean));
  const existingTitles = new Set(beforeBatch.map((material) => normalizeArabic(material.title)));
  const collisions = catalog.materials.reduce(
    (result, material) => {
      if (existingIds.has(material.id)) result.id += 1;
      if (material.sourceUrl && existingUrls.has(material.sourceUrl)) result.url += 1;
      if (existingTitles.has(normalizeArabic(material.title))) result.title += 1;
      return result;
    },
    { id: 0, url: 0, title: 0 },
  );
  console.log(
    JSON.stringify(
      {
        catalogCount: catalog.materials.length,
        viteCatalogCount: viteCatalog.materials?.length ?? null,
        runtimeBatchCount: batch.length,
        collisionsAgainstPreexistingMaterials: collisions,
      },
      null,
      2,
    ),
  );
} finally {
  await vite.close();
}

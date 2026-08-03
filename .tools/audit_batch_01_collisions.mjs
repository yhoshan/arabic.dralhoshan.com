import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const catalog = JSON.parse(
  await readFile(
    join(projectRoot, "client/src/data/uploaded-linguistic-lists-batch-01.json"),
    "utf8",
  ),
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
  const liveIds = new Set(MATERIALS.map((material) => material.id));
  const liveUrls = new Set(MATERIALS.map((material) => material.sourceUrl).filter(Boolean));
  const liveTitles = new Set(MATERIALS.map((material) => normalizeArabic(material.title)));
  const report = catalog.materials.reduce(
    (result, material) => {
      if (liveIds.has(material.id)) result.id += 1;
      if (material.sourceUrl && liveUrls.has(material.sourceUrl)) result.url += 1;
      if (liveTitles.has(normalizeArabic(material.title))) result.title += 1;
      return result;
    },
    { id: 0, url: 0, title: 0 },
  );
  const present = MATERIALS.filter((material) => material.id.startsWith("upload-b01-")).length;
  console.log(JSON.stringify({ catalogCount: catalog.materials.length, runtimeBatchCount: present, collisionsAgainstRuntime: report }, null, 2));
} finally {
  await vite.close();
}

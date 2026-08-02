import { createServer } from "vite";

const normalizeArabic = (value = "") =>
  value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();

const hadithPattern = /(?:ال?حديث|ال?احاديث|hadith|hadeeth)/iu;
const hasHadith = (value) => hadithPattern.test(normalizeArabic(String(value ?? "")));

const server = await createServer({
  root: "/home/ubuntu/arabic-language-thesaurus",
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { MATERIALS } = await server.ssrLoadModule("/client/src/lib/materials.ts");
  const titleMatches = MATERIALS.filter((material) => hasHadith(material.title));
  const indexedMatches = MATERIALS.filter((material) =>
    [
      material.title,
      material.author,
      material.source,
      material.relativePath,
      ...(material.tags ?? []),
      ...(material.matchEvidence?.strongSignals ?? []),
      ...(material.matchEvidence?.supportingSignals ?? []),
    ].some(hasHadith),
  );
  const byCategory = titleMatches.reduce((result, material) => {
    result[material.primaryCategory] = (result[material.primaryCategory] ?? 0) + 1;
    return result;
  }, {});
  console.log(JSON.stringify({
    totalCatalogMaterials: MATERIALS.length,
    explicitHadithInTitle: titleMatches.length,
    explicitHadithInAnyIndexedField: indexedMatches.length,
    titleMatchesByCategory: byCategory,
    samples: titleMatches.slice(0, 5).map(({ title, primaryCategory }) => ({ title, primaryCategory })),
  }, null, 2));
} finally {
  await server.close();
}

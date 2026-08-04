import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const corpusPath = join(projectRoot, "client/src/data/arabic-materials.json");

function text(value) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";
}

function normalizeArabic(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ة/gu, "ه")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي")
    .replace(/ـ/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("ar");
}

function canonicalUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./u, "");
    url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
    return url.toString();
  } catch {
    return raw.replace(/\/+$/u, "").toLowerCase();
  }
}

const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
const imported = corpus.materials.filter((item) => String(item?.id || "").startsWith("buhooth-"));
const ids = new Set();
const urls = new Set();
const titles = new Set();
const duplicateKeys = [];
for (const item of imported) {
  const id = text(item.id);
  const url = canonicalUrl(item.sourceUrl);
  const title = normalizeArabic(item.title);
  if (!id || !url || !title || !Array.isArray(item.tags) || item.tags.length === 0) duplicateKeys.push({ title: item.title, reason: "حقول لازمة ناقصة" });
  if (ids.has(id)) duplicateKeys.push({ title: item.title, reason: "معرف مكرر" });
  if (urls.has(url)) duplicateKeys.push({ title: item.title, reason: "رابط مكرر" });
  if (titles.has(title)) duplicateKeys.push({ title: item.title, reason: "عنوان مكرر" });
  ids.add(id);
  urls.add(url);
  titles.add(title);
}

const vite = await createServer({
  root: projectRoot,
  configFile: join(projectRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
try {
  const { MATERIALS } = await vite.ssrLoadModule("/client/src/lib/materials.ts");
  const required = [
    corpus.metadata?.statistics?.totalMaterials === corpus.materials.length,
    corpus.metadata?.buhoothDriveSource?.importedCount === imported.length,
    imported.length === 1016,
    duplicateKeys.length === 0,
    Array.isArray(MATERIALS) && MATERIALS.length >= corpus.materials.length,
  ];
  const result = {
    corpusMaterials: corpus.materials.length,
    metadataTotalMaterials: corpus.metadata?.statistics?.totalMaterials ?? null,
    buhoothImported: imported.length,
    buhoothMetadataCount: corpus.metadata?.buhoothDriveSource?.importedCount ?? null,
    uiSearchableMaterials: Array.isArray(MATERIALS) ? MATERIALS.length : null,
    duplicateKeyIssues: duplicateKeys.length,
    passed: required.every(Boolean),
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
} finally {
  await vite.close();
}

import { readFile, writeFile } from "node:fs/promises";

const CANDIDATES_PATH = "/home/ubuntu/telegram_theses_candidates_v4.json";
const EXISTING_PATH = new URL("../client/src/data/arabic-materials.json", import.meta.url);
const AUDIT_PATH = "/home/ubuntu/telegram_theses_import_audit.json";
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\u0621-\u063A\u0641-\u064A0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const input = JSON.parse(await readFile(CANDIDATES_PATH, "utf8"));
const candidates = Array.isArray(input.materials) ? input.materials : [];
const existing = JSON.parse(await readFile(EXISTING_PATH, "utf8"));
const existingMaterials = Array.isArray(existing.materials) ? existing.materials : [];
const existingTitleKeys = new Set(existingMaterials.map((item) => normalize(item.title)).filter(Boolean));
const seen = new Set();
const duplicateWithinBatch = [];
const overlaps = [];
const invalidLinks = [];
const suspiciousTitles = [];

for (const item of candidates) {
  const titleKey = normalize(item.title);
  if (seen.has(titleKey)) duplicateWithinBatch.push(item);
  seen.add(titleKey);
  if (existingTitleKeys.has(titleKey)) overlaps.push(item);
  if (!/^https:\/\/t\.me\/Arsail2020\/\d+$/.test(item.sourceUrl ?? "")) invalidLinks.push(item);
  if (!item.title || item.title.length < 12 || /(?:^|\s)(?:في|عن|من|على|إلى|الى|لدى|عند|دراسة|رسالة|الباب|الفصل|الجزء|القرن|كتاب)\s*$/u.test(item.title)) suspiciousTitles.push(item);
}

const sample = [];
const stride = Math.max(1, Math.floor(candidates.length / 40));
for (let index = 0; index < candidates.length && sample.length < 40; index += stride) sample.push(candidates[index]);

const audit = {
  generatedAt: new Date().toISOString(),
  candidates: candidates.length,
  existingCatalogMaterials: existingMaterials.length,
  overlapsWithExistingCatalog: overlaps.length,
  duplicateWithinBatch: duplicateWithinBatch.length,
  invalidTelegramLinks: invalidLinks.length,
  suspiciousTitles: suspiciousTitles.length,
  categoryBreakdown: Object.fromEntries(
    [...new Set(candidates.flatMap((item) => item.tags ?? []))]
      .sort((a, b) => a.localeCompare(b, "ar"))
      .map((tag) => [tag, candidates.filter((item) => (item.tags ?? []).includes(tag)).length]),
  ),
  overlapSample: overlaps.slice(0, 30),
  suspiciousTitleSample: suspiciousTitles.slice(0, 30),
  representativeSample: sample,
};

await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({
  candidates: audit.candidates,
  overlaps: audit.overlapsWithExistingCatalog,
  duplicateWithinBatch: audit.duplicateWithinBatch,
  invalidTelegramLinks: audit.invalidTelegramLinks,
  suspiciousTitles: audit.suspiciousTitles,
}, null, 2));

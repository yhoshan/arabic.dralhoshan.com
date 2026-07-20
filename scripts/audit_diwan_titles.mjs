import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "/home/ubuntu/arabic-language-thesaurus/client/src/data/arabic-materials.json";
const outputPath = "/tmp/arabic-thesaurus-diwan-audit.json";
const payload = JSON.parse(readFileSync(sourcePath, "utf8"));
const materials = payload.materials ?? [];

const tagged = materials.filter((material) => material.tags?.includes("ديوان شعري"));
const normalized = (value) => String(value ?? "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ـ/g, "").replace(/\s+/g, " ").trim();
const isStandaloneDiwan = (title) => {
  const value = normalized(title);
  if (!/^ديوان\s+/.test(value)) return false;
  return !/[:؛،]|(دراسة|شرح|تحقيق|فهرس|مجموع|مختارات|رسالة|اثر|قضية|نقد|شعر|شعرية|ديوانين|دواوين|رؤية|تشكيل|تحليل|قراءة)/.test(value);
};

const standalone = tagged.filter((material) => isStandaloneDiwan(material.title));
const excluded = tagged.filter((material) => !isStandaloneDiwan(material.title));

writeFileSync(outputPath, JSON.stringify({
  tagged_count: tagged.length,
  standalone_count: standalone.length,
  excluded_count: excluded.length,
  standalone: standalone.map(({ id, title, tags, primaryCategory }) => ({ id, title, tags, primaryCategory })),
  excluded: excluded.map(({ id, title, tags, primaryCategory }) => ({ id, title, tags, primaryCategory })),
}, null, 2));
console.log(outputPath);

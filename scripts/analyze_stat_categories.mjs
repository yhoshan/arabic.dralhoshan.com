import { readFile } from "node:fs/promises";

const corpusPath = new URL("../client/src/data/arabic-materials.json", import.meta.url);
const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
const materials = corpus.materials;

function countMatching(label, predicate) {
  const matching = materials.filter(predicate);
  return { label, count: matching.length, ids: matching.map((item) => item.id) };
}

const hasAnyTag = (tags) => (material) => tags.some((tag) => material.tags.includes(tag));

const results = [
  countMatching("إجمالي المواد", () => true),
  countMatching("النحو والدراسات اللغوية", hasAnyTag(["نحو", "صرف", "دراسات لغوية"])),
  countMatching("المعاجم والأدب والبلاغة", hasAnyTag(["معجم لغوي", "شعر وأدب", "بلاغة"])),
  countMatching("الدواوين الشعرية", hasAnyTag(["ديوان شعري"])),
];

console.log(JSON.stringify({ totalMaterials: materials.length, results }, null, 2));

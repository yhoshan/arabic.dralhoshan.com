#!/usr/bin/env node
import fs from "node:fs";

const corpus = JSON.parse(
  fs.readFileSync("/home/ubuntu/arabic-language-thesaurus/client/src/data/arabic-materials.json", "utf8"),
);

const materials = Array.isArray(corpus.materials) ? corpus.materials : [];
const by = (items, selector) =>
  Object.fromEntries(
    [...items.reduce((map, item) => {
      const key = selector(item) || "(فارغ)";
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map()).entries()].sort(([, a], [, b]) => b - a),
  );

const structured = materials.filter((item) => ["references", "dictionaries"].includes(item.primaryCategory));
const languageTagged = materials.filter((item) =>
  ["معجم لغوي", "نحو", "صرف", "بلاغة", "دراسات لغوية", "شعر وأدب"].some((tag) => item.tags?.includes(tag)),
);
const likelyAcademic = /(رسالة|دراسة|بحث|منهج|مقارنة|تحليل|في ضوء|القرن|المعاصر|الحديث)/;
const traditionalTitles = structured.filter((item) => !likelyAcademic.test(item.title));
const heritageSources = materials.filter((item) =>
  ["Internet Archive", "مركز المعرفة الرقمي (بحث)"].includes(item.source),
);
const heritageReferenceBooks = heritageSources.filter((item) =>
  ["references", "dictionaries"].includes(item.primaryCategory),
);

const result = {
  total: materials.length,
  structuredCount: structured.length,
  languageTaggedCount: languageTagged.length,
  traditionalTitleCandidateCount: traditionalTitles.length,
  heritageSourceCount: heritageSources.length,
  heritageReferenceBookCount: heritageReferenceBooks.length,
  heritageSourcesByCategory: by(heritageSources, (item) => item.primaryCategory),
  structuredByCategory: by(structured, (item) => item.primaryCategory),
  structuredBySource: by(structured, (item) => item.source),
  samples: {
    dictionaries: structured
      .filter((item) => item.primaryCategory === "dictionaries")
      .slice(0, 24)
      .map((item) => ({ title: item.title, source: item.source, tags: item.tags })),
    references: structured
      .filter((item) => item.primaryCategory === "references")
      .slice(0, 24)
      .map((item) => ({ title: item.title, source: item.source, tags: item.tags })),
    traditionalTitleCandidates: traditionalTitles
      .slice(0, 40)
      .map((item) => ({ title: item.title, source: item.source, tags: item.tags, category: item.primaryCategory })),
    heritageReferenceBooks: heritageReferenceBooks
      .slice(0, 40)
      .map((item) => ({ title: item.title, source: item.source, tags: item.tags, category: item.primaryCategory })),
  },
};

console.log(JSON.stringify(result, null, 2));

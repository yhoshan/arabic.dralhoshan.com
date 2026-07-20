/*
 * فلسفة التصميم لهذا الملف: محرك بيانات صغير وشفاف لمكنز اللغة العربية وعلومها.
 * يعرض الفهرس المستورد كما هو، مع تطبيع بحث عربي محافظ وروابط أصلية؛ لا يولّد مواد أو أعداداً افتراضية.
 */
import corpusJson from "@/data/arabic-materials.json";

export type MaterialCategory = "all" | "references" | "dictionaries" | "diwans";

export type MaterialTag =
  | "معجم لغوي"
  | "ديوان شعري"
  | "نحو"
  | "صرف"
  | "بلاغة"
  | "شعر وأدب"
  | "دراسات لغوية";

export interface Material {
  id: string;
  title: string;
  author: string | null;
  source: string;
  relativePath: string;
  sourceUrl: string;
  primaryCategory: Exclude<MaterialCategory, "all">;
  tags: MaterialTag[];
  matchEvidence: {
    strongSignals: string[];
    supportingSignals: string[];
    explicitLanguageSource: boolean;
  };
}

export interface CorpusMetadata {
  title: string;
  sourceName: string;
  sourceIndexUrl: string;
  sourceFetchedAt: string;
  sourceSha256: string;
  sourceRecordCount: number;
  selectionMethod: string;
  statistics: {
    sourcesAndReferences: number;
    linguisticDictionaries: number;
    poetryDiwans: number;
    academicJournals: number;
    totalMaterials: number;
  };
  journalSources: string[];
}

interface CorpusPayload {
  metadata: CorpusMetadata;
  materials: Material[];
}

const corpus = corpusJson as CorpusPayload;

export const MATERIALS = corpus.materials;
export const CORPUS_METADATA = corpus.metadata;
export const JOURNAL_SOURCES = corpus.metadata.journalSources;

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const SEARCH_PUNCTUATION = /[^\u0621-\u063A\u0641-\u064A0-9\s]/g;
const SEARCH_SPACES = /\s+/g;

/** تطبيعٌ محدود للحروف يجعل البحث متسامحاً مع الهمزات والتشكيل والفواصل. */
export function normalizeArabic(value: string): string {
  return (value || "")
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(SEARCH_PUNCTUATION, " ")
    .replace(SEARCH_SPACES, " ")
    .trim()
    .toLocaleLowerCase("ar");
}

function includesEveryToken(haystack: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

export function filterMaterials(
  materials: Material[],
  query: string,
  category: MaterialCategory,
  source: string,
): Material[] {
  const normalizedQuery = normalizeArabic(query);

  return materials.filter((material) => {
    const matchesCategory = category === "all" || material.primaryCategory === category;
    const matchesSource = source === "all" || material.source === source;
    const searchHaystack = normalizeArabic(
      [material.title, material.author, material.source, material.tags.join(" ")]
        .filter(Boolean)
        .join(" "),
    );
    const matchesQuery = includesEveryToken(searchHaystack, normalizedQuery);

    return matchesCategory && matchesSource && matchesQuery;
  });
}

export function displayCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  all: "جميع المواد",
  references: "المصادر والمراجع",
  dictionaries: "المعاجم اللغوية",
  diwans: "الدواوين الشعرية",
};

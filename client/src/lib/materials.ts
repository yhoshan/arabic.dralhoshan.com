/*
 * فلسفة التصميم لهذا الملف: محرك بيانات صغير وشفاف لمكنز اللغة العربية وعلومها.
 * يعرض فهرس بحوث كما هو، ويضيف كتالوج الدواوين وكتالوج المناهج المنقّى بروابط المصدر المباشرة.
 * لا يُحسب ديوان إلا إذا مرّ بمرحلة التحقق الوصفية وإزالة التكرار؛ ولا تُستورد مادة منهجية إلا إذا اكتملت حقول العرض والبحث الأساسية.
 */
import corpusJson from "@/data/arabic-materials.json";
import curriculaJson from "@/data/curricula-materials.json";
import diwansJson from "@/data/diwans.json";
import academiesJson from "@/data/academies-materials.json";
import rhetoricalInterpretationJson from "@/data/rhetorical-interpretation-materials.json";
import literaryClubsJson from "@/data/literary-clubs-materials.json";
import qiraatLinguisticJson from "@/data/qiraat-linguistic-materials.json";
import gapResourcesJson from "@/data/gap-resources-materials.json";
import osoolLinguisticJson from "@/data/osool-linguistic-materials.json";
import userCuratedJson from "@/data/user-curated-materials.json";
import curatedHeritageJson from "@/data/curated-heritage-materials.json";
import millionBooksJson from "@/data/million-books-materials.json";

export type MaterialCategory =
  | "all"
  | "academic_theses"
  | "references"
  | "dictionaries"
  | "bilingual_dictionaries"
  | "diwans"
  | "scientific_poems"
  | "curricula"
  | "academies"
  | "literary_clubs";

export type MaterialTag =
  | "معجم لغوي"
  | "ديوان شعري"
  | "نحو"
  | "صرف"
  | "بلاغة"
  | "شعر وأدب"
  | "دراسات لغوية"
  | "رسالة دكتوراه"
  | "رسالة ماجستير"
  | "رسالة علمية";

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
    academicTheses?: number;
    totalMaterials: number;
  };
  journalSources: string[];
  academicThesesSource?: {
    name: string;
    channelUrl: string;
    importedCount: number;
    selectionMethod: string;
  };
}

interface CorpusPayload {
  metadata: CorpusMetadata;
  materials: Material[];
}

interface DiwanCatalogPayload {
  metadata: {
    sourceName: string;
    sourceIndexUrl: string;
    selectionMethod: string;
  };
  materials: Array<Omit<Material, "relativePath">>;
}

interface CurriculumRecord {
  "الرقم": number;
  "العنوان": string;
  "النوع": string;
  "الجهة": string;
  "الدولة": string;
  "المرحلة": string;
  "الفئة المستهدفة": string;
  "التصنيفات": string[];
  "حالة التحقق": string;
  "الرابط": string;
}

interface CurriculumCatalogPayload {
  meta: {
    "اسم_المجموعة": string;
    "عدد_السجلات_المستوردة": number;
  };
  records: CurriculumRecord[];
}

interface AcademyRecord {
  id: string;
  title: string;
  academy: string;
  country: string;
  materialType: string;
  year: string;
  linkStatus: string;
  url: string;
  description: string | null;
  sourceFile: string;
}

interface AcademyCatalogPayload {
  meta: {
    name: string;
    academyCount: number;
    recordCount: number;
    sourceFileCount: number;
    selectionMethod: string;
  };
  records: AcademyRecord[];
}

interface LiteraryClubRecord {
  id: string;
  title: string;
  club: string;
  country: string;
  city: string;
  materialType: string;
  year: string;
  linkStatus: string;
  url: string | null;
  description: string | null;
  sourceFile: string;
}

interface LiteraryClubCatalogPayload {
  meta: {
    name: string;
    clubCount: number;
    recordCount: number;
    sourceFileCount: number;
    validSourceFileCount: number;
    skippedFiles: Array<{ fileName: string; reason: string }>;
    selectionMethod: string;
  };
  records: LiteraryClubRecord[];
}

interface CuratedMaterialCatalogPayload {
  materials: Material[];
}

export type CurriculumFilterKey = "country" | "materialType" | "organization";
export type AcademyFilterKey = "academy" | "country" | "materialType" | "year" | "linkStatus";
export type LiteraryClubFilterKey =
  | "club"
  | "country"
  | "city"
  | "materialType"
  | "year"
  | "linkStatus";

export interface CurriculumFilters {
  country: string;
  materialType: string;
  organization: string;
}

export interface CurriculumFilterOption {
  value: string;
  count: number;
}

export interface CurriculumFilterOptions {
  country: CurriculumFilterOption[];
  materialType: CurriculumFilterOption[];
  organization: CurriculumFilterOption[];
}

export interface AcademyFilters {
  academy: string;
  country: string;
  materialType: string;
  year: string;
  linkStatus: string;
}

export interface AcademyFilterOptions {
  academy: CurriculumFilterOption[];
  country: CurriculumFilterOption[];
  materialType: CurriculumFilterOption[];
  year: CurriculumFilterOption[];
  linkStatus: CurriculumFilterOption[];
}

export interface LiteraryClubFilters {
  club: string;
  country: string;
  city: string;
  materialType: string;
  year: string;
  linkStatus: string;
}

export interface LiteraryClubFilterOptions {
  club: CurriculumFilterOption[];
  country: CurriculumFilterOption[];
  city: CurriculumFilterOption[];
  materialType: CurriculumFilterOption[];
  year: CurriculumFilterOption[];
  linkStatus: CurriculumFilterOption[];
}

const corpus = corpusJson as CorpusPayload;
const curriculaCatalog = curriculaJson as CurriculumCatalogPayload;
const diwanCatalog = diwansJson as DiwanCatalogPayload;
const academiesCatalog = academiesJson as AcademyCatalogPayload;
const literaryClubsCatalog = literaryClubsJson as LiteraryClubCatalogPayload;
const rhetoricalInterpretationCatalog =
  rhetoricalInterpretationJson as unknown as CuratedMaterialCatalogPayload;
const qiraatLinguisticCatalog =
  qiraatLinguisticJson as unknown as CuratedMaterialCatalogPayload;
const gapResourcesCatalog = gapResourcesJson as unknown as CuratedMaterialCatalogPayload;
const osoolLinguisticCatalog = osoolLinguisticJson as unknown as CuratedMaterialCatalogPayload;
const userCuratedCatalog = userCuratedJson as unknown as CuratedMaterialCatalogPayload;
const curatedHeritageCatalog = curatedHeritageJson as unknown as CuratedMaterialCatalogPayload;
const millionBooksCatalog = millionBooksJson as unknown as CuratedMaterialCatalogPayload;
const CURATED_DIWAN_SIGNAL = "سجل ديوان موثّق";
const IMPORTED_DIWAN_SIGNAL = "سجل ديوان مستورد ومُصنّف";
const CURATED_CURRICULUM_SIGNAL = "سجل منهج ومقرر منقّى";
const CURATED_ACADEMY_SIGNAL = "سجل مجمع لغوي موثّق";
const CURATED_LITERARY_CLUB_SIGNAL = "سجل نادي أدبي موثّق";
const CLASSICAL_LANGUAGE_BOOK_SOURCE = "Internet Archive";
/** مصدر السجلات المدمجة للمنظومات؛ يُستخدم لتقديم قسم مشتق دون تعديل السجلات الخام. */
const SCIENTIFIC_POEMS_SOURCE = "المنظومات العلمية";
const CURRICULUM_UNSPECIFIED_VALUE = "غير محدد";
const LITERARY_CLUB_PRIORITY_COUNTRY = "المملكة العربية السعودية";
const SAUDI_LITERARY_CLUBS = new Set(
  literaryClubsCatalog.records
    .filter((record) => academyFieldValue(record.country) === LITERARY_CLUB_PRIORITY_COUNTRY)
    .map((record) => academyFieldValue(record.club)),
);

export const CURRICULUM_FILTER_DEFAULTS: CurriculumFilters = {
  country: "all",
  materialType: "all",
  organization: "all",
};

export const ACADEMY_FILTER_DEFAULTS: AcademyFilters = {
  academy: "all",
  country: "all",
  materialType: "all",
  year: "all",
  linkStatus: "all",
};

export const LITERARY_CLUB_FILTER_DEFAULTS: LiteraryClubFilters = {
  club: "all",
  country: "all",
  city: "all",
  materialType: "all",
  year: "all",
  linkStatus: "all",
};

type CurriculumFacet = Record<CurriculumFilterKey, string>;
type AcademyFacet = Record<AcademyFilterKey, string>;
type LiteraryClubFacet = Record<LiteraryClubFilterKey, string>;

function curriculumFieldValue(value: string | null | undefined): string {
  const trimmedValue = typeof value === "string" ? value.trim() : "";
  return trimmedValue || CURRICULUM_UNSPECIFIED_VALUE;
}

function curriculumFacetFromRecord(record: CurriculumRecord): CurriculumFacet {
  return {
    country: curriculumFieldValue(record["الدولة"]),
    materialType: curriculumFieldValue(record["النوع"]),
    organization: curriculumFieldValue(record["الجهة"]),
  };
}

const CURRICULUM_FACETS_BY_ID = new Map<string, CurriculumFacet>(
  curriculaCatalog.records.map((record) => [
    `curricula-${record["الرقم"]}`,
    curriculumFacetFromRecord(record),
  ]),
);

function academyFieldValue(value: string | null | undefined): string {
  const trimmedValue = typeof value === "string" ? value.trim() : "";
  return trimmedValue || CURRICULUM_UNSPECIFIED_VALUE;
}

function academyFacetFromRecord(record: AcademyRecord): AcademyFacet {
  return {
    academy: academyFieldValue(record.academy),
    country: academyFieldValue(record.country),
    materialType: academyFieldValue(record.materialType),
    year: academyFieldValue(record.year),
    linkStatus: academyFieldValue(record.linkStatus),
  };
}

function literaryClubFacetFromRecord(record: LiteraryClubRecord): LiteraryClubFacet {
  return {
    club: academyFieldValue(record.club),
    country: academyFieldValue(record.country),
    city: academyFieldValue(record.city),
    materialType: academyFieldValue(record.materialType),
    year: academyFieldValue(record.year),
    linkStatus: academyFieldValue(record.linkStatus),
  };
}

const ACADEMY_FACETS_BY_ID = new Map<string, AcademyFacet>(
  academiesCatalog.records.map((record) => [
    `academies-${record.id}`,
    academyFacetFromRecord(record),
  ]),
);

const LITERARY_CLUB_FACETS_BY_ID = new Map<string, LiteraryClubFacet>(
  literaryClubsCatalog.records.map((record) => [
    `literary-clubs-${record.id}`,
    literaryClubFacetFromRecord(record),
  ]),
);

/**
 * معرّفات القواميس الثنائية العربية الموثقة في تحليل الكتالوج الحالي.
 * القائمة مرجعية للتصفية فقط؛ لا تضيف سجلات ولا تعدّل بيانات المواد الأصلية.
 */
const BILINGUAL_DICTIONARY_IDS = new Set<string>([
  "archive-OBA985AREN",
  "archive-AAlexandrina-143879",
  "archive-AAlexandrina-080680",
  "archive-AAlexandrina-159097",
  "archive-AAlexandrina-123386",
  "archive-AAlexandrina-305593",
  "archive-AAlexandrina-214454",
  "archive-AAlexandrina-187969",
  "archive-AAlexandrina-142386",
  "archive-AAlexandrina-409106",
  "archive-AAlexandrina-068970",
  "archive-AAlexandrina-430714",
  "archive-AAlexandrina-306815",
  "archive-mo3jam-mostalahat-3ilm-lura-hadith",
  "archive-20210801_20210801_0455",
  "archive-shamel_dictinnary",
  "archive-20201115_20201115_1554",
  "archive-20221210_20221210_1418",
  "archive-languages-00004",
  "archive-ALW2004FRAR",
  "archive-mogam_askri_fransi",
  "archive-AAlexandrina-069600",
  "archive-KAR1970ENAR",
  "archive-abuarialkurdy_gmail_20171005_0541",
  "archive-20241126_20241126_1424",
  "archive-al-mawrid",
  "archive-ALL1996FAAR",
  "archive-20201120_20201120_0736",
  "archive-20200929_20200929_1704",
  "archive-AAlexandrina-402408",
  "archive-maktabah2000_gmail_20150726_0312",
  "archive-20200411_20200411_2132",
  "archive-maktbah.net_20200915",
  "archive-20231211_20231211",
  "archive-20200922_20200922_1604",
  "archive-elvisturk_hotmail",
  "archive-20200811_20200811_2211",
  "archive-4547pdf",
  "archive-jamal6565_googlemail_9_20151018_0928",
  "archive-AAlexandrina-305666",
  "archive-k_719",
  "archive-hosamaldin",
  "archive-20220605_20220605_1521",
  "archive-20221210_20221210_1424",
  "archive-20210518_20210518_2123",
  "archive-TLI1982ITAR",
  "archive-20240730_20240730_1419",
  "archive-2_20200903_20200903_1533",
  "archive-20200929_20200929_1727",
  "archive-MHI0000FAAR",
  "archive-20200831_20200831_1859",
  "archive-20200828_20200828_2325",
  "archive-271_20211111",
  "archive-qamos_askri",
  "archive-alkamela2000_gmail_20150209_1439",
  "archive-moamenquraish_gmail_20150712_0246",
  "archive-qamoosFransiArabiNagaryBey",
  "archive-20221116_20221116_1314",
  "archive-visuelles-worterbuch-arabisch-deutsch",
  "archive-20241125_20241125_2139",
  "archive-WAR1984AREN",
  "archive-20240718_20240718",
  "archive-DON1982ENAR",
  "archive-AAlexandrina-438434",
  "archive-1_20221228_20221228_1455",
  "archive-20240803_20240803_1338",
  "archive-20241117_20241117_0907",
  "archive-by_20200912",
  "archive-AAlexandrina-419586",
  "archive-farsiarab",
  "archive-yoooooofs_gmail_20180329",
  "archive-salemd201806",
  "archive-AAlexandrina-433234",
  "archive-Mo3gamMostlhat",
  "archive-20260717_20260717_2132",
  "archive-AAlexandrina-150110",
  "archive-5200pdf",
  "archive-compressed_20200628_1527khatab",
  "archive-KurdiArabicDic",
  "archive-AAlexandrina-440923",
  "archive-5212pdf",
  "archive-20201231_20201231_1451",
  "archive-dic00001",
  "archive-20240324_20240324_1010",
  "archive-20200831_20200831_1805",
  "archive-majidalhydar_gmail_20160502",
  "archive-AAskZad-1140774",
  "archive-AAskZad-0187074",
  "archive-AAskZad-1140768",
  "archive-AAskZad-0179639",
  "archive-AAskZad-0182274",
  "archive-AAskZad-0182276",
  "e9d0a5387347bf83",
  "29a19ba709222e07",
  "45756a7f6a0e5e41",
  "947b32c722494683",
  "08c6abf43b608de4",
  "2e6119b2a4a6f1a4",
  "60656328387a6c1a",
  "44e35a826d994f65",
  "86d2f10e617eba62",
  "fcb2050bc7fbbdf1",
  "d022f25e56040616",
  "97d2e11c9c45acc7",
  "ab5c4840b191dbca",
  "ee0f9055bfd3af1d",
  "280aa1655cd51cb9",
  "c624d8add3e3ec1c",
  "6f6ede423f2cd155",
  "6c639bbb8cb29eb3",
  "0f2d33ad2c1d5a66",
  "88679cc73eb5770e",
  "1353dabc0505bee4",
  "dd49ba2964af9245",
  "cf1952f36372ee63",
  "4d6f1b323847fc11",
  "02bb55aee9f5b226",
  "53cb9e1de7e3ba4a",
  "8f19281110b4ba70",
  "44b64bf4de4c3d7b",
  "2aefda0c6c1bf3fd",
  "592bea57e861b7bc",
  "29df310197d9fd5f",
  "d4d9f24829efc899",
  "b28d061480f95049",
  "ae9508468a91cfa6",
  "c1842f5f66ac3907",
  "3a8b703f7d084d23",
  "8b8dfaddfad9d1be",
  "4d2ab87c862963d4",
  "2b393eef15300b0e",
  "d56a874b29c6adc9",
  "ee0b2127f09226c4",
  "2b213523a5749ba4",
  "7dc95b9cb82797a9",
  "07f085659c04ed9c",
  "f7af75a63d395a27",
  "3c4d58c59f499b34",
  "841fdbbfcdd0a516",
  "33742dc6949a914e",
  "56dd0a8e9dbb1491",
  "5c7840441645407a",
  "170ddf70ea00f904",
  "6c00f3a2b9e372a6",
  "4fbfcd48cdf6d145",
  "cfc6486bfafadd73",
  "c676e7cc0fe9f568",
  "856ff22a85cead4f",
  "3c30354cc1e7afb9",
  "a173e82533c674e7",
  "1f031276c7bc96e0",
  "35172f28d727b88d",
  "ba027276ec448985",
  "36236e520ec0d0be",
  "1a3d9c5cbb77eefb",
  "99bbc37113d8ef50",
  "a39ea032d48e8e79",
  "f974c5188184b3af",
  "1789c76e24ebcf08",
  "7aff4efa44f6bdff",
  "d64520af484b2141",
  "7c23c44d6cee74ff",
  "0f64ec89040e1c20",
  "af541aaf497555bb",
  "6413b3e0291c7eae",
  "0f37cf61e5ed8b06",
  "d87678c92c729eab",
  "30462e11d0b5197d",
  "e5598f29b6c3d00a",
  "4848d4954f53c0db",
  "8ea597cf9b199965",
  "89fa83785906ef07",
  "0b1bd476d9701397",
  "a75d0d50e1de317f",
  "20cbccdab258d2ed",
  "1d6f244227d76dec",
  "662174de7d301018",
  "ccea79c74f71e9d7",
  "d20a909b03f8765a",
  "b65dcfe290dadbe3",
  "2c5abe2078b46d19",
  "65a29241200e6179",
  "bd980400313c1b78",
  "4d0e2935c3929f23",
  "573ac9bd670a5a8b",
  "8ecb7ce1f5002dd1",
  "caad6c476f86a70b",
  "46053dd2667f0487",
  "0960a17e4d7b5485",
  "72b9d62b366c892c",
  "24e85bafba8a8013",
  "507d3750745e9265",
]);

const DYNAMIC_DIWANS: Material[] = diwanCatalog.materials.map((material) => ({
  ...material,
  relativePath: material.sourceUrl,
  matchEvidence: {
    ...material.matchEvidence,
    strongSignals: Array.from(
      new Set([...material.matchEvidence.strongSignals, CURATED_DIWAN_SIGNAL]),
    ),
  },
}));

const DYNAMIC_CURRICULA: Material[] = curriculaCatalog.records.map((record) => {
  const tags = [
    "المناهج والمقررات",
    record["النوع"],
    record["المرحلة"],
    record["الفئة المستهدفة"],
    record["الدولة"],
    record["حالة التحقق"],
    ...record["التصنيفات"],
  ].filter(Boolean);
  const source =
    record["الجهة"].trim() ||
    record["الدولة"].trim() ||
    curriculaCatalog.meta["اسم_المجموعة"];

  return {
    id: `curricula-${record["الرقم"]}`,
    title: record["العنوان"].trim(),
    author: record["الجهة"].trim() || null,
    source,
    relativePath: record["الرابط"].trim(),
    sourceUrl: record["الرابط"].trim(),
    primaryCategory: "curricula",
    tags: Array.from(new Set(tags)) as MaterialTag[],
    matchEvidence: {
      strongSignals: [CURATED_CURRICULUM_SIGNAL, record["النوع"]],
      supportingSignals: tags,
      explicitLanguageSource: true,
    },
  };
});

const DYNAMIC_ACADEMIES: Material[] = academiesCatalog.records.map((record) => {
  const tags = [
    "المجامع اللغوية",
    record.materialType,
    record.country,
    record.year === "غير محدد" ? record.year : `سنة ${record.year}`,
    record.linkStatus,
  ].filter(Boolean);

  return {
    id: `academies-${record.id}`,
    title: record.title,
    author: record.country === "غير محدد" ? null : record.country,
    source: record.academy,
    relativePath: record.sourceFile,
    sourceUrl: record.url,
    primaryCategory: "academies",
    tags: Array.from(new Set(tags)) as MaterialTag[],
    matchEvidence: {
      strongSignals: [CURATED_ACADEMY_SIGNAL, record.materialType],
      supportingSignals: tags,
      explicitLanguageSource: true,
    },
  };
});

const DYNAMIC_LITERARY_CLUBS: Material[] = literaryClubsCatalog.records.map((record) => {
  const tags = [
    "الأندية الأدبية",
    record.materialType,
    record.country,
    record.city,
    record.year === "غير محدد" ? record.year : `سنة ${record.year}`,
    record.linkStatus,
  ].filter(Boolean);

  return {
    id: `literary-clubs-${record.id}`,
    title: record.title,
    author: record.country === "غير محدد" ? null : record.country,
    source: record.club,
    relativePath: record.sourceFile,
    sourceUrl: record.url ?? "",
    primaryCategory: "literary_clubs",
    tags: Array.from(new Set(tags)) as MaterialTag[],
    matchEvidence: {
      strongSignals: [CURATED_LITERARY_CLUB_SIGNAL, record.materialType],
      supportingSignals: tags,
      explicitLanguageSource: true,
    },
  };
});

const BASE_MATERIALS = [
  ...corpus.materials,
  ...DYNAMIC_DIWANS,
  ...DYNAMIC_CURRICULA,
  ...DYNAMIC_ACADEMIES,
];
const PREEXISTING_MATERIAL_IDS = new Set(BASE_MATERIALS.map((material) => material.id));
const PREEXISTING_MATERIAL_URLS = new Set(
  BASE_MATERIALS.map((material) => material.sourceUrl).filter(Boolean),
);
/** مجلدات موثقة من المصدر الرسمي، مع استبعاد أي سجل يطابق معرّفًا أو رابطًا حاضرًا مسبقًا. */
const RHETORICAL_INTERPRETATION_MATERIALS = rhetoricalInterpretationCatalog.materials.filter(
  (material) =>
    !PREEXISTING_MATERIAL_IDS.has(material.id) &&
    !PREEXISTING_MATERIAL_URLS.has(material.sourceUrl),
);
const MATERIALS_BEFORE_QIRAAT = [...BASE_MATERIALS, ...RHETORICAL_INTERPRETATION_MATERIALS];
const MATERIAL_IDS_BEFORE_QIRAAT = new Set(MATERIALS_BEFORE_QIRAAT.map((material) => material.id));
const MATERIAL_URLS_BEFORE_QIRAAT = new Set(
  MATERIALS_BEFORE_QIRAAT.map((material) => material.sourceUrl).filter(Boolean),
);
const normalizeCatalogTitle = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const MATERIAL_TITLES_BEFORE_QIRAAT = new Set(
  MATERIALS_BEFORE_QIRAAT.map((material) => normalizeCatalogTitle(material.title)).filter(Boolean),
);
/** مواد قراءات منتقاة: لا تمر إلا إذا لم تطابق معرّفًا أو رابطًا أو عنوانًا حاضرًا في المكنز. */
const QIRAAT_LINGUISTIC_MATERIALS = qiraatLinguisticCatalog.materials.filter(
  (material) =>
    !MATERIAL_IDS_BEFORE_QIRAAT.has(material.id) &&
    !MATERIAL_URLS_BEFORE_QIRAAT.has(material.sourceUrl) &&
    !MATERIAL_TITLES_BEFORE_QIRAAT.has(normalizeCatalogTitle(material.title)),
);
const MATERIALS_BEFORE_GAP_RESOURCES = [...MATERIALS_BEFORE_QIRAAT, ...QIRAAT_LINGUISTIC_MATERIALS];
const MATERIAL_IDS_BEFORE_GAP_RESOURCES = new Set(
  MATERIALS_BEFORE_GAP_RESOURCES.map((material) => material.id),
);
const MATERIAL_URLS_BEFORE_GAP_RESOURCES = new Set(
  MATERIALS_BEFORE_GAP_RESOURCES.map((material) => material.sourceUrl).filter(Boolean),
);
const MATERIAL_TITLES_BEFORE_GAP_RESOURCES = new Set(
  MATERIALS_BEFORE_GAP_RESOURCES.map((material) => normalizeCatalogTitle(material.title)).filter(Boolean),
);
/** مواد فجوات منتقاة: لا تمر إلا إذا لم تطابق معرفًا أو رابطًا أو عنوانًا حاضرًا في المكنز. */
const GAP_RESOURCES_MATERIALS = gapResourcesCatalog.materials.filter(
  (material) =>
    !MATERIAL_IDS_BEFORE_GAP_RESOURCES.has(material.id) &&
    !MATERIAL_URLS_BEFORE_GAP_RESOURCES.has(material.sourceUrl) &&
    !MATERIAL_TITLES_BEFORE_GAP_RESOURCES.has(normalizeCatalogTitle(material.title)),
);
const MATERIALS_BEFORE_LITERARY_CLUBS = [...MATERIALS_BEFORE_GAP_RESOURCES, ...GAP_RESOURCES_MATERIALS];
const MATERIAL_IDS_BEFORE_LITERARY_CLUBS = new Set(
  MATERIALS_BEFORE_LITERARY_CLUBS.map((material) => material.id),
);
const MATERIAL_URLS_BEFORE_LITERARY_CLUBS = new Set(
  MATERIALS_BEFORE_LITERARY_CLUBS.map((material) => material.sourceUrl).filter(Boolean),
);
const LITERARY_CLUB_MATERIALS = DYNAMIC_LITERARY_CLUBS.filter(
  (material) =>
    !MATERIAL_IDS_BEFORE_LITERARY_CLUBS.has(material.id) &&
    (!material.sourceUrl || !MATERIAL_URLS_BEFORE_LITERARY_CLUBS.has(material.sourceUrl)),
);
const MATERIALS_BEFORE_OSOOL = [...MATERIALS_BEFORE_LITERARY_CLUBS, ...LITERARY_CLUB_MATERIALS];
const MATERIAL_IDS_BEFORE_OSOOL = new Set(MATERIALS_BEFORE_OSOOL.map((material) => material.id));
const MATERIAL_URLS_BEFORE_OSOOL = new Set(
  MATERIALS_BEFORE_OSOOL.map((material) => material.sourceUrl).filter(Boolean),
);
/** مواد لغوية منتقاة يدويًا من مكنز أصول، بعد فحص التكرار مع الكتالوجات الموحدة. */
const OSOOL_LINGUISTIC_MATERIALS = osoolLinguisticCatalog.materials.filter(
  (material) =>
    !MATERIAL_IDS_BEFORE_OSOOL.has(material.id) &&
    (!material.sourceUrl || !MATERIAL_URLS_BEFORE_OSOOL.has(material.sourceUrl)),
);

/**
 * مجموعة المكنز قبل الدفعة اليدوية الحالية؛ تُستعمل مرجعًا ثابتًا لبطاقات العدادات
 * حتى لا يتبدل أي رقم ظاهر عند إضافة سجل جديد قابل للبحث.
 */
export const DISPLAY_STAT_MATERIALS: Material[] = [
  ...MATERIALS_BEFORE_OSOOL,
  ...OSOOL_LINGUISTIC_MATERIALS,
];
const DISPLAY_STAT_MATERIAL_IDS = new Set(DISPLAY_STAT_MATERIALS.map((material) => material.id));
const DISPLAY_STAT_MATERIAL_URLS = new Set(
  DISPLAY_STAT_MATERIALS.map((material) => material.sourceUrl).filter(Boolean),
);
/** سجلات المستخدم تضاف للبحث والتصنيف فقط، بعد منع تكرار المعرّف أو الرابط. */
const USER_CURATED_MATERIALS = userCuratedCatalog.materials.filter(
  (material) =>
    !DISPLAY_STAT_MATERIAL_IDS.has(material.id) &&
    (!material.sourceUrl || !DISPLAY_STAT_MATERIAL_URLS.has(material.sourceUrl)),
);
const MATERIALS_BEFORE_CURATED_HERITAGE = [...DISPLAY_STAT_MATERIALS, ...USER_CURATED_MATERIALS];
const MATERIAL_IDS_BEFORE_CURATED_HERITAGE = new Set(
  MATERIALS_BEFORE_CURATED_HERITAGE.map((material) => material.id),
);
const MATERIAL_URLS_BEFORE_CURATED_HERITAGE = new Set(
  MATERIALS_BEFORE_CURATED_HERITAGE.map((material) => material.sourceUrl).filter(Boolean),
);
const MATERIAL_TITLES_BEFORE_CURATED_HERITAGE = new Set(
  MATERIALS_BEFORE_CURATED_HERITAGE.map((material) => normalizeCatalogTitle(material.title)).filter(Boolean),
);
/** دفعة التراث المعتمدة: لا تمر إلا إذا لم تطابق معرّفًا أو رابطًا أو عنوانًا منطقيًا حاضرًا. */
const CURATED_HERITAGE_MATERIALS = curatedHeritageCatalog.materials.filter(
  (material) =>
    !MATERIAL_IDS_BEFORE_CURATED_HERITAGE.has(material.id) &&
    (!material.sourceUrl || !MATERIAL_URLS_BEFORE_CURATED_HERITAGE.has(material.sourceUrl)) &&
    !MATERIAL_TITLES_BEFORE_CURATED_HERITAGE.has(normalizeCatalogTitle(material.title)),
);

const MATERIALS_BEFORE_MILLION_BOOKS = [
  ...MATERIALS_BEFORE_CURATED_HERITAGE,
  ...CURATED_HERITAGE_MATERIALS,
];
const MATERIAL_IDS_BEFORE_MILLION_BOOKS = new Set(
  MATERIALS_BEFORE_MILLION_BOOKS.map((material) => material.id),
);
const MATERIAL_URLS_BEFORE_MILLION_BOOKS = new Set(
  MATERIALS_BEFORE_MILLION_BOOKS.map((material) => material.sourceUrl).filter(Boolean),
);
const MATERIAL_TITLES_BEFORE_MILLION_BOOKS = new Set(
  MATERIALS_BEFORE_MILLION_BOOKS.map((material) => normalizeCatalogTitle(material.title)).filter(Boolean),
);
/** دفعة مليون كتاب إسلامي: لا تمر إلا إذا لم تطابق معرّفًا أو رابطًا أو عنوانًا مطبعًا حاضرًا. */
const MILLION_BOOKS_MATERIALS = millionBooksCatalog.materials.filter(
  (material) =>
    !MATERIAL_IDS_BEFORE_MILLION_BOOKS.has(material.id) &&
    (!material.sourceUrl || !MATERIAL_URLS_BEFORE_MILLION_BOOKS.has(material.sourceUrl)) &&
    !MATERIAL_TITLES_BEFORE_MILLION_BOOKS.has(normalizeCatalogTitle(material.title)),
);

export const MATERIALS: Material[] = [
  ...MATERIALS_BEFORE_MILLION_BOOKS,
  ...MILLION_BOOKS_MATERIALS,
];
/** العدادات الحية للدواوين والمنظومات من كامل الكتالوج القابل للبحث. */
export const DIWAN_COUNT = MATERIALS.filter(
  (material) => isStandalonePoetryDiwan(material) || isScientificPoem(material),
).length;
/** عداد الدواوين الشعرية الحي بعد استبعاد المنظومات العلمية. */
export const POETRY_DIWAN_COUNT = MATERIALS.filter(isPoetryDiwan).length;
/** عداد المنظومات العلمية الحي من كامل الكتالوج. */
export const SCIENTIFIC_POEMS_COUNT = MATERIALS.filter(isScientificPoem).length;
/** عدد المناهج والمقررات الحيّ: مصدره السجلات المنقاة القابلة للبحث والعرض. */
export const CURRICULA_COUNT = DYNAMIC_CURRICULA.length;
/** عدد مواد المجامع الحيّ: يُعاد احتسابه من السجلات الموحّدة القابلة للبحث والتصفية. */
export const ACADEMY_COUNT = DYNAMIC_ACADEMIES.length;
/** عدد مواد الأندية الحيّ: يُعاد احتسابه من السجلات الموحدة القابلة للبحث والتصفية. */
export const LITERARY_CLUB_COUNT = LITERARY_CLUB_MATERIALS.length;
export const CORPUS_METADATA = corpus.metadata;
export const JOURNAL_SOURCES = corpus.metadata.journalSources;
export const DIWAN_SOURCE_LINKS = [
  {
    name: "الأرشيف العالمي — الدواوين",
    url: diwanCatalog.metadata.sourceIndexUrl,
  },
  {
    name: "الجامع — الدواوين",
    url: "https://aljam3.com/ar/categories/31",
  },
] as const;

/** مصادر موثقة مرتبطة بالمواد؛ تشمل قنوات ومكتبات عامة وروابط رسائل أصلية عند توفرها. */
export const VERIFIED_SOURCE_LINKS = [
  {
    name: "المنظومات العلمية",
    url: "https://t.me/c/1219051448/3607",
  },
  {
    name: "مكتبة القراءات العشر والتجويد",
    url: "https://t.me/c/2602541235/5241",
  },
  {
    name: "جامع الكتب المصورة",
    url: "https://t.me/ktbktb",
  },
  {
    name: "المكتبة الوقفية",
    url: "https://waqfeya.net/",
  },
  {
    name: "المكتبة الشاملة",
    url: "https://shamela.ws/",
  },
  {
    name: "كتب النحو والبلاغة",
    url: "https://t.me/mahmoudelbahery",
  },
  {
    name: "مكتبة النحو والصرف",
    url: "https://t.me/elom77yu",
  },
  {
    name: "الرسائل العلمية والبحوث المحكمة",
    url: "https://t.me/+gkYORRKE0wxhMDQ0",
  },
  {
    name: "المجامع اللغوية",
    url: "https://www.alashj.ae/%d8%a7%d9%84%d9%85%d8%ac%d8%a7%d9%85%d8%b9-%d9%88%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d9%84%d8%ba%d9%88%d9%8a%d8%a9-%d9%88%d8%a7%d9%84%d8%b9%d9%84%d9%85%d9%8a%d8%a9/",
  },
] as const;

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

/**
 * لا يمرّ الديوان إلى المربع الديناميكي إلا بوسم تحقّق صريح أضيف بعد فحص
 * بيانات المصدر ودمج المكرر؛ وبذلك تقبل الدواوين الموثقة والمستوردة المدققة
 * فقط، وتستبعد الدراسات التي تذكر الديوان عرضاً.
 */
export function isStandalonePoetryDiwan(
  material: Pick<Material, "primaryCategory" | "matchEvidence">,
): boolean {
  return (
    material.primaryCategory === "diwans" &&
    (material.matchEvidence.strongSignals.includes(CURATED_DIWAN_SIGNAL) ||
      material.matchEvidence.strongSignals.includes(IMPORTED_DIWAN_SIGNAL))
  );
}

/** سجلات المنظومات العلمية تُستمد من المصدر الموثق نفسه، من غير أي تغيير في ملفها الخام. */
export function isScientificPoem(material: Pick<Material, "primaryCategory" | "source">): boolean {
  return (
    material.primaryCategory === "scientific_poems" ||
    (material.primaryCategory === "diwans" && material.source === SCIENTIFIC_POEMS_SOURCE)
  );
}

/** الدواوين الشعرية وحدها: السجلات الموثقة التي لا تنتمي إلى مصدر المنظومات العلمية. */
export function isPoetryDiwan(
  material: Pick<Material, "primaryCategory" | "matchEvidence" | "source">,
): boolean {
  return isStandalonePoetryDiwan(material) && !isScientificPoem(material);
}

/**
 * بداية الباحث الجديد: كتب اللغة ذات الرابط المباشر في الأرشيف العالمي،
 * والمصنّفة مصدراً/مرجعاً أو معجماً. لا نخلط بها الرسائل والدراسات الحديثة؛
 * تبقى هذه المواد متاحة من «جميع المواد» والبحث العام.
 */
export function isClassicalArabicLanguageBook(
  material: Pick<Material, "source" | "primaryCategory">,
): boolean {
  return (
    material.source === CLASSICAL_LANGUAGE_BOOK_SOURCE &&
    (material.primaryCategory === "references" || material.primaryCategory === "dictionaries")
  );
}

/** القواميس الثنائية المعتمدة: تقاطع السجل الحالي مع قائمة المعرّفات الموثقة فقط. */
export function isBilingualArabicDictionary(material: Pick<Material, "id">): boolean {
  return BILINGUAL_DICTIONARY_IDS.has(material.id);
}

function includesEveryToken(haystack: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function matchesCurriculumFilters(
  facet: CurriculumFacet,
  filters: CurriculumFilters,
  ignoredFilter?: CurriculumFilterKey,
): boolean {
  return (
    (ignoredFilter === "country" || filters.country === "all" || facet.country === filters.country) &&
    (ignoredFilter === "materialType" ||
      filters.materialType === "all" ||
      facet.materialType === filters.materialType) &&
    (ignoredFilter === "organization" ||
      filters.organization === "all" ||
      facet.organization === filters.organization)
  );
}

/** تفصل مواد المناهج وفق حقولها الأصلية فقط، مع إبقاء القيم الفارغة تحت «غير محدد». */
export function filterCurriculumMaterials(
  materials: Material[],
  filters: CurriculumFilters,
): Material[] {
  return materials.filter((material) => {
    if (material.primaryCategory !== "curricula") return false;
    const facet = CURRICULUM_FACETS_BY_ID.get(material.id);
    return Boolean(facet && matchesCurriculumFilters(facet, filters));
  });
}

function curriculumOptionsFor(
  materials: Material[],
  filters: CurriculumFilters,
  key: CurriculumFilterKey,
): CurriculumFilterOption[] {
  const counts = new Map<string, number>();

  for (const material of materials) {
    if (material.primaryCategory !== "curricula") continue;
    const facet = CURRICULUM_FACETS_BY_ID.get(material.id);
    if (!facet || !matchesCurriculumFilters(facet, filters, key)) continue;
    counts.set(facet[key], (counts.get(facet[key]) ?? 0) + 1);
  }

  const selectedValue = filters[key];
  if (selectedValue !== "all" && !counts.has(selectedValue)) {
    counts.set(selectedValue, 0);
  }

  return Array.from(counts, ([value, count]) => ({ value, count }))
    .filter((option) => option.count > 0 || option.value === selectedValue)
    .sort((left, right) => left.value.localeCompare(right.value, "ar"));
}

/**
 * خيارات الفلاتر تُشتق من سجلات المناهج نفسها، وتتغير أعدادها بحسب الفلترين الآخرين.
 * لا تُنشأ نسخة بيانات ولا تُقرأ قيمة من عنوان السجل أو وصفه.
 */
export function getCurriculumFilterOptions(
  materials: Material[],
  filters: CurriculumFilters,
): CurriculumFilterOptions {
  return {
    country: curriculumOptionsFor(materials, filters, "country"),
    materialType: curriculumOptionsFor(materials, filters, "materialType"),
    organization: curriculumOptionsFor(materials, filters, "organization"),
  };
}

function matchesAcademyFilters(
  facet: AcademyFacet,
  filters: AcademyFilters,
  ignoredFilter?: AcademyFilterKey,
): boolean {
  return (
    (ignoredFilter === "academy" || filters.academy === "all" || facet.academy === filters.academy) &&
    (ignoredFilter === "country" || filters.country === "all" || facet.country === filters.country) &&
    (ignoredFilter === "materialType" ||
      filters.materialType === "all" ||
      facet.materialType === filters.materialType) &&
    (ignoredFilter === "year" || filters.year === "all" || facet.year === filters.year) &&
    (ignoredFilter === "linkStatus" ||
      filters.linkStatus === "all" ||
      facet.linkStatus === filters.linkStatus)
  );
}

/** تفصل مواد المجامع وفق حقول السجل الموحّد فقط، ولا تستنتج أي قيمة من عنوان المادة أو وصفها. */
export function filterAcademyMaterials(
  materials: Material[],
  filters: AcademyFilters,
): Material[] {
  return materials.filter((material) => {
    if (material.primaryCategory !== "academies") return false;
    const facet = ACADEMY_FACETS_BY_ID.get(material.id);
    return Boolean(facet && matchesAcademyFilters(facet, filters));
  });
}

function academyOptionsFor(
  materials: Material[],
  filters: AcademyFilters,
  key: AcademyFilterKey,
): CurriculumFilterOption[] {
  const counts = new Map<string, number>();

  for (const material of materials) {
    if (material.primaryCategory !== "academies") continue;
    const facet = ACADEMY_FACETS_BY_ID.get(material.id);
    if (!facet || !matchesAcademyFilters(facet, filters, key)) continue;
    counts.set(facet[key], (counts.get(facet[key]) ?? 0) + 1);
  }

  const selectedValue = filters[key];
  if (selectedValue !== "all" && !counts.has(selectedValue)) {
    counts.set(selectedValue, 0);
  }

  return Array.from(counts, ([value, count]) => ({ value, count }))
    .filter((option) => option.count > 0 || option.value === selectedValue)
    .sort((left, right) => left.value.localeCompare(right.value, "ar"));
}

/** تتغير خيارات مرشحات المجامع وأعدادها بحسب المرشحات الأخرى وبالاعتماد على السجلات الفعلية نفسها. */
export function getAcademyFilterOptions(
  materials: Material[],
  filters: AcademyFilters,
): AcademyFilterOptions {
  return {
    academy: academyOptionsFor(materials, filters, "academy"),
    country: academyOptionsFor(materials, filters, "country"),
    materialType: academyOptionsFor(materials, filters, "materialType"),
    year: academyOptionsFor(materials, filters, "year"),
    linkStatus: academyOptionsFor(materials, filters, "linkStatus"),
  };
}

function matchesLiteraryClubFilters(
  facet: LiteraryClubFacet,
  filters: LiteraryClubFilters,
  ignoredFilter?: LiteraryClubFilterKey,
): boolean {
  return (
    (ignoredFilter === "club" || filters.club === "all" || facet.club === filters.club) &&
    (ignoredFilter === "country" || filters.country === "all" || facet.country === filters.country) &&
    (ignoredFilter === "city" || filters.city === "all" || facet.city === filters.city) &&
    (ignoredFilter === "materialType" ||
      filters.materialType === "all" ||
      facet.materialType === filters.materialType) &&
    (ignoredFilter === "year" || filters.year === "all" || facet.year === filters.year) &&
    (ignoredFilter === "linkStatus" ||
      filters.linkStatus === "all" ||
      facet.linkStatus === filters.linkStatus)
  );
}

/** تفصل مواد الأندية وفق الحقول الموحّدة في السجلات المستوردة فقط، مع تقديم الأندية السعودية في النتائج. */
export function filterLiteraryClubMaterials(
  materials: Material[],
  filters: LiteraryClubFilters,
): Material[] {
  const matchingMaterials = materials.filter((material) => {
    if (material.primaryCategory !== "literary_clubs") return false;
    const facet = LITERARY_CLUB_FACETS_BY_ID.get(material.id);
    return Boolean(facet && matchesLiteraryClubFilters(facet, filters));
  });

  return matchingMaterials.sort((left, right) => {
    const leftIsSaudi =
      LITERARY_CLUB_FACETS_BY_ID.get(left.id)?.country === LITERARY_CLUB_PRIORITY_COUNTRY ? 0 : 1;
    const rightIsSaudi =
      LITERARY_CLUB_FACETS_BY_ID.get(right.id)?.country === LITERARY_CLUB_PRIORITY_COUNTRY
        ? 0
        : 1;
    return leftIsSaudi - rightIsSaudi;
  });
}

function literaryClubOptionsFor(
  materials: Material[],
  filters: LiteraryClubFilters,
  key: LiteraryClubFilterKey,
): CurriculumFilterOption[] {
  const counts = new Map<string, number>();

  for (const material of materials) {
    if (material.primaryCategory !== "literary_clubs") continue;
    const facet = LITERARY_CLUB_FACETS_BY_ID.get(material.id);
    if (!facet || !matchesLiteraryClubFilters(facet, filters, key)) continue;
    counts.set(facet[key], (counts.get(facet[key]) ?? 0) + 1);
  }

  const selectedValue = filters[key];
  if (selectedValue !== "all" && !counts.has(selectedValue)) {
    counts.set(selectedValue, 0);
  }

  return Array.from(counts, ([value, count]) => ({ value, count }))
    .filter((option) => option.count > 0 || option.value === selectedValue)
    .sort((left, right) => {
      if (key === "country") {
        const leftIsSaudi = left.value === LITERARY_CLUB_PRIORITY_COUNTRY;
        const rightIsSaudi = right.value === LITERARY_CLUB_PRIORITY_COUNTRY;
        if (leftIsSaudi !== rightIsSaudi) return leftIsSaudi ? -1 : 1;
      }

      if (key === "club") {
        const leftIsSaudiClub = SAUDI_LITERARY_CLUBS.has(left.value);
        const rightIsSaudiClub = SAUDI_LITERARY_CLUBS.has(right.value);
        if (leftIsSaudiClub !== rightIsSaudiClub) return leftIsSaudiClub ? -1 : 1;
      }

      return left.value.localeCompare(right.value, "ar");
    });
}

/** خيارات مرشحات الأندية وأعدادها تُشتق مباشرةً من السجلات الفعلية الموحّدة. */
export function getLiteraryClubFilterOptions(
  materials: Material[],
  filters: LiteraryClubFilters,
): LiteraryClubFilterOptions {
  return {
    club: literaryClubOptionsFor(materials, filters, "club"),
    country: literaryClubOptionsFor(materials, filters, "country"),
    city: literaryClubOptionsFor(materials, filters, "city"),
    materialType: literaryClubOptionsFor(materials, filters, "materialType"),
    year: literaryClubOptionsFor(materials, filters, "year"),
    linkStatus: literaryClubOptionsFor(materials, filters, "linkStatus"),
  };
}

export function filterMaterials(
  materials: Material[],
  query: string,
  category: MaterialCategory,
  source: string,
): Material[] {
  const normalizedQuery = normalizeArabic(query);

  return materials.filter((material) => {
    const matchesCategory =
      category === "all"
        ? true
        : category === "diwans"
          ? isPoetryDiwan(material)
          : category === "scientific_poems"
            ? isScientificPoem(material)
            : category === "bilingual_dictionaries"
              ? isBilingualArabicDictionary(material)
              : material.primaryCategory === category;
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
  academic_theses: "الرسائل العلمية",
  references: "المصادر والمراجع",
  dictionaries: "المعاجم اللغوية",
  bilingual_dictionaries: "القواميس الثنائية",
  diwans: "الدواوين",
  scientific_poems: "المنظومات العلمية",
  curricula: "المناهج والمقررات",
  academies: "المجامع اللغوية",
  literary_clubs: "الأندية الأدبية",
};

/** تسمية البطاقة تتبع القسم المشتق للمنظومات مع بقاء تصنيف السجل الأصلي كما هو. */
export function getMaterialCategoryLabel(
  material: Pick<Material, "primaryCategory" | "source">,
): string {
  return isScientificPoem(material)
    ? MATERIAL_CATEGORY_LABELS.scientific_poems
    : MATERIAL_CATEGORY_LABELS[material.primaryCategory];
}

/*
 * فلسفة التصميم: مكنز عربي بتركواز مائي عميق، وعلامات نقطية مستلهمة من التشكيل والفهرسة.
 * بطاقات الغلاف تستمد عداداتها من الكتالوج الحي لتطابق الأقسام ونتائج البحث بعد كل إضافة.
 * شريط فلاتر المناهج يستعير الهوية المرجعية نفسها ويظهر داخل نتائج «المناهج والمقررات» وحدها.
 * تبدأ واجهة المواد بعناوين تحوي «معلقة»؛ وتبقى مقدمتها خالية من الشارة والعبارة الزخرفيتين.
 * الهيدر السفلي يقتصر على المشاركة والتنبيهات والتوقيع؛ ويعرض مصادر المكنز الثابتة والقنوات الموثقة ضمن القائمة الحالية.
 * أزرار الأقسام تحافظ على هندستها الحالية، وتضيف شارات عدد حية داخلية فقط بمحاذاة البداية المرئية للزر في RTL.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BookX,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe2,
  Info,
  Library,
  Mail,
  Moon,
  Search,
  Send,
  ShieldAlert,
  Sun,
  X,
} from "lucide-react";
import {
  ACADEMY_FILTER_DEFAULTS,
  VERIFIED_SOURCE_LINKS,
  CORPUS_METADATA,
  CURRICULUM_FILTER_DEFAULTS,
  DIWAN_SOURCE_LINKS,
  LITERARY_CLUB_FILTER_DEFAULTS,
  displayCount,
  filterAcademyMaterials,
  filterCurriculumMaterials,
  filterLiteraryClubMaterials,
  filterMaterials,
  getAcademyFilterOptions,
  getCurriculumFilterOptions,
  getLiteraryClubFilterOptions,
  getMaterialCategoryLabel,
  isScientificPoem,
  isStandalonePoetryDiwan,
  normalizeArabic,
  MATERIAL_CATEGORY_LABELS,
  MATERIALS,
  type AcademyFilterKey,
  type AcademyFilters,
  type CurriculumFilterKey,
  type CurriculumFilters,
  type LiteraryClubFilterKey,
  type LiteraryClubFilters,
  type MaterialCategory,
} from "@/lib/materials";

const PAGE_SIZE = 12;

const WHATSAPP_ICON_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

type StatFilter = "all" | "linguistics" | "lexicon-literature-rhetoric" | "diwans";

type StatCard = {
  id: StatFilter;
  label: string;
  count: number;
};

const STAT_FILTER_LABELS: Record<StatFilter, string> = {
  all: "المواد العلمية",
  linguistics: "علوم اللغة",
  "lexicon-literature-rhetoric": "المعاجم والأدب",
  diwans: "الدواوين والمنظومات",
};

// تعرض الصفحة الأولى المواد التي تحوي «معلقة» في العنوان؛ ولا تغيّر هذه المجموعة أي بيانات في الكتالوج.
const DEFAULT_MUALLAQA_QUERY = normalizeArabic("معلقة");
const DEFAULT_MUALLAQA_MATERIALS = MATERIALS.filter((material) =>
  normalizeArabic(material.title).includes(DEFAULT_MUALLAQA_QUERY),
);

function hasAnyTag(material: (typeof MATERIALS)[number], tags: string[]) {
  return tags.some((tag) => material.tags.includes(tag as (typeof material.tags)[number]));
}

function matchesStatFilter(material: (typeof MATERIALS)[number], filter: StatFilter) {
  if (filter === "all") return true;
  if (filter === "linguistics") {
    return hasAnyTag(material, ["نحو", "صرف", "دراسات لغوية"]);
  }
  if (filter === "lexicon-literature-rhetoric") {
    return hasAnyTag(material, ["معجم لغوي", "شعر وأدب", "بلاغة"]);
  }
  return isStandalonePoetryDiwan(material) || isScientificPoem(material);
}

const STAT_CARDS: StatCard[] = [
  { id: "all", label: STAT_FILTER_LABELS.all, count: MATERIALS.length },
  {
    id: "linguistics",
    label: STAT_FILTER_LABELS.linguistics,
    count: MATERIALS.filter((material) => matchesStatFilter(material, "linguistics")).length,
  },
  {
    id: "lexicon-literature-rhetoric",
    label: STAT_FILTER_LABELS["lexicon-literature-rhetoric"],
    count: MATERIALS.filter((material) =>
      matchesStatFilter(material, "lexicon-literature-rhetoric"),
    ).length,
  },
  {
    id: "diwans",
    label: STAT_FILTER_LABELS.diwans,
    count: MATERIALS.filter((material) => matchesStatFilter(material, "diwans")).length,
  },
];

/** عدادات حية لأزرار الأقسام؛ تستخدم مرشح الكتالوج نفسه الذي يحدد نتائج كل قسم. */
const CATEGORY_BUTTON_COUNTS = Object.fromEntries(
  (Object.keys(MATERIAL_CATEGORY_LABELS) as MaterialCategory[]).map((category) => [
    category,
    filterMaterials(MATERIALS, "", category, "all").length,
  ]),
) as Record<MaterialCategory, number>;

const CURRICULUM_FILTER_LABELS: Record<
  CurriculumFilterKey,
  { label: string; allLabel: string }
> = {
  country: { label: "الدولة", allLabel: "جميع الدول" },
  materialType: { label: "نوع المادة", allLabel: "جميع الأنواع" },
  organization: { label: "الجهة", allLabel: "جميع الجهات" },
};

const CURRICULUM_FILTER_KEYS = Object.keys(
  CURRICULUM_FILTER_LABELS,
) as CurriculumFilterKey[];

const ACADEMY_FILTER_LABELS: Record<
  AcademyFilterKey,
  { label: string; allLabel: string }
> = {
  academy: { label: "المجمع", allLabel: "جميع المجامع" },
  country: { label: "الدولة", allLabel: "جميع الدول" },
  materialType: { label: "نوع المادة", allLabel: "جميع الأنواع" },
  year: { label: "السنة", allLabel: "جميع السنوات" },
  linkStatus: { label: "حالة الرابط", allLabel: "جميع الحالات" },
};

const ACADEMY_FILTER_KEYS = Object.keys(ACADEMY_FILTER_LABELS) as AcademyFilterKey[];

const LITERARY_CLUB_FILTER_LABELS: Record<
  LiteraryClubFilterKey,
  { label: string; allLabel: string }
> = {
  club: { label: "النادي", allLabel: "جميع الأندية" },
  country: { label: "الدولة", allLabel: "جميع الدول" },
  city: { label: "المدينة", allLabel: "جميع المدن" },
  materialType: { label: "نوع المادة", allLabel: "جميع الأنواع" },
  year: { label: "السنة", allLabel: "جميع السنوات" },
  linkStatus: { label: "حالة الرابط", allLabel: "جميع الحالات" },
};

const LITERARY_CLUB_FILTER_KEYS = Object.keys(
  LITERARY_CLUB_FILTER_LABELS,
) as LiteraryClubFilterKey[];

function DisclaimerModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="disclaimer-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="disclaimer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="disclaimer-modal__accent" />
        <header className="disclaimer-modal__header">
          <ShieldAlert aria-hidden="true" />
          <h2 id="disclaimer-title">حول المكنز</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="إغلاق النافذة"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="disclaimer-modal__content">
          <p>
            مكنز اللغة العربية وعلومها فهرسٌ تجميعيٌّ للروابط والإحالات إلى مواد
            منشورة في مصادر خارجية، أُعدّ لتيسير الوصول وخدمة الباحثين في اللغة
            العربية وعلومها. لا يدّعي ملكية المواد ولا يضمن محتواها أو دقتها أو
            بقاء روابطها. تبقى الحقوق لأصحابها، ويتحمّل المستخدم مسؤولية التحقق
            من المادة وحقوق استخدامها. تُراجع الإحالات وروابطها ضمن دورات
            التحديث الدورية للمكنز.
          </p>
        </div>
        <div className="disclaimer-modal__actions">
          <button type="button" className="modal-confirm" onClick={onClose}>
            فهمت
          </button>
        </div>
      </section>
    </div>
  );
}

function WhatsappGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={WHATSAPP_ICON_PATH} />
    </svg>
  );
}

function getCatalogIdentifier(title: string) {
  const match = title.match(/^(\d{4,})(?:[_\s-]+|$)/);
  return match?.[1] ?? null;
}

function formatCatalogTitle(title: string) {
  const withoutIdentifier = title
    .replace(/^\d{4,}[_\s-]+/, "")
    .replace(/^0{2,}(?=[\u0600-\u06FF])/, "");

  return withoutIdentifier.replace(/_/g, " ").replace(/\s+/g, " ").trim() || title;
}

function MaterialCard({ material }: { material: (typeof MATERIALS)[number] }) {
  const [copied, setCopied] = useState(false);
  const isAcademyMaterial = material.primaryCategory === "academies";
  const isLiteraryClubMaterial = material.primaryCategory === "literary_clubs";
  const hasSourceLink = Boolean(material.sourceUrl);
  const isBuhoothMaterial = /^https?:\/\/(?:www\.)?buhooth\.link(?::\d+)?\//i.test(material.sourceUrl);
  const isTelegramSource = /^https?:\/\/t\.me\//i.test(material.sourceUrl);
  const isInternetArchiveSource = /^https?:\/\/(?:www\.)?archive\.org\//i.test(material.sourceUrl);
  const isDdlTitleSearch = material.source === "مركز المعرفة الرقمي (بحث)";
  const catalogIdentifier = getCatalogIdentifier(material.title);
  const displayTitle = formatCatalogTitle(material.title);
  const ExternalSourceIcon = isTelegramSource ? Send : ExternalLink;
  const externalActionLabel = isDdlTitleSearch
    ? "فتح إحالة البحث"
    : isTelegramSource
      ? "فتح في قناة تيليجرام"
      : isInternetArchiveSource
        ? "فتح في أرشيف"
        : "فتح الرابط";
  const externalActionTitle = isDdlTitleSearch
    ? `فتح نتائج البحث بعنوان «${displayTitle}» في مركز المعرفة الرقمي`
    : isTelegramSource
      ? "فتح منشور المادة في قناة تيليجرام"
      : isInternetArchiveSource
        ? "فتح المادة في موقع أرشيف"
        : `فتح رابط المادة في ${material.source}`;

  const copyMaterialLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) return;
      await navigator.clipboard.writeText(material.sourceUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="material-card">
      <div className="material-card__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="material-card__body">
        <header className="material-card__record-head">
          <div className="material-card__topline">
            <span className="material-card__category">
              {getMaterialCategoryLabel(material)}
            </span>
            <span className="material-card__source">{material.source}</span>
          </div>
          {catalogIdentifier && (
            <span className="material-card__identifier">سجل {catalogIdentifier}</span>
          )}
        </header>
        <h3 title={material.title}>{displayTitle}</h3>
        <dl className="material-card__metadata">
          <div>
            <dt>{isAcademyMaterial || isLiteraryClubMaterial ? "الدولة" : "المؤلف"}</dt>
            <dd>{material.author || "لم يرد في الفهرس"}</dd>
          </div>
          <div>
            <dt>الوسوم</dt>
            <dd>
              <span className="material-card__tags">
                {material.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </span>
            </dd>
          </div>
        </dl>
      </div>
      {isBuhoothMaterial ? (
        <button
          type="button"
          className="material-card__link"
          onClick={copyMaterialLink}
          title="نسخ رابط المادة من موقع بحوث"
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span>
        </button>
      ) : hasSourceLink ? (
        <a
          className="material-card__link"
          href={material.sourceUrl}
          target="_blank"
          rel="noreferrer"
          title={externalActionTitle}
        >
          <ExternalSourceIcon size={16} aria-hidden="true" />
          <span>{externalActionLabel}</span>
        </a>
      ) : (
        <span className="material-card__link" aria-disabled="true" title="لا يتوفر رابط في السجل المصدر">
          <ExternalLink size={16} aria-hidden="true" />
          <span>لا يتوفر رابط</span>
        </span>
      )}
    </article>
  );
}

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [footerSourcesOpen, setFooterSourcesOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MaterialCategory>("all");
  const [statFilter, setStatFilter] = useState<StatFilter>("all");
  const [curriculumFilters, setCurriculumFilters] = useState<CurriculumFilters>(
    CURRICULUM_FILTER_DEFAULTS,
  );
  const [academyFilters, setAcademyFilters] = useState<AcademyFilters>(
    ACADEMY_FILTER_DEFAULTS,
  );
  const [literaryClubFilters, setLiteraryClubFilters] = useState<LiteraryClubFilters>(
    LITERARY_CLUB_FILTER_DEFAULTS,
  );
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  const currentUrl =
    typeof window === "undefined"
      ? "https://arabic.dralhoshan.com/"
      : window.location.href;
  const shareText = "مكنز اللغة العربية وعلومها — فهرس للمصادر العلمية للباحثين";
  const shareUrl = encodeURIComponent(`${shareText}\n${currentUrl}`);

  const isCurriculaCategory = category === "curricula";
  const isAcademiesCategory = category === "academies";
  const isLiteraryClubsCategory = category === "literary_clubs";
  const hasMaterialsTitle = Boolean(query.trim()) || category !== "all" || statFilter !== "all";
  const curriculumFilterOptions = useMemo(
    () => getCurriculumFilterOptions(MATERIALS, curriculumFilters),
    [curriculumFilters],
  );
  const academyFilterOptions = useMemo(
    () => getAcademyFilterOptions(MATERIALS, academyFilters),
    [academyFilters],
  );
  const literaryClubFilterOptions = useMemo(
    () => getLiteraryClubFilterOptions(MATERIALS, literaryClubFilters),
    [literaryClubFilters],
  );

  // تبدأ القائمة بعناوين «معلقة» في الحالة الافتراضية؛ أما البحث أو اختيار قسم فيمتد إلى كل مواد المكنز.
  const filteredMaterials = useMemo(() => {
    const hasActiveFilter = Boolean(query.trim()) || category !== "all" || statFilter !== "all";
    const searchableMaterials = hasActiveFilter ? MATERIALS : DEFAULT_MUALLAQA_MATERIALS;
    const categoryMatches =
      category === "curricula"
        ? filterCurriculumMaterials(MATERIALS, curriculumFilters)
        : category === "academies"
          ? filterAcademyMaterials(MATERIALS, academyFilters)
          : category === "literary_clubs"
            ? filterLiteraryClubMaterials(MATERIALS, literaryClubFilters)
            : filterMaterials(searchableMaterials, query, category, "all");
    const searchMatches =
      category === "curricula" || category === "academies" || category === "literary_clubs"
        ? filterMaterials(categoryMatches, query, "all", "all")
        : categoryMatches;

    return searchMatches.filter((material) => matchesStatFilter(material, statFilter));
  }, [query, category, statFilter, curriculumFilters, academyFilters, literaryClubFilters]);
  const pageCount = Math.max(1, Math.ceil(filteredMaterials.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageMaterials = filteredMaterials.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [query, category, statFilter, curriculumFilters, academyFilters]);

  useEffect(() => {
    if (category !== "curricula") {
      setCurriculumFilters((filters) =>
        filters.country === "all" &&
        filters.materialType === "all" &&
        filters.organization === "all"
          ? filters
          : CURRICULUM_FILTER_DEFAULTS,
      );
    }
  }, [category]);

  useEffect(() => {
    if (category !== "academies") {
      setAcademyFilters((filters) =>
        filters.academy === "all" &&
        filters.country === "all" &&
        filters.materialType === "all" &&
        filters.year === "all" &&
        filters.linkStatus === "all"
          ? filters
          : ACADEMY_FILTER_DEFAULTS,
      );
    }
  }, [category]);

  useEffect(() => {
    if (category !== "literary_clubs") {
      setLiteraryClubFilters((filters) =>
        filters.club === "all" &&
        filters.country === "all" &&
        filters.city === "all" &&
        filters.materialType === "all" &&
        filters.year === "all" &&
        filters.linkStatus === "all"
          ? filters
          : LITERARY_CLUB_FILTER_DEFAULTS,
      );
    }
  }, [category]);

  const updateCurriculumFilter = (key: CurriculumFilterKey, value: string) => {
    setCurriculumFilters((filters) => ({ ...filters, [key]: value }));
  };

  const updateAcademyFilter = (key: AcademyFilterKey, value: string) => {
    setAcademyFilters((filters) => ({ ...filters, [key]: value }));
  };

  const updateLiteraryClubFilter = (key: LiteraryClubFilterKey, value: string) => {
    setLiteraryClubFilters((filters) => ({ ...filters, [key]: value }));
  };

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setStatFilter("all");
    setCurriculumFilters(CURRICULUM_FILTER_DEFAULTS);
    setAcademyFilters(ACADEMY_FILTER_DEFAULTS);
    setLiteraryClubFilters(LITERARY_CLUB_FILTER_DEFAULTS);
  };

  const chooseStat = (stat: StatCard) => {
    setCategory("all");
    setStatFilter(stat.id);
    document
      .getElementById("materials-title")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard?.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main
      className={`thesaurus-page ${isDark ? "thesaurus-page--dark" : ""}`}
      dir="rtl"
    >
      {showDisclaimer && (
        <DisclaimerModal onClose={() => setShowDisclaimer(false)} />
      )}

      <header className="hero hero--blue" id="top">
        <style>{`
          /* نطاق الهيدر فقط: مرجع أزرق هادئ، خط عربي تقليدي للعنوان وخط حديث للواجهة. */
          .hero.hero--blue,
          .thesaurus-page--dark .hero.hero--blue {
            min-height: 0;
            color: #f8fbff;
            background: linear-gradient(135deg, #063a8c 0%, #0866d6 54%, #07489f 100%);
          }

          .hero.hero--blue::before {
            background:
              radial-gradient(ellipse 52% 65% at 77% 18%, rgba(154, 208, 255, 0.2), transparent 70%),
              radial-gradient(ellipse 48% 62% at 18% 100%, rgba(112, 183, 255, 0.14), transparent 70%),
              repeating-linear-gradient(118deg, rgba(255, 255, 255, 0.022) 0 1px, transparent 1px 9px);
          }

          .hero.hero--blue::after {
            display: none;
          }

          .hero.hero--blue + .reference-search {
            border-top: 0;
            border-bottom-color: rgba(218, 233, 255, 0.38);
            background: linear-gradient(135deg, #063a8c 0%, #0866d6 54%, #07489f 100%);
            box-shadow: 0 1px 12px rgba(3, 58, 140, 0.16);
          }

          .hero.hero--blue + .reference-search::before {
            display: none;
          }

          .hero.hero--blue + .reference-search .search-status {
            color: rgba(248, 251, 255, 0.92);
          }

          .hero.hero--blue + .reference-search .filter-button {
            border-color: rgba(235, 245, 255, 0.64);
            background: rgba(255, 255, 255, 0.08);
            color: #f8fbff;
          }

          .hero.hero--blue + .reference-search .filter-button:hover {
            border-color: rgba(255, 255, 255, 0.92);
            background: rgba(255, 255, 255, 0.17);
            color: #ffffff;
          }

          .hero.hero--blue + .reference-search .filter-button--active {
            border-color: #ffffff;
            background: #ffffff;
            color: #075bc8;
          }

          .hero.hero--blue + .reference-search .filter-button__count {
            display: inline-flex;
            min-width: 1.78rem;
            align-items: center;
            justify-content: center;
            padding: 0.18rem 0.35rem;
            border: 1px solid currentColor;
            border-radius: 5px;
            background: rgba(255, 255, 255, 0.1);
            color: inherit;
            direction: ltr;
            font-family: "Tajawal", "Noto Kufi Arabic", sans-serif;
            font-size: 0.78em;
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            line-height: 1;
            white-space: nowrap;
          }

          .hero.hero--blue + .reference-search .filter-button--active .filter-button__count {
            background: rgba(7, 91, 200, 0.08);
          }

          @media (max-width: 639px) {
            .hero.hero--blue + .reference-search .filter-button__count {
              min-width: 1.62rem;
              padding-inline: 0.28rem;
              font-size: 0.74em;
            }
          }

          .disclaimer-modal {
            border-color: rgba(185, 216, 255, 0.58);
            background: linear-gradient(160deg, #07489f 0%, #063a8c 100%);
            box-shadow: 0 22px 60px rgba(3, 58, 140, 0.42);
          }

          .disclaimer-modal__accent {
            background: linear-gradient(90deg, #075bc8, #c7ddff, #075bc8);
          }

          .disclaimer-modal__header > svg {
            color: #d9eaff;
          }

          .modal-confirm {
            background: linear-gradient(135deg, #075bc8, #3f8fe6);
          }

          .thesaurus-page .share-section {
            background:
              radial-gradient(circle at 20% 0%, rgba(161, 211, 255, 0.18), transparent 36%),
              linear-gradient(135deg, #063a8c 0%, #0866d6 54%, #07489f 100%);
          }

          .thesaurus-page .share-section h2 {
            color: #e7f2ff;
          }

          .thesaurus-page .share-section > p {
            color: #c9e0ff;
          }

          .thesaurus-page .share-divider {
            background: rgba(220, 237, 255, 0.45);
          }

          .thesaurus-page .copy-link {
            background: #075bc8;
            color: #ffffff;
          }

          .thesaurus-page .footer-main {
            background: linear-gradient(160deg, #063a8c 0%, #042e72 100%);
          }

          .thesaurus-page .footer-notes,
          .thesaurus-page .footer-sources__empty {
            color: #c9e0ff;
          }

          .thesaurus-page .footer-notes a,
          .thesaurus-page .footer-sources__empty a {
            color: #e7f2ff;
          }

          .thesaurus-page .footer-sources {
            border-color: rgba(203, 227, 255, 0.3);
          }

          .thesaurus-page .footer-sources__trigger {
            color: #f8fbff;
          }

          .thesaurus-page .footer-index-mark span {
            background: #d8eaff;
            box-shadow: 0 0 0 3px rgba(161, 211, 255, 0.14);
          }

          .hero.hero--blue,
          .hero.hero--blue *,
          .hero.hero--blue::before,
          .hero.hero--blue::after {
            animation: none !important;
            transition: none !important;
          }

          .hero.hero--blue .hero__top-line,
          .hero.hero--blue .hero__bottom-line,
          .hero.hero--blue .hero__stats::before,
          .hero.hero--blue .hero__stats::after,
          .hero.hero--blue .hero-stat__index,
          .hero.hero--blue .hero-stat__hint,
          .hero.hero--blue .hero-stat--button::after {
            display: none;
          }

          .hero.hero--blue .hero__theme-control,
          .hero.hero--blue .hero__about-control {
            z-index: 3;
            top: 20px;
          }

          .hero.hero--blue .theme-toggle,
          .hero.hero--blue .about-trigger {
            border: 1px solid rgba(232, 243, 255, 0.5);
            background: rgba(255, 255, 255, 0.045);
            color: #f8fbff;
            box-shadow: none;
            backdrop-filter: none;
          }

          .hero.hero--blue .theme-toggle:hover,
          .hero.hero--blue .about-trigger:hover {
            border-color: rgba(248, 251, 255, 0.84);
            background: rgba(255, 255, 255, 0.1);
          }

          .hero.hero--blue .about-trigger {
            min-width: auto;
            min-height: 38px;
            padding: 7px 16px;
            border-radius: 10px;
            font-family: "Tajawal", "Noto Kufi Arabic", sans-serif;
            font-size: 13px;
            font-weight: 500;
            line-height: 1;
          }

          .hero.hero--blue .about-trigger::before,
          .hero.hero--blue .about-trigger::after {
            display: none;
            content: none;
          }

          .hero.hero--blue .hero__content {
            z-index: 1;
            padding: 92px 20px 43px;
            text-align: center;
          }

          .hero.hero--blue .hero-title {
            gap: 3px;
            color: #f8fbff;
            font-family: "Al Mohanad", "Amiri", serif;
            font-weight: 700;
            line-height: 1.1;
            text-shadow: none;
          }

          /* الهوية المعتمدة: لوحة العنوان أكبر بنسبة 10% لإبراز اسم المكنز مع الحفاظ على المسافات المتجاوبة. */
          .hero.hero--blue .hero-title--art {
            width: min(100%, clamp(330px, 55vw, 704px));
            margin: 0 auto;
          }

          .hero.hero--blue .hero-title--art img {
            display: block;
            width: 100%;
            height: auto;
          }

          .hero.hero--blue .hero-title__kicker {
            color: #f8fbff;
            font-size: 38px;
            line-height: 1.1;
          }

          .hero.hero--blue .hero-title__name {
            color: #f8fbff;
            font-size: clamp(52px, 5.6vw, 76px);
            line-height: 1.12;
            white-space: normal;
          }

          .hero.hero--blue .hero__description {
            gap: 0;
            max-width: 660px;
            margin: 14px auto 25px;
            color: #e4eeff;
            font-family: "Tajawal", "Noto Kufi Arabic", sans-serif;
            font-size: 20px;
            font-weight: 400;
            line-height: 1.8;
          }

          .hero.hero--blue .hero__stats {
            width: min(100%, 650px);
            gap: 10px;
            padding: 0;
          }

          .hero.hero--blue .hero-stat {
            min-height: 116px;
            border: 1px solid rgba(232, 243, 255, 0.48);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.045);
            box-shadow: none;
            backdrop-filter: none;
          }

          .hero.hero--blue .hero-stat--button {
            align-items: center;
            justify-content: center;
            padding: 15px 12px 13px;
            color: #f8fbff;
            text-align: center;
          }

          .hero.hero--blue .hero-stat--button:hover,
          .hero.hero--blue .hero-stat--button:focus-visible {
            border-color: rgba(248, 251, 255, 0.76);
            background: rgba(255, 255, 255, 0.09);
          }

          .hero.hero--blue .hero-stat--button:focus-visible {
            outline-color: #f8fbff;
          }

          .hero.hero--blue .hero-stat__label {
            color: #e7f0ff;
            font-family: "Tajawal", "Noto Kufi Arabic", sans-serif;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.45;
          }

          .hero.hero--blue .hero-stat__number {
            margin-top: 9px;
            color: #ffffff;
            font-family: "Tajawal", "Noto Kufi Arabic", sans-serif;
            font-size: 40px;
            font-variant-numeric: tabular-nums;
            font-weight: 400;
            letter-spacing: 0;
            line-height: 1;
            text-shadow: none;
          }

          .hero.hero--blue .hero__search {
            width: min(100%, 560px);
            margin-top: 25px;
          }

          .hero.hero--blue .search-field {
            min-height: 50px;
            height: 50px;
            margin: 0;
            overflow: visible;
            border: 0;
            border-radius: 999px;
            background: #ffffff;
            box-shadow: none;
            color: #1c2b43;
            direction: ltr;
          }

          .hero.hero--blue .search-field > svg {
            flex: 0 0 auto;
            margin: 0 14px;
            color: #075bc8;
          }

          .hero.hero--blue .search-field input {
            flex: 1;
            width: auto;
            height: 50px;
            padding: 0 16px 0 8px;
            color: #1c2b43;
            direction: rtl;
            font-family: "Tajawal", "Noto Kufi Arabic", sans-serif;
            font-size: 14px;
            text-align: right;
          }

          .hero.hero--blue .search-field input::placeholder {
            color: #6c7280;
            opacity: 1;
          }

          .hero.hero--blue .search-field__clear {
            top: 10px;
            right: 9px;
            left: auto;
            color: #075bc8;
          }

          .hero.hero--blue .search-field__clear:hover {
            background: rgba(7, 91, 200, 0.1);
            color: #075bc8;
          }

          @media (max-width: 639px) {
            .hero.hero--blue .hero__theme-control,
            .hero.hero--blue .hero__about-control {
              top: 14px;
            }

            .hero.hero--blue .hero__theme-control {
              left: 14px;
            }

            .hero.hero--blue .hero__about-control {
              right: 14px;
            }

            .hero.hero--blue .hero__content {
              padding: 78px 20px 32px;
            }

            .hero.hero--blue .hero-title__kicker {
              font-size: 30px;
            }

            .hero.hero--blue .hero-title__name {
              font-size: 40px;
              line-height: 1.2;
            }

            .hero.hero--blue .hero__description {
              margin-top: 12px;
              margin-bottom: 22px;
              font-size: 16px;
              line-height: 1.7;
            }

            .hero.hero--blue .hero__stats {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .hero.hero--blue .hero-stat {
              min-height: 106px;
            }

            .hero.hero--blue .hero-stat__label {
              font-size: 13px;
            }

            .hero.hero--blue .hero-stat__number {
              font-size: 34px;
            }

            .hero.hero--blue .hero__search {
              margin-top: 20px;
            }
          }
        `}</style>
        <div className="hero__top-line" aria-hidden="true" />

        <div className="hero__theme-control">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setIsDark((value) => !value)}
            title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
            aria-label={isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
          >
            {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>
        </div>

        <div className="hero__about-control">
          <button type="button" className="about-trigger" onClick={() => setShowDisclaimer(true)}>
            حول المكنز
          </button>
        </div>

        <div className="hero__content reference-shell">
          <h1 className="hero-title hero-title--art">
            <img
              src="/manus-storage/maknaz-arabic-language-title-transparent_8ef46a33.png"
              alt="مكنز اللغة العربية وعلومها"
            />
          </h1>

          <p className="hero__description">
            <span>فهرس علمي منظم للغة العربية وعلومها</span>
            <span>ومعاجمها ودواوينها الشعرية ومراجعها.</span>
          </p>

          <div className="hero__stats" role="list" aria-label="أقسام المكنز">
            {STAT_CARDS.map((item) => (
              <button
                type="button"
                className="hero-stat hero-stat--button"
                role="listitem"
                key={item.id}
                onClick={() => chooseStat(item)}
                aria-label={`عرض ${displayCount(item.count)} مادة في قسم ${item.label}`}
              >
                <span className="hero-stat__index" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="hero-stat__label">
                  {item.id === "all"
                    ? "إجمالي المواد"
                    : item.id === "linguistics"
                      ? "النحو والدراسات اللغوية"
                      : item.id === "lexicon-literature-rhetoric"
                        ? "المعاجم والأدب والبلاغة"
                        : "الدواوين والمنظومات"}
                </span>
                <span className="hero-stat__hint">استكشف القسم</span>
                <span className="hero-stat__number">{displayCount(item.count)}</span>
              </button>
            ))}
          </div>

          <div className="hero__search">
            <div className="search-field">
              <Search size={20} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    document
                      .getElementById("materials-title")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                placeholder="ابحث في جميع عناوين الكتب والمؤلفين..."
                aria-label="البحث في جميع مواد المكنز"
                aria-describedby="search-status"
              />
              {query && (
                <button
                  type="button"
                  className="search-field__clear"
                  onClick={() => setQuery("")}
                  aria-label="مسح البحث"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="hero__bottom-line" aria-hidden="true" />
      </header>

      <section className="reference-search" aria-label="البحث والتصفية">
        <div className="reference-shell reference-search__inner">
          {query.trim() && (
            <p id="search-status" className="search-status" aria-live="polite">
              {filteredMaterials.length
                ? `تم العثور على ${displayCount(filteredMaterials.length)} نتيجة في جميع مواد المكنز.`
                : "لا توجد نتائج مطابقة في جميع مواد المكنز."}
            </p>
          )}

          <div className="reference-search__filters">
            <div className="category-filter" aria-label="فلاتر التصنيف">
              {(Object.keys(MATERIAL_CATEGORY_LABELS) as MaterialCategory[]).map((filter) => (
                <button
                  type="button"
                  key={filter}
                  className={`filter-button ${category === filter ? "filter-button--active" : ""}`}
                  onClick={() => {
                    setCategory(filter);
                    setStatFilter("all");
                  }}
                  aria-pressed={category === filter}
                  aria-label={`${
                    filter === "curricula"
                      ? "المناهج والمقررات حول العالم"
                      : filter === "academies"
                        ? "المجامع والمراكز"
                      : MATERIAL_CATEGORY_LABELS[filter]
                  }: ${displayCount(CATEGORY_BUTTON_COUNTS[filter])} مادة`}
                >
                  <span>
                    {filter === "curricula"
                      ? "المناهج والمقررات حول العالم"
                      : filter === "academies"
                        ? "المجامع والمراكز"
                      : MATERIAL_CATEGORY_LABELS[filter]}
                  </span>
                  <span className="filter-button__count" aria-hidden="true">
                    {displayCount(CATEGORY_BUTTON_COUNTS[filter])}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="materials-section reference-shell" aria-label="مواد المكنز">
        {isCurriculaCategory && (
          <div className="curriculum-filter-bar" aria-label="فلاتر المناهج والمقررات">
            {CURRICULUM_FILTER_KEYS.map((key) => {
              const metadata = CURRICULUM_FILTER_LABELS[key];
              const options = curriculumFilterOptions[key];
              return (
                <label className="curriculum-filter-control" key={key}>
                  <span>{metadata.label}</span>
                  <select
                    value={curriculumFilters[key]}
                    onChange={(event) => updateCurriculumFilter(key, event.target.value)}
                    aria-label={`تصفية المناهج حسب ${metadata.label}`}
                  >
                    <option value="all">{metadata.allLabel}</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} ({displayCount(option.count)})
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        )}
        {isAcademiesCategory && (
          <div className="curriculum-filter-bar" aria-label="فلاتر المجامع اللغوية">
            {ACADEMY_FILTER_KEYS.map((key) => {
              const metadata = ACADEMY_FILTER_LABELS[key];
              const options = academyFilterOptions[key];
              return (
                <label className="curriculum-filter-control" key={key}>
                  <span>{metadata.label}</span>
                  <select
                    value={academyFilters[key]}
                    onChange={(event) => updateAcademyFilter(key, event.target.value)}
                    aria-label={`تصفية المجامع حسب ${metadata.label}`}
                  >
                    <option value="all">{metadata.allLabel}</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} ({displayCount(option.count)})
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        )}
        {isLiteraryClubsCategory && (
          <div className="curriculum-filter-bar" aria-label="فلاتر الأندية الأدبية">
            {LITERARY_CLUB_FILTER_KEYS.map((key) => {
              const metadata = LITERARY_CLUB_FILTER_LABELS[key];
              const options = literaryClubFilterOptions[key];
              return (
                <label className="curriculum-filter-control" key={key}>
                  <span>{metadata.label}</span>
                  <select
                    value={literaryClubFilters[key]}
                    onChange={(event) => updateLiteraryClubFilter(key, event.target.value)}
                    aria-label={`تصفية الأندية الأدبية حسب ${metadata.label}`}
                  >
                    <option value="all">{metadata.allLabel}</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} ({displayCount(option.count)})
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        )}
        <div className="materials-section__heading">
          {hasMaterialsTitle && (
            <div className="materials-section__title-group">
              {isCurriculaCategory && !query.trim() ? (
                <div>
                  <h2 id="materials-title">المناهج والمقررات حول العالم</h2>
                  <p className="materials-section__page-note">
                    فهرس علمي لمناهج ومقررات اللغة العربية من جامعات ومؤسسات العالم.
                  </p>
                </div>
              ) : isAcademiesCategory && !query.trim() ? (
                <div>
                  <h2 id="materials-title">المجامع اللغوية</h2>
                  <p className="materials-section__page-note">
                    {displayCount(filteredMaterials.length)} مادة موثقة قابلة للتصفية بحسب المجمع والدولة والنوع والسنة وحالة الرابط.
                  </p>
                </div>
              ) : isLiteraryClubsCategory && !query.trim() ? (
                <div>
                  <h2 id="materials-title">الأندية الأدبية</h2>
                  <p className="materials-section__page-note">
                    {displayCount(filteredMaterials.length)} مادة موثقة قابلة للتصفية بحسب النادي والدولة والمدينة والنوع والسنة وحالة الرابط.
                  </p>
                </div>
              ) : (
                <h2 id="materials-title">
                  {query.trim()
                    ? "نتائج البحث في جميع مواد المكنز"
                    : statFilter !== "all"
                      ? STAT_FILTER_LABELS[statFilter]
                      : MATERIAL_CATEGORY_LABELS[category]}
                </h2>
              )}
            </div>
          )}
          {filteredMaterials.length > 0 && (
            <p className="materials-section__page-note">
              {query.trim()
                ? `${displayCount(filteredMaterials.length)} نتيجة لعبارة «${query.trim()}»`
                : isAcademiesCategory || isLiteraryClubsCategory
                  ? `${displayCount(filteredMaterials.length)} مادة — الصفحة ${displayCount(safePage)} من ${displayCount(pageCount)}`
                  : `الصفحة ${displayCount(safePage)} من ${displayCount(pageCount)}`}
            </p>
          )}
        </div>

        {pageMaterials.length ? (
          <>
            <div className="materials-list">
              {pageMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>
            {pageCount > 1 && (
              <nav className="pagination" aria-label="ترقيم صفحات المواد">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronRight size={17} aria-hidden="true" />
                  السابق
                </button>
                <span>{displayCount(safePage)} / {displayCount(pageCount)}</span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  disabled={safePage === pageCount}
                >
                  التالي
                  <ChevronLeft size={17} aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="materials-empty" role="status">
            <BookX size={64} aria-hidden="true" />
            <h3>لا توجد نتائج</h3>
            <p>جرّب تغيير كلمات البحث أو الفلاتر المحددة</p>
            <button type="button" className="empty-reset" onClick={clearFilters}>
              العودة إلى المواد المعروضة افتراضيًا
            </button>
          </div>
        )}
      </section>

      <footer className="reference-footer">
        <section className="broken-link-section reference-shell">
          <div className="broken-link-card">
            <h2>الإبلاغ عن رابط لا يعمل</h2>
            <p>
              إذا تعذّر فتح إحالةٍ ما، فاكتب اسم المادة أو رابطها؛ تُراجع الإحالة
              وتُصحّح في أقرب تحديث للفهرس.
            </p>
          </div>
        </section>

        <section className="share-section">
          <h2>ساهم في نشر المكنز</h2>
          <p>(الدال على الخير كفاعله)</p>
          <div className="share-actions" aria-label="مشاركة المكنز">
            <a
              href={`https://wa.me/?text=${shareUrl}`}
              target="_blank"
              rel="noreferrer"
              className="share-action share-action--whatsapp"
              title="مشاركة عبر واتساب"
              aria-label="مشاركة عبر واتساب"
            >
              <WhatsappGlyph />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
              className="share-action share-action--x"
              title="مشاركة عبر X"
              aria-label="مشاركة عبر X"
            >
              <span aria-hidden="true">X</span>
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
              className="share-action share-action--telegram"
              title="مشاركة عبر تيليجرام"
              aria-label="مشاركة عبر تيليجرام"
            >
              <Send size={19} aria-hidden="true" />
            </a>
            <span className="share-divider" aria-hidden="true" />
            <button type="button" className="copy-link" onClick={copyShareLink}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span>
            </button>
          </div>
        </section>

        <section className="footer-main">
          <div className="reference-shell footer-main__inner">
            <div className="footer-notes">
              <p className="footer-note">
                <Mail className="footer-note__icon" size={16} aria-hidden="true" />
                <span>
                  في حال عدم رغبتكم في نشر ما يخصكم أمل المراسلة على: {" "}
                  <a href="mailto:yhoshan@gmail.com">yhoshan@gmail.com</a>
                </span>
              </p>
              <p className="footer-note">
                <Info className="footer-note__icon" size={16} aria-hidden="true" />
                <span>
                  تم تصنيف هذا الفهرس آليًا وتصحيحه يدويًا بناءً على أسماء الملفات
                  والأوصاف؛ يرجى الاستفادة من شريط البحث العام.
                </span>
              </p>
              <p className="footer-note">
                <Globe2 className="footer-note__icon" size={16} aria-hidden="true" />
                <span>
                  هل تبحث في السلاسل التراثية الأخرى؟ انتقل إلى {" "}
                  <a href="https://nsooos.com/" target="_blank" rel="noreferrer">
                    منصة نصوص تراثية للباحثين
                  </a>
                  .
                </span>
              </p>
            </div>

            <div className="footer-sources">
              <button
                type="button"
                className="footer-sources__trigger"
                onClick={() => setFooterSourcesOpen((value) => !value)}
                aria-expanded={footerSourcesOpen}
              >
                <span>
                  <Library size={16} aria-hidden="true" />
                  مصادر المكنز
                </span>
                <ChevronDown
                  size={17}
                  className={footerSourcesOpen ? "footer-sources__chevron footer-sources__chevron--open" : "footer-sources__chevron"}
                  aria-hidden="true"
                />
              </button>
              {footerSourcesOpen && (
                <div className="footer-sources__empty">
                  <a
                    href={CORPUS_METADATA.sourceIndexUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    موقع بحوث
                  </a>
                  <a href="https://ddl.ae/" target="_blank" rel="noreferrer">
                    مركز المعرفة الرقمي
                  </a>
                  {DIWAN_SOURCE_LINKS.map((source) => (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      key={source.url}
                    >
                      {source.name}
                    </a>
                  ))}
                  {VERIFIED_SOURCE_LINKS.map((source) => (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      key={source.url}
                    >
                      {source.name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="footer-bottom">
              <p>جميع الحقوق محفوظة © 2026 — مكنز اللغة العربية وعلومها.</p>
              <div className="footer-identity">
                <a
                  className="footer-signature"
                  href="https://dralhoshan.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="د. يوسف بن حمود الحوشان"
                >
                  <img
                    src="/manus-storage/dralhoshan-signature-white_18a5beb6.png"
                    alt="د. يوسف بن حمود الحوشان"
                  />
                </a>
                <a
                  className="footer-makanezz"
                  href="https://dralhoshan.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="المكانز"
                >
                  <img src="/manus-storage/makanezz-logo_a19df83c.png" alt="المكانز" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <a
          href={`https://wa.me/?text=${shareUrl}`}
          target="_blank"
          rel="noreferrer"
          className="floating-whatsapp"
          title="مشاركة عبر واتساب"
          aria-label="مشاركة عبر واتساب"
        >
          <WhatsappGlyph />
        </a>
      </footer>
    </main>
  );
}

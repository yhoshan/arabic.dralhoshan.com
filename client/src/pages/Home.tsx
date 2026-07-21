/*
 * فلسفة التصميم: مكنز عربي بتركواز مائي عميق، وعلامات نقطية مستلهمة من التشكيل والفهرسة.
 * بطاقات الغلاف تعرض الأعداد الحية المستمدة من الكتالوج، بما فيها عدّاد الدواوين، وبترتيب واضح فوق اسم القسم.
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
  FileText,
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
  CORPUS_METADATA,
  DIWAN_SOURCE_LINKS,
  displayCount,
  filterMaterials,
  isStandalonePoetryDiwan,
  MATERIAL_CATEGORY_LABELS,
  MATERIALS,
  type MaterialCategory,
} from "@/lib/materials";

const SIGNATURE_URL = "/manus-storage/user-signature-white-source_7d795c68.png";
const MAKANEZ_ICON =
  "https://zadwarod.dralhoshan.com/manus-storage/makanez-icon_85f25650.png";
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
  all: "إجمالي المواد",
  linguistics: "النحو والدراسات اللغوية",
  "lexicon-literature-rhetoric": "المعاجم والأدب والبلاغة",
  diwans: "الدواوين الشعرية",
};

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
  return isStandalonePoetryDiwan(material);
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
    count: MATERIALS.filter((material) => matchesStatFilter(material, "lexicon-literature-rhetoric")).length,
  },
  {
    id: "diwans",
    label: STAT_FILTER_LABELS.diwans,
    count: MATERIALS.filter((material) => matchesStatFilter(material, "diwans")).length,
  },
];

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
            من المادة وحقوق استخدامها، ومن له حق أو ملاحظة فليتواصل عبر البريد
            الإلكتروني.
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

function SignatureLink() {
  return (
    <a
      href="https://dralhoshan.com/"
      target="_blank"
      rel="noreferrer"
      title="الموقع الرسمي للدكتور يوسف بن حمود الحوشان"
      className="footer-signature"
    >
      <img
        src={SIGNATURE_URL}
        alt="د. يوسف بن حمود الحوشان"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </a>
  );
}

function MaterialCard({ material }: { material: (typeof MATERIALS)[number] }) {
  const [copied, setCopied] = useState(false);
  const isDiwan = isStandalonePoetryDiwan(material);

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
      <div className="material-card__icon" aria-hidden="true">
        <FileText size={20} />
      </div>
      <div className="material-card__body">
        <div className="material-card__topline">
          <span className="material-card__category">
            {MATERIAL_CATEGORY_LABELS[material.primaryCategory]}
          </span>
          <span className="material-card__source">{material.source}</span>
        </div>
        <h3>{material.title}</h3>
        <dl className="material-card__metadata">
          <div>
            <dt>المؤلف</dt>
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
      {isDiwan ? (
        <a
          className="material-card__link"
          href={material.sourceUrl}
          target="_blank"
          rel="noreferrer"
          title={`فتح صفحة الديوان في ${material.source}`}
        >
          <ExternalLink size={16} aria-hidden="true" />
          <span>فتح صفحة الديوان</span>
        </a>
      ) : (
        <button
          type="button"
          className="material-card__link"
          onClick={copyMaterialLink}
          title="نسخ رابط المادة من موقع بحوث"
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span>
        </button>
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
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  const currentUrl =
    typeof window === "undefined"
      ? "https://arabic.dralhoshan.com/"
      : window.location.href;
  const shareText = "مكنز اللغة العربية وعلومها — فهرس للمصادر العلمية للباحثين";
  const shareUrl = encodeURIComponent(`${shareText}\n${currentUrl}`);

  const filteredMaterials = useMemo(
    () =>
      filterMaterials(MATERIALS, query, category, "all").filter((material) =>
        matchesStatFilter(material, statFilter),
      ),
    [query, category, statFilter],
  );
  const pageCount = Math.max(1, Math.ceil(filteredMaterials.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageMaterials = filteredMaterials.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [query, category, statFilter]);

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setStatFilter("all");
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

      <header className="hero" id="top">
        <div className="hero__top-line" aria-hidden="true" />

        <div className="hero__about-control">
          <button
            type="button"
            className="about-trigger"
            onClick={() => setShowDisclaimer(true)}
            aria-haspopup="dialog"
          >
            <ShieldAlert size={20} aria-hidden="true" />
            <span>حول المكنز</span>
          </button>
        </div>

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

        <div className="hero__content reference-shell">
          <h1 className="hero-title" aria-label="مكنز اللغة العربية وعلومها">
            <span className="hero-title__kicker">مكنز</span>
            <span className="hero-title__name">اللغة العربية وعلومها</span>
          </h1>

          <p className="hero__description">
            <span>فهرس تجميعي للروابط والإحالات العلمية</span>
            <span>في اللغة العربية وعلومها</span>
          </p>

          <div className="hero__stats" role="list" aria-label="إحصاءات المكنز">
            {STAT_CARDS.map((item) => (
              <button
                type="button"
                className="hero-stat hero-stat--button"
                role="listitem"
                key={item.id}
                onClick={() => chooseStat(item)}
                aria-label={`${item.label}: ${displayCount(item.count)}`}
              >
                <span className="hero-stat__label">{item.label}</span>
                <span className="hero-stat__number">{displayCount(item.count)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hero__bottom-line" aria-hidden="true" />
      </header>

      <section className="reference-search" aria-label="البحث والتصفية">
        <div className="reference-shell reference-search__inner">
          <div className="search-field">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث في عناوين الكتب والمؤلفين..."
              aria-label="البحث في مواد المكنز"
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
                >
                  {MATERIAL_CATEGORY_LABELS[filter]}
                </button>
              ))}
            </div>
          </div>

          <div className="results-strip" aria-live="polite">
            <span>
              النتائج: <strong>{displayCount(filteredMaterials.length)}</strong> من {displayCount(MATERIALS.length)} مادة مفهرسة
            </span>
            {(query || category !== "all" || statFilter !== "all") && (
              <button type="button" onClick={clearFilters}>
                <X size={13} aria-hidden="true" />
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="materials-section reference-shell" aria-labelledby="materials-title">
        <div className="materials-section__heading">
          <h2 id="materials-title">
            {statFilter !== "all"
              ? STAT_FILTER_LABELS[statFilter]
              : category === "all"
                ? "المواد العلمية"
                : MATERIAL_CATEGORY_LABELS[category]}
          </h2>
          {filteredMaterials.length > 0 && (
            <p className="materials-section__page-note">
              الصفحة {displayCount(safePage)} من {displayCount(pageCount)}
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
              عرض جميع المواد
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
            <a
              href="mailto:yhoshan@gmail.com?subject=إبلاغ عن رابط معطل في مكنز اللغة العربية وعلومها"
              className="report-link"
            >
              <Mail size={16} aria-hidden="true" />
              <span>إرسال البلاغ للمشرف</span>
            </a>
          </div>
        </section>

        <section className="share-section">
          <h2>أعن على تداول المكنز</h2>
          <p>إحالات علمية مُنظّمة لخدمة الباحث في اللغة العربية وعلومها.</p>
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
              <p>هذا المكنز دليل إحالات؛ وتبقى حقوق المواد ونشرها لأصحابها وناشريها.</p>
              <p>
                لتصحيح إحالة أو طلب إزالة مادة، تُستقبل المراسلات على: {" "}
                <a href="mailto:yhoshan@gmail.com">yhoshan@gmail.com</a>
              </p>
              <p>
                يوسّع البحث العام نطاق الاستكشاف عند غياب المادة عن القسم المتوقع.
              </p>
              <p>
                وللبحوث في السلاسل التراثية: {" "}
                <a href="https://nsooos.com/" target="_blank" rel="noreferrer">
                  منصة نصوص تراثية للباحثين
                </a>
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
                </div>
              )}
            </div>

            <div className="footer-bottom">
              <p>جميع الحقوق محفوظة © 2026 — مكنز اللغة العربية وعلومها.</p>
              <a
                href="https://dralhoshan.com/"
                target="_blank"
                rel="noreferrer"
                className="makanez-link"
                title="منصة المكانز العلمية"
              >
                <img
                  src={MAKANEZ_ICON}
                  alt="المكانز"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </a>
              <SignatureLink />
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

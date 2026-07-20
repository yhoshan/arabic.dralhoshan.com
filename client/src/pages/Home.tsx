/*
 * فلسفة التصميم لهذا الملف: محاكاة مكنز أصول الفقه المرجعي بهوية تركوازية عربية.
 * يبقى الغلاف هرميّاً وبسيطاً، وتخدم كل بطاقة أو حركة مهمة الباحث في الوصول إلى المادة ورابطها الأصلي.
 * لا تعرض هذه الصفحة أي مواد مولدة أو أعداداً افتراضية؛ جميع القيم مشتقة من ملف الاستيراد الموثق.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
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
  displayCount,
  filterMaterials,
  JOURNAL_SOURCES,
  MATERIAL_CATEGORY_LABELS,
  MATERIALS,
  type MaterialCategory,
} from "@/lib/materials";

const SIGNATURE_URL = "/manus-storage/user-signature-white-source_7d795c68.png";
const MAKANEZ_ICON = "https://zadwarod.dralhoshan.com/manus-storage/makanez-icon_85f25650.png";
const THESAURUS_MARK_URL = "/manus-storage/arabic-thesaurus-symbol_5a70fd92.png";
const PAGE_SIZE = 12;

const WHATSAPP_ICON_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571.227 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

type StatCard = {
  id: "references" | "dictionaries" | "diwans" | "journals";
  label: string;
  count: number;
  category?: MaterialCategory;
};

const STAT_CARDS: StatCard[] = [
  {
    id: "references",
    label: "المصادر والمراجع",
    count: CORPUS_METADATA.statistics.sourcesAndReferences,
    category: "references",
  },
  {
    id: "dictionaries",
    label: "المعاجم اللغوية",
    count: CORPUS_METADATA.statistics.linguisticDictionaries,
    category: "dictionaries",
  },
  {
    id: "diwans",
    label: "الدواوين الشعرية",
    count: CORPUS_METADATA.statistics.poetryDiwans,
    category: "diwans",
  },
  {
    id: "journals",
    label: "المجلات العلمية",
    count: CORPUS_METADATA.statistics.academicJournals,
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
            منشورة في مصادر خارجية. تضم هذه الدفعة {displayCount(CORPUS_METADATA.statistics.totalMaterials)} مادةً
            منتقاة من فهرس عام لموقع بحوث، وتبقى الحقوق لأصحابها وناشريها. لا يدّعي
            المكنز ملكية المواد ولا يضمن محتواها أو دقتها أو بقاء روابطها؛ ويتحمل
            الباحث مسؤولية التحقق من المادة وحقوق استخدامها.
          </p>
          <a
            className="source-index-link"
            href={CORPUS_METADATA.sourceIndexUrl}
            target="_blank"
            rel="noreferrer"
          >
            عرض فهرس المصدر العام
            <ExternalLink size={14} aria-hidden="true" />
          </a>
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
      <a
        className="material-card__link"
        href={encodeURI(material.sourceUrl)}
        target="_blank"
        rel="noreferrer"
        title={`فتح المصدر الأصلي: ${material.title}`}
      >
        <span>فتح المصدر</span>
        <ExternalLink size={16} aria-hidden="true" />
      </a>
    </article>
  );
}

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [footerSourcesOpen, setFooterSourcesOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MaterialCategory>("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  const currentUrl =
    typeof window === "undefined"
      ? "https://arabic.dralhoshan.com/"
      : window.location.href;
  const shareText = "مكنز اللغة العربية وعلومها — فهرس للمواد والمصادر العلمية";
  const shareUrl = encodeURIComponent(`${shareText}\n${currentUrl}`);

  const filteredMaterials = useMemo(
    () => filterMaterials(MATERIALS, query, category, source),
    [query, category, source],
  );
  const pageCount = Math.max(1, Math.ceil(filteredMaterials.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageMaterials = filteredMaterials.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [query, category, source]);

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setSource("all");
  };

  const chooseStat = (stat: StatCard) => {
    if (stat.category) {
      setCategory(stat.category);
      setSource("all");
      setShowSources(false);
      document.getElementById("materials-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setCategory("all");
    setShowSources(true);
    document.getElementById("search-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    <main className={`thesaurus-page ${isDark ? "thesaurus-page--dark" : ""}`} dir="rtl">
      {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}

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
          <img className="hero-mark" src={THESAURUS_MARK_URL} alt="" aria-hidden="true" />
          <h1 className="hero-title" aria-label="مكنز اللغة العربية وعلومها">
            <span className="hero-title__kicker">مكنز</span>
            <span className="hero-title__name">اللغة العربية وعلومها</span>
          </h1>

          <p className="hero__description hero-subtitle">
            <span>فهرس علمي منظم لمواد اللغة العربية وعلومها</span>
            <span>من {displayCount(CORPUS_METADATA.statistics.academicJournals)} مجلة علمية وروابطها الأصلية.</span>
          </p>

          <div className="hero__stats stats-grid" role="list" aria-label="إحصاءات المكنز الفعلية">
            {STAT_CARDS.map((item) => (
              <button
                type="button"
                className="hero-stat stat-card"
                role="listitem"
                key={item.id}
                onClick={() => chooseStat(item)}
                aria-label={`${item.label}: ${item.count}. ${item.category ? "اعرض مواد الفئة" : "اعرض المجلات العلمية"}`}
              >
                <span className="stat-label">{item.label}</span>
                <span className="stat-number">{displayCount(item.count)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hero__bottom-line" aria-hidden="true" />
      </header>

      <section className="reference-search" aria-label="البحث والتصفية" id="search-panel">
        <div className="reference-shell reference-search__inner">
          <div className="search-field">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث في العناوين أو المؤلفين أو المصادر..."
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
                  onClick={() => setCategory(filter)}
                  aria-pressed={category === filter}
                >
                  {MATERIAL_CATEGORY_LABELS[filter]}
                </button>
              ))}
            </div>

            <div className="source-filter-wrap">
              <button
                type="button"
                className={`filter-button source-filter ${showSources ? "source-filter--open" : ""}`}
                onClick={() => setShowSources((value) => !value)}
                aria-expanded={showSources}
                aria-controls="source-panel"
              >
                <Library size={15} aria-hidden="true" />
                <span>{source === "all" ? "المصادر" : "مصدر محدد"}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {showSources && (
            <div className="source-panel" id="source-panel">
              <div className="source-panel__heading">
                <span>اختر مصدراً من {displayCount(JOURNAL_SOURCES.length)} مجلة ممثلة في المكنز</span>
                {source !== "all" && (
                  <button type="button" onClick={() => setSource("all")}>
                    عرض جميع المصادر
                  </button>
                )}
              </div>
              <div className="source-panel__list">
                {JOURNAL_SOURCES.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={source === item ? "source-panel__item source-panel__item--active" : "source-panel__item"}
                    onClick={() => setSource(item)}
                    aria-pressed={source === item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="results-strip" aria-live="polite">
            <span>
              النتائج: <strong>{displayCount(filteredMaterials.length)}</strong> من {displayCount(CORPUS_METADATA.statistics.totalMaterials)} مادة علمية
            </span>
            {(query || category !== "all" || source !== "all") && (
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
          <div>
            <p className="materials-section__eyebrow">المواد المستوردة</p>
            <h2 id="materials-title">
              {category === "all" ? "المواد العلمية" : MATERIAL_CATEGORY_LABELS[category]}
            </h2>
          </div>
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
            <h3>لا توجد نتائج مطابقة</h3>
            <p>جرّب تغيير كلمات البحث أو العودة إلى جميع التصنيفات.</p>
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
              أخي الباحث، إذا واجهتك مشكلة في فتح أي مادة، يرجى كتابة اسم المادة أو الرابط المعطل وسنقوم بمراجعته.
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
          <h2>ساهم في نشر المكنز</h2>
          <p>الدال على الخير كفاعله</p>
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
              <p>حقوق المواد محفوظة لمؤلفيها وناشريها.</p>
              <p>
                في حال عدم رغبتكم بنشر ما يخصكم، آمل المراسلة على: <a href="mailto:yhoshan@gmail.com">yhoshan@gmail.com</a>
              </p>
              <p>الروابط تنقلك إلى المصدر الأصلي لكل مادة، وليست نسخاً مخزنة في المكنز.</p>
              <p>
                هل تبحث في السلاسل التراثية الأخرى؟ <a href="https://nsooos.com/" target="_blank" rel="noreferrer">انتقل لمنصة نصوص تراثية للباحثين</a>
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
                  مصادر المكنز ({displayCount(JOURNAL_SOURCES.length)})
                </span>
                <ChevronDown
                  size={17}
                  className={footerSourcesOpen ? "footer-sources__chevron footer-sources__chevron--open" : "footer-sources__chevron"}
                  aria-hidden="true"
                />
              </button>
              {footerSourcesOpen && (
                <div className="footer-sources__list" role="list">
                  {JOURNAL_SOURCES.map((item) => (
                    <span key={item} role="listitem">{item}</span>
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

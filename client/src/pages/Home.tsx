/**
 * تصميم الصفحة: محاكاة هادئة لمكنز أصول الفقه، بهوية #00B2A9 ونص أبيض ناصع،
 * وخط أميري وواجهة RTL. تبقى «مِكنز» أصغر من عنوان «اللغة العربية وعلومها» في سطر واحد.
 */
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Database,
  FileText,
  Info,
  Layers3,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";

const assets = {
  hero: "/manus-storage/arabic-thesaurus-hero_decbdaad.png",
  seal: "/manus-storage/arabic-thesaurus-seal_4dcd4c4d.png",
};

const categories = [
  "جميع التصنيفات",
  "النحو والدراسات اللغوية",
  "المعاجم والأدب والبلاغة",
  "الدواوين الشعرية",
];

const sortOptions = [
  "الترتيب الافتراضي",
  "أ ← ي (تصاعدي)",
  "ي ← أ (تنازلي)",
  "الأحدث أولاً",
  "الأقدم أولاً",
];

const structureCards = [
  {
    icon: FileText,
    eyebrow: "بطاقة المادة",
    title: "عنوان المادة العلمية",
    detail: "يوضع هنا العنوان كما يرد في المصدر، مع إتاحة فتح صفحة التفاصيل.",
    meta: "المؤلف أو الجهة · المصدر · التاريخ",
  },
  {
    icon: BookOpen,
    eyebrow: "إحالة منظّمة",
    title: "مصدر المادة وتصنيفها",
    detail: "تظهر بيانات التصنيف والنوع والإحالة الخارجية في موضع ثابت يسهل مسحه بصرياً.",
    meta: "تصنيف · صيغة المادة · رابط الإحالة",
  },
  {
    icon: Database,
    eyebrow: "عرض بحثي",
    title: "تفاصيل قابلة للتوسّع",
    detail: "تُستكمل الحقول الوصفية والجداول العلمية عند إدخال المواد الفعلية.",
    meta: "وصف · كلمات مفتاحية · ملاحظات",
  },
];

const detailFields = [
  "عنوان المادة",
  "المؤلف أو الجهة",
  "التصنيف الرئيس والفرعي",
  "المصدر والرابط",
  "التاريخ والصيغة",
  "الوصف والكلمات المفتاحية",
];

const tableTabs = [
  "المصطلحات المنهجية",
  "الكتب",
  "الأعلام",
  "المدارس والاتجاهات",
  "الموارد حسب المجال",
];

type DialogKind = "about" | "details" | null;

export default function Home() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [sortBy, setSortBy] = useState(sortOptions[0]);
  const [isDark, setIsDark] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);

  const searchMessage = useMemo(() => {
    const cleanQuery = query.trim();
    return cleanQuery
      ? `تم تجهيز البحث عن «${cleanQuery}». ستظهر النتائج بعد إضافة المواد.`
      : "ابحث في العناوين والموضوعات والمصادر عند إدخال مواد المكنز.";
  }, [query]);

  return (
    <main
      className={`thesaurus-page ${isDark ? "thesaurus-page--dark" : ""}`}
      dir="rtl"
    >
      <section
        className="hero"
        id="top"
        style={{ backgroundImage: `url(${assets.hero})` }}
      >
        <div className="hero__texture" aria-hidden="true" />
        <header className="site-header shell">
          <a className="brand-lockup" href="#top" aria-label="العودة إلى أعلى الصفحة">
            <img src={assets.seal} alt="رمز مكنز اللغة العربية وعلومها" />
            <span>مكانز</span>
          </a>

          <nav className="site-header__actions" aria-label="أدوات الموقع">
            <button className="header-link" onClick={() => setDialog("about")}>
              <Info size={17} strokeWidth={1.9} aria-hidden="true" />
              <span>حول المكنز</span>
            </button>
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setIsDark((value) => !value)}
              aria-label={isDark ? "تفعيل النمط الفاتح" : "تفعيل النمط الداكن"}
              title={isDark ? "تفعيل النمط الفاتح" : "تفعيل النمط الداكن"}
            >
              {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
          </nav>
        </header>

        <div className="hero__content shell">
          <div className="hero__brand-mark" aria-hidden="true">
            <span className="hero__brand-mark-dot" />
            <span className="hero__brand-mark-line" />
          </div>
          <p className="hero__kicker">مِكنز</p>
          <h1>اللغة العربية وعلومها</h1>
          <p className="hero__description">
            فهرس علمي منظم للغة العربية وعلومها ومعاجمها ودواوينها الشعرية ومراجعها.
          </p>

          <div className="hero__stats" role="list" aria-label="أقسام المكنز">
            {[
              { label: "إجمالي المواد", icon: Layers3 },
              { label: "النحو والدراسات اللغوية", icon: BookOpen },
              { label: "المعاجم والأدب والبلاغة", icon: FileText },
              { label: "الدواوين الشعرية", icon: Database },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div className="stat-card" key={item.label} role="listitem">
                  <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="site-body">
        <section className="discovery shell" aria-label="أدوات الاستكشاف">
          <div className="search-shell">
            <Search className="search-shell__icon" size={23} strokeWidth={1.8} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث في عناوين الكتب والمؤلفين والموضوعات..."
              aria-label="البحث في مواد المكنز"
            />
            <button className="search-submit" type="button" aria-label="تنفيذ البحث">
              <Search size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
          <p className="search-status" aria-live="polite">
            {searchMessage}
          </p>

          <div className="filters-panel">
            <div className="filters-panel__heading">
              <SlidersHorizontal size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>مسارات التصفح</span>
            </div>
            <div className="category-chips" aria-label="تصفية التصنيفات">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={selectedCategory === category ? "category-chip category-chip--active" : "category-chip"}
                  onClick={() => setSelectedCategory(category)}
                  aria-pressed={selectedCategory === category}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="select-row">
              <label className="select-control">
                <span>المصادر</span>
                <span className="select-control__field">
                  <select aria-label="تصفية المصادر" defaultValue="all">
                    <option value="all">جميع المصادر</option>
                    <option disabled value="later">تظهر المصادر هنا بعد إدخال المواد</option>
                  </select>
                  <ChevronDown size={16} aria-hidden="true" />
                </span>
              </label>
              <label className="select-control">
                <span>الترتيب</span>
                <span className="select-control__field">
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="ترتيب المواد">
                    {sortOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" />
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="materials shell" id="materials" aria-labelledby="materials-title">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">واجهة قابلة للبيانات</p>
              <h2 id="materials-title">المواد العلمية</h2>
              <p>هذا هو قالب العرض المعتمد؛ تبقى حقوله فارغة حتى تزويد المكنز بمواده.</p>
            </div>
            <button className="outline-button" type="button" onClick={() => setDialog("details")}>
              <span>معاينة التفاصيل</span>
              <ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <div className="materials-grid">
            {structureCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className="material-card material-card--template" key={card.title}>
                  <div className="material-card__topline">
                    <span className="material-card__type">
                      <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                      {card.eyebrow}
                    </span>
                    <span className="template-label">هيكل معتمد</span>
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.detail}</p>
                  <div className="material-card__meta">{card.meta}</div>
                  <div className="material-card__actions">
                    <button type="button" onClick={() => setDialog("details")}>تفاصيل المادة</button>
                    <button type="button" aria-label="رابط المادة غير متاح قبل إدخال المواد" disabled>
                      رابط الإحالة
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="research-route shell" aria-labelledby="route-title">
          <div className="research-route__art" aria-hidden="true" />
          <div className="research-route__content">
            <p className="section-heading__eyebrow">هيكل الباحث</p>
            <h2 id="route-title">من الاستكشاف إلى الإحالة</h2>
            <p>
              يبدأ الباحث بالبحث الحر، ثم يضيّق النتائج عبر التصنيف والمصدر والترتيب، وينتقل إلى
              بطاقة المادة فصفحة تفاصيلها والإحالة الأصلية.
            </p>
            <div className="route-steps" aria-label="خطوات استعمال المكنز">
              <span>البحث</span>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>التصفية</span>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>التفاصيل</span>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>الإحالة</span>
            </div>
          </div>
        </section>

        <section className="detail-tables shell" aria-labelledby="tables-title">
          <div className="detail-tables__title">
            <Database size={26} strokeWidth={1.6} aria-hidden="true" />
            <div>
              <p className="section-heading__eyebrow">مساحة تحليلية</p>
              <h2 id="tables-title">الجداول التفصيلية</h2>
            </div>
          </div>
          <div className="table-tabs" role="tablist" aria-label="أنواع الجداول التفصيلية">
            {tableTabs.map((tab, index) => (
              <button key={tab} type="button" role="tab" aria-selected={index === 0} className={index === 0 ? "table-tab table-tab--active" : "table-tab"}>
                {tab}
              </button>
            ))}
          </div>
          <div className="empty-table" role="status">
            <div className="empty-table__lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>تُعرض البيانات التفصيلية هنا بعد استلامها، مع البحث والفرز والتصفية من داخل الجدول.</p>
          </div>
        </section>

        <footer className="site-footer">
          <div className="shell site-footer__inner">
            <div className="footer-brand">
              <img src={assets.seal} alt="" aria-hidden="true" />
              <div>
                <span>مِكنز</span>
                <strong>اللغة العربية وعلومها</strong>
              </div>
            </div>
            <p>
              <Info size={16} strokeWidth={1.8} aria-hidden="true" />
              إخلاء مسؤولية: هذا المكنز فهرسٌ تجميعيٌّ للروابط والإحالات إلى مواد منشورة في مصادر خارجية،
              أُعدّ لتيسير الوصول وخدمة الباحثين، ولا يدّعي ملكية المواد ولا يضمن محتواها أو دقتها أو بقاء روابطها.
            </p>
          </div>
        </footer>
      </div>

      {dialog && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDialog(null)}>
          <section
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="dialog-close" type="button" onClick={() => setDialog(null)} aria-label="إغلاق النافذة">
              <X size={21} aria-hidden="true" />
            </button>
            {dialog === "about" ? (
              <>
                <p className="section-heading__eyebrow">عن المشروع</p>
                <h2 id="dialog-title">مكنز اللغة العربية وعلومها</h2>
                <p>
                  منصة فهرسة علمية تُهيّأ لجمع مصادر اللغة العربية وعلومها وتيسير البحث فيها عبر
                  التصنيفات والمصادر والإحالات المنظمة.
                </p>
              </>
            ) : (
              <>
                <p className="section-heading__eyebrow">قالب صفحة المادة</p>
                <h2 id="dialog-title">تفاصيل المادة العلمية</h2>
                <p>تظهر هذه الحقول في صفحة كل مادة بعد تزويد المكنز بالبيانات الفعلية.</p>
                <dl className="detail-fields">
                  {detailFields.map((field) => (
                    <div key={field}>
                      <dt>{field}</dt>
                      <dd>يُملأ عند إضافة المادة</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

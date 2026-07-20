/**
 * فلسفة التصميم لهذا الملف: محاكاة بنية مكنز أصول الفقه المرجعية بلا عناصر إضافية.
 * تستعمل الواجهة تدرج الهوية السماوية الثابت وخط المهند للعناوين، وخط أميري لبقية النصوص.
 * يضبط عنوان الغلاف هرميته وتباعده وفق النموذج المرفق، من دون تغيير الخط أو اللون.
 */
import { useEffect, useState } from "react";
import {
  BookX,
  Check,
  ChevronDown,
  Copy,
  Library,
  Link2,
  Mail,
  MessageCircle,
  Moon,
  Search,
  Send,
  ShieldAlert,
  Sun,
  X,
} from "lucide-react";

const SIGNATURE_URL = "/manus-storage/user-signature-white-source_7d795c68.png";
const MAKANEZ_ICON =
  "https://zadwarod.dralhoshan.com/manus-storage/makanez-icon_85f25650.png";

const WHATSAPP_ICON_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

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

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [footerSourcesOpen, setFooterSourcesOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const currentUrl =
    typeof window === "undefined"
      ? "https://arabic.dralhoshan.com/"
      : window.location.href;
  const shareText = "مكنز اللغة العربية وعلومها — فهرس للمصادر العلمية للباحثين";
  const shareUrl = encodeURIComponent(`${shareText}\n${currentUrl}`);

  const clearFilters = () => {
    setQuery("");
    setShowSources(false);
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

          <div
            className="hero__stats"
            role="list"
            aria-label="مساحات إحصاءات المكنز التي ستستكمل من البيانات المعتمدة"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <div
                className="hero-stat"
                role="listitem"
                key={`stat-slot-${index}`}
                aria-label={`خانة إحصاء ${index + 1} — في انتظار البيانات`}
              />
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
              <button type="button" className="filter-button filter-button--active">
                جميع التصنيفات
              </button>
              <span className="filter-deferred-note">تُضاف الأقسام بعد اعتمادها</span>
            </div>

            <div className="source-filter-wrap">
              <button
                type="button"
                className={`filter-button source-filter ${showSources ? "source-filter--open" : ""}`}
                onClick={() => setShowSources((value) => !value)}
                aria-expanded={showSources}
              >
                <Library size={15} aria-hidden="true" />
                <span>المصادر</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {showSources && (
            <div className="source-panel" role="status">
              <p>تُدرج المصادر هنا بعد تزويد المكنز بها.</p>
            </div>
          )}

          <div className="results-strip">
            <span>
              إجمالي المواد: <strong>—</strong> مادة علمية
            </span>
            {query && (
              <button type="button" onClick={clearFilters}>
                <X size={13} aria-hidden="true" />
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="materials-section reference-shell" aria-labelledby="materials-title">
        <h2 id="materials-title">المواد العلمية</h2>
        <div className="materials-empty" role="status">
          <BookX size={64} aria-hidden="true" />
          <h3>لا توجد نتائج</h3>
          <p>جرّب تغيير كلمات البحث أو الفلاتر المحددة</p>
        </div>
      </section>

      <footer className="reference-footer">
        <section className="broken-link-section reference-shell">
          <div className="broken-link-card">
            <h2>الإبلاغ عن رابط لا يعمل</h2>
            <p>
              أخي الباحث، إذا واجهتك مشكلة في تحميل أي كتاب أو مادة، يرجى كتابة
              اسم المادة أو الرابط المعطل وسنقوم بمراجعته.
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
                في حال عدم رغبتكم بنشر ما يخصكم، آمل المراسلة على: {" "}
                <a href="mailto:yhoshan@gmail.com">yhoshan@gmail.com</a>
              </p>
              <p>
                إذا لم تجد مادة في قسمها المتوقع، يرجى استخدام شريط البحث العام.
              </p>
              <p>
                هل تبحث في السلاسل التراثية الأخرى؟ {" "}
                <a href="https://nsooos.com/" target="_blank" rel="noreferrer">
                  انتقل لمنصة نصوص تراثية للباحثين
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
                <div className="footer-sources__empty" role="status">
                  لا توجد مصادر مضافة بعد.
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

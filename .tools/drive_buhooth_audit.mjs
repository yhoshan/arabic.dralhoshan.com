import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { join } from "node:path";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const inputPath = "/home/ubuntu/Downloads/buhooth_master_hierarchical.json";
const outputPath = "/home/ubuntu/drive_buhooth_audit.json";
const reportPath = "/home/ubuntu/drive_buhooth_recommendations.md";

const STOP_WORDS = new Set([
  "في", "من", "إلى", "الى", "على", "عن", "بين", "مع", "حول", "عند", "بعد", "قبل", "لدى", "لدي", "هذا", "هذه", "ذلك", "تلك", "التي", "الذي", "كما", "وقد", "كان", "تكون", "دراسة", "دراسات", "بحث", "بحوث", "مقالة", "مقالات", "الحديث", "الحديثة", "العربية", "العربي", "العرب",
]);

const SIGNALS = [
  {
    tag: "نحو",
    weight: 4,
    pattern: /(?:النحو|نحوي|إعراب|اعراب|الجملة|جمل|العامل|العوامل|المعمول|المعمولات|الحال|النعت|المفعول|النداء|التوابع|الحروف الناسخة|كان وأخواتها|إن وأخواتها|ظن وأخواتها|المبني للمجهول|الجزم|الرفع|النصب|الجر)/iu,
  },
  {
    tag: "صرف",
    weight: 4,
    pattern: /(?:الصرف|صرفي|تصريف|اشتقاق|الإعلال|الاعلال|الإبدال|الابدال|الإدغام|الادغام|بنية الكلمة|المشتقات|صيغة|صيغ)/iu,
  },
  {
    tag: "بلاغة",
    weight: 4,
    pattern: /(?:بلاغة|بلاغي|البيان|بديع|المعاني|فصاحة|مجاز|تشبيه|استعارة|كناية|أسلوبية|اسلوبية|إيجاز|ايجاز|إطناب|اطناب|حجاج)/iu,
  },
  {
    tag: "معجم لغوي",
    weight: 5,
    pattern: /(?:معجم|معاجم|قاموس|قواميس|المفردات|مفردات|الألفاظ|الالفاظ|المصطلح|مصطلحات|الصحاح|لسان العرب|غريب اللغة)/iu,
  },
  {
    tag: "دراسات لغوية",
    weight: 4,
    pattern: /(?:اللغة العربية|لغة عربية|لسانيات|لساني|لغوي|لغة|الدلالة|دلالي|الصوتيات|صوتي|الأصوات|لهجة|لهجات|عامية|فصحى|التعريب|تعريب|الإملاء|املاء|الرسم العربي|الخط العربي|التداولية|تداولية|تعليم العربية|تعلم العربية|التخطيط اللغوي|الازدواجية)/iu,
  },
  {
    tag: "شعر وأدب",
    weight: 3,
    pattern: /(?:الأدب العربي|ادب عربي|نقد أدبي|النقد الأدبي|الشعر العربي|شعر عربي|قصيدة|قصائد|ديوان|دواوين|عروض|قافية|الشاعر|شعراء|الرواية العربية|القصة العربية|مقامات|التناص)/iu,
  },
];

const EXCLUSIONS = /(?:الفتوى|الفقه|العقيدة|الحديث النبوي|التفسير|القرآن الكريم|الاقتصاد|السياسة|الطب|الهندسة|الزراعة|الرياضيات|الفيزياء|الكيمياء|الجغرافيا|التاريخ السياسي|القانون|التمريض|إدارة الأعمال|التربية البدنية)/iu;

function text(value) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";
}

function normalizeArabic(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ة/gu, "ه")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي")
    .replace(/ـ/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("ar");
}

function canonicalUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./u, "");
    url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
    const parameters = [...url.searchParams.entries()].sort(
      ([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue),
    );
    url.search = "";
    for (const [key, item] of parameters) url.searchParams.append(key, item);
    return url.toString();
  } catch {
    return raw.replace(/\/+$/u, "").toLowerCase();
  }
}

function tokens(value) {
  return normalizeArabic(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function uniqueTokens(value) {
  return [...new Set(tokens(value))];
}

function tokenScore(left, right) {
  const leftTokens = new Set(uniqueTokens(left));
  const rightTokens = new Set(uniqueTokens(right));
  if (!leftTokens.size || !rightTokens.size) return { jaccard: 0, coverage: 0, shared: 0 };
  let shared = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) shared += 1;
  return {
    jaccard: shared / new Set([...leftTokens, ...rightTokens]).size,
    coverage: shared / Math.min(leftTokens.size, rightTokens.size),
    shared,
  };
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    for (let index = 0; index < previous.length; index += 1) previous[index] = current[index];
  }
  return previous[right.length];
}

function flattenRecords(payload) {
  const records = [];
  for (const source of Array.isArray(payload?.sources) ? payload.sources : []) {
    for (const volume of Array.isArray(source?.volumes) ? source.volumes : []) {
      for (const issue of Array.isArray(volume?.issues) ? volume.issues : []) {
        for (const record of Array.isArray(issue?.records) ? issue.records : []) {
          records.push({
            id: record?.id,
            recordType: text(record?.record_type),
            title: text(record?.title),
            authors: Array.isArray(record?.authors) ? record.authors.map(text).filter(Boolean) : [],
            directUrl: text(record?.direct_url),
            path: text(record?.path),
            sourceName: text(source?.source_name),
            volume: text(volume?.volume),
            issue: text(issue?.issue),
          });
        }
      }
    }
  }
  return records;
}

function classify(title) {
  const tags = [];
  let score = 0;
  for (const signal of SIGNALS) {
    if (signal.pattern.test(title)) {
      tags.push(signal.tag);
      score += signal.weight;
    }
  }
  const normalized = normalizeArabic(title);
  const hasArabic = (normalized.match(/[\u0621-\u063A\u0641-\u064A]/gu) || []).length >= 8;
  const excluded = EXCLUSIONS.test(title) && tags.length < 2;
  const generic = normalized.length < 12 || /^(?:مقدمه|خاتمه|كلمه المحرر|افتتاحيه|عرض كتاب|تعقيب)$/u.test(normalized);
  return {
    tags: [...new Set(tags)],
    score,
    isRelevant: hasArabic && !excluded && !generic && score >= 3,
    exclusion: excluded ? "سياق غير لغوي أو غير أدبي ظاهر من العنوان" : generic ? "عنوان عام لا يثبت الصلة" : null,
  };
}

function primaryCategory(tags) {
  if (tags.includes("معجم لغوي")) return "معاجم وقواميس";
  if (tags.includes("نحو") || tags.includes("صرف")) return "النحو والصرف";
  if (tags.includes("بلاغة")) return "البلاغة";
  if (tags.includes("شعر وأدب")) return "الأدب والنقد";
  return "الدراسات اللغوية";
}

const payload = JSON.parse(await readFile(inputPath, "utf8"));
const flattened = flattenRecords(payload);
const articleRecords = flattened.filter((record) => record.recordType === "article" && record.title);

const vite = await createServer({
  root: projectRoot,
  configFile: join(projectRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { MATERIALS } = await vite.ssrLoadModule("/client/src/lib/materials.ts");
  const existing = Array.isArray(MATERIALS) ? MATERIALS : [];
  const existingByTitle = new Map();
  const existingByUrl = new Map();
  const existingTokenIndex = new Map();

  for (const material of existing) {
    const title = text(material?.title);
    const titleKey = normalizeArabic(title);
    const urlKey = canonicalUrl(material?.sourceUrl);
    const summary = {
      title,
      id: text(material?.id),
      source: text(material?.source),
      sourceUrl: text(material?.sourceUrl),
    };
    if (titleKey && !existingByTitle.has(titleKey)) existingByTitle.set(titleKey, summary);
    if (urlKey && !existingByUrl.has(urlKey)) existingByUrl.set(urlKey, summary);
    for (const token of uniqueTokens(title)) {
      const bucket = existingTokenIndex.get(token) ?? [];
      if (bucket.length < 300) bucket.push({ titleKey, ...summary });
      existingTokenIndex.set(token, bucket);
    }
  }

  const internalTitles = new Set();
  const internalUrls = new Set();
  const decisions = [];
  const statistics = {
    rawRecords: flattened.length,
    articleRecords: articleRecords.length,
    issueFileRecords: flattened.filter((record) => record.recordType === "issue").length,
    relevantArticleRecords: 0,
    internalDuplicates: 0,
    exactTitleDuplicates: 0,
    exactUrlDuplicates: 0,
    nearTitleDuplicates: 0,
    accepted: 0,
    rejectedNotRelevant: 0,
  };

  for (const record of articleRecords) {
    const titleKey = normalizeArabic(record.title);
    const urlKey = canonicalUrl(record.directUrl);
    const classification = classify(record.title);

    if (!classification.isRelevant) {
      statistics.rejectedNotRelevant += 1;
      continue;
    }
    statistics.relevantArticleRecords += 1;

    if (internalTitles.has(titleKey) || (urlKey && internalUrls.has(urlKey))) {
      statistics.internalDuplicates += 1;
      continue;
    }
    internalTitles.add(titleKey);
    if (urlKey) internalUrls.add(urlKey);

    const exactUrl = urlKey ? existingByUrl.get(urlKey) : null;
    const exactTitle = existingByTitle.get(titleKey);
    let reason = null;
    let matched = null;

    if (exactUrl) {
      reason = "مطابق لرابط مادة قائم";
      matched = exactUrl;
      statistics.exactUrlDuplicates += 1;
    } else if (exactTitle) {
      reason = "مطابق لعنوان قائم بعد التطبيع";
      matched = exactTitle;
      statistics.exactTitleDuplicates += 1;
    } else {
      const candidatePool = new Map();
      for (const token of uniqueTokens(record.title).sort((a, b) => a.length - b.length).slice(0, 8)) {
        for (const existingItem of existingTokenIndex.get(token) ?? []) {
          if (!candidatePool.has(existingItem.titleKey)) candidatePool.set(existingItem.titleKey, existingItem);
        }
      }
      for (const existingItem of candidatePool.values()) {
        if (!existingItem.title || existingItem.titleKey === titleKey) continue;
        const score = tokenScore(record.title, existingItem.title);
        if (score.shared < 2) continue;
        const compactCandidate = titleKey.replace(/\s/gu, "");
        const compactExisting = existingItem.titleKey.replace(/\s/gu, "");
        const minLength = Math.min(compactCandidate.length, compactExisting.length);
        const isContainment = minLength >= 22 && (compactCandidate.includes(compactExisting) || compactExisting.includes(compactCandidate));
        const closeEnoughForEdit = Math.abs(compactCandidate.length - compactExisting.length) <= 5 && minLength >= 18;
        const edits = closeEnoughForEdit ? editDistance(compactCandidate, compactExisting) : Number.POSITIVE_INFINITY;
        if (score.jaccard >= 0.88 || score.coverage === 1 && score.shared >= 3 || isContainment || (closeEnoughForEdit && edits <= Math.max(2, Math.floor(minLength * 0.07)))) {
          reason = "عنوان قريب جداً من سجل قائم؛ حجب احتياطي";
          matched = existingItem;
          statistics.nearTitleDuplicates += 1;
          break;
        }
      }
    }

    const candidate = {
      title: record.title,
      authors: record.authors,
      sourceName: record.sourceName,
      sourceUrl: record.directUrl,
      sourcePath: record.path,
      volume: record.volume,
      issue: record.issue,
      tags: classification.tags,
      category: primaryCategory(classification.tags),
      confidence: classification.score >= 8 ? "عالٍ" : classification.score >= 5 ? "متوسط" : "أولي",
      relevanceScore: classification.score,
    };

    if (reason) {
      decisions.push({ status: "مستبعد_لتكرار", reason, matched, ...candidate });
    } else {
      decisions.push({ status: "مرشح_غير_مكرر", reason: "لا تطابق دقيق أو قريب وفق ضوابط التدقيق", matched: null, ...candidate });
      statistics.accepted += 1;
    }
  }

  const accepted = decisions
    .filter((entry) => entry.status === "مرشح_غير_مكرر")
    .sort((a, b) => b.relevanceScore - a.relevanceScore || a.title.localeCompare(b.title, "ar"));
  const excluded = decisions.filter((entry) => entry.status === "مستبعد_لتكرار");
  const byCategory = Object.fromEntries(
    ["معاجم وقواميس", "النحو والصرف", "البلاغة", "الدراسات اللغوية", "الأدب والنقد"].map((category) => [
      category,
      accepted.filter((entry) => entry.category === category).length,
    ]),
  );
  const bySource = Object.entries(
    accepted.reduce((accumulator, entry) => {
      accumulator[entry.sourceName] = (accumulator[entry.sourceName] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .sort(([, left], [, right]) => right - left)
    .map(([sourceName, count]) => ({ sourceName, count }));

  const audit = {
    generatedAt: new Date().toISOString(),
    input: {
      file: inputPath,
      meta: payload.meta,
      sourceRecordCount: flattened.length,
      articleRecordsConsidered: articleRecords.length,
    },
    catalog: {
      currentMaterialCount: existing.length,
      matchingMethod:
        "تطبيع العنوان العربي، ومقارنة الرابط المباشر، ثم كشف عنوان قريب محافظ بالرموز المشتركة والتطابق الاحتوائي أو فرق التحرير الضئيل.",
    },
    statistics,
    acceptedByCategory: byCategory,
    leadingSources: bySource.slice(0, 25),
    recommended: accepted,
    blockedDuplicates: excluded,
  };

  const rows = accepted.slice(0, 80).map((entry, index) => {
    const authors = entry.authors.length ? entry.authors.join("، ") : "غير مذكور";
    return `| ${index + 1} | ${entry.title.replace(/\|/gu, "\\|")} | ${entry.category} | ${entry.tags.join("، ")} | ${authors.replace(/\|/gu, "\\|")} | [المصدر](${entry.sourceUrl}) |`;
  });
  const markdown = `# تقرير فحص ملف بحوث لمكنز اللغة العربية وعلومها\n\n> هذا تقرير تدقيقي فقط؛ لم يُستورد أي سجل ولم تُعدَّل بيانات المشروع.\n\n## ملخص النتيجة\n\n| البند | النتيجة |\n|---|---:|\n| سجلات المقالات التي فُحصت | ${statistics.articleRecords.toLocaleString("ar-EG")} |\n| مقالات ذات صلة أولية بعلوم العربية | ${statistics.relevantArticleRecords.toLocaleString("ar-EG")} |\n| مرشحات غير مكررة | ${statistics.accepted.toLocaleString("ar-EG")} |\n| تكرار برابط مباشر | ${statistics.exactUrlDuplicates.toLocaleString("ar-EG")} |\n| تكرار بعنوان مطبع | ${statistics.exactTitleDuplicates.toLocaleString("ar-EG")} |\n| عناوين قريبة حجبت احتياطياً | ${statistics.nearTitleDuplicates.toLocaleString("ar-EG")} |\n| تكرار داخلي في الملف | ${statistics.internalDuplicates.toLocaleString("ar-EG")} |\n\n## توزيع المرشحات غير المكررة\n\n| المجال | العدد |\n|---|---:|\n${Object.entries(byCategory).map(([category, count]) => `| ${category} | ${count.toLocaleString("ar-EG")} |`).join("\n")}\n\n## أهم المصادر التي ما زالت تحمل مرشحات\n\n| المصدر | العدد |\n|---|---:|\n${bySource.slice(0, 15).map((entry) => `| ${entry.sourceName} | ${entry.count.toLocaleString("ar-EG")} |`).join("\n")}\n\n## أول 80 مرشحاً مرتبين حسب قوة الإشارة الموضوعية\n\n| # | العنوان | المجال | الوسوم | المؤلف | الرابط المباشر |\n|---:|---|---|---|---|---|\n${rows.join("\n")}\n\n## منهج منع التكرار\n\nيُحجب السجل إذا تطابق الرابط المباشر أو العنوان بعد تطبيع الأحرف العربية، أو إذا كان عنوانه قريباً جداً من عنوان قائم بحسب تغطية الكلمات المميزة والتطابق الاحتوائي أو فرق التحرير المحدود. تبقى المرشحات في التقرير فقط إلى أن يطلب المستخدم الاستيراد صراحة.\n`;

  await writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await writeFile(reportPath, markdown, "utf8");
  console.log(JSON.stringify({ statistics, acceptedByCategory: byCategory, leadingSources: bySource.slice(0, 12) }, null, 2));
} finally {
  await vite.close();
}

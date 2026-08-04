/*
 * دمج محافظ لمرشحات ملف بحوث المعتمدة في مكنز اللغة العربية وعلومها.
 * لا يحرر هذا البرنامج أي ملفات واجهة؛ يكتب ملف بيانات الكتالوج فقط عند APPLY=1.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "vite";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const auditPath = "/home/ubuntu/drive_buhooth_audit.json";
const corpusPath = join(projectRoot, "client/src/data/arabic-materials.json");
const reportPath = "/home/ubuntu/drive_buhooth_import_audit.json";
const apply = process.env.APPLY === "1";

const CATEGORY_MAP = new Map([
  ["معاجم وقواميس", "dictionaries"],
  ["النحو والصرف", "references"],
  ["البلاغة", "references"],
  ["الدراسات اللغوية", "references"],
  ["الأدب والنقد", "references"],
]);
const TAGS = new Set(["معجم لغوي", "نحو", "صرف", "بلاغة", "شعر وأدب", "دراسات لغوية"]);

function text(value) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";
}

function normalizeArabic(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
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
    const params = [...url.searchParams.entries()].sort(([aKey, aValue], [bKey, bValue]) =>
      aKey.localeCompare(bKey) || aValue.localeCompare(bValue),
    );
    url.search = "";
    for (const [key, item] of params) url.searchParams.append(key, item);
    return url.toString();
  } catch {
    return raw.replace(/\/+$/u, "").toLowerCase();
  }
}

function uniqueTokens(value) {
  return [...new Set(normalizeArabic(value).split(" ").filter((token) => token.length >= 3))];
}

function tokenScore(left, right) {
  const leftTokens = uniqueTokens(left);
  const rightTokens = uniqueTokens(right);
  const shared = leftTokens.filter((token) => rightTokens.includes(token));
  const union = new Set([...leftTokens, ...rightTokens]);
  return {
    shared: shared.length,
    jaccard: union.size ? shared.length / union.size : 0,
    coverage: leftTokens.length ? shared.length / leftTokens.length : 0,
  };
}

function safePath(value) {
  return text(value).replace(/[\\/:*?"<>|]/gu, " ").replace(/\s+/gu, " ").slice(0, 160) || "مادة";
}

function stableId(candidate) {
  const seed = `${normalizeArabic(candidate.title)}|${normalizeArabic(candidate.author ?? "")}|${canonicalUrl(candidate.sourceUrl)}`;
  return `buhooth-${createHash("sha256").update(seed).digest("hex").slice(0, 20)}`;
}

function materialFromEntry(entry) {
  const tags = [...new Set((Array.isArray(entry.tags) ? entry.tags : []).filter((tag) => TAGS.has(tag)))];
  const primaryCategory = CATEGORY_MAP.get(text(entry.category));
  if (!primaryCategory || tags.length === 0 || !text(entry.title) || !canonicalUrl(entry.sourceUrl)) return null;
  const authorList = Array.isArray(entry.authors) ? entry.authors.map(text).filter(Boolean) : [];
  const author = authorList.length ? authorList.join("، ") : null;
  const material = {
    title: text(entry.title),
    author,
    source: text(entry.sourceName) || "فهرس بحوث",
    relativePath: `بحوث/${safePath(entry.sourceName)}/${safePath(entry.sourcePath || entry.title)}.pdf`,
    sourceUrl: text(entry.sourceUrl),
    primaryCategory,
    tags,
    matchEvidence: {
      strongSignals: [
        "مقالة مرشحة من فهرس بحوث بعد فحص صلة العنوان بالمكنز",
        `التصنيف المعتمد: ${text(entry.category)}`,
        `وسوم موضوعية: ${tags.join("، ")}`,
      ],
      supportingSignals: [
        `المصدر: ${text(entry.sourceName) || "فهرس بحوث"}`,
        entry.volume ? `المجلد: ${text(entry.volume)}` : "",
        entry.issue ? `العدد: ${text(entry.issue)}` : "",
        `درجة الإشارة الموضوعية: ${Number(entry.relevanceScore) || 0}`,
      ].filter(Boolean),
      explicitLanguageSource: false,
    },
  };
  material.id = stableId(material);
  Object.defineProperty(material, "_buhoothCategory", {
    value: text(entry.category),
    enumerable: false,
  });
  return material;
}

const audit = JSON.parse(await readFile(auditPath, "utf8"));
const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
const candidateEntries = Array.isArray(audit.recommended) ? audit.recommended : [];
const candidates = candidateEntries.map(materialFromEntry).filter(Boolean);

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
  const existingIds = new Set(existing.map((item) => text(item.id)).filter(Boolean));
  const existingUrls = new Set(existing.map((item) => canonicalUrl(item.sourceUrl)).filter(Boolean));
  const existingTitles = new Set(existing.map((item) => normalizeArabic(item.title)).filter(Boolean));
  const existingTokenIndex = new Map();
  for (const item of existing) {
    const title = text(item.title);
    const titleKey = normalizeArabic(title);
    if (!titleKey) continue;
    for (const token of uniqueTokens(title)) {
      const bucket = existingTokenIndex.get(token) ?? [];
      if (bucket.length < 320) bucket.push({ title, titleKey });
      existingTokenIndex.set(token, bucket);
    }
  }

  const batchIds = new Set();
  const batchUrls = new Set();
  const batchTitles = new Set();
  const batchTokenIndex = new Map();
  const accepted = [];
  const excluded = [];

  function nearMatch(candidate, tokenIndex) {
    const pool = new Map();
    for (const token of uniqueTokens(candidate.title).sort((a, b) => a.length - b.length).slice(0, 9)) {
      for (const item of tokenIndex.get(token) ?? []) {
        if (!pool.has(item.titleKey)) pool.set(item.titleKey, item);
      }
    }
    for (const item of pool.values()) {
      const score = tokenScore(candidate.title, item.title);
      const candidateKey = normalizeArabic(candidate.title).replace(/\s/gu, "");
      const itemKey = item.titleKey.replace(/\s/gu, "");
      const minimum = Math.min(candidateKey.length, itemKey.length);
      const containment = minimum >= 22 && (candidateKey.includes(itemKey) || itemKey.includes(candidateKey));
      if (score.jaccard >= 0.9 || (score.coverage === 1 && score.shared >= 3) || containment) return item.title;
    }
    return null;
  }

  for (const candidate of candidates) {
    const idKey = text(candidate.id);
    const urlKey = canonicalUrl(candidate.sourceUrl);
    const titleKey = normalizeArabic(candidate.title);
    const exactReason =
      existingIds.has(idKey) || batchIds.has(idKey)
        ? "معرف مكرر"
        : existingUrls.has(urlKey) || batchUrls.has(urlKey)
          ? "رابط مباشر مكرر"
          : existingTitles.has(titleKey) || batchTitles.has(titleKey)
            ? "عنوان مكرر بعد التطبيع"
            : null;
    const nearExisting = exactReason ? null : nearMatch(candidate, existingTokenIndex);
    const nearBatch = exactReason || nearExisting ? null : nearMatch(candidate, batchTokenIndex);
    if (exactReason || nearExisting || nearBatch) {
      excluded.push({
        id: candidate.id,
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        reason: exactReason || "عنوان قريب جداً؛ حُجب احتياطياً",
        matchedTitle: nearExisting || nearBatch || null,
      });
      continue;
    }

    batchIds.add(idKey);
    batchUrls.add(urlKey);
    batchTitles.add(titleKey);
    for (const token of uniqueTokens(candidate.title)) {
      const bucket = batchTokenIndex.get(token) ?? [];
      bucket.push({ title: candidate.title, titleKey });
      batchTokenIndex.set(token, bucket);
    }
    accepted.push(candidate);
  }

  accepted.sort((left, right) => left.title.localeCompare(right.title, "ar"));
  const acceptedByCategory = Object.fromEntries(
    [...CATEGORY_MAP.keys()].map((category) => [category, accepted.filter((item) => item._buhoothCategory === category).length]),
  );
  const acceptedByTag = Object.fromEntries(
    [...TAGS].map((tag) => [tag, accepted.filter((item) => item.tags.includes(tag)).length]),
  );
  const finalMaterials = [...(Array.isArray(corpus.materials) ? corpus.materials : []), ...accepted];
  const selectionNote = "أضيفت مقالات منتقاة من فهرس بحوث بعد تصنيفها في أقسام المكنز وفحص التكرار بالمعرف والرابط والعنوان والعنوان القريب؛ لا تغيّر هذا الدمج بنية الواجهة أو نصوصها.";
  const priorMethod = text(corpus?.metadata?.selectionMethod);
  const output = {
    ...corpus,
    metadata: {
      ...corpus.metadata,
      selectionMethod: priorMethod.includes("فهرس بحوث بعد تصنيفها") ? priorMethod : `${priorMethod} ${selectionNote}`.trim(),
      statistics: {
        ...(corpus.metadata?.statistics ?? {}),
        totalMaterials: finalMaterials.length,
      },
      buhoothDriveSource: {
        name: "فهرس بحوث (ملف Google Drive المشارك)",
        importedCount: accepted.length,
        sourceRecordCount: audit?.input?.sourceRecordCount ?? null,
        selectionMethod:
          "تُقبل المرشحات غير المكررة ذات الصلة المصنفة في معاجم وقواميس أو النحو والصرف أو البلاغة أو الدراسات اللغوية أو الأدب والنقد؛ ثم يعاد فحص التكرار قبل الكتابة.",
      },
    },
    materials: finalMaterials,
  };

  if (apply) await writeFile(corpusPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "applied" : "dry-run",
    inputRecommended: candidates.length,
    catalogMaterialsBefore: Array.isArray(corpus.materials) ? corpus.materials.length : 0,
    catalogMaterialsAfter: finalMaterials.length,
    imported: accepted.length,
    acceptedByCategory,
    acceptedByTag,
    excludedAfterFreshCheck: excluded.length,
    excludedSample: excluded.slice(0, 80),
    policy: {
      uiIntegrity: "لا يكتب المستورد إلا client/src/data/arabic-materials.json عند APPLY=1.",
      deduplication: ["المعرف", "الرابط المباشر", "العنوان المطبّع", "العنوان القريب المحافظ"],
    },
    importedRecords: accepted,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    mode: report.mode,
    candidates: candidates.length,
    imported: accepted.length,
    excluded: excluded.length,
    catalogMaterialsBefore: report.catalogMaterialsBefore,
    catalogMaterialsAfter: report.catalogMaterialsAfter,
    acceptedByCategory,
    acceptedByTag,
  }, null, 2));
} finally {
  await vite.close();
}

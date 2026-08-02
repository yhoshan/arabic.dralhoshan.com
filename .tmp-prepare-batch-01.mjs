import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { createServer } from "vite";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const reviewRoot = "/home/ubuntu/repo-review";
const stagingRoot = join(reviewRoot, "batch-01-sources");
const inputFiles = [
  "/home/ubuntu/upload/pasted_file_waGkPb_deepseek_json_20260802_197611.json",
  "/home/ubuntu/upload/pasted_file_9eohMp_deepseek_json_20260802_d253fa.json",
  "/home/ubuntu/upload/pasted_file_74yiAs_deepseek_json_20260802_df57b6.json",
  "/home/ubuntu/upload/pasted_file_Sa0h7g_deepseek_json_20260802_e1d444.json",
];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArabic(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ـ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function canonicalUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    const entries = [...url.searchParams.entries()].sort(([a, av], [b, bv]) =>
      a === b ? av.localeCompare(bv) : a.localeCompare(b),
    );
    url.search = "";
    for (const [key, item] of entries) url.searchParams.append(key, item);
    return url.toString();
  } catch {
    return raw.replace(/\/+$/, "").toLowerCase();
  }
}

function linkPriority(link) {
  const source = normalizeArabic(link?.source);
  const url = canonicalUrl(link?.url);
  if (!url) return 99;
  if (source.includes("ارشف") || url.includes("archive.org")) return 0;
  if (source.includes("وقفي") || url.includes("waqfeya")) return 1;
  if (source.includes("شامله") || url.includes("shamela")) return 2;
  if (source.includes("نور") || url.includes("noor-book")) return 3;
  return 10;
}

function selectLink(record) {
  const values = Array.isArray(record.links)
    ? record.links
    : Array.isArray(record.urls)
      ? record.urls
      : record.url
        ? [{ source: record.source, url: record.url }]
        : [];
  const candidates = values
    .map((item) => ({ source: text(item?.source), url: text(item?.url ?? item?.link) }))
    .filter((item) => canonicalUrl(item.url))
    .sort((a, b) => linkPriority(a) - linkPriority(b) || a.url.localeCompare(b.url));
  return candidates[0] ?? { source: "قائمة لغوية مرفقة", url: "" };
}

function classify(record, listKey) {
  const combined = normalizeArabic(
    [listKey, record.category, record.subject, record.type, record.section, record.title].filter(Boolean).join(" "),
  );
  if (/(ديوان|دواوين|poetry diwan)/.test(combined)) {
    return { primaryCategory: "diwans", tags: ["ديوان شعري"], section: "الدواوين الشعرية", strongSignal: "سجل ديوان موثّق" };
  }
  if (/(معجم|معاجم|lexicon|dictionary)/.test(combined)) {
    return { primaryCategory: "dictionaries", tags: ["معجم لغوي"], section: "المعاجم اللغوية", strongSignal: "قائمة معاجم لغوية مرفقة" };
  }
  if (/(نحو|صرف|grammar|morphology)/.test(combined)) {
    const tags = [];
    if (/(نحو|grammar)/.test(combined)) tags.push("نحو");
    if (/(صرف|morphology)/.test(combined)) tags.push("صرف");
    return { primaryCategory: "references", tags: tags.length ? tags : ["دراسات لغوية"], section: "النحو والصرف", strongSignal: "قائمة نحو وصرف مرفقة" };
  }
  if (/(بلاغ|rhetoric)/.test(combined)) {
    return { primaryCategory: "references", tags: ["بلاغة"], section: "البلاغة", strongSignal: "قائمة بلاغة مرفقة" };
  }
  if (/(عروض|قافي|prosody|rhyme)/.test(combined)) {
    return { primaryCategory: "references", tags: ["شعر وأدب"], section: "العروض والقافية", strongSignal: "قائمة عروض وقافية مرفقة" };
  }
  if (/(ادب|نقد|literature|criticism)/.test(combined)) {
    return { primaryCategory: "references", tags: ["شعر وأدب"], section: "الأدب والنقد", strongSignal: "قائمة أدب ونقد مرفقة" };
  }
  return { primaryCategory: "references", tags: ["دراسات لغوية"], section: "الدراسات اللغوية", strongSignal: "قائمة لغوية مرفقة" };
}

function extractRecordArrays(payload) {
  const arrays = [];
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value) && value.some((item) => item && typeof item === "object" && text(item.title))) {
      arrays.push([key, value]);
    }
  }
  return arrays;
}

function createId(record, classification, sourceUrl) {
  const base = `${normalizeArabic(record.title)}|${normalizeArabic(record.author)}|${canonicalUrl(sourceUrl)}|${classification.section}`;
  return `uploaded-${createHash("sha256").update(base).digest("hex").slice(0, 20)}`;
}

const vite = await createServer({
  root: projectRoot,
  configFile: join(projectRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  await mkdir(stagingRoot, { recursive: true });
  const { MATERIALS } = await vite.ssrLoadModule("/client/src/lib/materials.ts");
  const existingById = new Set(MATERIALS.map((item) => text(item.id)).filter(Boolean));
  const existingByUrl = new Set(MATERIALS.map((item) => canonicalUrl(item.sourceUrl)).filter(Boolean));
  const existingByTitle = new Set(MATERIALS.map((item) => normalizeArabic(item.title)).filter(Boolean));

  const rawEntries = [];
  const sourceSummary = [];
  for (const sourceFile of inputFiles) {
    const rawText = await readFile(sourceFile, "utf8");
    const payload = JSON.parse(rawText);
    await copyFile(sourceFile, join(stagingRoot, basename(sourceFile)));
    const arrays = extractRecordArrays(payload);
    sourceSummary.push({ file: basename(sourceFile), arrayKeys: arrays.map(([key, values]) => ({ key, count: values.length })) });
    for (const [listKey, records] of arrays) {
      for (const record of records) {
        if (!record || typeof record !== "object" || !text(record.title)) continue;
        rawEntries.push({ file: basename(sourceFile), listKey, record });
      }
    }
  }

  const seenInputKeys = new Map();
  const duplicateWithinInput = [];
  const candidateEntries = [];
  for (const entry of rawEntries) {
    const selectedLink = selectLink(entry.record);
    const key = normalizeArabic(entry.record.title);
    if (!key) continue;
    const prior = seenInputKeys.get(key);
    if (prior) {
      duplicateWithinInput.push({ title: entry.record.title, firstFile: prior.file, duplicateFile: entry.file, url: selectedLink.url });
      continue;
    }
    seenInputKeys.set(key, entry);
    candidateEntries.push({ ...entry, selectedLink });
  }

  const skippedExisting = [];
  const materials = [];
  const categoryCounts = {};
  for (const entry of candidateEntries) {
    const classification = classify(entry.record, entry.listKey);
    const sourceUrl = entry.selectedLink.url;
    const id = createId(entry.record, classification, sourceUrl);
    const normalizedTitle = normalizeArabic(entry.record.title);
    const normalizedUrl = canonicalUrl(sourceUrl);
    const reason = existingById.has(id)
      ? "identifier"
      : normalizedUrl && existingByUrl.has(normalizedUrl)
        ? "source_url"
        : existingByTitle.has(normalizedTitle)
          ? "normalized_title"
          : "";
    if (reason) {
      skippedExisting.push({ title: entry.record.title, reason, sourceUrl });
      continue;
    }
    const source = entry.selectedLink.source || "قائمة لغوية مرفقة";
    const tags = classification.tags;
    const material = {
      id,
      title: text(entry.record.title),
      author: text(entry.record.author) || null,
      source,
      relativePath: `${entry.file}#${entry.listKey}`,
      sourceUrl,
      primaryCategory: classification.primaryCategory,
      tags,
      matchEvidence: {
        strongSignals: [classification.strongSignal, text(entry.record.category)].filter(Boolean),
        supportingSignals: [entry.listKey, text(entry.record.category), ...tags].filter(Boolean),
        explicitLanguageSource: true,
      },
    };
    materials.push(material);
    categoryCounts[classification.section] = (categoryCounts[classification.section] ?? 0) + 1;
  }

  const payload = {
    metadata: {
      title: "قوائم اللغة العربية المرفقة — الدفعة الأولى",
      generatedAt: new Date().toISOString(),
      sourceFiles: sourceSummary,
      rawRecordCount: rawEntries.length,
      uniqueInputCount: candidateEntries.length,
      internalDuplicateCount: duplicateWithinInput.length,
      existingDuplicateCount: skippedExisting.length,
      importCandidateCount: materials.length,
      categoryCounts,
      selectionMethod: "تصنيف قائم على القائمة ووسم السجل، مع منع التكرار بالمعرّف والرابط والعنوان المطبّع",
    },
    materials,
  };
  const report = [
    "# تقرير مرشحات الدفعة الأولى",
    "",
    `- السجلات الخام: ${rawEntries.length}`,
    `- العناوين المكررة داخليًا والمستبعدة: ${duplicateWithinInput.length}`,
    `- المطابقات مع الكتالوج الحالي والمستبعدة: ${skippedExisting.length}`,
    `- المرشحات الجديدة القابلة للدمج: ${materials.length}`,
    "",
    "## التوزيع بعد منع التكرار",
    "",
    "| القسم | عدد المرشحات |",
    "|---|---:|",
    ...Object.entries(categoryCounts).sort(([a], [b]) => a.localeCompare(b, "ar")).map(([section, count]) => `| ${section} | ${count} |`),
    "",
    "## أسباب استبعاد المطابقات الحالية",
    "",
    "| السبب | العدد |",
    "|---|---:|",
    ...["identifier", "source_url", "normalized_title"].map((reason) => `| ${reason} | ${skippedExisting.filter((item) => item.reason === reason).length} |`),
    "",
    "## ملفات المصدر",
    "",
    ...sourceSummary.map((item) => `- ${item.file}: ${item.arrayKeys.map((entry) => `${entry.key} (${entry.count})`).join("، ")}`),
  ].join("\n");
  await writeFile(join(reviewRoot, "batch-01-candidates.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(join(reviewRoot, "batch-01-candidate-report.md"), `${report}\n`, "utf8");
  console.log(JSON.stringify(payload.metadata, null, 2));
} finally {
  await vite.close();
}

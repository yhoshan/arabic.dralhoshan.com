import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { createServer } from "vite";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const inputRoot = "/home/ubuntu/repo-review/uploaded-lists-extracted";
const outputPath = join(
  projectRoot,
  "client/src/data/uploaded-linguistic-lists-batch-01.json",
);
const inputFiles = [
  "deepseek_json_20260802_197611.json",
  "deepseek_json_20260802_d253fa.json",
  "deepseek_json_20260802_df57b6.json",
  "deepseek_json_20260802_e1d444.json",
].map((file) => join(inputRoot, file));

function text(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
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
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ar");
}

function canonicalUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    const parameters = [...url.searchParams.entries()].sort(
      ([firstKey, firstValue], [secondKey, secondValue]) =>
        firstKey.localeCompare(secondKey) || firstValue.localeCompare(secondValue),
    );
    url.search = "";
    for (const [key, item] of parameters) url.searchParams.append(key, item);
    return url.toString();
  } catch {
    return raw.replace(/\/+$/, "").toLowerCase();
  }
}

function titleOf(record) {
  return text(record?.title ?? record?.name ?? record?.["العنوان"] ?? record?.["الاسم"]);
}

function authorOf(record) {
  return text(record?.author ?? record?.writer ?? record?.["المؤلف"]);
}

function categoryOf(record) {
  return text(record?.category ?? record?.subject ?? record?.section ?? record?.type ?? record?.["التصنيف"]);
}

function sourceOf(record) {
  return text(record?.source ?? record?.publisher ?? record?.library ?? record?.["المصدر"]);
}

function collectRecordArrays(value, path = "") {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.some((item) => item && typeof item === "object" && titleOf(item))
      ? [[path || "records", value]]
      : [];
  }
  return Object.entries(value).flatMap(([key, item]) =>
    collectRecordArrays(item, path ? `${path}.${key}` : key),
  );
}

function linkOf(record) {
  const raw = Array.isArray(record?.links)
    ? record.links
    : Array.isArray(record?.urls)
      ? record.urls
      : record?.url || record?.link
        ? [{ source: record?.source, url: record?.url ?? record?.link }]
        : [];
  const candidates = raw
    .map((item) => ({ source: text(item?.source ?? item?.name), url: text(item?.url ?? item?.link) }))
    .filter((item) => canonicalUrl(item.url));
  const priority = (item) => {
    const label = normalizeArabic(`${item.source} ${item.url}`);
    if (label.includes("archive.org") || label.includes("ارشف")) return 0;
    if (label.includes("waqfeya") || label.includes("وقفي")) return 1;
    if (label.includes("shamela") || label.includes("شامله")) return 2;
    if (label.includes("noor-book") || label.includes("نور")) return 3;
    return 10;
  };
  return candidates.sort((first, second) => priority(first) - priority(second) || first.url.localeCompare(second.url))[0] ?? {
    source: "قوائم لغوية مرفقة",
    url: "",
  };
}

function sectionFor(listKey) {
  const sections = {
    "nahw_sarf.books": {
      primaryCategory: "references",
      tags: ["نحو", "صرف"],
      label: "النحو والصرف",
      signal: "قائمة النحو والصرف المرفقة",
    },
    "balagha.books": {
      primaryCategory: "references",
      tags: ["بلاغة"],
      label: "البلاغة",
      signal: "قائمة البلاغة المرفقة",
    },
    "arudh_rhyme.books": {
      primaryCategory: "references",
      tags: ["شعر وأدب"],
      label: "العروض والقافية",
      signal: "قائمة العروض والقافية المرفقة",
    },
    "language_lexicons.books": {
      primaryCategory: "dictionaries",
      tags: ["معجم لغوي"],
      label: "المعاجم اللغوية",
      signal: "قائمة المعاجم اللغوية المرفقة",
    },
    "adab_naqd.books": {
      primaryCategory: "references",
      tags: ["شعر وأدب"],
      label: "الأدب والنقد",
      signal: "قائمة الأدب والنقد المرفقة",
    },
    "poetry_diwan.books": {
      primaryCategory: "diwans",
      tags: ["ديوان شعري"],
      label: "الدواوين الشعرية",
      signal: "قائمة الدواوين الشعرية المرفقة",
    },
    applied_linguistics: {
      primaryCategory: "references",
      tags: ["دراسات لغوية"],
      label: "الدراسات اللغوية",
      signal: "قائمة اللسانيات التطبيقية المرفقة",
    },
    historical_linguistics: {
      primaryCategory: "references",
      tags: ["دراسات لغوية"],
      label: "الدراسات اللغوية",
      signal: "قائمة اللسانيات التاريخية المرفقة",
    },
  };
  return sections[listKey] ?? {
    primaryCategory: "references",
    tags: ["دراسات لغوية"],
    label: "الدراسات اللغوية",
    signal: "قائمة بلا قسم صريح",
  };
}

const vite = await createServer({
  root: projectRoot,
  configFile: join(projectRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { MATERIALS } = await vite.ssrLoadModule("/client/src/lib/materials.ts");
  const existingIds = new Set(MATERIALS.map((item) => text(item.id)).filter(Boolean));
  const existingUrls = new Set(MATERIALS.map((item) => canonicalUrl(item.sourceUrl)).filter(Boolean));
  const existingTitles = new Set(MATERIALS.map((item) => normalizeArabic(item.title)).filter(Boolean));
  const seenIds = new Set();
  const seenUrls = new Set();
  const seenTitles = new Set();
  const materials = [];
  const excluded = {
    internalIdentifier: 0,
    internalUrl: 0,
    internalTitle: 0,
    existingIdentifier: 0,
    existingUrl: 0,
    existingTitle: 0,
    withoutTitle: 0,
  };
  const sectionCounts = {};
  let rawRecordCount = 0;

  for (const sourceFile of inputFiles) {
    const payload = JSON.parse(await readFile(sourceFile, "utf8"));
    for (const [listKey, records] of collectRecordArrays(payload)) {
      for (const record of records) {
        rawRecordCount += 1;
        const title = titleOf(record);
        const titleKey = normalizeArabic(title);
        if (!titleKey) {
          excluded.withoutTitle += 1;
          continue;
        }
        const author = authorOf(record) || null;
        const link = linkOf(record);
        const urlKey = canonicalUrl(link.url);
        const section = sectionFor(listKey);
        const id = `upload-b01-${createHash("sha256")
          .update(`${titleKey}|${normalizeArabic(author ?? "")}|${urlKey}|${section.label}`)
          .digest("hex")
          .slice(0, 20)}`;

        if (seenIds.has(id)) {
          excluded.internalIdentifier += 1;
          continue;
        }
        if (urlKey && seenUrls.has(urlKey)) {
          excluded.internalUrl += 1;
          continue;
        }
        if (seenTitles.has(titleKey)) {
          excluded.internalTitle += 1;
          continue;
        }
        seenIds.add(id);
        if (urlKey) seenUrls.add(urlKey);
        seenTitles.add(titleKey);

        if (existingIds.has(id)) {
          excluded.existingIdentifier += 1;
          continue;
        }
        if (urlKey && existingUrls.has(urlKey)) {
          excluded.existingUrl += 1;
          continue;
        }
        if (existingTitles.has(titleKey)) {
          excluded.existingTitle += 1;
          continue;
        }

        materials.push({
          id,
          title,
          author,
          source: sourceOf(record) || link.source || "قوائم لغوية مرفقة",
          relativePath: `${basename(sourceFile)}#${listKey}`,
          sourceUrl: link.url,
          primaryCategory: section.primaryCategory,
          tags: section.tags,
          matchEvidence: {
            strongSignals: [section.signal, categoryOf(record)].filter(Boolean),
            supportingSignals: [listKey, categoryOf(record), ...section.tags].filter(Boolean),
            explicitLanguageSource: true,
          },
        });
        sectionCounts[section.label] = (sectionCounts[section.label] ?? 0) + 1;
      }
    }
  }

  const catalog = {
    metadata: {
      title: "دفعة القوائم اللغوية المرفقة — الدفعة الأولى",
      sourceFiles: inputFiles.map((file) => basename(file)),
      generatedAt: "2026-08-02",
      rawRecordCount,
      uniqueInputCount: seenTitles.size,
      importedCount: materials.length,
      excluded,
      sectionCounts,
      selectionMethod:
        "تعيين القسم من مفتاح القائمة المرفقة، وإسناد كل قائمة بلا قسم صريح إلى الدراسات اللغوية، مع منع التكرار بالمعرف والرابط والعنوان العربي المطبّع.",
    },
    materials,
  };

  await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(catalog.metadata, null, 2));
} finally {
  await vite.close();
}

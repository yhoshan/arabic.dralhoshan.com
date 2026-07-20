import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = "/home/ubuntu/arabic-language-thesaurus";
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const archivePayload = readJson(resolve(projectRoot, "client/src/data/archive-diwans.json"));
const aljam3Payload = readJson(resolve(projectRoot, "client/src/data/aljam3-diwans.json"));
const outputPath = resolve(projectRoot, "client/src/data/diwans.json");
const auditPath = "/home/ubuntu/diwan_catalog_audit.json";

const foreignScript = /[پچژگکۍێی]/u;
const foreignLanguageSignal = /(?:فارسي|فارسية|الأدب\s+الفارسي|شعر\s+فارسي|تركي|تركية|اردو|إنجليزي|انجليزي|فرنسي|كردي)/u;
const nonDiwanTitle = /(?:^|\s)(?:أناشيد|اناشيد|نشيد|المستدرك|فهرس|دليل|دراسة|دراسه|رسالة|رساله|أطروحة|اطروحة|شرح|شروح|معلقات|المعلقات|مختارات|اختيارات|موسوعة|موسوعه|روائع|نزهة|نزهه|مجموع\s+اشعار|اشعار\s+النساء|حدوتة\s+كتاب|حدوته\s+كتاب|الشعرية|شعريه|نقد|قراءة|قراءه|تحليل|ديوان\s+(?:المعاني|النثر\s+العربي|الشعر\s+العربي|الشعراء)|شعراء\s+العرب)(?:\s|$)|(?:\s|^)(?:ورسائله|ورسائله|ونثره|نثره|وأخباره|واخباره)(?:\s|$)|(?:في|عن)\s+ديوان\s+/u;
const genericAuthor = /^(?:مجموعة\s+من|عدة\s+مؤلفين|مجهول|غير\s+معروف|لم\s+يثبت)/u;

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return compact(value)
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/\bابي\b/g, "ابو")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/[\[\]{}()"'`*_،؛:!?.,/\\|+\-=—–]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanDisplayTitle(value) {
  return compact(value)
    .replace(/^[\s._\-—–·•ـ]+/u, "")
    .replace(/^\d{3,7}[_\-\s]*/u, "")
    .replace(/^\d+\s+(?=ديوان\b)/u, "")
    .replace(/\s*\[[^\]]{1,80}\]\s*(?:---|–|—)\s*.*/u, "")
    .replace(/\s+(?:pdf|word|htm|html)$/iu, "")
    .trim();
}

function hasArabicText(value) {
  const raw = compact(value);
  if (!raw || foreignScript.test(raw)) return false;
  const letters = raw.match(/[\u0621-\u064A]/g) ?? [];
  const visible = raw.replace(/\s|[\d٠-٩\W_]/g, "");
  return letters.length >= 3 && letters.length / Math.max(visible.length, 1) >= 0.58;
}

function tokens(value) {
  return new Set(normalize(value).split(/\s+/).filter((token) => token.length > 1 && !["ديوان", "الشعر", "شعري"].includes(token)));
}

function tokenOverlap(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap;
}

function canonicalTitle(value) {
  return normalize(cleanDisplayTitle(value))
    .replace(/(?:\s|[-–—،:])(?:ت\.?|تحقيق|طبعه|طبعة|نشر|مراجعه|مراجعة).*/u, "")
    .trim();
}

function canonicalAuthor(value) {
  const author = normalize(value);
  return genericAuthor.test(author) ? "" : author;
}

function identityFor(record) {
  const title = canonicalTitle(record.title);
  const author = canonicalAuthor(record.author);
  const diwanMatch = title.match(/(?:^|\s)ديوان\s+(.+)$/u);
  if (diwanMatch && author && tokenOverlap(diwanMatch[1], author) >= 2) return `poet-diwan::${author}`;
  return `work::${title}::${author || "author-unavailable"}`;
}

function rejectionReason(record) {
  const title = cleanDisplayTitle(record.title);
  const author = compact(record.author);
  const evidence = compact([
    ...(record.matchEvidence?.strongSignals ?? []),
    ...(record.matchEvidence?.supportingSignals ?? []),
  ].join(" "));
  if (!hasArabicText(title)) return "العنوان ليس عربياً خالصاً";
  if (foreignLanguageSignal.test(`${title} ${author} ${evidence}`)) return "لغة أو سياق غير عربي";
  if (nonDiwanTitle.test(normalize(title))) return "العنوان يصف مادة غير ديوانية أو عملاً مضمّناً";
  if (genericAuthor.test(normalize(author)) && !/(?:ديوان|قصائد|اشعار|أشعار)/u.test(title)) return "لا يثبت شاعر أو ديوان مستقل";
  return "";
}

function sourcePriority(source) {
  return source === "Internet Archive" ? 0 : 1;
}

function toCatalogRecord(sourceRecord) {
  const title = cleanDisplayTitle(sourceRecord.title);
  const author = compact(sourceRecord.author) || "لم يُثبت اسم الشاعر في المصدر";
  const source = sourceRecord.source;
  return {
    id: sourceRecord.id,
    title,
    author,
    source,
    sourceUrl: sourceRecord.sourceUrl,
    primaryCategory: "diwans",
    tags: ["ديوان شعري"],
    matchEvidence: sourceRecord.matchEvidence ?? { strongSignals: [], supportingSignals: [] },
    volumes: sourceRecord.volumes ?? null,
    pages: sourceRecord.pages ?? null,
  };
}

const allSourceRecords = [
  ...(archivePayload.materials ?? []),
  ...(aljam3Payload.materials ?? []),
].map(toCatalogRecord);

const rejected = [];
const byIdentity = new Map();
for (const candidate of allSourceRecords) {
  const reason = rejectionReason(candidate);
  if (reason) {
    rejected.push({ id: candidate.id, title: candidate.title, author: candidate.author, source: candidate.source, reason });
    continue;
  }
  const identity = identityFor(candidate);
  const previous = byIdentity.get(identity);
  const sourceRef = { source: candidate.source, url: candidate.sourceUrl };
  if (!previous) {
    byIdentity.set(identity, { ...candidate, identity, sourceRefs: [sourceRef] });
    continue;
  }
  const uniqueRefs = [...previous.sourceRefs, sourceRef].filter((ref, index, refs) => refs.findIndex((other) => other.url === ref.url) === index);
  const preferred = sourcePriority(candidate.source) < sourcePriority(previous.source) ? candidate : previous;
  const title = preferred.title;
  const author = canonicalAuthor(preferred.author) ? preferred.author : previous.author;
  byIdentity.set(identity, {
    ...preferred,
    title,
    author,
    identity,
    sourceRefs: uniqueRefs,
    duplicateIds: [...(previous.duplicateIds ?? [previous.id]), candidate.id],
  });
}

const materials = [...byIdentity.values()]
  .map(({ identity, duplicateIds, ...record }) => ({ ...record, sourceCount: record.sourceRefs.length }))
  .sort((a, b) => a.title.localeCompare(b.title, "ar"));
const rejectedCounts = Object.fromEntries([...new Set(rejected.map((item) => item.reason))].map((reason) => [reason, rejected.filter((item) => item.reason === reason).length]));
const duplicateCount = allSourceRecords.length - rejected.length - materials.length;
const payload = {
  metadata: {
    generatedAt: new Date().toISOString(),
    sourceName: "الأرشيف العالمي والجامع",
    sourceIndexUrl: "https://archive.org/search?tab=all&query=%D8%AF%D9%8A%D9%88%D8%A7%D9%86&and%5B%5D=mediatype%3A%22texts%22",
    selectionMethod: "دواوين عربية موثقة ببيانات المصدر، بعد استبعاد المواد غير الديوانية واللغات غير العربية وتوحيد المكرر بالعنوان والشاعر عند التحقق.",
    collectionScope: "دفعة الدواوين الديناميكية الحالية؛ كل بطاقة تحيل إلى صفحة الديوان في مصدره.",
    inputs: {
      archive: archivePayload.materials?.length ?? 0,
      aljam3: aljam3Payload.materials?.length ?? 0,
    },
  },
  materials,
};
const audit = {
  generatedAt: payload.metadata.generatedAt,
  inputRecords: allSourceRecords.length,
  acceptedRecords: materials.length,
  rejectedRecords: rejected.length,
  duplicateRecordsMerged: duplicateCount,
  rejectedCounts,
  rejectedSample: rejected.slice(0, 40),
  mergedSourceSample: materials.filter((item) => item.sourceCount > 1).slice(0, 40),
  acceptedSample: materials.slice(0, 40),
};
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ inputs: allSourceRecords.length, accepted: materials.length, rejected: rejected.length, mergedDuplicates: duplicateCount, outputPath, auditPath }, null, 2));

import fs from 'node:fs';
import path from 'node:path';

const inputDir = '/home/ubuntu/webdev-static-assets/linguistic-lists-batch-01';
const outputJson = '/home/ubuntu/arabic-language-thesaurus/.tmp-batch-01-analysis.json';
const outputMarkdown = '/home/ubuntu/arabic-language-thesaurus/.tmp-batch-01-analysis.md';

function text(value) {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(' | ');
  return '';
}

function normalizeArabic(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) &&
    ['title', 'name', 'title_ar'].some((field) => typeof value[field] === 'string' && value[field].trim());
}

function sourceUrl(record) {
  return text(record.sourceUrl ?? record.url ?? record.link ?? record.archive_org?.url ?? record.archive?.url);
}

function externalId(record) {
  return text(record.id ?? record.identifier ?? record.archive_org?.identifier ?? record.archive?.identifier);
}

function walk(node, currentPath, out) {
  if (Array.isArray(node)) {
    const records = node.filter(isRecord);
    if (records.length) {
      records.forEach((record, index) => out.push({ path: currentPath, index, record }));
      return;
    }
    node.forEach((value, index) => walk(value, `${currentPath}[${index}]`, out));
    return;
  }
  if (node && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => {
      if (key !== 'meta') walk(value, `${currentPath}.${key}`, out);
    });
  }
}

const files = fs.readdirSync(inputDir).filter((file) => file.endsWith('.json')).sort();
const records = [];
for (const file of files) {
  const payload = JSON.parse(fs.readFileSync(path.join(inputDir, file), 'utf8'));
  const found = [];
  walk(payload, '$', found);
  found.forEach(({ path: recordPath, index, record }) => {
    const title = text(record.title ?? record.name ?? record.title_ar);
    records.push({
      file,
      meta: payload.meta ?? {},
      recordPath,
      listKey: recordPath.replace(/^\$\./, '').replace(/\.(books|references|items|materials)$/i, '').replace(/\./g, ' / ') || 'unclassified',
      index,
      title,
      normalizedTitle: normalizeArabic(title),
      author: text(record.author ?? record.authors),
      categoryHint: text(record.category ?? record.section ?? record.classification),
      tagsHint: text(record.tags ?? record.topics),
      description: text(record.description ?? record.abstract ?? record.summary),
      source: text(record.source ?? record.publisher),
      sourceUrl: sourceUrl(record),
      externalId: externalId(record),
      raw: record,
    });
  });
}

const groups = new Map();
for (const item of records) {
  const group = groups.get(item.listKey) ?? { listKey: item.listKey, count: 0, examples: [], files: new Set() };
  group.count += 1;
  group.files.add(item.file);
  if (group.examples.length < 3) group.examples.push(item.title);
  groups.set(item.listKey, group);
}

const titleMap = new Map();
records.forEach((item) => {
  if (!item.normalizedTitle) return;
  const same = titleMap.get(item.normalizedTitle) ?? [];
  same.push(item);
  titleMap.set(item.normalizedTitle, same);
});
const duplicateTitles = [...titleMap.entries()]
  .filter(([, same]) => same.length > 1)
  .map(([normalizedTitle, same]) => ({ normalizedTitle, title: same[0].title, occurrences: same.map((item) => ({ file: item.file, listKey: item.listKey, recordPath: item.recordPath })) }));

const result = {
  inputDir,
  fileCount: files.length,
  rawRecordCount: records.length,
  groups: [...groups.values()].map((group) => ({ ...group, files: [...group.files] })).sort((a, b) => a.listKey.localeCompare(b.listKey, 'ar')),
  duplicateTitles,
  records,
};
fs.writeFileSync(outputJson, `${JSON.stringify(result, null, 2)}\n`);

const lines = [
  '# تحليل الدفعة الأولى',
  '',
  `- الملفات: **${files.length}**`,
  `- السجلات الخام: **${records.length}**`,
  `- القوائم: **${groups.size}**`,
  `- العناوين المكررة داخليًا: **${duplicateTitles.length}**`,
  '',
  '| القائمة | السجلات | أمثلة |',
  '|---|---:|---|',
];
result.groups.forEach((group) => lines.push(`| \`${group.listKey}\` | ${group.count} | ${group.examples.join(' — ')} |`));
if (duplicateTitles.length) {
  lines.push('', '## العناوين المكررة داخل الدفعة', '');
  duplicateTitles.forEach((item) => lines.push(`- **${item.title}**: ${item.occurrences.map((occurrence) => `\`${occurrence.file}: ${occurrence.listKey}\``).join('، ')}`));
}
fs.writeFileSync(outputMarkdown, `${lines.join('\n')}\n`);
console.log(JSON.stringify({ outputJson, outputMarkdown, fileCount: files.length, rawRecordCount: records.length, groupCount: groups.size, duplicateTitles: duplicateTitles.length }, null, 2));

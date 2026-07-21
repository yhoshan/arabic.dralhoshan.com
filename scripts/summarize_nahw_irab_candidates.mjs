import fs from "node:fs";

const auditPath = "/home/ubuntu/archive_nahw_irab_import_audit.json";
const outputPath = "/home/ubuntu/archive_nahw_irab_candidate_quality_summary.json";
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const accepted = Array.isArray(audit.acceptedRecords) ? audit.acceptedRecords : [];

const reviewPattern = /ملخص|مذكرة|محاضرة|محاضرات|تدريب(?:ات)?|تمرين(?:ات)?|ورقة عمل|واجب|اختبار|امتحان|إجابة نموذجية|أسئلة|درس|دروس|للصف|الصف|الثانوية|البكالوريا|منهج(?:ية)?|مقرر|دليل المعلم|المعلم|المعلمة|الطال[بة]{1,2}|المرحلة|الوحدة التعليمية/i;
const grammarSignal = /نحو|إعراب|اعراب|نحوي|النحو العربي|الآجرومية|الاجرومية|ألفية ابن مالك|الألفية|ابن هشام|المفصل|الجمل في النحو|الكافية في النحو|عوامل النحو|قواعد النحو|منصوبات|مرفوعات|مجرورات|تيسير النحو|النحو التطبيقي|معاني النحو|شرح قطر الندى|شذور الذهب/i;
const canonical = (value) => String(value || "")
  .normalize("NFKC")
  .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
  .replace(/[أإآ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/ؤ/g, "و")
  .replace(/ئ/g, "ي")
  .replace(/ـ/g, "")
  .replace(/[_]+/g, " ")
  .replace(/^\s*(?:\d{3,8}|\d{1,4}\s*(?:كتاب|book|bok|pdf|word|htm))\s*/i, "")
  .replace(/^\s*(?:كتاب|book|bok)\s+/i, "")
  .replace(/\b(?:اقرا اونلاين|اقرأ اونلاين|صيغة|ورد|word|pdf|htm|www)\b/gi, " ")
  .replace(/[^\u0621-\u063A\u0641-\u064A0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const byTag = {};
const reviewCandidates = [];
const weakGrammarSignal = [];
const titleGroups = new Map();
for (const material of accepted) {
  for (const tag of material.tags || []) byTag[tag] = (byTag[tag] || 0) + 1;
  const title = String(material.title || "");
  if (reviewPattern.test(title)) reviewCandidates.push({ id: material.id, title, tags: material.tags, sourceUrl: material.sourceUrl });
  if (!grammarSignal.test(title)) weakGrammarSignal.push({ id: material.id, title, tags: material.tags, sourceUrl: material.sourceUrl });
  const key = canonical(title);
  if (!titleGroups.has(key)) titleGroups.set(key, []);
  titleGroups.get(key).push({ id: material.id, title, sourceUrl: material.sourceUrl });
}
const duplicateTitleGroups = [...titleGroups.entries()]
  .filter(([, entries]) => entries.length > 1)
  .map(([title, entries]) => ({ title, records: entries }))
  .sort((a, b) => b.records.length - a.records.length);

const output = {
  accepted: accepted.length,
  byTag,
  reviewTitleSignals: reviewCandidates.length,
  reviewTitleSamples: reviewCandidates.slice(0, 80),
  weakDirectGrammarSignal: weakGrammarSignal.length,
  weakDirectGrammarSignalSamples: weakGrammarSignal.slice(0, 80),
  remainingExactTitleGroups: duplicateTitleGroups.length,
  remainingExactTitleGroupSamples: duplicateTitleGroups.slice(0, 40),
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output, null, 2));

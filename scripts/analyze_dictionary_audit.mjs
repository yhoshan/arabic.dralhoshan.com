import fs from "node:fs";

const auditPath = process.env.AUDIT_PATH || "/home/ubuntu/archive_dictionaries_import_audit_final.json";
const outputPath = process.env.OUTPUT_PATH || "/home/ubuntu/archive_dictionaries_audit_profile_final.json";
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const suspiciousPattern = /(?:شيوخ|رجال|صحابة|رواة|بلدان|أنساب|قبائل|فتاوى|فقه|فقهاء|قراءات|مؤلفين|مخطوطات|طرق صوفية|أعلام|سير|تراجم|دول|تاريخ|سياسة|طب|هندسة|اقتصاد|قانون|رياضيات)/i;
const schoolPattern = /(?:مراجعة|اختبار|امتحان|تمارين|ورقة عمل|الصف|الثانوي|الابتدائي|واجبات)/i;
const recordSummary = (record) => ({
  id: record.id,
  title: record.title,
  tags: record.tags,
  sourceUrl: record.sourceUrl,
});
const suspicious = audit.acceptedRecords.filter((record) => suspiciousPattern.test(record.title));
const schoolLike = audit.acceptedRecords.filter((record) => schoolPattern.test(record.title));
const malformedTitle = audit.acceptedRecords.filter((record) => /(?:^\d{3,}|\bpdf\b|\bbook\b|_)/i.test(record.title));
const profile = {
  auditPath,
  accepted: audit.accepted,
  acceptedByTag: audit.acceptedByTag,
  suspiciousCount: suspicious.length,
  suspicious: suspicious.slice(0, 50).map(recordSummary),
  schoolLikeCount: schoolLike.length,
  schoolLike: schoolLike.slice(0, 30).map(recordSummary),
  malformedTitleCount: malformedTitle.length,
  malformedTitle: malformedTitle.slice(0, 30).map(recordSummary),
};
fs.writeFileSync(outputPath, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ accepted: profile.accepted, suspiciousCount: profile.suspiciousCount, schoolLikeCount: profile.schoolLikeCount, malformedTitleCount: profile.malformedTitleCount }, null, 2));

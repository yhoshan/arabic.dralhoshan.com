import fs from "node:fs";

const auditPath = process.env.AUDIT_PATH || "/home/ubuntu/archive_prosody_import_audit.json";
const outputPath = process.env.OUTPUT_PATH || "/home/ubuntu/archive_prosody_audit_profile.json";
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const accepted = Array.isArray(audit.acceptedRecords) ? audit.acceptedRecords : [];

const suspiciousProsodyContext = /العروض\s+(?:المسرحي(?:ة)?|التجاري(?:ة)?|الضوئي(?:ة)?|السينمائي(?:ة)?|الفني(?:ة)?|التلفزيوني(?:ة)?|الموسيقي(?:ة)?|العسكري(?:ة)?|الطبي(?:ة)?|السعري(?:ة)?|على\s+الأرض|الأرض)|معارض|عرض(?:\s+(?:مسرحي|تجاري|فني|سينمائي|ضوئي|عسكري|طبي|سعري))/i;
const prosodyAnchor = /علم\s+العروض|عروض\s+الشعر|العروض\s*(?:و|،)?\s*(?:القافية|القوافي)|القافي(?:ة|ات)|بحور\s+(?:الشعر|شعرية)|الأوزان\s+الشعرية|وزن\s+الشعر|تفعيلات|زحاف|علل\s+العروض|إيقاع(?:ية)?\s+(?:الشعر|شعري)|عروض\s+(?:العربي|القديم|ل(?:ل)?زجاج|لابن\s+جني|الفرس)/i;
const titles = accepted.map((record) => String(record.title || ""));
const suspicious = accepted.filter((record) => suspiciousProsodyContext.test(String(record.title || "")));
const weakProsody = accepted.filter((record) => {
  const title = String(record.title || "");
  return /العروض|القافي/i.test(title) && !prosodyAnchor.test(title) && !suspiciousProsodyContext.test(title);
});
const noArabicLiteraryAnchor = accepted.filter((record) => {
  const title = String(record.title || "");
  return !/العروض|القافي|شعر|أدب|نقد|بلاغ|نحو|صرف|معجم|لغة|لسان|ديوان|قص(?:ة|ص)|رواية|مقامة/i.test(title);
});

const profile = {
  auditPath,
  accepted: accepted.length,
  acceptedWithProsodyOrArabicAnchor: accepted.filter((record) => prosodyAnchor.test(String(record.title || ""))).length,
  suspiciousProsodyContextCount: suspicious.length,
  suspiciousProsodyContext: suspicious.map((record) => ({ id: record.id, title: record.title, sourceUrl: record.sourceUrl })),
  weakProsodyAnchorCount: weakProsody.length,
  weakProsodyAnchorSample: weakProsody.slice(0, 50).map((record) => ({ id: record.id, title: record.title, sourceUrl: record.sourceUrl })),
  noArabicLiteraryAnchorCount: noArabicLiteraryAnchor.length,
  noArabicLiteraryAnchorSample: noArabicLiteraryAnchor.slice(0, 50).map((record) => ({ id: record.id, title: record.title, sourceUrl: record.sourceUrl })),
  titleSample: titles.slice(0, 80),
};

fs.writeFileSync(outputPath, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
console.log(JSON.stringify(profile, null, 2));

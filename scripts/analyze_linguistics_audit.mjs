import fs from "node:fs";

const auditPath = process.env.AUDIT_PATH || "/home/ubuntu/archive_linguistics_import_audit.json";
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const accepted = Array.isArray(audit.acceptedRecords) ? audit.acceptedRecords : [];

const schoolPattern = /(?:الصف(?:\s|$)|المرحلة\s*(?:الابتدائية|الإعدادية|الاعدادية|الثانوية)|ابتدائي|ابتدائية|إعدادي|اعدادي|ثانوي|امتحان|اختبار|مذكرة|ملزمة|كراسة|ورقة\s*عمل|دليل\s*المعلم|دليل\s*الطالب|تلاميذ|التلميذ|مدرسة|مدارس|كتاب\s*(?:الطالب|التلميذ))/i;
const noisyTitlePattern = /(?:^\s*[_○♣♦•·\d\-]+|اقرا\s*اونلاين|اقرأ\s*اونلاين|\bpdf\b|\bhtm\b|\bhtml\b|\bwww\b|upscaled|صيغة\s*(?:ويب|وورد|word)|\bكتاب\s+اقرا)/i;
const pedagogicPattern = /(?:تعليم|تدريس|طرائق\s*تدريس|مناهج\s*اللغة|تعلم\s*اللغة)/i;
const categoryCounts = Object.fromEntries(
  ["references", "dictionaries", "academic_theses"].map((category) => [category, accepted.filter((item) => item.primaryCategory === category).length]),
);
const tagCounts = Object.fromEntries(
  ["بلاغة", "نحو", "صرف", "معجم لغوي", "دراسات لغوية", "شعر وأدب", "رسالة علمية"].map((tag) => [tag, accepted.filter((item) => item.tags.includes(tag)).length]),
);
const sample = (items) => items.slice(0, 25).map((item) => ({ id: item.id, title: item.title, tags: item.tags }));

const report = {
  accepted: accepted.length,
  categoryCounts,
  tagCounts,
  schoolLike: {
    count: accepted.filter((item) => schoolPattern.test(item.title)).length,
    sample: sample(accepted.filter((item) => schoolPattern.test(item.title))),
  },
  pedagogicButNotSchoolLike: {
    count: accepted.filter((item) => pedagogicPattern.test(item.title) && !schoolPattern.test(item.title)).length,
    sample: sample(accepted.filter((item) => pedagogicPattern.test(item.title) && !schoolPattern.test(item.title))),
  },
  noisyTitles: {
    count: accepted.filter((item) => noisyTitlePattern.test(item.title)).length,
    sample: sample(accepted.filter((item) => noisyTitlePattern.test(item.title))),
  },
};

console.log(JSON.stringify(report, null, 2));

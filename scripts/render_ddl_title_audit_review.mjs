import fs from "node:fs";

const auditPath = process.env.AUDIT_PATH || "/home/ubuntu/ddl_title_only_import_audit.json";
const outputPath = process.env.OUTPUT_PATH || "/home/ubuntu/ddl_title_only_import_review.md";
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));

function rows(items, fields) {
  return items
    .map((item, index) => `| ${index + 1} | ${fields.map((field) => String(item[field] ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`)
    .join("\n");
}

const accepted = audit.acceptedRecords || [];
const rejected = audit.rejectedSample || [];
const duplicates = audit.duplicateSample || [];
const lines = [
  "# مراجعة تدقيق عناوين مركز المعرفة الرقمي (DDL)",
  "",
  `تاريخ التقرير: ${audit.generatedAt}`,
  "",
  "## الملخص",
  "",
  "| المؤشر | القيمة |",
  "|---|---:|",
  `| عناوين الإدخال | ${audit.input?.titleOccurrences ?? 0} |`,
  `| المقبول | ${audit.accepted ?? 0} |`,
  `| المستبعد | ${audit.rejected ?? 0} |`,
  `| المحجوب للتكرار | ${audit.duplicates ?? 0} |`,
  `| الكتالوج قبل الدمج | ${audit.catalogMaterialsBeforeImport ?? 0} |`,
  `| الكتالوج بعد الدمج المتوقع | ${audit.catalogMaterialsAfterImport ?? 0} |`,
  "",
  "## المقبول بحسب الوسم",
  "",
  "| الوسم | العدد |",
  "|---|---:|",
  ...Object.entries(audit.acceptedByTag || {}).map(([tag, count]) => `| ${tag} | ${count} |`),
  "",
  "## السجلات المقبولة",
  "",
  "| # | العنوان | الوسوم | التصنيف الأولي في الملف |",
  "|---:|---|---|---|",
  rows(
    accepted.map((item) => ({
      title: item.title,
      tags: (item.tags || []).join("، "),
      sourceCategory: item.matchEvidence?.supportingSignals?.find((signal) => signal.startsWith("تصنيف الملف الأولي:"))?.replace("تصنيف الملف الأولي: ", "") || "—",
    })),
    ["title", "tags", "sourceCategory"],
  ),
  "",
  "## عينة الاستبعاد",
  "",
  "| # | العنوان | التصنيف الأولي في الملف | سبب الاستبعاد |",
  "|---:|---|---|---|",
  rows(rejected, ["title", "sourceCategory", "reason"]),
  "",
  "## عينة التكرار المحجوب",
  "",
  "| # | العنوان | التصنيف الأولي في الملف | سبب الحجب | العنوان المقارن |",
  "|---:|---|---|---|---|",
  rows(duplicates, ["title", "sourceCategory", "reason", "relatedTitle"]),
  "",
];

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(outputPath);

import fs from "node:fs";

const audit = JSON.parse(fs.readFileSync("/home/ubuntu/archive_balaghah_import_audit.json", "utf8"));
const records = Array.isArray(audit.acceptedRecords) ? audit.acceptedRecords : [];
const tags = ["بلاغة", "نحو", "صرف", "معجم لغوي", "دراسات لغوية", "شعر وأدب"];
const lines = [];
lines.push("تقرير مراجعة مرشحي دفعة البلاغة من أرشيف");
lines.push(`إجمالي المرشحين: ${records.length}`);
lines.push("");
for (const tag of tags) {
  const group = records.filter((record) => record.tags?.includes(tag));
  lines.push(`## ${tag} (${group.length})`);
  for (const record of group) {
    lines.push(`- ${record.title} | ${record.author || "بلا مؤلف"} | ${record.sourceUrl}`);
  }
  lines.push("");
}
fs.writeFileSync("/home/ubuntu/archive_balaghah_accepted_titles.txt", `${lines.join("\n")}\n`, "utf8");
console.log(lines.slice(0, 100).join("\n"));

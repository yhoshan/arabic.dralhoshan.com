import { readFile, writeFile } from "node:fs/promises";

const auditPath = "/home/ubuntu/drive_buhooth_audit.json";
const outputPath = "/home/ubuntu/drive_buhooth_priority_selection.json";
const reportPath = "/home/ubuntu/drive_buhooth_priority_selection.md";

const directSciencePattern = /(?:النحو|نحوي|الإعراب|اعراب|الصرف|صرفي|التصريف|الاشتقاق|الإعلال|الاعلال|الإبدال|الابدال|الإدغام|الادغام|بلاغة|بلاغي|البيان|البديع|المعاني|الفصاحة|المجاز|تشبيه|استعارة|كناية|معجم|معاجم|قاموس|قواميس|لسانيات|لساني|الدلالة|دلالي|التداولية|تداولي|الصوتيات|صوتي|الأصوات|لهجة|لهجات|الإملاء|املاء|الخط العربي|تعريب|اللغة العربية|لغة عربية|العروض|القافية|نقد أدبي|النقد الأدبي|الأدب العربي|الشعر العربي)/iu;
const weakContextPattern = /(?:التفسير|القرآن الكريم|القرآنية|الفقه|الفقهية|الحديث النبوي|العقيدة|الشريعة|الشرعية|التصوف|الصوفي|المصطلحات الطبية|الطب|أمراض الدم|السياسة|القانون|الاقتصاد|الإدارة)/iu;
const directSourcePattern = /(?:للغة العربية|العلوم العربية|الآداب|الأدب|الإنسانية|اللغوية)/iu;

function score(entry) {
  const title = String(entry.title ?? "");
  const source = String(entry.sourceName ?? "");
  let points = Number(entry.relevanceScore ?? 0);
  if (directSciencePattern.test(title)) points += 5;
  if (directSourcePattern.test(source)) points += 2;
  if (weakContextPattern.test(title) && entry.tags.length < 2) points -= 6;
  if (weakContextPattern.test(source) && !/(?:النحو|نحوي|الصرف|صرفي|بلاغة|معجم|لساني|الدلالة|دلالي|الصوت|لهجة|إملاء|تعريب|اللغة العربية|لغة عربية|العروض|القافية|نقد أدبي|الأدب العربي|الشعر العربي)/iu.test(title)) points -= 4;
  return points;
}

const audit = JSON.parse(await readFile(auditPath, "utf8"));
const selection = (Array.isArray(audit.recommended) ? audit.recommended : [])
  .map((entry) => ({ ...entry, priorityScore: score(entry) }))
  .filter((entry) => directSciencePattern.test(entry.title) && entry.priorityScore >= 8)
  .sort((left, right) => right.priorityScore - left.priorityScore || left.title.localeCompare(right.title, "ar"));

const byTag = Object.fromEntries(
  ["نحو", "صرف", "بلاغة", "معجم لغوي", "دراسات لغوية", "شعر وأدب"].map((tag) => [
    tag,
    selection.filter((entry) => entry.tags.includes(tag)).length,
  ]),
);
const bySource = Object.entries(
  selection.reduce((accumulator, entry) => {
    accumulator[entry.sourceName] = (accumulator[entry.sourceName] ?? 0) + 1;
    return accumulator;
  }, {}),
)
  .sort(([, left], [, right]) => right - left)
  .map(([sourceName, count]) => ({ sourceName, count }));

const output = {
  generatedAt: new Date().toISOString(),
  selectionMethod:
    "ترشيح محافظ من مواد اجتازت مطابقة عدم التكرار، يشترط إشارة صريحة في العنوان إلى أحد علوم العربية أو آدابها، مع خفض أولوية السياقات الدينية أو التخصصية التي لا تثبت صلتها اللغوية من العنوان.",
  total: selection.length,
  byTag,
  bySource,
  materials: selection,
};

const rows = selection.slice(0, 100).map((entry, index) => {
  const author = entry.authors.length ? entry.authors.join("، ") : "غير مذكور";
  return `| ${index + 1} | ${entry.title.replace(/\|/gu, "\\|")} | ${entry.tags.join("، ")} | ${entry.sourceName.replace(/\|/gu, "\\|")} | ${author.replace(/\|/gu, "\\|")} | [الرابط](${entry.sourceUrl}) |`;
});
const markdown = `# انتقاء محافظ من فهرس بحوث لمكنز اللغة العربية وعلومها\n\n> لا تضم هذه الوثيقة إلا مواد اجتازت أولاً فحص عدم التكرار، ثم حمل عنوانها إشارة مباشرة إلى علم من علوم العربية أو آدابها. لم يُستورد أي سجل.\n\n## الحصيلة\n\n| البند | العدد |\n|---|---:|\n| المرشحات غير المكررة في التدقيق الأول | ${audit.statistics.accepted.toLocaleString("ar-EG")} |\n| الانتقاء المحافظ ذي الصلة الصريحة | ${selection.length.toLocaleString("ar-EG")} |\n\n## التوزيع بحسب الإشارات الموضوعية\n\n| الوسم | العدد |\n|---|---:|\n${Object.entries(byTag).map(([tag, count]) => `| ${tag} | ${count.toLocaleString("ar-EG")} |`).join("\n")}\n\n## أبرز المصادر\n\n| المصدر | العدد |\n|---|---:|\n${bySource.slice(0, 15).map((entry) => `| ${entry.sourceName} | ${entry.count.toLocaleString("ar-EG")} |`).join("\n")}\n\n## أول 100 مادة حسب الأولوية\n\n| # | العنوان | الإشارات | المصدر | المؤلف | الرابط المباشر |\n|---:|---|---|---|---|---|\n${rows.join("\n")}\n\n## ضابط الاستخدام\n\nهذه قائمة ترشيح لا دفعة استيراد. قبل أي إدخال فعلي، يراجع العنوان والمؤلف والرابط المباشر مرة أخيرة، وتُحجب المواد ذات الصلة غير المباشرة أو التي يثبت تكرارها بعد الفحص الببليوغرافي اليدوي.\n`;

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
await writeFile(reportPath, markdown, "utf8");
console.log(JSON.stringify({ total: selection.length, byTag, leadingSources: bySource.slice(0, 12) }, null, 2));

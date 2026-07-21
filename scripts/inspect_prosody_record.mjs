import fs from "node:fs";

const cache = JSON.parse(fs.readFileSync("/home/ubuntu/archive_prosody_metadata_cache.json", "utf8"));
const input = JSON.parse(fs.readFileSync("/home/ubuntu/upload/pasted_file_jLRUlq_archive_arabic_prosody_book_titles.json", "utf8"));
const pattern = /(?:العروض|عروض)\s+(?:المسرح(?:ية)?|التجاري(?:ة)?|الضوئي(?:ة)?|السينمائي(?:ة)?|الفني(?:ة)?|الموسيقي(?:ة)?|العسكري(?:ة)?|الطبي(?:ة)?|السعري(?:ة)?|على\s+الأرض|على\s+خشبات|في\s+المسرح)|عروض\s+مسرح|زكاة\s+العروض|المضاربة\s+على\s+العروض|عروض\s+التجارة/i;
for (const identifier of ["AAlexandrina-215386", "a1329n"]) {
  const book = input.books.find((entry) => entry.identifier === identifier);
  const metadata = cache[identifier] || {};
  const fields = [book?.title, metadata.title, metadata.subject, metadata.description, metadata.creator].map((value) => (Array.isArray(value) ? value.join(" | ") : String(value || "")));
  const catalogText = fields.join(" ");
  console.log(JSON.stringify({ identifier, bookTitle: book?.title, metadata, matchesCatalogText: pattern.test(catalogText), catalogText }, null, 2));
}

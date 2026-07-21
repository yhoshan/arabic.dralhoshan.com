const endpoint = "https://archive.org/services/search/v1/scrape";
const fields = "identifier,title,creator,language,subject,description,collection,mediatype";
const query = "mediatype:texts AND title:ديوان";

function buildUrl(cursor) {
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("fields", fields);
  url.searchParams.set("count", "1000");
  url.searchParams.set("sorts", "identifier");
  if (cursor) url.searchParams.set("cursor", cursor);
  return url;
}

const firstResponse = await fetch(buildUrl(), {
  headers: { "user-agent": "Arabic-Language-Thesaurus/1.2 (cursor probe)" },
  signal: AbortSignal.timeout(90000),
});
const firstText = await firstResponse.text();
console.log(JSON.stringify({ firstStatus: firstResponse.status, firstPreview: firstText.slice(0, 160) }, null, 2));
if (!firstResponse.ok) process.exit(1);

const firstPayload = JSON.parse(firstText);
const cursor = firstPayload.cursor;
console.log(JSON.stringify({ firstItems: firstPayload.items?.length ?? 0, cursorLength: cursor?.length ?? 0, cursorPreview: cursor?.slice(0, 100) ?? "" }, null, 2));
if (!cursor) process.exit(0);

const secondResponse = await fetch(buildUrl(cursor), {
  headers: { "user-agent": "Arabic-Language-Thesaurus/1.2 (cursor probe)" },
  signal: AbortSignal.timeout(90000),
});
const secondText = await secondResponse.text();
console.log(JSON.stringify({ secondStatus: secondResponse.status, secondPreview: secondText.slice(0, 700) }, null, 2));

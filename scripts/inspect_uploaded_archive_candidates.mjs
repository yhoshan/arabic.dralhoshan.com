import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const inputPath = "/home/ubuntu/upload/archive_org_diwans_all_6009.json.gz";
const identifiers = new Set([
  "20230622_20230622_1425",
  "20251125_20251125_0504",
  "03_20260627",
  "cam-scanner-21-08-2024-02.23",
  "1900-1970_202602",
  "20251126_20251126_0157",
  "20251128_20251128_0244",
  "20251126_20251126_0114",
  "20250829_20250829_1053",
  "20251126_20251126_0245",
]);

function list(value) {
  return Array.isArray(value) ? value.flatMap(list) : value == null ? [] : [String(value)];
}

const payload = JSON.parse(gunzipSync(readFileSync(inputPath)).toString("utf8"));
const rows = (payload.records ?? [])
  .filter((record) => identifiers.has(String(record.identifier ?? "")))
  .map((record) => ({
    identifier: record.identifier,
    title: record.title ?? "",
    creator: list(record.creator),
    language: list(record.language),
    subjects: list(record.subjects ?? record.subject),
    description: list(record.description).join(" ").slice(0, 800),
    collection: list(record.collection),
    mediatype: record.mediatype ?? "",
  }));

console.log(JSON.stringify(rows, null, 2));

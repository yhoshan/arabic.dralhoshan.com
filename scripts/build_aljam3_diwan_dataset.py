from __future__ import annotations

import json
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup

PROJECT_ROOT = Path("/home/ubuntu/arabic-language-thesaurus")
OUTPUT_PATH = PROJECT_ROOT / "client/src/data/aljam3-diwans.json"
AUDIT_PATH = Path("/home/ubuntu/aljam3_diwan_dataset_audit.json")
BASE_URL = "https://aljam3.com"
CATEGORY_URL = f"{BASE_URL}/ar/categories/31.turbo_stream?page={{page}}"
MAX_PAGES = 8


def compact(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_arabic(value: str | None) -> str:
    value = compact(value).lower()
    value = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", value)
    value = value.translate(str.maketrans({"إ": "ا", "أ": "ا", "آ": "ا", "ٱ": "ا", "ؤ": "و", "ئ": "ي", "ى": "ي", "ة": "ه"}))
    value = re.sub(r"[\u200e\u200f\u202a-\u202e]", "", value)
    value = re.sub(r"[\[\]{}()\"'`*_،؛:!?.,/\\|+\-=—–]", " ", value)
    return compact(value)


def has_arabic_title(value: str) -> bool:
    arabic_letters = re.findall(r"[\u0621-\u064a]", value)
    visible = re.sub(r"[\s\d٠-٩\W_]", "", value)
    return len(arabic_letters) >= 3 and len(arabic_letters) / max(len(visible), 1) >= 0.55


def fetch(url: str) -> str:
    result = subprocess.run(
        [
            "curl",
            "--fail",
            "--silent",
            "--show-error",
            "--location",
            "--max-time",
            "25",
            "--header",
            "Accept: text/vnd.turbo-stream.html, text/html;q=0.9",
            url,
        ],
        capture_output=True,
        check=True,
        timeout=30,
    )
    return result.stdout.decode("utf-8", errors="replace")


def parse_page(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    results = []
    for card in soup.select("div.rounded-xl.border.bg-card.shadow"):
        title_anchor = card.select_one('h3 a[href^="/ar/"]')
        author_anchor = card.select_one('a[href^="/ar/authors/"]')
        if not title_anchor:
            continue
        title = compact(title_anchor.decode_contents())
        relative_path = compact(title_anchor.get("href"))
        author = compact(author_anchor.decode_contents()) if author_anchor else ""
        source_url = urljoin(BASE_URL, relative_path)
        page_text = compact(BeautifulSoup(card.decode_contents(), "html.parser").get_text(" ", strip=True))
        volume_match = re.search(r"المجلدات:\s*(\d+)", page_text)
        page_match = re.search(r"الصفحات:\s*(\d+)", page_text)
        if title and relative_path.startswith("/ar/"):
            results.append({
                "id": f"aljam3-{relative_path.rsplit('/', 1)[-1]}",
                "title": title,
                "author": author or "لم يُثبت اسم الشاعر في المصدر",
                "source": "الجامع",
                "relativePath": relative_path.lstrip("/"),
                "sourceUrl": source_url,
                "primaryCategory": "diwans",
                "tags": ["ديوان شعري"],
                "volumes": int(volume_match.group(1)) if volume_match else None,
                "pages": int(page_match.group(1)) if page_match else None,
                "matchEvidence": {
                    "strongSignals": ["مصنف في قسم الدواوين الشعرية"],
                    "supportingSignals": [],
                    "explicitLanguageSource": True,
                },
            })
    return results


all_records: dict[str, dict] = {}
requests = []
failures = []
for page in range(1, MAX_PAGES + 1):
    url = CATEGORY_URL.format(page=page)
    try:
        html = fetch(url)
        page_records = parse_page(html)
        requests.append({"page": page, "url": url, "records": len(page_records)})
        for record in page_records:
            all_records[record["id"]] = record
        if not page_records:
            break
    except Exception as error:  # pragma: no cover - network source handling
        failures.append({"page": page, "url": url, "error": str(error)})
    time.sleep(0.25)

arabic_records = [record for record in all_records.values() if has_arabic_title(record["title"])]
arabic_records.sort(key=lambda record: record["title"])
metadata = {
    "sourceName": "الجامع",
    "sourceIndexUrl": "https://aljam3.com/ar/categories/31",
    "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "selectionMethod": "الكتب العربية المصنفة في قسم الدواوين الشعرية، مع رابط مباشر إلى صفحة الكتاب في المصدر.",
    "collectionScope": "قائمة القسم كاملة بحسب الصفحات المتاحة وقت الجمع.",
    "requests": requests,
}
payload = {"metadata": metadata, "materials": arabic_records}
audit = {
    "generatedAt": metadata["generatedAt"],
    "requests": requests,
    "failures": failures,
    "recordsBeforeLanguageFilter": len(all_records),
    "arabicRecords": len(arabic_records),
    "sample": arabic_records[:30],
}
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"records": len(arabic_records), "failures": len(failures), "output": str(OUTPUT_PATH), "audit": str(AUDIT_PATH)}, ensure_ascii=False, indent=2))

#!/usr/bin/env python3
"""Build a conservative Arabic-language and literature corpus from buhooth.link's public journal index.

The script is intentionally deterministic and auditable.  It only uses record metadata
published in the source index and does not download, reproduce, or inspect the linked PDFs.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "data" / "buhooth-journals-raw.tsv"
OUTPUT_PATH = ROOT / "client" / "src" / "data" / "arabic-materials.json"
REPORT_PATH = ROOT / "data" / "arabic-science-import-report.json"
REVIEW_PATH = ROOT / "data" / "arabic-science-review.tsv"

SOURCE_BASE_URL = "https://www.buhooth.link:8080/data/journals/"
SOURCE_INDEX_URL = "https://www.buhooth.link:8080/data/journals.txt"

# Arabic marks plus formatting controls often present in copied catalogue titles.
ARABIC_MARKS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u200c\u200d\ufeff]")
NON_LETTER = re.compile(r"[^\u0621-\u063A\u0641-\u064A0-9]+")
WHITESPACE = re.compile(r"\s+")
LEADING_ITEM_NUMBER = re.compile(r"^\s*\d+[\-–—.]?\s*")
GENERIC_FILE = re.compile(r"^\d+(?:[\-–—]\d+)?\.pdf$", re.IGNORECASE)

# These terms are sufficiently specific to Arabic language, linguistics, literature,
# rhetoric, lexicography, prosody, or poetry to justify inclusion when found in a title.
STRONG_SIGNALS = {
    "اللغة العربية",
    "العربية الفصحى",
    "في العربية",
    "النحو العربي",
    "الصرف العربي",
    "اللغوية",
    "اللغويات",
    "علم اللغة",
    "علم اللغه",
    "اللساني",
    "اللسانيات",
    "النحو",
    "النحوية",
    "نحوي",
    "الصرف",
    "الصرفية",
    "صرفي",
    "البلاغة",
    "البلاغيه",
    "علم البيان",
    "البديع",
    "علم المعاني",
    "المعاني النحوية",
    "العروض",
    "القافية",
    "القافيه",
    "القوافي",
    "المعجم",
    "المعاجم",
    "المعجمية",
    "المعجميه",
    "قاموس",
    "قواميس",
    "الشعر",
    "الشعرية",
    "الشعريه",
    "قصيدة",
    "قصائد",
    "ديوان",
    "دواوين",
    "المعلقات",
    "الادب العربي",
    "الادبية",
    "الادبيه",
    "النقد الادبي",
    "النقد العربي",
    "الرواية العربية",
    "الروايه العربيه",
    "الرواية السعودية",
    "الروايه السعوديه",
    "القصة العربية",
    "القصه العربيه",
    "القصة القصيرة",
    "القصه القصيره",
    "السرد",
    "النثر",
    "الخط العربي",
    "الاملاء",
    "التعريب",
    "الفصحى",
    "العامية",
    "العاميه",
    "اللهجات",
    "لهجة",
    "لهجه",
    "الصوتيات",
    "الاصوات اللغوية",
    "الاصوات اللغويه",
    "الدلالة اللغوية",
    "الدلاله اللغويه",
    "التداولية",
    "التداوليه",
    "الاسلوبية",
    "الاسلوبيه",
    "التناص",
    "الترجمة الادبية",
    "الترجمه الادبيه",
}

# Used only to elevate good candidates in explicit Arabic-language periodicals;
# by themselves these general scholarly words never cause inclusion.
SUPPORTING_SIGNALS = {
    "الدلالة",
    "الدلاله",
    "الاسلوب",
    "الخطاب",
    "النص",
    "القراءة",
    "القراءه",
    "التاويل",
    "التأويل",
    "المفردات",
    "الالفاظ",
    "الالفاظ",
    "الالفاظ",
    "التراكيب",
    "الجملة",
    "الجمله",
    "الكلمة",
    "الكلمه",
    "الاشتقاق",
    "الاشتراك",
    "الترادف",
    "المجاز",
    "الاستعارة",
    "الاستعاره",
    "الكناية",
    "الكنايه",
}

DICTIONARY_SIGNALS = {
    "المعجم",
    "المعاجم",
    "المعجمية",
    "المعجميه",
    "قاموس",
    "قواميس",
    "القاموس",
}

DIWAN_TOKENS = {"ديوان", "دواوين"}
NON_POETIC_DIWAN_SIGNALS = {
    "ديوان المظالم",
    "ديوان الخراج",
    "ديوان الجند",
    "ديوان الرسائل",
    "ديوان الحيوان",
    "ديوان الانشاء",
    "ديوان الانشا",
    "ديوان الخدمة",
    "ديوان الخدمه",
    "الدواوين الملكية",
    "الدواوين الملكيه",
}

# Source names explicitly devoted to Arabic language or Arabic studies.  This adds only
# one point: a title still needs language/literature evidence in order to be retained.
SOURCE_LANGUAGE_SIGNALS = {
    "العلوم العربية",
    "اللغة العربية",
    "للغة العربية",
    "لغه عربيه",
    "اللغة والاداب",
    "اللغة والآداب",
    "الادب العربي",
}

# Materials in a mixed religious or scientific source need stronger title evidence.  A
# negative signal does not discard a clear language-study record; it only blocks records
# whose score depends entirely on an ambiguous source title.
EXCLUSION_SIGNALS = {
    "الفقه",
    "الشريعة",
    "الشريعه",
    "الحديث",
    "السنة",
    "السنه",
    "العقيدة",
    "العقيده",
    "القانون",
    "الاقتصاد",
    "الادارة",
    "الاداره",
    "الطب",
    "الهندسة",
    "الهندسه",
    "التمريض",
    "الصحة",
    "الصحه",
    "المحاسبة",
    "المحاسبه",
    "التربية",
    "التربيه",
    "علم النفس",
    "الاجتماع",
    "الجغرافيا",
    "السياحة",
    "السياحه",
    "الامن",
    "الأمن",
}


def normalize(text: str) -> str:
    """Make Arabic phrase matching tolerant of diacritics and common glyph variants."""
    text = unicodedata.normalize("NFKC", text or "")
    text = ARABIC_MARKS.sub("", text)
    translation = str.maketrans({
        "أ": "ا",
        "إ": "ا",
        "آ": "ا",
        "ى": "ي",
        "ة": "ه",
        "ؤ": "و",
        "ئ": "ي",
    })
    text = text.translate(translation).lower()
    return WHITESPACE.sub(" ", NON_LETTER.sub(" ", text)).strip()


def clean_title(value: str) -> str:
    value = (value or "").replace("$", ":").replace("&", "/")
    value = re.sub(r"\.pdf$", "", value, flags=re.IGNORECASE)
    value = LEADING_ITEM_NUMBER.sub("", value)
    value = WHITESPACE.sub(" ", value).strip(" -–—:؛")
    return value


def phrase_hits(normalized_text: str, terms: set[str]) -> list[str]:
    padded = f" {normalized_text} "
    return sorted({term for term in terms if f" {normalize(term)} " in padded})


def is_explicit_language_source(source: str) -> bool:
    source_normalized = normalize(source)
    return any(normalize(term) in source_normalized for term in SOURCE_LANGUAGE_SIGNALS)


def classify(row: dict[str, str]) -> dict[str, Any] | None:
    relative_path = row["relativePath"].strip()
    raw_file_name = row["fileName"].strip()
    title = clean_title(row["displayName"] or raw_file_name)
    author = WHITESPACE.sub(" ", row["author"].replace("@", "،")).strip(" ،")

    if not relative_path or not title or GENERIC_FILE.fullmatch(raw_file_name):
        return None

    source = relative_path.split("/", 1)[0].strip()
    title_normalized = normalize(title)
    source_normalized = normalize(source)

    strong_hits = phrase_hits(title_normalized, STRONG_SIGNALS)
    supporting_hits = phrase_hits(title_normalized, SUPPORTING_SIGNALS)
    exclusion_hits = phrase_hits(title_normalized, EXCLUSION_SIGNALS)
    non_poetic_diwan_hits = phrase_hits(title_normalized, NON_POETIC_DIWAN_SIGNALS)
    # Remove administrative or non-poetic diwans from the subject evidence unless another
    # independent linguistic/literary signal remains in the title.
    if non_poetic_diwan_hits:
        strong_hits = [hit for hit in strong_hits if hit not in {normalize("ديوان"), normalize("دواوين")}]
    source_is_explicit = is_explicit_language_source(source)

    # A specific title signal alone is sufficient.  A supporting signal needs an explicit
    # Arabic-language periodical, and a source name alone is never sufficient.
    score = (3 if strong_hits else 0) + (1 if supporting_hits else 0) + (1 if source_is_explicit else 0)
    if not strong_hits and exclusion_hits:
        score -= 2
    if score < 3:
        return None

    dictionary_hits = phrase_hits(title_normalized, DICTIONARY_SIGNALS)
    diwan_hits = [] if non_poetic_diwan_hits else phrase_hits(title_normalized, DIWAN_TOKENS)
    tags: list[str] = []
    if dictionary_hits:
        tags.append("معجم لغوي")
    if diwan_hits:
        tags.append("ديوان شعري")
    if any(hit in strong_hits for hit in {normalize("النحو"), normalize("النحوية"), normalize("نحوي")}):
        tags.append("نحو")
    if any(hit in strong_hits for hit in {normalize("الصرف"), normalize("الصرفية"), normalize("صرفي")}):
        tags.append("صرف")
    if any(hit in strong_hits for hit in {normalize("البلاغة"), normalize("البيان"), normalize("البديع"), normalize("المعاني")}):
        tags.append("بلاغة")
    if any(hit in strong_hits for hit in {normalize("الشعر"), normalize("الشعرية"), normalize("قصيدة"), normalize("قصائد"), normalize("ديوان"), normalize("دواوين"), normalize("المعلقات")}):
        tags.append("شعر وأدب")
    if not tags:
        tags.append("دراسات لغوية")

    if dictionary_hits:
        primary_category = "dictionaries"
    elif diwan_hits:
        primary_category = "diwans"
    else:
        primary_category = "references"

    return {
        "id": hashlib.sha1(relative_path.encode("utf-8")).hexdigest()[:16],
        "title": title,
        "author": author or None,
        "source": source,
        "relativePath": relative_path,
        "sourceUrl": SOURCE_BASE_URL + relative_path,
        "primaryCategory": primary_category,
        "tags": tags,
        "matchEvidence": {
            "strongSignals": strong_hits,
            "supportingSignals": supporting_hits,
            "explicitLanguageSource": source_is_explicit,
        },
    }


def main() -> None:
    if not RAW_PATH.exists():
        raise SystemExit(f"Missing raw catalogue: {RAW_PATH}")

    raw_bytes = RAW_PATH.read_bytes()
    rows: list[dict[str, str]] = []
    with RAW_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle, delimiter="\t")
        for fields in reader:
            fields = (fields + [""] * 4)[:4]
            rows.append(
                {
                    "relativePath": fields[0],
                    "fileName": fields[1],
                    "author": fields[2],
                    "displayName": fields[3],
                }
            )

    candidates = [record for row in rows if (record := classify(row)) is not None]

    # Deduplicate metadata variants only when the full bibliographic tuple is the same.
    unique: dict[tuple[str, str, str], dict[str, Any]] = {}
    for record in candidates:
        key = (
            normalize(record["source"]),
            normalize(record["title"]),
            normalize(record["author"] or ""),
        )
        unique.setdefault(key, record)

    materials = sorted(
        unique.values(),
        key=lambda record: (normalize(record["source"]), normalize(record["title"]), record["id"]),
    )
    journals = sorted({record["source"] for record in materials}, key=normalize)
    primary_counts = Counter(record["primaryCategory"] for record in materials)
    tag_counts = Counter(tag for record in materials for tag in record["tags"])

    # The first three cards are mutually exclusive primary subject categories; together
    # they equal the curated corpus size.  The journal card counts distinct scholarly
    # periodicals represented in that corpus, rather than duplicating the material count.
    statistics = {
        "sourcesAndReferences": primary_counts["references"],
        "linguisticDictionaries": primary_counts["dictionaries"],
        "poetryDiwans": primary_counts["diwans"],
        "academicJournals": len(journals),
        "totalMaterials": len(materials),
    }

    payload = {
        "metadata": {
            "title": "مواد مكنز اللغة العربية وعلومها",
            "sourceName": "فهرس موقع بحوث العام",
            "sourceIndexUrl": SOURCE_INDEX_URL,
            "sourceFetchedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "sourceSha256": hashlib.sha256(raw_bytes).hexdigest(),
            "sourceRecordCount": len(rows),
            "selectionMethod": "تصنيف محافظ قائم على العنوان واسم المصدر وفق إشارات موضوعية موثقة؛ لا ينسخ النصوص الكاملة للمواد.",
            "statistics": statistics,
            "journalSources": journals,
        },
        "materials": materials,
    }

    report = {
        "source": payload["metadata"],
        "candidateCountBeforeDeduplication": len(candidates),
        "materialCountAfterDeduplication": len(materials),
        "primaryCategoryCounts": dict(sorted(primary_counts.items())),
        "tagCounts": dict(sorted(tag_counts.items())),
        "classificationPolicy": {
            "included": "إشارة عنوان متخصصة، أو إشارة داعمة مع مصدر مكرس صراحة للغة العربية أو العلوم العربية.",
            "excluded": "السجلات ذات اسم ملف عام أو التي لا تقدم دليلاً موضوعياً كافياً في بياناتها الوصفية.",
            "dictionary": "وجود معجم أو معاجم أو قاموس أو قواميس في العنوان.",
            "diwan": "وجود ديوان أو دواوين في العنوان مع استبعاد الدواوين الإدارية وغير الشعرية الصريحة.",
        },
        "statistics": statistics,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    with REVIEW_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow(["id", "title", "author", "source", "primaryCategory", "tags", "relativePath"])
        for record in materials:
            writer.writerow(
                [
                    record["id"],
                    record["title"],
                    record["author"] or "",
                    record["source"],
                    record["primaryCategory"],
                    " | ".join(record["tags"]),
                    record["relativePath"],
                ]
            )

    print(json.dumps({"statistics": statistics, "materials": len(materials), "journals": len(journals)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

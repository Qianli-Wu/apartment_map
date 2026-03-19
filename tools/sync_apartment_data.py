#!/usr/bin/env python3

from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_CSV = ROOT / "output/spreadsheet/apartment_research_latest.csv"
TARGETS = [
    ROOT / "docs/apartments-data.json",
    ROOT / "map/apartments-data.json",
]

EXPECTED_COLUMNS = [
    "apartment",
    "city",
    "address",
    "latitude",
    "longitude",
    "starred",
    "tourDateTime",
    "earliestAvailability",
    "availableBy",
    "beds",
    "baths",
    "sqFt",
    "listedRent",
    "priceBasis",
    "floorplanUnit",
    "specials",
    "deposit",
    "leaseTerms",
    "review",
    "officialWebsite",
    "listingSource",
    "closestCaltrain",
    "distance",
    "walkTime",
    "notes",
    "researchDate",
    "primarySource",
    "walkTimeBasis",
    "washer",
    "washerNotes",
    "transitLaundryEvidence",
    "sourceUrls",
    "transitLaundryConfidence",
]


def normalize_string(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def normalize_float(value: str | None) -> float | None:
    cleaned = normalize_string(value)
    if cleaned is None:
        return None
    return float(cleaned)


def normalize_bool(value: str | None) -> bool:
    cleaned = normalize_string(value)
    if cleaned is None:
        return False
    return cleaned.lower() in {"true", "yes", "y", "1", "starred"}


def normalize_urls(value: str | None) -> list[str]:
    cleaned = normalize_string(value)
    if cleaned is None:
        return []
    return [part.strip() for part in cleaned.split("|") if part.strip()]


def load_rows() -> list[dict[str, object]]:
    with SOURCE_CSV.open(newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != EXPECTED_COLUMNS:
            raise ValueError(
                "Unexpected CSV columns.\n"
                f"Expected: {EXPECTED_COLUMNS}\n"
                f"Received: {reader.fieldnames}"
            )

        apartments: list[dict[str, object]] = []
        for row in reader:
            apartments.append(
                {
                    "apartment": normalize_string(row["apartment"]),
                    "city": normalize_string(row["city"]),
                    "address": normalize_string(row["address"]),
                    "latitude": normalize_float(row["latitude"]),
                    "longitude": normalize_float(row["longitude"]),
                    "starred": normalize_bool(row["starred"]),
                    "tourDateTime": normalize_string(row["tourDateTime"]),
                    "earliestAvailability": normalize_string(row["earliestAvailability"]),
                    "availableBy": normalize_string(row["availableBy"]),
                    "beds": normalize_string(row["beds"]),
                    "baths": normalize_string(row["baths"]),
                    "sqFt": normalize_string(row["sqFt"]),
                    "listedRent": normalize_string(row["listedRent"]),
                    "priceBasis": normalize_string(row["priceBasis"]),
                    "floorplanUnit": normalize_string(row["floorplanUnit"]),
                    "specials": normalize_string(row["specials"]),
                    "deposit": normalize_string(row["deposit"]),
                    "leaseTerms": normalize_string(row["leaseTerms"]),
                    "review": normalize_string(row["review"]),
                    "officialWebsite": normalize_string(row["officialWebsite"]),
                    "listingSource": normalize_string(row["listingSource"]),
                    "closestCaltrain": normalize_string(row["closestCaltrain"]),
                    "distance": normalize_string(row["distance"]),
                    "walkTime": normalize_string(row["walkTime"]),
                    "notes": normalize_string(row["notes"]),
                    "researchDate": normalize_string(row["researchDate"]),
                    "primarySource": normalize_string(row["primarySource"]),
                    "walkTimeBasis": normalize_string(row["walkTimeBasis"]),
                    "washer": normalize_string(row["washer"]),
                    "washerNotes": normalize_string(row["washerNotes"]),
                    "transitLaundryEvidence": normalize_string(row["transitLaundryEvidence"]),
                    "sourceUrls": normalize_urls(row["sourceUrls"]),
                    "transitLaundryConfidence": normalize_float(
                        row["transitLaundryConfidence"]
                    ),
                }
            )

    apartments.sort(key=lambda item: ((item["city"] or ""), (item["apartment"] or "")))
    return apartments


def write_targets(apartments: list[dict[str, object]]) -> None:
    payload = json.dumps(apartments, indent=2) + "\n"
    for target in TARGETS:
        target.write_text(payload)


def main() -> None:
    apartments = load_rows()
    write_targets(apartments)
    print(f"Synced {len(apartments)} apartments from {SOURCE_CSV}")
    for target in TARGETS:
        print(f"Wrote {target}")


if __name__ == "__main__":
    main()

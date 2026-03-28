"""
BharatCRS — One-Time Chennai Building Footprint Importer
═══════════════════════════════════════════════════════════
Reads the Google Open Buildings CSV, converts each row to a valid
GeoJSON Point (centroid) document, and bulk-inserts into MongoDB.
Creates a 2dsphere index for O(log n) spatial proximity queries.

Usage (run ONCE from the backend/ directory):
    python scripts/import_buildings.py

Requires:
    pip install pymongo tqdm
"""
import csv
import os
import sys

from pymongo import MongoClient, GEOSPHERE
from tqdm import tqdm
from dotenv import load_dotenv

# ─── Config ───────────────────────────────────────────────────────────────────

# Load .env relative to this script's location
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(base_dir, ".env"))

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("MONGODB_DB", "bharatcrs")
COL_NAME  = "buildings"

# Absolute path to the raw CSV (rename from tmpXXXXX if not done yet)
CSV_PATH  = os.path.join(
    os.path.dirname(__file__), "..", "..", "ml",
    "chennai_buildings.csv"
)

# We only store buildings with confidence above this threshold
MIN_CONFIDENCE  = 0.65
BATCH_SIZE      = 5_000   # rows per bulk_write call

# ─── Helpers ──────────────────────────────────────────────────────────────────

def parse_row(row: dict) -> dict | None:
    """Convert a CSV row to a MongoDB building document."""
    try:
        confidence = float(row["confidence"])
        if confidence < MIN_CONFIDENCE:
            return None

        lat  = float(row["latitude"])
        lng  = float(row["longitude"])
        area = float(row["area_in_meters"])

        return {
            "loc": {                         # GeoJSON Point — [lng, lat] order!
                "type": "Point",
                "coordinates": [lng, lat],
            },
            "area_m2":    round(area, 2),
            "confidence": round(confidence, 4),
            "plus_code":  row.get("full_plus_code", ""),
        }
    except (ValueError, KeyError):
        return None


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    csv_path = os.path.abspath(CSV_PATH)
    if not os.path.exists(csv_path):
        print(f"[ERROR] CSV not found at: {csv_path}")
        print("  Rename your ml/tmpo6jxbu4p file to  ml/chennai_buildings.csv  first.")
        sys.exit(1)

    client = MongoClient(MONGO_URI)
    db     = client[DB_NAME]
    col    = db[COL_NAME]

    # ── Drop + recreate for a clean import ──
    existing = col.estimated_document_count()
    if existing > 0:
        ans = input(f"Collection already has {existing:,} docs. Re-import? [y/N] ").strip().lower()
        if ans != "y":
            print("Aborted.")
            return
        col.drop()
        print("[INFO] Old collection dropped.")

    # Count rows for a proper progress bar
    print("[INFO] Counting rows (one-time)…")
    with open(csv_path, "r", encoding="utf-8") as f:
        total_rows = sum(1 for _ in f) - 1  # subtract header
    print(f"[INFO] Total rows in CSV: {total_rows:,}")

    # ── Stream + batch-insert ──
    batch        = []
    total_ins    = 0
    total_skip   = 0

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in tqdm(reader, total=total_rows, unit="row", desc="Importing"):
            doc = parse_row(row)
            if doc is None:
                total_skip += 1
                continue

            batch.append(doc)
            if len(batch) >= BATCH_SIZE:
                col.insert_many(batch, ordered=False)
                total_ins += len(batch)
                batch = []

    if batch:
        col.insert_many(batch, ordered=False)
        total_ins += len(batch)

    print(f"\n[INFO] Inserted: {total_ins:,}   Skipped (low confidence): {total_skip:,}")

    # ── Create 2dsphere index ──
    print("[INFO] Creating 2dsphere spatial index on 'loc'…")
    col.create_index([("loc", GEOSPHERE)])
    print("[OK] Index created. Building density queries are now live!")

    client.close()


if __name__ == "__main__":
    main()

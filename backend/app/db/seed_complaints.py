"""
BharathCRS — Chennai Complaint Seed Script (V7 Schema Sync)
Populates MongoDB with realistic civic complaints using the new multi-head schema.

Usage:
  python app/db/seed_complaints.py  (from /backend directory)
  OR
  python seed_complaints.py (from /backend/app/db directory - path fix included)
"""
import asyncio
import random
import sys
import os
from datetime import datetime, timezone, timedelta

# Path fix to ensure "from app.db.mongodb import ..." works from any directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "../.."))
if BACKEND_ROOT not in sys.path:
    sys.path.append(BACKEND_ROOT)

from dotenv import load_dotenv
load_dotenv()

from app.db.mongodb import init_db, get_db

# ─── Data Templates ──────────────────────────────────────────────────────────

CITIZENS = [
    {"username": "citizen1", "name": "Arjun Kumar"},
    {"username": "citizen2", "name": "Priya Raman"},
    {"username": "citizen3", "name": "Murugan S"},
    {"username": "citizen",  "name": "Demo Citizen"},
]

WARDS = [
    {"id": 1,  "name": "Thiruvottiyur", "lat": 13.1572, "lon": 80.3194},
    {"id": 10, "name": "Anna Nagar",    "lat": 13.0850, "lon": 80.2101},
    {"id": 11, "name": "T. Nagar",      "lat": 13.0418, "lon": 80.2341},
    {"id": 12, "name": "Adyar",         "lat": 13.0012, "lon": 80.2565},
    {"id": 13, "name": "Velachery",     "lat": 12.9800, "lon": 80.2200},
]

COMPLAINTS = [
    ("Large pothole causing accidents near signal", "Core Infrastructure & Public Works", "Road Infrastructure", "Road Damage", "High", "High", "GCC Roads Department"),
    ("Overflowing sewage water on main road", "Sanitation, Environment & Parks", "Sewage & Drainage", "Sewage Overflow", "High", "High", "CMWSSB"),
    ("Streetlight not working for 2 weeks", "Core Infrastructure & Public Works", "Electrical Infrastructure", "Streetlight Failure", "Medium", "Medium", "GCC Electrical"),
    ("Garbage not collected in residential area", "Sanitation, Environment & Parks", "Waste Management", "Uncollected Garbage", "Medium", "Medium", "GCC Sanitation"),
    ("Stray dogs menace near school entrance", "Social Infrastructure & Public Health", "Animal Control", "Stray Animal Menace", "Critical", "Critical", "Public Health Department"),
]

async def seed():
    await init_db()
    db = get_db()

    print("[Seed] Dropping existing complaints...")
    await db["complaints"].drop()
    
    TOTAL = 50
    print(f"[Seed] Seeding {TOTAL} complaints with V7 Schema...")
    now = datetime.now(timezone.utc)

    for i in range(TOTAL):
        text, domain, sub, issue, sev, prio, dept = random.choice(COMPLAINTS)
        ward = random.choice(WARDS)
        citizen = random.choice(CITIZENS)
        
        # Jitter coordinates
        lat = ward["lat"] + random.uniform(-0.01, 0.01)
        lon = ward["lon"] + random.uniform(-0.01, 0.01)
        
        days_ago = random.randint(0, 15)
        submitted_at = now - timedelta(days=days_ago)

        doc = {
            "common_metadata": {
                "report_id": f"BCRS-2026-{i:04d}",
                "citizen_id": citizen["username"],
                "submission_timestamp": submitted_at.isoformat(),
                "status": random.choice(["submitted", "assigned", "in_progress"]),
                "raw_text": f"{text} (Seeded {i})",
                "media_urls": [],
                "update_count": 0
            },
            "spatio_temporal_core": {
                "location": {
                    "latitude": lat,
                    "longitude": lon,
                    "address": f"{ward['name']}, Chennai"
                },
                "administrative_unit": {
                    "ward_id": ward["id"],
                    "ward_name": ward["name"]
                }
            },
            "normalized_input": {
                "raw_text": text,
                "issue_summary": f"Reported {issue} in {ward['name']}"
            },
            "domain_classification": {
                "primary_domain": domain,
                "sub_domain": sub,
                "issue_type": issue
            },
            "priority_assessment": {
                "priority_class": prio,
                "severity_class": sev,
                "priority_score": random.uniform(5.0, 9.0)
            },
            "community_engagement": {
                "upvotes": random.randint(1, 25)
            },
            "governance_and_sla": {
                "assigned_department": dept,
                "sla_hours": 48
            }
        }
        await db["complaints"].insert_one(doc)

    print(f"[Seed] ✅ Successfully seeded {TOTAL} complaints.")

if __name__ == "__main__":
    asyncio.run(seed())

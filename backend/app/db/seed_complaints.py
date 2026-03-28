"""
BharathCRS — Chennai Complaint Seed Script
Run once to populate MongoDB with realistic civic complaints centered on Chennai.

Usage (from /backend directory):
  python -m app.db.seed_complaints

Or run directly:
  python app/db/seed_complaints.py
"""
import asyncio
import random
import json
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
load_dotenv()

from app.db.mongodb import init_db, get_db

# ─── Chennai Complaint Data ─────────────────────────────────────────────────────

CITIZENS = [
    {"username": "citizen1", "password": "citizen123", "name": "Arjun Kumar"},
    {"username": "citizen2", "password": "citizen123", "name": "Priya Raman"},
    {"username": "citizen3", "password": "citizen123", "name": "Murugan S"},
    {"username": "citizen4", "password": "citizen123", "name": "Lakshmi Devi"},
    {"username": "citizen5", "password": "citizen123", "name": "Suresh Babu"},
    {"username": "citizen",  "password": "citizen123", "name": "Demo Citizen"},
]

# Chennai ward metadata - 21 wards with exact coordinates
WARDS = [
    {"ward_id": 1,  "name": "Thiruvottiyur",   "poverty_index": 0.65, "lat": 13.1572, "lon": 80.3194},
    {"ward_id": 2,  "name": "Manali",           "poverty_index": 0.70, "lat": 13.1657, "lon": 80.2636},
    {"ward_id": 3,  "name": "Madhavaram",       "poverty_index": 0.60, "lat": 13.1483, "lon": 80.2316},
    {"ward_id": 4,  "name": "Tondiarpet",       "poverty_index": 0.72, "lat": 13.1164, "lon": 80.2900},
    {"ward_id": 5,  "name": "Royapuram",        "poverty_index": 0.68, "lat": 13.1093, "lon": 80.2967},
    {"ward_id": 6,  "name": "Harbour",          "poverty_index": 0.75, "lat": 13.0898, "lon": 80.2920},
    {"ward_id": 7,  "name": "Basin Bridge",     "poverty_index": 0.80, "lat": 13.1017, "lon": 80.2799},
    {"ward_id": 8,  "name": "Park Town",        "poverty_index": 0.30, "lat": 13.0797, "lon": 80.2755},
    {"ward_id": 9,  "name": "Flower Bazaar",    "poverty_index": 0.55, "lat": 13.0880, "lon": 80.2859},
    {"ward_id": 10, "name": "Anna Nagar",       "poverty_index": 0.10, "lat": 13.0850, "lon": 80.2101},
    {"ward_id": 11, "name": "T. Nagar",         "poverty_index": 0.12, "lat": 13.0418, "lon": 80.2341},
    {"ward_id": 12, "name": "Adyar",            "poverty_index": 0.15, "lat": 13.0012, "lon": 80.2565},
    {"ward_id": 13, "name": "Sholinganallur",   "poverty_index": 0.20, "lat": 12.9010, "lon": 80.2279},
    {"ward_id": 14, "name": "Alandur",          "poverty_index": 0.35, "lat": 13.0005, "lon": 80.2074},
    {"ward_id": 15, "name": "Ambattur",         "poverty_index": 0.50, "lat": 13.1143, "lon": 80.1548},
    {"ward_id": 16, "name": "Ayanavaram",       "poverty_index": 0.58, "lat": 13.1005, "lon": 80.2445},
    {"ward_id": 17, "name": "Perambur",         "poverty_index": 0.62, "lat": 13.1163, "lon": 80.2476},
    {"ward_id": 18, "name": "Villivakkam",      "poverty_index": 0.45, "lat": 13.1017, "lon": 80.2095},
    {"ward_id": 19, "name": "Kodambakkam",      "poverty_index": 0.25, "lat": 13.0523, "lon": 80.2225},
    {"ward_id": 20, "name": "Valasaravakkam",   "poverty_index": 0.22, "lat": 13.0490, "lon": 80.1758},
    {"ward_id": 21, "name": "Manappakkam",      "poverty_index": 0.40, "lat": 13.0111, "lon": 80.1705},
]

COMPLAINTS_TEMPLATE = [
    # (text, domain, subdomain, issue_type, severity, priority, status, dept, lat_offset, lon_offset)
    ("Large pothole on Anna Salai near Saidapet signal causing accidents", "Core Infrastructure & Public Works", "Road Infrastructure", "Road Damage", "High", "High", "in_progress", "GCC Roads Department", 0.0418, 0.2341),
    ("Overflowing sewage water on MRC Nagar main road for 3 days", "Sanitation, Environment & Parks", "Sewage & Drainage", "Sewage Overflow", "High", "High", "assigned", "CMWSSB", 0.0012, 0.2565),
    ("Streetlight not working for past 2 weeks at Velachery bus stop", "Core Infrastructure & Public Works", "Electrical Infrastructure", "Streetlight Failure", "Medium", "Medium", "submitted", "GCC Electrical", 0.0267, 0.2254),
    ("Garbage not collected for 5 days in Besant Nagar 4th cross street", "Sanitation, Environment & Parks", "Waste Management", "Uncollected Garbage", "Medium", "Medium", "resolved", "GCC Sanitation", 0.0128, 0.2642),
    ("Stray dogs menace near Kotturpuram school, children attacked", "Social Infrastructure & Public Health", "Animal Control", "Stray Animal Menace", "Critical", "Critical", "in_progress", "Public Health Department", 0.0335, 0.2604),
    ("Water supply cut off for 3 days in Thoraipakkam area", "Core Infrastructure & Public Works", "Water Supply", "Water Disruption", "High", "High", "in_progress", "CMWSSB", 0.8850, 0.2369),
    ("Fallen tree blocking entire road in Nungambakkam for 24 hours", "Core Infrastructure & Public Works", "Road Infrastructure", "Road Obstruction", "High", "High", "assigned", "GCC Roads Department", 0.0650, 0.2350),
    ("Public toilet in Parrys Corner extremely unhygienic and unusable", "Sanitation, Environment & Parks", "Public Sanitation", "Toilet Maintenance", "Medium", "Medium", "submitted", "GCC Sanitation", 0.0880, 0.2859),
    ("Dense smoke from garbage dump near Perumbakkam affecting residents", "Sanitation, Environment & Parks", "Environmental Pollution", "Air Pollution", "High", "High", "verified", "GCC Sanitation", 0.8967, 0.2140),
    ("Open manhole in Adambakkam main road, dangerous at night", "Core Infrastructure & Public Works", "Sewage & Drainage", "Open Manhole", "Critical", "Critical", "in_progress", "CMWSSB", 0.9807, 0.2065),
    ("Illegal sand quarrying happening near Poonamallee highway", "Urban Planning & Real Estate", "Illegal Construction", "Environmental Violation", "High", "High", "submitted", "CMDA", 0.1143, 0.1548),
    ("Speed breakers missing on Rajiv Gandhi Salai near Perungudi", "Transportation & Traffic", "Road Safety", "Missing Road Features", "Medium", "Medium", "assigned", "Traffic Police", 0.8962, 0.2236),
    ("Flooding in Alandur underpass during rain, cars submerged", "Core Infrastructure & Public Works", "Drainage Infrastructure", "Waterlogging", "Critical", "Critical", "verified", "GCC Roads Department", 0.0005, 0.2074),
    ("Mosquito breeding in stagnant water at Kottur housing board colony", "Social Infrastructure & Public Health", "Vector Control", "Mosquito Menace", "Medium", "Medium", "submitted", "Health Department", 0.0428, 0.2512),
    ("Bus route 21B suddenly stopped service to Thiruvanmiyur, residents stranded", "Transportation & Traffic", "Public Transport", "Route Disruption", "Medium", "Medium", "resolved", "MTC/CMRL", 0.9878, 0.2575),
    ("Encroachment on footpath near Vadapalani Metro, pedestrians walk on road", "Urban Planning & Real Estate", "Encroachment", "Footpath Obstruction", "Medium", "Medium", "in_progress", "CMDA", 0.0586, 0.2261),
    ("Drinking water contamination complaints in Kolathur residential area", "Social Infrastructure & Public Health", "Water Quality", "Water Contamination", "Critical", "Critical", "in_progress", "CMWSSB", 0.1052, 0.2421),
    ("Road divider broken on Inner Ring Road stretch near Ekkatuthangal", "Core Infrastructure & Public Works", "Road Infrastructure", "Road Damage", "Medium", "Medium", "submitted", "GCC Roads Department", 0.0420, 0.2150),
    ("Illegal dumping of construction waste on Pattabiram village road", "Sanitation, Environment & Parks", "Waste Management", "Illegal Dumping", "Medium", "Medium", "assigned", "GCC Sanitation", 0.1285, 0.1622),
    ("Power outage lasting 12 hours in Pallikaranai affecting 400 homes", "Core Infrastructure & Public Works", "Electrical Infrastructure", "Power Outage", "High", "High", "resolved", "GCC Electrical", 0.8967, 0.2140),
    ("School building in Vyasarpadi in dilapidated condition, roof leaking", "Social Infrastructure & Public Health", "Education Infrastructure", "Infrastructure Failure", "High", "High", "submitted", "Education Department", 0.1119, 0.2509),
    ("SH 48 road at Minjur is completely waterlogged after rain", "Core Infrastructure & Public Works", "Drainage Infrastructure", "Waterlogging", "High", "High", "in_progress", "GCC Roads Department", 0.2018, 0.2875),
    ("Auto-rickshaw overcharging passengers at Chennai Central, no action", "Transportation & Traffic", "Transport Regulation", "Fare Overcharge", "Low", "Low", "submitted", "Traffic Police", 0.0813, 0.2757),
    ("Damaged footpath near Saidapet courts injuring elderly pedestrian", "Core Infrastructure & Public Works", "Road Infrastructure", "Footpath Damage", "High", "High", "assigned", "GCC Roads Department", 0.0419, 0.2346),
    ("Open electrical wire hanging low in Ashok Nagar 4th avenue", "Core Infrastructure & Public Works", "Electrical Infrastructure", "Electrical Hazard", "Critical", "Critical", "in_progress", "GCC Electrical", 0.0502, 0.2236),
    ("GCC park at Nanganallur damaged equipment not replaced for months", "Sanitation, Environment & Parks", "Parks & Recreation", "Park Damage", "Low", "Low", "submitted", "GCC Parks", 0.9750, 0.2053),
    ("Borewell water turned brown in Chromepet, contamination suspected", "Social Infrastructure & Public Health", "Water Quality", "Water Contamination", "High", "High", "verified", "CMWSSB", 0.9867, 0.2011),
    ("Traffic signals not working at Kathipara junction causing gridlock", "Transportation & Traffic", "Traffic Management", "Signal Failure", "High", "High", "in_progress", "Traffic Police", 0.9987, 0.2049),
    ("Wet waste and dry waste combined in Mandaveli, segregation rules ignored", "Sanitation, Environment & Parks", "Waste Management", "Improper Segregation", "Low", "Low", "resolved", "GCC Sanitation", 0.0248, 0.2650),
    ("Child malnutrition cases reported in Vyasarpadi, no action from health dept", "Social Infrastructure & Public Health", "Child Welfare", "Malnutrition", "Critical", "Critical", "submitted", "Child Welfare & Health Unit", 0.1119, 0.2509),
    ("Fire at SIDCO industrial estate Guindy spreading to residential area", "Emergency, Safety & Accountability", "Emergency", "Fire Incident", "Critical", "Critical", "resolved", "Fire & Safety Department", 0.0253, 0.2106),
    ("Portion of old building collapsed in Washermanpet near harbour", "Emergency, Safety & Accountability", "Safety", "Building Collapse", "Critical", "Critical", "in_progress", "Fire & Safety Department", 0.0898, 0.2920),
    ("Encroachment on Buckingham Canal bund in Royapuram causing flooding", "Urban Planning & Real Estate", "Encroachment", "Canal Encroachment", "High", "High", "in_progress", "CMDA", 0.1093, 0.2967),
    ("Damaged gutter covers on GST Road near Guduvanchery posing danger", "Core Infrastructure & Public Works", "Road Infrastructure", "Road Safety Hazard", "Medium", "Medium", "assigned", "GCC Roads Department", 0.7500, 0.2038),
    ("Corporation hospital in Tondiarpet lacks basic medicines for weeks", "Social Infrastructure & Public Health", "Healthcare", "Medicine Shortage", "High", "High", "submitted", "Health Department", 0.1164, 0.2900),
    ("Desilting of stormwater drains pending in Neelankarai ahead of monsoon", "Core Infrastructure & Public Works", "Drainage Infrastructure", "Drain Desilting", "High", "High", "submitted", "CMWSSB", 0.9500, 0.2540),
    ("Dense fog due to burning e-waste near Perungudi dump yard", "Sanitation, Environment & Parks", "Environmental Pollution", "Toxic Burning", "Critical", "Critical", "verified", "GCC Sanitation", 0.9062, 0.2280),
    ("Footover bridge at Villivakkam station in broken condition", "Core Infrastructure & Public Works", "Road Infrastructure", "Bridge Damage", "High", "High", "in_progress", "GCC Roads Department", 0.1017, 0.2095),
    ("Corrupt official in land registration office demanding bribe", "Emergency, Safety & Accountability", "Corruption", "Bribery", "High", "High", "submitted", "Vigilance Department", 0.0797, 0.2755),
    ("TASMAC outlet noise until midnight disturbing residents near T Nagar", "Social Infrastructure & Public Health", "Noise Pollution", "Night Disturbance", "Low", "Low", "submitted", "Public Health Department", 0.0418, 0.2341),
    ("Drainage overflow flooding Angappan Naicken Street during light rain", "Core Infrastructure & Public Works", "Drainage Infrastructure", "Drain Overflow", "High", "High", "assigned", "CMWSSB", 0.0880, 0.2859),
    ("Abandoned vehicles parked on Sardar Patel Road for 3 months", "Transportation & Traffic", "Parking Violations", "Abandoned Vehicle", "Low", "Low", "submitted", "Traffic Police", 0.0487, 0.2208),
    ("Bus stand at Poonamallee has no roof, passengers suffer in rain", "Transportation & Traffic", "Public Transport", "Infrastructure Issue", "Medium", "Medium", "assigned", "MTC/CMRL", 0.1234, 0.1637),
    ("Road cave-in near Koyambedu market flooded with rain water inside", "Core Infrastructure & Public Works", "Road Infrastructure", "Road Cave-in", "Critical", "Critical", "in_progress", "GCC Roads Department", 0.0700, 0.2085),
    ("Night soil collected openly on Triplicane main road at 6am", "Sanitation, Environment & Parks", "Waste Management", "Improper Waste Disposal", "Medium", "Medium", "resolved", "GCC Sanitation", 0.0795, 0.2835),
    ("Old age home in Tambaram lacks staff, elderly neglected", "Social Infrastructure & Public Health", "Elder Welfare", "Neglect", "High", "High", "submitted", "Health Department", 0.9310, 0.2186),
    ("Noise pollution from crusher unit near Ambattur estate", "Sanitation, Environment & Parks", "Environmental Pollution", "Noise Pollution", "Medium", "Medium", "submitted", "Public Health Department", 0.1143, 0.1548),
    ("Water meter reading irregularities causing inflated billing in Velachery", "Core Infrastructure & Public Works", "Water Supply", "Billing Issue", "Low", "Low", "resolved", "CMWSSB", 0.0267, 0.2254),
    ("Dense traffic daily at Silk Board flyover, signal timing needs revision", "Transportation & Traffic", "Traffic Management", "Traffic Congestion", "Medium", "Medium", "submitted", "Traffic Police", 0.9350, 0.2150),
    ("Pothole crater on Mount Road near Gemini flyover, car tyres damaged", "Core Infrastructure & Public Works", "Road Infrastructure", "Road Damage", "High", "High", "assigned", "GCC Roads Department", 0.0680, 0.2830),
]

STATUS_MAP = {
    "submitted": ("submitted", 0),
    "verified": ("verified", 1),
    "assigned": ("assigned", 2),
    "in_progress": ("in_progress", 3),
    "resolved": ("resolved", 5),
}

DEPT_DOMAIN_MAP = {
    "GCC Roads Department": "Core Infrastructure & Public Works",
    "CMWSSB": "Core Infrastructure & Public Works",
    "GCC Electrical": "Core Infrastructure & Public Works",
    "GCC Sanitation": "Sanitation, Environment & Parks",
    "Public Health Department": "Social Infrastructure & Public Health",
    "Health Department": "Social Infrastructure & Public Health",
    "Traffic Police": "Transportation & Traffic",
    "MTC/CMRL": "Transportation & Traffic",
    "CMDA": "Urban Planning & Real Estate",
    "Child Welfare & Health Unit": "Social Infrastructure & Public Health",
    "Education Department": "Social Infrastructure & Public Health",
    "Fire & Safety Department": "Emergency, Safety & Accountability",
    "Disaster Management": "Emergency, Safety & Accountability",
    "Vigilance Department": "Emergency, Safety & Accountability",
    "GCC Parks": "Sanitation, Environment & Parks",
}


async def seed():
    await init_db()
    db = get_db()

    # ─── Seed Citizen Users ───────────────────────────────────────────────────
    print("[Seed] Seeding citizen users...")
    for c in CITIZENS:
        existing = await db["users"].find_one({"username": c["username"]})
        if not existing:
            await db["users"].insert_one({
                "username": c["username"],
                "password": c["password"],
                "role": "citizen",
                "display_name": c.get("name", c["username"]),
            })
            print(f"  ✓ Created user: {c['username']}")
        else:
            print(f"  - User exists: {c['username']}")

    # ─── Check existing complaint count ──────────────────────────────────────
    existing_count = await db["complaints"].count_documents({})
    if existing_count >= 40:
        print(f"[Seed] {existing_count} complaints already exist — skipping complaint seeding (delete them manually to re-seed)")
        return

    # ─── Seed Complaints ─────────────────────────────────────────────────────
    print("[Seed] Seeding 50 Chennai complaints...")
    now = datetime.now(timezone.utc)

    citizen_ids = [c["username"] for c in CITIZENS]
    seeded_ids = []

    for i, tpl in enumerate(COMPLAINTS_TEMPLATE):
        text, domain, subdomain, issue_type, severity, priority, status_key, dept, lat, lon = tpl

        days_ago = random.randint(0, 60)
        submission_time = now - timedelta(days=days_ago, hours=random.randint(0, 23))
        report_id = f"BCRS-{submission_time.year}-{submission_time.month:02d}-{i+1:04d}"
        citizen = random.choice(citizen_ids)

        # Add slight jitter to lat/lon so they don't all stack exactly
        jitter_lat = lat + random.uniform(-0.008, 0.008)
        jitter_lon = lon + random.uniform(-0.008, 0.008)

        # Find matching ward
        best_ward = min(WARDS, key=lambda w: abs(w["lat"] - lat) + abs(w["lon"] - lon))
        ward_name = best_ward["name"]

        status, update_count = STATUS_MAP.get(status_key, ("submitted", 0))

        upvotes = random.randint(0, 85)

        resolution_text = None
        resolved_at = None
        if status == "resolved":
            resolved_at = submission_time + timedelta(days=random.randint(1, 14))
            resolution_text = f"Issue has been resolved by {dept}. Inspection cleared."

        complaint_doc = {
            "common_metadata": {
                "report_id": report_id,
                "citizen_id": citizen,
                "submission_timestamp": submission_time.isoformat(),
                "raw_text": text,
                "status": status,
                "location": {
                    "latitude": jitter_lat,
                    "longitude": jitter_lon,
                    "ward_name": ward_name,
                    "ward_id": best_ward["ward_id"],
                    "address": f"{ward_name}, Chennai",
                },
                "media_urls": [],
                "upvotes": upvotes,
                "update_count": update_count,
                "resolution_text": resolution_text,
                "resolved_at": resolved_at.isoformat() if resolved_at else None,
            },
            "domain_classification": {
                "primary_domain": domain,
                "sub_domain": subdomain,
                "issue_type": issue_type,
                "assigned_department": dept,
                "routing_confidence": round(random.uniform(0.78, 0.99), 2),
            },
            "priority_assessment": {
                "severity_class": severity,
                "priority_class": priority,
                "priority_score": round(random.uniform(3.0 if priority == "Low" else 5.0 if priority == "Medium" else 7.5, 10.0), 2),
                "safety_flag": severity == "Critical",
                "urgency_level": "immediate" if priority == "Critical" else "high" if priority == "High" else "medium",
            },
            "governance_and_sla": {
                "sla_hours": 12 if priority == "Critical" else 24 if priority == "High" else 48 if priority == "Medium" else 72,
                "sla_breached": days_ago > (12 if priority == "Critical" else 24 if priority == "High" else 48) / 24 and status not in ["resolved"],
                "assigned_to": dept,
            },
            "context_analysis": {
                "ward_name": ward_name,
                "poverty_index": best_ward["poverty_index"],
                "area_risk_score": round(best_ward["poverty_index"] * random.uniform(0.8, 1.2), 2),
            },
        }

        await db["complaints"].insert_one(complaint_doc)
        seeded_ids.append(report_id)

    print(f"[Seed] ✅ Seeded {len(seeded_ids)} complaints successfully!")
    print("[Seed] Sample IDs:", seeded_ids[:5])


if __name__ == "__main__":
    asyncio.run(seed())

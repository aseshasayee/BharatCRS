"""
BharathCRS — MongoDB Async Utility Layer
Uses Motor (async MongoDB driver) for non-blocking DB operations.
Initializes all 5 collections and creates necessary indexes on startup.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, GEOSPHERE, IndexModel

# ─── Singleton Client ──────────────────────────────────────────────────────────

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("MongoDB client not initialized. Call init_db() first.")
    return _client


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("MongoDB not initialized. Call init_db() first.")
    return _db


# ─── Collection Accessors ─────────────────────────────────────────────────────

def complaints_col():
    return get_db()["complaints"]


def clusters_col():
    return get_db()["clusters"]


def department_metrics_col():
    return get_db()["department_metrics"]


def audit_logs_col():
    return get_db()["audit_logs"]


def config_col():
    return get_db()["config"]


def users_col():
    return get_db()["users"]


# ─── Startup / Shutdown ───────────────────────────────────────────────────────

async def init_db() -> None:
    """
    Called on FastAPI startup (via lifespan).
    Initializes the Motor client, selects the database,
    and creates all required indexes.
    """
    global _client, _db

    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "bharathcrs")

    try:
        import certifi
        _client = AsyncIOMotorClient(uri, tlsCAFile=certifi.where())
    except ImportError:
        _client = AsyncIOMotorClient(uri)
    _db = _client[db_name]

    await _create_indexes()
    await _seed_config()

    print(f"[DB] Connected to MongoDB: {db_name}")


async def close_db() -> None:
    """Called on FastAPI shutdown."""
    global _client
    if _client:
        _client.close()
        print("[DB] MongoDB connection closed.")


async def _create_indexes() -> None:
    """
    Creates indexes for efficient querying.

    complaints:
      - 2dsphere index on location for geo queries (duplicate detection)
      - Single-field indexes for filtering by status and timestamp

    clusters:
      - Unique index on hotspot_cluster_id

    audit_logs:
      - Index on complaint_id for fast audit trail lookups

    department_metrics:
      - Index on department_id
    """
    db = get_db()

    # complaints collection indexes
    await db["complaints"].create_index(
        [("spatio_temporal_core.location.latitude", ASCENDING),
         ("spatio_temporal_core.location.longitude", ASCENDING)],
        name="idx_complaints_location"
    )
    await db["complaints"].create_index("common_metadata.status", name="idx_complaints_status")
    await db["complaints"].create_index(
        "common_metadata.submission_timestamp", name="idx_complaints_timestamp"
    )
    await db["complaints"].create_index(
        "domain_classification.issue_type", name="idx_complaints_issue_type"
    )
    await db["complaints"].create_index(
        "governance_and_sla.assigned_department", name="idx_complaints_department"
    )
    await db["complaints"].create_index(
        "common_metadata.report_id", unique=True, name="idx_complaints_report_id"
    )

    # clusters collection indexes
    await db["clusters"].create_index(
        "hotspot_cluster_id", unique=True, name="idx_clusters_id"
    )

    # audit_logs collection indexes
    await db["audit_logs"].create_index("complaint_id", name="idx_audit_complaint_id")
    await db["audit_logs"].create_index("timestamp", name="idx_audit_timestamp")

    # department_metrics collection indexes
    await db["department_metrics"].create_index(
        "department_id", unique=True, name="idx_dept_metrics_id"
    )

    # context_cache compound index (grid cell lookup)
    await db["context_cache"].create_index(
        [("grid_lat", ASCENDING), ("grid_lon", ASCENDING)],
        unique=True, name="idx_context_cache_grid"
    )
    # ward metadata
    await db["ward_metadata"].create_index("ward_id", unique=True, name="idx_ward_id")
    # escalations
    await db["escalations"].create_index("department", name="idx_escalations_dept")
    await db["escalations"].create_index("acknowledged", name="idx_escalations_ack")
    
    # users
    await db["users"].create_index("username", unique=True, name="idx_users_username")

    print("[DB] Indexes created successfully.")


async def _seed_config() -> None:
    """
    Seeds the config collection with routing rules and RFM weights
    if it doesn't already exist. Runs only once.
    """
    db = get_db()
    existing = await db["config"].find_one({"_id": "routing_rules"})
    existing = await db["config"].find_one({"_id": "routing_rules"})

    routing_rules = {
        "_id": "routing_rules",
        "domain_to_department": {
            "Core Infrastructure & Public Works": {
                "Roads": "GCC Roads Department",
                "Water Supply": "CMWSSB",
                "Drainage/Sewerage": "CMWSSB",
                "Street Lighting": "GCC Electrical",
            },
            "Sanitation, Environment & Parks": {
                "Garbage & Waste": "GCC Sanitation",
                "Environment": "Public Health Department",
                "Vector Control": "Public Health Department",
            },
            "Transportation & Traffic": {
                "Traffic Signals": "Traffic Police",
                "Parking": "Traffic Police",
                "Public Transport": "MTC/CMRL",
                "Pedestrian Safety": "GCC Roads Department",
            },
            "Urban Planning & Real Estate": {
                "Construction": "CMDA",
                "Zoning": "CMDA",
                "Demolition": "CMDA",
            },
            "Social Infrastructure & Public Health": {
                "Healthcare & Welfare": "Health Department",
                "Schools": "Education Department",
            },
            "Emergency, Safety & Accountability": {
                "Fire & Safety": "Fire & Safety Department",
                "Disaster Management": "Disaster Management",
                "Corruption": "Vigilance Department",
                "Structural Safety": "CMDA",
            },
        },
        "sla_hours": {
            "Critical": 12,
            "High": 24,
            "Medium": 48,
            "Low": 72,
        },
        "safety_override_sla_hours": 4,
    }

    rfm_weights = {
        "_id": "rfm_weights",
        # v3 RFM+A weights — all adjustable by admin via /api/admin/weights
        "recency_weight": 0.25,
        "frequency_weight": 0.35,
        "exec_response_weight": 0.25,
        "area_importance_weight": 0.15,
        "frequency_normalization_cap": 100,
        "equity_weight": 0.40,    # How much poverty index amplifies area score
    }

    domain_risk_bonus = {
        "_id": "domain_risk_bonus",
        # Added AFTER base RFM+A score. Admin-adjustable. Logged on change.
        "Emergency, Safety & Accountability": 3.0,
        "Social Infrastructure & Public Health": 2.0,
        "Core Infrastructure & Public Works": 0.5,
        "Sanitation, Environment & Parks": 0.5,
        "Transportation & Traffic": 0.3,
        "Urban Planning & Real Estate": 0.2,
    }

    if not existing:
        await db["config"].insert_one(routing_rules)
        await db["config"].insert_one(rfm_weights)
        await db["config"].insert_one(domain_risk_bonus)

    # Seed default department metrics (historical SLA delay avg = 2 days for all depts)
    departments = [
        "GCC Roads Department", "CMWSSB", "GCC Electrical", "GCC Sanitation",
        "Public Health Department", "GCC Parks", "Traffic Police", "MTC/CMRL",
        "CMDA", "Child Welfare & Health Unit", "Health Department",
        "Education Department", "Fire & Safety Department",
        "Disaster Management", "Vigilance Department",
    ]
    for dept in departments:
        existing_dept = await db["department_metrics"].find_one({"department_id": dept})
        if not existing_dept:
            await db["department_metrics"].insert_one({
                "department_id": dept,
                "avg_resolution_days": 2.0,
                "total_complaints": 0,
                "resolved_on_time": 0,
                "sla_compliance_rate": 1.0,
                "sla_breaches": 0,
            })

    # Seed Chennai ward poverty index data
    # poverty_index: 0.0 (low deprivation) → 1.0 (high deprivation)
    # Source: GCC ward socioeconomic profile (approximate representative values)
    ward_data = [
        {"ward_id": 1,  "name": "Thiruvottiyur",  "poverty_index": 0.65, "centroid_lat": 13.1572, "centroid_lon": 80.3194},
        {"ward_id": 2,  "name": "Manali",          "poverty_index": 0.70, "centroid_lat": 13.1657, "centroid_lon": 80.2636},
        {"ward_id": 3,  "name": "Madhavaram",      "poverty_index": 0.60, "centroid_lat": 13.1483, "centroid_lon": 80.2316},
        {"ward_id": 4,  "name": "Tondiarpet",      "poverty_index": 0.72, "centroid_lat": 13.1164, "centroid_lon": 80.2900},
        {"ward_id": 5,  "name": "Royapuram",       "poverty_index": 0.68, "centroid_lat": 13.1093, "centroid_lon": 80.2967},
        {"ward_id": 6,  "name": "Harbour",         "poverty_index": 0.75, "centroid_lat": 13.0898, "centroid_lon": 80.2920},
        {"ward_id": 7,  "name": "Basin Bridge",    "poverty_index": 0.80, "centroid_lat": 13.1017, "centroid_lon": 80.2799},
        {"ward_id": 8,  "name": "Park Town",       "poverty_index": 0.30, "centroid_lat": 13.0797, "centroid_lon": 80.2755},
        {"ward_id": 9,  "name": "Flower Bazaar",   "poverty_index": 0.55, "centroid_lat": 13.0880, "centroid_lon": 80.2859},
        {"ward_id": 10, "name": "Anna Nagar",      "poverty_index": 0.10, "centroid_lat": 13.0850, "centroid_lon": 80.2101},
        {"ward_id": 11, "name": "T. Nagar",        "poverty_index": 0.12, "centroid_lat": 13.0418, "centroid_lon": 80.2341},
        {"ward_id": 12, "name": "Adyar",           "poverty_index": 0.15, "centroid_lat": 13.0012, "centroid_lon": 80.2565},
        {"ward_id": 13, "name": "Sholinganallur",  "poverty_index": 0.20, "centroid_lat": 12.9010, "centroid_lon": 80.2279},
        {"ward_id": 14, "name": "Alandur",         "poverty_index": 0.35, "centroid_lat": 13.0005, "centroid_lon": 80.2074},
        {"ward_id": 15, "name": "Ambattur",        "poverty_index": 0.50, "centroid_lat": 13.1143, "centroid_lon": 80.1548},
        {"ward_id": 16, "name": "Ayanavaram",      "poverty_index": 0.58, "centroid_lat": 13.1005, "centroid_lon": 80.2445},
        {"ward_id": 17, "name": "Perambur",        "poverty_index": 0.62, "centroid_lat": 13.1163, "centroid_lon": 80.2476},
        {"ward_id": 18, "name": "Villivakkam",     "poverty_index": 0.45, "centroid_lat": 13.1017, "centroid_lon": 80.2095},
        {"ward_id": 19, "name": "Kodambakkam",     "poverty_index": 0.25, "centroid_lat": 13.0523, "centroid_lon": 80.2225},
        {"ward_id": 20, "name": "Valasaravakkam",  "poverty_index": 0.22, "centroid_lat": 13.0490, "centroid_lon": 80.1758},
        {"ward_id": 21, "name": "Manappakkam",     "poverty_index": 0.40, "centroid_lat": 13.0111, "centroid_lon": 80.1705},
    ]
    for ward in ward_data:
        existing = await db["ward_metadata"].find_one({"ward_id": ward["ward_id"]})
        if not existing:
            await db["ward_metadata"].insert_one(ward)

    # Seed Department Logins
    for dept in departments:
        username = dept.lower().replace(" ", "").replace("&", "and").replace("/", "")
        existing_user = await db["users"].find_one({"username": username})
        if not existing_user:
            await db["users"].insert_one({
                "username": username,
                "password": "password123", # simple login
                "department_name": dept,
                "role": "department"
            })
            
    # Admin User
    if not await db["users"].find_one({"username": "admin"}):
        await db["users"].insert_one({
            "username": "admin",
            "password": "admin123",
            "role": "admin"
        })

    # Citizen User
    if not await db["users"].find_one({"username": "citizen"}):
        await db["users"].insert_one({
            "username": "citizen",
            "password": "citizen123",
            "role": "citizen"
        })

    print("[DB] v3 Config, department metrics, users, and ward metadata seeded.")

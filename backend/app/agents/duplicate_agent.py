"""
BharathCRS — Duplicate Detection Agent (Deterministic)
────────────────────────────────────────────────────────
Implements spatial-temporal clustering to identify duplicate complaints.

Algorithm:
  1. Query MongoDB for complaints within 50m radius of new complaint
  2. Filter to same issue_type and within last 48 hours
  3. If matches found → add to existing cluster (or create new one)
  4. Update duplicate_report_count on the master complaint

No ML model used — pure Haversine geometry + time-window filtering.
"""
import math
import uuid
from datetime import datetime, timedelta, timezone

from app.db.mongodb import clusters_col, complaints_col


# ─── Haversine Distance ────────────────────────────────────────────────────────

def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance in METERS between two GPS points.
    Uses the Haversine formula — no external library needed.

    Earth radius: 6,371,000 meters
    """
    R = 6_371_000  # Earth radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ─── Constants ─────────────────────────────────────────────────────────────────

CLUSTER_RADIUS_METERS = 50      # Max distance to consider same hotspot
TIME_WINDOW_HOURS = 48          # Consider only last 48 hours
MIN_CLUSTER_SIZE = 2            # Minimum reports to form a cluster


# ─── Main Duplicate Detection Function ────────────────────────────────────────

async def run_duplicate_agent(
    report_id: str,
    latitude: float,
    longitude: float,
    issue_type: str,
    submission_timestamp: datetime,
) -> dict:
    """
    Checks for duplicate complaints and assigns/creates a cluster.

    Returns:
        {
            "hotspot_cluster_id": str | None,
            "duplicate_report_count": int,
            "is_duplicate": bool,
            "master_complaint_id": str | None,
        }
    """
    # Define the 48-hour lookback window
    time_cutoff = submission_timestamp - timedelta(hours=TIME_WINDOW_HOURS)

    # Query all complaints in the time window with the same issue_type
    query = {
        "domain_classification.issue_type": issue_type,
        "common_metadata.submission_timestamp": {"$gte": time_cutoff},
        "common_metadata.report_id": {"$ne": report_id},  # Exclude self
        "common_metadata.status": {"$nin": ["Resolved"]},
    }

    nearby_complaints = []
    cursor = complaints_col().find(query)
    async for complaint in cursor:
        comp_lat = complaint["spatio_temporal_core"]["location"]["latitude"]
        comp_lon = complaint["spatio_temporal_core"]["location"]["longitude"]

        distance = haversine_meters(latitude, longitude, comp_lat, comp_lon)

        if distance <= CLUSTER_RADIUS_METERS:
            nearby_complaints.append(complaint)

    if not nearby_complaints:
        # No duplicates found — this is a unique complaint
        return {
            "hotspot_cluster_id": None,
            "duplicate_report_count": 0,
            "is_duplicate": False,
            "master_complaint_id": None,
        }

    # ── Duplicates found: find or create a cluster ──────────────────────────

    # Check if any existing complaint already has a cluster ID
    existing_cluster_id = None
    master_complaint_id = None

    for comp in nearby_complaints:
        cluster_id = comp.get("systemic_pattern_metrics", {}).get("hotspot_cluster_id")
        if cluster_id:
            existing_cluster_id = cluster_id
            master_complaint_id = comp["common_metadata"]["report_id"]
            break

    if existing_cluster_id:
        # Add to existing cluster
        await _increment_cluster(existing_cluster_id, latitude, longitude)
        cluster_id = existing_cluster_id
    else:
        # Create a new cluster from the first nearby complaint
        master_complaint = nearby_complaints[0]
        master_complaint_id = master_complaint["common_metadata"]["report_id"]
        master_lat = master_complaint["spatio_temporal_core"]["location"]["latitude"]
        master_lon = master_complaint["spatio_temporal_core"]["location"]["longitude"]

        cluster_id = await _create_cluster(
            issue_type=issue_type,
            lat=master_lat,
            lon=master_lon,
            initial_count=len(nearby_complaints) + 1,
        )

        # Tag all existing duplicates with this cluster ID
        for comp in nearby_complaints:
            await complaints_col().update_one(
                {"common_metadata.report_id": comp["common_metadata"]["report_id"]},
                {"$set": {"systemic_pattern_metrics.hotspot_cluster_id": cluster_id}},
            )

    # Get updated cluster count
    cluster_doc = await clusters_col().find_one({"hotspot_cluster_id": cluster_id})
    duplicate_count = cluster_doc["duplicate_report_count"] if cluster_doc else len(nearby_complaints)

    return {
        "hotspot_cluster_id": cluster_id,
        "duplicate_report_count": duplicate_count,
        "is_duplicate": True,
        "master_complaint_id": master_complaint_id,
    }


# ─── Cluster Helpers ───────────────────────────────────────────────────────────

async def _create_cluster(
    issue_type: str, lat: float, lon: float, initial_count: int
) -> str:
    """Creates a new hotspot cluster document in MongoDB."""
    cluster_id = f"cluster-CHE-{issue_type.upper()[:8]}-{uuid.uuid4().hex[:6].upper()}"

    await clusters_col().insert_one({
        "hotspot_cluster_id": cluster_id,
        "issue_type": issue_type,
        "geo_center": {"latitude": lat, "longitude": lon},
        "duplicate_report_count": initial_count,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    return cluster_id


async def _increment_cluster(cluster_id: str, lat: float, lon: float) -> None:
    """Increments the duplicate count on an existing cluster."""
    await clusters_col().update_one(
        {"hotspot_cluster_id": cluster_id},
        {
            "$inc": {"duplicate_report_count": 1},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

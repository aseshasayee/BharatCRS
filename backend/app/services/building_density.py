"""
BharatCRS — Building Density Query Utility
═══════════════════════════════════════════
Provides a fast async function to count the number of building footprints
within a given radius around a GPS coordinate, using MongoDB's native
$geoWithin / $centerSphere operator against a 2dsphere-indexed collection.

Used by the Priority Agent to apply a "Population Impact" multiplier.
"""
from __future__ import annotations

from functools import lru_cache

from app.db.mongodb import buildings_col

# ─── Radius Tiers (metres) → Building Count Thresholds ────────────────────────
#
#  "High density"  : ≥ 300 buildings within 500m  → +2.5 priority bonus
#  "Medium density": 100–299 buildings             → +1.0 priority bonus
#  "Low density"   : < 100 buildings               → no bonus
#
DENSITY_RADIUS_M    = 500      # metres
HIGH_DENSITY_THRESH = 300      # buildings above → high impact
MED_DENSITY_THRESH  = 100      # buildings above → medium impact

HIGH_DENSITY_BONUS  = 2.5
MED_DENSITY_BONUS   = 1.0


# ─── Core Query ───────────────────────────────────────────────────────────────

async def get_building_density(lat: float, lng: float) -> dict:
    """
    Count buildings within DENSITY_RADIUS_M metres of the given coordinate.

    Returns a dict:
        {
            "count":  int,          # number of nearby buildings
            "tier":   str,          # "high" | "medium" | "low"
            "bonus":  float,        # priority score bonus to add
            "radius_m": int,        # radius used (for audit transparency)
        }
    """
    col = buildings_col()

    # MongoDB $centerSphere takes radius in RADIANS (divide by Earth radius)
    earth_radius_m = 6_378_137.0
    radius_radians = DENSITY_RADIUS_M / earth_radius_m

    count = await col.count_documents({
        "loc": {
            "$geoWithin": {
                "$centerSphere": [[lng, lat], radius_radians]
            }
        }
    })

    if count >= HIGH_DENSITY_THRESH:
        tier  = "high"
        bonus = HIGH_DENSITY_BONUS
    elif count >= MED_DENSITY_THRESH:
        tier  = "medium"
        bonus = MED_DENSITY_BONUS
    else:
        tier  = "low"
        bonus = 0.0

    return {
        "count":    count,
        "tier":     tier,
        "bonus":    bonus,
        "radius_m": DENSITY_RADIUS_M,
    }

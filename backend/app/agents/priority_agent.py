"""
BharathCRS — Priority Assessment Agent (Agent 3)
─────────────────────────────────────────────────
Agent 3 of 5 in the BharathCRS pipeline.

Responsibilities (all within this one agent):
  3a. Context Lookup  — 250m grid cache → ward aggregate → city defaults
  3b. Ward Resolution — GPS → nearest centroid → poverty_index
  3c. RFM+A Scoring   — weighted formula with equity multiplier + domain bonus

Priority Formula:
  base_score = R×w_r + F×w_f + E×w_e + A_adjusted×w_a
  final      = min(10, base_score + domain_risk_bonus)

Weights from MongoDB config (admin-adjustable):
  R: 0.25  F: 0.35  E: 0.25  A: 0.15  equity: 0.40
"""
import math
import httpx
from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt

from app.db.mongodb import config_col, department_metrics_col, get_db
from app.models.complaint import PriorityAssessment, PriorityClass, RFMMetrics


# ─── Priority Agent Constants ─────────────────────────────────────────────────

DEFAULT_WEIGHTS = {
    "recency_weight": 0.25,
    "frequency_weight": 0.35,
    "exec_response_weight": 0.25,
    "area_importance_weight": 0.15,
    "frequency_normalization_cap": 100,
    "equity_weight": 0.40,
}

DEFAULT_DOMAIN_RISK_BONUS = {
    "Emergency, Safety & Accountability": 3.0,
    "Social Infrastructure & Public Health": 2.0,
    "Core Infrastructure & Public Works": 0.5,
    "Sanitation, Environment & Parks": 0.5,
    "Transportation & Traffic": 0.3,
    "Urban Planning & Real Estate": 0.2,
}

RECENCY_DECAY_HOURS = 72

# ─── Context Engine: Active Events Mock ───────────────────────────────────────

ACTIVE_EVENT_ZONES = {
    11: "Public Elections",
    80: "Diwali Festival Route",
    13: "VIP Convoy Route",
}

async def _get_weather_context(lat: float, lng: float) -> str:
    """Fetches real-time weather from Open-Meteo API."""
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=precipitation,weather_code"
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json().get("current", {})
                precip = data.get("precipitation", 0.0)
                if precip > 0.0:
                    return "Rain"
                return "Clear"
    except Exception as e:
        print(f"[Agent3/Weather] Failed to fetch weather: {e}")
    return "Unknown"


# ─── Sub-step 3a: Context Lookup ─────────────────────────────────────────────
# 250m grid cell → ward aggregate → city default
# (was context_agent.py — now absorbed as a sub-step of Agent 3)

GRID_LAT_STEP = 0.00225   # ≈ 250m at Chennai latitude
GRID_LON_STEP = 0.00270   # ≈ 250m at Chennai longitude

CITY_DEFAULTS = {
    "nearby_schools_count": 1,
    "nearby_hospitals_count": 0,
    "land_use_density": "Medium",
    "road_importance_score": 2,
    "near_sensitive_institution_flag": False,
    "vulnerable_population_flag": False,
    "area_importance_score": 5.0,
    "context_source": "city_default_fallback",
}


def _snap_to_grid(lat: float, lng: float) -> tuple[float, float]:
    grid_lat = math.floor(lat / GRID_LAT_STEP) * GRID_LAT_STEP
    grid_lon = math.floor(lng / GRID_LON_STEP) * GRID_LON_STEP
    return round(grid_lat, 6), round(grid_lon, 6)


def _derive_flags(cell: dict) -> dict:
    schools = cell.get("nearby_schools_count", 0) or 0
    hospitals = cell.get("nearby_hospitals_count", 0) or 0
    near_sensitive = (schools > 0) or (hospitals > 0)
    return {
        "near_sensitive_institution_flag": near_sensitive,
        "vulnerable_population_flag": near_sensitive,
    }


def _compute_area_importance(cell: dict) -> float:
    """
    Area importance score formula:
      A = 0.25×schools_score + 0.25×hospital_score + 0.30×road_norm + 0.20×density_score
    """
    if "area_importance_score" in cell:
        return float(cell["area_importance_score"])
    schools = cell.get("nearby_schools_count", 0) or 0
    hospitals = cell.get("nearby_hospitals_count", 0) or 0
    road = cell.get("road_importance_score", 2) or 2
    density = cell.get("land_use_density", "Medium") or "Medium"
    return round(
        0.25 * min(schools * 2.5, 10.0)
        + 0.25 * min(hospitals * 3.3, 10.0)
        + 0.30 * (road / 5.0) * 10.0
        + 0.20 * {"Low": 3.0, "Medium": 6.0, "High": 10.0}.get(density, 5.0),
        2,
    )


async def _lookup_context(lat: float, lng: float, ward_id: int | None = None) -> dict:
    """
    Tier-1: 250m grid cell from context_cache (precomputed nightly).
    Tier-2: Ward-level aggregate from ward_context_cache.
    Tier-3: City defaults (hardcoded Chennai constants).
    Never raises — always returns a valid context dict.
    """
    db = get_db()
    grid_lat, grid_lon = _snap_to_grid(lat, lng)

    try:
        cell = await db["context_cache"].find_one({"grid_lat": grid_lat, "grid_lon": grid_lon})
        if cell:
            return {
                "nearby_schools_count": cell.get("nearby_schools_count", 0),
                "nearby_hospitals_count": cell.get("nearby_hospitals_count", 0),
                "land_use_density": cell.get("land_use_density", "Medium"),
                "road_importance_score": cell.get("road_importance_score", 2),
                **_derive_flags(cell),
                "area_importance_score": _compute_area_importance(cell),
                "context_source": f"grid_precomputed_{cell.get('refresh_date', 'unknown')}",
            }
    except Exception as e:
        print(f"[Agent3/Context] Grid lookup error: {e}")

    if ward_id:
        try:
            ward = await db["ward_context_cache"].find_one({"ward_id": ward_id})
            if ward:
                return {
                    "nearby_schools_count": ward.get("avg_schools_count"),
                    "nearby_hospitals_count": ward.get("avg_hospitals_count"),
                    "land_use_density": ward.get("dominant_density", "Medium"),
                    "road_importance_score": ward.get("avg_road_score", 2),
                    **_derive_flags(ward),
                    "area_importance_score": _compute_area_importance(ward),
                    "context_source": f"ward_aggregate_{ward_id}",
                }
        except Exception as e:
            print(f"[Agent3/Context] Ward aggregate lookup error: {e}")

    print(f"[Agent3/Context] Using city defaults for ({lat}, {lng})")
    return dict(CITY_DEFAULTS)


# ─── Sub-step 3b: Ward Resolution ────────────────────────────────────────────
# GPS coordinates → nearest ward_id via centroid Haversine distance
# (was done in workflow.py — now part of Agent 3)

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    φ1, φ2 = radians(lat1), radians(lat2)
    Δφ = radians(lat2 - lat1)
    Δλ = radians(lon2 - lon1)
    a = sin(Δφ/2)**2 + cos(φ1) * cos(φ2) * sin(Δλ/2)**2
    return R * 2 * asin(sqrt(a))


async def resolve_ward_id(lat: float, lng: float) -> int | None:
    """
    Finds the nearest Chennai ward to a GPS coordinate using centroid matching.
    Reads ward_metadata (21 wards, fetched fresh each call — lightweight).
    Returns ward_id or None if collection is empty.
    """
    try:
        db = get_db()
        wards = await db["ward_metadata"].find(
            {}, {"ward_id": 1, "centroid_lat": 1, "centroid_lon": 1}
        ).to_list(length=250)
        if not wards:
            return None
        nearest = min(wards, key=lambda w: _haversine(lat, lng, w["centroid_lat"], w["centroid_lon"]))
        return nearest["ward_id"]
    except Exception as e:
        print(f"[Agent3/Ward] Resolution failed: {e}")
        return None


# ─── Sub-step 3c: RFM+A Scoring ──────────────────────────────────────────────

async def _get_exec_response_mean(department: str) -> float:
    """
    E = 10 − avg_resolution_days (from department_metrics).
    Performance signal — NOT escalation trigger. Escalation = Monitoring Agent.
    Fast dept → high E → its complaints score higher. Slow dept → low E.
    """
    doc = await department_metrics_col().find_one({"department_id": department})
    if not doc:
        return 5.0
    avg_days = doc.get("avg_resolution_days", 2.0)
    return max(0.0, min(10.0, 10.0 - avg_days))


async def _get_equity_multiplier(ward_id: int | None, equity_weight: float) -> tuple[float, float]:
    """
    equity_multiplier = 1 + (poverty_index × equity_weight)
    Range: 1.00 (no deprivation) → 1.40 (max deprivation, equity_weight=0.40)
    Adjusts A score upward for deprived wards to counteract geographic bias.
    """
    if ward_id is None:
        return 1.0, 0.0
    try:
        db = get_db()
        ward = await db["ward_metadata"].find_one({"ward_id": ward_id})
        if ward:
            poverty_index = float(ward.get("poverty_index", 0.0))
            multiplier = 1.0 + (poverty_index * equity_weight)
            return round(multiplier, 3), poverty_index
    except Exception as e:
        print(f"[Agent3/Equity] Multiplier lookup failed: {e}")
    return 1.0, 0.0


async def _get_building_density_score(lat: float, lng: float) -> tuple[float, int]:
    """
    Calculates Area Importance (A) dynamically using building footprints.
    Counts structures within a 250m radius (Earth radius ≈ 6,378,100 m).
    """
    try:
        db = get_db()
        radius_rad = 250 / 6378100 
        count = await db["buildings"].count_documents({
            "loc": {
                "$geoWithin": {
                    "$centerSphere": [[lng, lat], radius_rad]
                }
            }
        })
        # Score normalization: 0 buildings -> 2.0 (baseline), >= 150 buildings -> 10.0
        score = min(10.0, 2.0 + (count / 150.0) * 8.0)
        return round(score, 2), count
    except Exception as e:
        print(f"[Agent3/Density] Building density fetch failed: {e}")
        return 5.0, 0

async def _get_domain_risk_bonuses() -> dict:
    try:
        config = await config_col().find_one({"_id": "domain_risk_bonus"})
        if config:
            return {k: v for k, v in config.items() if k != "_id"}
    except Exception as e:
        print(f"[Agent3/DomainBonus] Config fetch failed: {e}")
    return DEFAULT_DOMAIN_RISK_BONUS


def _score_to_class(score: float) -> PriorityClass:
    if score >= 8.0:
        return PriorityClass.CRITICAL
    elif score >= 6.0:
        return PriorityClass.HIGH
    elif score >= 4.0:
        return PriorityClass.MEDIUM
    else:
        return PriorityClass.LOW


# ─── Agent 3 Main Entry Point ─────────────────────────────────────────────────

async def run_priority_agent(
    submission_timestamp: datetime,
    duplicate_report_count: int,
    community_upvotes: int,
    assigned_department: str,
    latitude: float,
    longitude: float,
    ward_id: int | None = None,
    primary_domain: str = "",
    issue_type: str = "",
    is_cascading_failure: bool = False,
    context_indicators: dict | None = None,   # optional pre-computed context
) -> tuple[PriorityAssessment, dict, int | None]:
    """
    Agent 3: Priority Assessment Agent.

    Performs all three sub-steps internally:
      3a. Context Lookup  (grid → ward → city defaults)
      3b. Ward Resolution (GPS → ward_id → poverty_index)
      3c. RFM+A Scoring   (full formula with true building density override)

    Returns:
        (PriorityAssessment, context_indicators dict, resolved ward_id)
    """
    context = context_indicators or {}

    # ── Sub-step 3b: Resolve ward_id if not provided ──────────────────────────
    if ward_id is None:
        ward_id = await resolve_ward_id(latitude, longitude)
        if ward_id:
            print(f"[Agent3/Ward] ({latitude:.4f},{longitude:.4f}) → ward_id={ward_id}")

    # ── Sub-step 3a: Context lookup (uses ward_id for tier-2 fallback) ────────
    if not context:
        context = await _lookup_context(latitude, longitude, ward_id)
        print(f"[Agent3/Context] source={context.get('context_source')} "
              f"area_score={context.get('area_importance_score')}")

    # ── Context Engine: Dynamic Signals ───────────────────────────────────────
    weather_condition = await _get_weather_context(latitude, longitude)
    
    hour = submission_timestamp.hour
    if hour >= 18 or hour < 6:
        temporal_context = "Night"
    elif (8 <= hour <= 10) or (17 <= hour <= 19):
        temporal_context = "Peak Traffic"
    else:
        temporal_context = "Standard"

    active_event = ACTIVE_EVENT_ZONES.get(ward_id)
    
    context.update({
        "weather_condition": weather_condition,
        "temporal_context": temporal_context,
        "active_event_proximity": bool(active_event),
    })

    # ── Load config from MongoDB ──────────────────────────────────────────────
    config = await config_col().find_one({"_id": "rfm_weights"})
    W = {**DEFAULT_WEIGHTS, **(config or {})}
    w_r = float(W.get("recency_weight", 0.25))
    w_f = float(W.get("frequency_weight", 0.35))
    w_e = float(W.get("exec_response_weight", 0.25))
    w_a = float(W.get("area_importance_weight", 0.15))
    freq_cap = float(W.get("frequency_normalization_cap", 100))
    equity_weight = float(W.get("equity_weight", 0.40))

    # ── Sub-step 3c: RFM+A Formula ────────────────────────────────────────────

    # R: Recency (0-10) — decays linearly from 10→0 over 72 hours
    now = datetime.now(timezone.utc)
    if submission_timestamp.tzinfo is None:
        submission_timestamp = submission_timestamp.replace(tzinfo=timezone.utc)
    hours_since = (now - submission_timestamp).total_seconds() / 3600
    recency = max(0.0, 10.0 * (1 - hours_since / RECENCY_DECAY_HOURS))

    # F: Frequency (0-10) — community signal
    combined = duplicate_report_count + community_upvotes
    frequency = min(10.0, (combined / freq_cap) * 10.0)

    # E: Executive Response Mean — performance signal, NOT pressure valve
    exec_response_mean = await _get_exec_response_mean(assigned_department)

    # A: Area Importance — Override with dynamic building density (MongoDB geospatials)
    density_score, building_count = await _get_building_density_score(latitude, longitude)
    context["nearby_buildings_count"] = building_count
    context["area_importance_score"] = density_score

    raw_area = float(density_score)
    equity_multiplier, _ = await _get_equity_multiplier(ward_id, equity_weight)
    area_adjusted = min(10.0, raw_area * equity_multiplier)
    equity_adjustment = area_adjusted - raw_area

    # Base score
    base_score = round(min(10.0, max(0.0,
        w_r * recency + w_f * frequency + w_e * exec_response_mean + w_a * area_adjusted
    )), 2)

    # Context Engine Dynamic Multipliers
    context_bonus = 0.0
    issue_lower = issue_type.lower()
    
    # 1. Weather Risk (Rain + Infrastructure/Sanitation)
    if weather_condition == "Rain" and primary_domain in ["Core Infrastructure & Public Works", "Sanitation, Environment & Parks"]:
        if any(keyword in issue_lower for keyword in ["road_damage", "flooding", "collapse", "drainage_sewage"]):
            context_bonus += 2.0
            print(f"[Agent3/ContextEngine] +2.0 risk bonus applied (Rain x {issue_type})")
            
    # 2. Temporal Risk (Night vs Peak)
    if temporal_context == "Night" and any(keyword in issue_lower for keyword in ["lighting", "unsafe", "drainage_sewage", "vector"]):
        context_bonus += 1.5
        print(f"[Agent3/ContextEngine] +1.5 risk bonus applied (Night x {issue_type})")
    elif temporal_context == "Peak Traffic" and any(keyword in issue_lower for keyword in ["signal", "road_damage", "transport", "parking"]):
        context_bonus += 1.5
        print(f"[Agent3/ContextEngine] +1.5 risk bonus applied (Peak Traffic x {issue_type})")

    # 3. Active Event Risk
    if active_event:
        context_bonus += 2.0
        print(f"[Agent3/ContextEngine] +2.0 risk bonus applied (Active Event: {active_event})")
        
    # 4. Cascading Failure Risk
    if is_cascading_failure:
        context_bonus += 3.0
        print(f"[Agent3/ContextEngine] +3.0 risk bonus applied (Cascading Failure Link)")

    # Domain risk bonus (admin-configurable)
    bonus_config = await _get_domain_risk_bonuses()
    domain_bonus = float(bonus_config.get(primary_domain, 0.0))
    
    # Final Score
    final_score = round(min(10.0, base_score + domain_bonus + context_bonus), 2)

    assessment = PriorityAssessment(
        rfm_metrics=RFMMetrics(
            recency=round(recency, 2),
            frequency=round(frequency, 2),
            executive_response_mean=round(exec_response_mean, 2),
        ),
        area_importance_score=round(area_adjusted, 2),
        base_score=base_score,
        domain_risk_bonus=domain_bonus,
        equity_adjustment=round(equity_adjustment, 2),
        priority_score=final_score,
        priority_class=_score_to_class(final_score),
    )

    return assessment, context, ward_id

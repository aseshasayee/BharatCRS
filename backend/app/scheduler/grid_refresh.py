"""
BharathCRS — Grid Refresh Scheduler
─────────────────────────────────────
Infrastructure job — NOT an agent in the 5-agent pipeline.
Runs nightly at 02:00 via APScheduler.

Purpose: Precomputes context data for all ~840 Chennai 250m grid cells
so the Priority Assessment Agent (Agent 3) has zero external API calls
per complaint. Stores results in context_cache + ward_context_cache.

Source: Originally grid_refresh_agent.py in agents/ — moved here to
make clear it is infrastructure, not a complaint-processing agent.
"""
import asyncio
import math
from datetime import datetime, timezone

import httpx

from app.db.mongodb import get_db


# ─── Chennai Bounding Box ─────────────────────────────────────────────────────

CHENNAI_LAT_MIN = 12.90
CHENNAI_LAT_MAX = 13.23
CHENNAI_LON_MIN = 80.17
CHENNAI_LON_MAX = 80.32

GRID_LAT_STEP = 0.00225   # ~250m latitude
GRID_LON_STEP = 0.00270   # ~250m longitude at Chennai latitude
API_CONCURRENCY = 5


# ─── API Helpers ──────────────────────────────────────────────────────────────

async def _google_nearby_count(client, api_key, lat, lng, place_type, radius_m=500):
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {"location": f"{lat},{lng}", "radius": radius_m, "type": place_type, "key": api_key}
    try:
        r = await client.get(url, params=params, timeout=10)
        if r.status_code == 200:
            return len(r.json().get("results", []))
    except Exception as e:
        print(f"[GridRefresh/Places] {place_type} at ({lat},{lng}): {e}")
    return 0


async def _osm_nearby_count(client, lat, lng, amenity, radius_m=500):
    query = (
        f"[out:json][timeout:15];"
        f"node[amenity={amenity}](around:{radius_m},{lat},{lng});"
        f"out count;"
    )
    try:
        r = await client.post("https://overpass-api.de/api/interpreter", data={"data": query}, timeout=15)
        if r.status_code == 200:
            elements = r.json().get("elements", [])
            for el in elements:
                if el.get("type") == "count":
                    return int(el.get("tags", {}).get("total", 0))
            return len(elements)
    except Exception as e:
        print(f"[GridRefresh/OSM] {amenity} at ({lat},{lng}): {e}")
    return 0


async def _get_road_type_osm(client, lat, lng):
    query = f"[out:json][timeout:10];way[highway](around:50,{lat},{lng});out tags 1;"
    try:
        r = await client.post("https://overpass-api.de/api/interpreter", data={"data": query}, timeout=10)
        if r.status_code == 200:
            for el in r.json().get("elements", []):
                hw = el.get("tags", {}).get("highway")
                if hw:
                    return hw
    except Exception:
        pass
    return "residential"


def _highway_to_score(highway_type: str) -> int:
    return {
        "motorway": 5, "trunk": 5, "primary": 4,
        "secondary": 3, "tertiary": 3,
        "unclassified": 2, "residential": 1, "service": 1,
    }.get(highway_type.lower(), 2)


def _compute_density(lat: float, lng: float) -> str:
    """Distance-from-city-centroid proxy for traffic density (free, no API)."""
    dist = math.sqrt((lat - 13.0827) ** 2 + (lng - 80.2707) ** 2)
    if dist < 0.045:
        return "High"
    elif dist < 0.135:
        return "Medium"
    return "Low"


def _compute_area_score(schools, hospitals, road, density) -> float:
    s = min(schools * 2.5, 10.0)
    h = min(hospitals * 3.3, 10.0)
    r = (road / 5.0) * 10.0
    d = {"Low": 3.0, "Medium": 6.0, "High": 10.0}.get(density, 5.0)
    return round(0.25 * s + 0.25 * h + 0.30 * r + 0.20 * d, 2)


# ─── Per-Cell Computation ─────────────────────────────────────────────────────

async def _compute_cell(client, lat, lng, use_google, google_key, refresh_date):
    if use_google and google_key:
        schools = await _google_nearby_count(client, google_key, lat, lng, "school")
        hospitals = await _google_nearby_count(client, google_key, lat, lng, "hospital")
    else:
        schools, hospitals = await asyncio.gather(
            _osm_nearby_count(client, lat, lng, "school"),
            _osm_nearby_count(client, lat, lng, "hospital"),
        )
    road_type = await _get_road_type_osm(client, lat, lng)
    road_score = _highway_to_score(road_type)
    density = _compute_density(lat, lng)
    return {
        "grid_lat": round(lat, 6),
        "grid_lon": round(lng, 6),
        "nearby_schools_count": schools,
        "nearby_hospitals_count": hospitals,
        "land_use_density": density,
        "road_importance_score": road_score,
        "area_importance_score": _compute_area_score(schools, hospitals, road_score, density),
        "refresh_date": refresh_date,
        "updated_at": datetime.now(timezone.utc),
    }


# ─── Main Entry Point ─────────────────────────────────────────────────────────

async def run_grid_refresh() -> dict:
    """
    Nightly grid refresh. Called by APScheduler at 02:00 and by
    POST /api/admin/grid-refresh for manual triggers.
    """
    import os
    google_key = os.getenv("GOOGLE_PLACES_API_KEY") or None
    use_google = bool(google_key)
    refresh_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    source = "google" if use_google else "osm"
    print(f"[GridRefresh] Starting — source={source}, date={refresh_date}")

    db = get_db()
    context_cache = db["context_cache"]

    cells_to_compute = []
    lat = CHENNAI_LAT_MIN
    while lat <= CHENNAI_LAT_MAX:
        lon = CHENNAI_LON_MIN
        while lon <= CHENNAI_LON_MAX:
            centre_lat = round(lat + GRID_LAT_STEP / 2, 6)
            centre_lon = round(lon + GRID_LON_STEP / 2, 6)
            cells_to_compute.append((round(lat, 6), round(lon, 6), centre_lat, centre_lon))
            lon += GRID_LON_STEP
        lat += GRID_LAT_STEP

    total = len(cells_to_compute)
    updated = 0
    errors = 0
    semaphore = asyncio.Semaphore(API_CONCURRENCY)

    async def fetch(client, gl, gln, cl, cln):
        async with semaphore:
            await asyncio.sleep(0.1)
            cell = await _compute_cell(client, cl, cln, use_google, google_key, refresh_date)
            cell["grid_lat"] = gl
            cell["grid_lon"] = gln
            return cell

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[fetch(client, gl, gln, cl, cln) for gl, gln, cl, cln in cells_to_compute],
            return_exceptions=True
        )

    for result in results:
        if isinstance(result, Exception):
            errors += 1
            continue
        try:
            await context_cache.update_one(
                {"grid_lat": result["grid_lat"], "grid_lon": result["grid_lon"]},
                {"$set": result}, upsert=True
            )
            updated += 1
        except Exception as e:
            errors += 1
            print(f"[GridRefresh] Upsert error: {e}")

    await _build_ward_aggregates(db)
    summary = {"total_cells": total, "updated": updated, "errors": errors, "source": source, "refresh_date": refresh_date}
    print(f"[GridRefresh] Complete: {summary}")
    return summary


async def _build_ward_aggregates(db) -> None:
    ward_cache = db["ward_context_cache"]
    wards = await db["ward_metadata"].find({}).to_list(length=200)
    for ward in wards:
        ward_id = ward.get("ward_id")
        centroid_lat = ward.get("centroid_lat", 13.0827)
        centroid_lon = ward.get("centroid_lon", 80.2707)
        radius_deg = 0.025
        try:
            cells = await db["context_cache"].find({
                "grid_lat": {"$gte": centroid_lat - radius_deg, "$lte": centroid_lat + radius_deg},
                "grid_lon": {"$gte": centroid_lon - radius_deg, "$lte": centroid_lon + radius_deg},
            }).to_list(length=200)
            if not cells:
                continue
            avg_schools = sum(c.get("nearby_schools_count", 0) for c in cells) / len(cells)
            avg_hospitals = sum(c.get("nearby_hospitals_count", 0) for c in cells) / len(cells)
            avg_road = sum(c.get("road_importance_score", 2) for c in cells) / len(cells)
            density_counts = {}
            for c in cells:
                d = c.get("land_use_density", "Medium")
                density_counts[d] = density_counts.get(d, 0) + 1
            dominant = max(density_counts, key=density_counts.get)
            await ward_cache.update_one({"ward_id": ward_id}, {"$set": {
                "ward_id": ward_id,
                "avg_schools_count": round(avg_schools, 1),
                "avg_hospitals_count": round(avg_hospitals, 1),
                "avg_road_score": round(avg_road, 1),
                "dominant_density": dominant,
                "area_importance_score": _compute_area_score(round(avg_schools), round(avg_hospitals), round(avg_road), dominant),
                "cells_sampled": len(cells),
                "updated_at": datetime.now(timezone.utc),
            }}, upsert=True)
        except Exception as e:
            print(f"[GridRefresh] Ward aggregate error ward {ward_id}: {e}")

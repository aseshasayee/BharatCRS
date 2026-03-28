"""
BharathCRS — FastAPI Application Entry Point v3
─────────────────────────────────────────────────
Bootstraps the FastAPI app with:
  - Lifespan (MongoDB init/shutdown)
  - CORS for Next.js frontend
  - Complaint router registration
  - APScheduler:
      • SLA monitoring (every 30 minutes)
      • Grid context refresh (nightly at 02:00)
"""
# Load .env FIRST — must happen before any os.getenv() calls
from dotenv import load_dotenv
load_dotenv()

import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.mongodb import close_db, init_db
from app.routers.complaints import router as complaints_router
from app.routers.auth import router as auth_router

# ─── Scheduler Setup ──────────────────────────────────────────────────────────

scheduler = AsyncIOScheduler()


async def _scheduled_sla_check():
    """Runs the monitoring agent every 30 minutes."""
    from app.agents.monitoring_agent import run_monitoring_agent
    result = await run_monitoring_agent()
    print(f"[Monitoring] SLA scan: {result['breached_count']} breach(es), "
          f"{result.get('escalations_created', 0)} new escalation(s).")


async def _scheduled_grid_refresh():
    """Runs the nightly context grid precomputation (2am)."""
    from app.scheduler.grid_refresh import run_grid_refresh
    result = await run_grid_refresh()
    print(f"[GridRefresh] Nightly refresh complete: {result['updated']}/{result['total_cells']} cells updated.")


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    print("[BharathCRS v3] Starting up...")
    await init_db()

    # SLA monitoring — every 30 minutes
    scheduler.add_job(_scheduled_sla_check, "interval", minutes=30, id="sla_monitor")
    # Grid refresh — nightly at 02:00
    scheduler.add_job(_scheduled_grid_refresh, "cron", hour=2, minute=0, id="grid_refresh")
    scheduler.start()
    print("[BharathCRS v3] Schedulers started: SLA monitor (30m), Grid refresh (02:00).")

    yield

    scheduler.shutdown()
    await close_db()
    print("[BharathCRS v3] Shutdown complete.")


# ─── App Initialization ────────────────────────────────────────────────────────

app = FastAPI(
    title="BharathCRS API",
    description=(
        "Governance-enforced neuro-symbolic civic complaint resolution system v3. "
        "LLM perception only. All routing deterministic. Equity-adjusted priority."
    ),
    version="3.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

default_cors_origins = ",".join([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])
cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", default_cors_origins).split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(complaints_router)
app.include_router(auth_router, prefix="/api")

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok", "service": "BharathCRS API", "version": "3.0.0"}


@app.get("/")
async def root() -> dict:
    return {"message": "Welcome to BharathCRS API v3", "docs": "/docs", "health": "/health"}


# ─── Admin: Weight Management ─────────────────────────────────────────────────

@app.get("/api/admin/weights")
async def get_weights() -> dict:
    """View current RFM+A weights and domain risk bonuses."""
    from app.db.mongodb import config_col
    rfm = await config_col().find_one({"_id": "rfm_weights"}) or {}
    bonus = await config_col().find_one({"_id": "domain_risk_bonus"}) or {}
    rfm.pop("_id", None)
    bonus.pop("_id", None)
    return {"rfm_weights": rfm, "domain_risk_bonus": bonus}


@app.patch("/api/admin/weights")
async def update_weights(updates: dict) -> dict:
    """
    Update RFM weights or domain risk bonuses.
    All changes logged to audit_logs (immutable).
    """
    from datetime import datetime, timezone
    from app.db.mongodb import audit_logs_col, config_col

    config_id = updates.pop("config_id", "rfm_weights")  # "rfm_weights" or "domain_risk_bonus"
    current = await config_col().find_one({"_id": config_id}) or {}
    old_values = {k: current.get(k) for k in updates}

    await config_col().update_one({"_id": config_id}, {"$set": updates})
    await audit_logs_col().insert_one({
        "complaint_id": "SYSTEM",
        "agent": "admin_weight_change",
        "decision": f"Config '{config_id}' updated: {updates}",
        "old_values": old_values,
        "new_values": updates,
        "rules_triggered": ["ADMIN_WEIGHT_POLICY_CHANGE"],
        "timestamp": datetime.now(timezone.utc),
        "manual_override": True,
    })
    return {"status": "updated", "config_id": config_id, "changes": updates}


# ─── Admin: Escalations ───────────────────────────────────────────────────────

@app.get("/api/admin/escalations")
async def get_escalations() -> list:
    """View all unacknowledged escalation records."""
    from app.db.mongodb import get_db
    db = get_db()
    escalations = await db["escalations"].find(
        {"acknowledged": False}
    ).sort("created_at", -1).to_list(length=50)
    for e in escalations:
        e["_id"] = str(e["_id"])
    return escalations


@app.patch("/api/admin/escalations/{escalation_id}/acknowledge")
async def acknowledge_escalation(escalation_id: str) -> dict:
    """Admin acknowledges a Tier-2 escalation (required to clear the flag)."""
    from datetime import datetime, timezone
    from bson import ObjectId
    from app.db.mongodb import audit_logs_col, get_db

    db = get_db()
    now = datetime.now(timezone.utc)
    result = await db["escalations"].update_one(
        {"_id": ObjectId(escalation_id)},
        {"$set": {"acknowledged": True, "acknowledged_at": now}},
    )
    if result.modified_count == 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Escalation not found")

    await audit_logs_col().insert_one({
        "complaint_id": "SYSTEM",
        "agent": "admin_escalation_ack",
        "decision": f"Escalation {escalation_id} acknowledged by admin",
        "rules_triggered": ["ADMIN_ESCALATION_ACKNOWLEDGED"],
        "timestamp": now,
        "manual_override": True,
    })
    return {"status": "acknowledged", "escalation_id": escalation_id}


# ─── Admin: Manual Grid Refresh Trigger ──────────────────────────────────────

@app.post("/api/admin/grid-refresh")
async def trigger_grid_refresh() -> dict:
    """Manually trigger context grid precomputation (normally runs nightly)."""
    result = await _scheduled_grid_refresh()
    return {"status": "triggered", "message": "Grid refresh started — check server logs for progress"}

"""
BharathCRS — Monitoring Agent v3 (3-Tier Escalation)
──────────────────────────────────────────────────────
Runs SLA breach detection + tiered escalation with operational consequences.

Escalation Tiers (all deterministic, rule-based):
  Tier 1 (≥3 breaches in 7d): escalation_flag=True on dept complaints
                               Admin sees red banner on dashboard
  Tier 2 (≥7 breaches in 7d): Escalation record created in `escalations` collection
                               Admin MUST acknowledge to clear the flag
  Tier 3 (Tier 2, unack 48h): Complaint status → ESCALATED (citizen-visible)
                               Public accountability without extra infra
"""
from datetime import datetime, timedelta, timezone

from app.db.mongodb import audit_logs_col, complaints_col, department_metrics_col, get_db
from app.models.complaint import ComplaintStatus


# ─── Escalation Thresholds ────────────────────────────────────────────────────

BREACH_WINDOW_DAYS = 7          # Rolling window for counting breaches
TIER1_BREACH_THRESHOLD = 3      # → escalation_flag on dashboard
TIER2_BREACH_THRESHOLD = 7      # → escalation record (must ack)
TIER3_UNACK_HOURS = 48          # → complaints become ESCALATED (citizen-visible)


# ─── Main Monitoring Function ─────────────────────────────────────────────────

async def run_monitoring_agent() -> dict:
    """
    Scans all active complaints for SLA breaches.
    Applies 3-tier escalation logic per department.

    Returns:
        { "breached_count", "checked_count", "escalations_created" }
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=BREACH_WINDOW_DAYS)

    query = {
        "governance_and_sla.sla_deadline": {"$lt": now},
        "common_metadata.status": {
            "$nin": [
                ComplaintStatus.RESOLVED.value,
                ComplaintStatus.SLA_BREACHED.value,
                "ESCALATED",
            ]
        },
    }

    breached_count = 0
    checked_count = 0
    escalations_created = 0

    # ── Process fresh breaches ────────────────────────────────────────────────
    cursor = complaints_col().find(query)
    async for complaint in cursor:
        checked_count += 1
        report_id = complaint["common_metadata"]["report_id"]
        department = complaint.get("governance_and_sla", {}).get("assigned_department", "Unknown")

        await complaints_col().update_one(
            {"common_metadata.report_id": report_id},
            {"$set": {"common_metadata.status": ComplaintStatus.SLA_BREACHED.value}},
        )

        await audit_logs_col().insert_one({
            "complaint_id": report_id,
            "agent": "monitoring_agent_v3",
            "decision": f"SLA BREACHED — deadline passed for {department}",
            "rules_triggered": ["RULE_SLA_BREACH_DETECTED"],
            "timestamp": now,
            "manual_override": False,
        })

        # Increment rolling breach counter
        await department_metrics_col().update_one(
            {"department_id": department},
            {"$inc": {"sla_breaches": 1}},
            upsert=True,
        )
        breached_count += 1

    # ── Evaluate escalation tiers per department ──────────────────────────────
    escalations_created += await _evaluate_escalation_tiers(now, window_start)

    # ── Tier 3: Promote unacknowledged Tier-2 escalations to ESCALATED status ─
    await _apply_tier3_escalations(now)

    return {
        "breached_count": breached_count,
        "checked_count": checked_count,
        "escalations_created": escalations_created,
    }


# ─── Escalation Tier Logic ────────────────────────────────────────────────────

async def _evaluate_escalation_tiers(now: datetime, window_start: datetime) -> int:
    """
    Checks each department's breach count in the rolling window.
    Creates Tier 1 (dashboard flag) or Tier 2 (escalation record) as needed.
    Returns count of new Tier-2 escalation records created.
    """
    db = get_db()
    escalations_col = db["escalations"]
    new_escalations = 0

    # Count breaches per department in the rolling window
    pipeline = [
        {
            "$match": {
                "agent": "monitoring_agent_v3",
                "timestamp": {"$gte": window_start},
                "rules_triggered": "RULE_SLA_BREACH_DETECTED",
            }
        },
        {
            "$group": {
                "_id": "$decision",  # groups by department string in decision field
                "count": {"$sum": 1},
            }
        },
    ]

    # Simpler approach: use department_metrics directly
    dept_cursor = department_metrics_col().find({"sla_breaches": {"$gte": TIER1_BREACH_THRESHOLD}})
    async for dept in dept_cursor:
        department = dept.get("department_id", "Unknown")
        breach_count = dept.get("sla_breaches", 0)

        # Tier 1: Set escalation_flag on all open complaints for this dept
        if breach_count >= TIER1_BREACH_THRESHOLD:
            await complaints_col().update_many(
                {
                    "governance_and_sla.assigned_department": department,
                    "common_metadata.status": {"$nin": [
                        ComplaintStatus.RESOLVED.value, "ESCALATED"
                    ]},
                },
                {"$set": {"escalation_flag": True}},
            )

        # Tier 2: Create escalation record (admin must acknowledge)
        if breach_count >= TIER2_BREACH_THRESHOLD:
            existing = await escalations_col.find_one({
                "department": department,
                "acknowledged": False,
            })
            if not existing:
                await escalations_col.insert_one({
                    "department": department,
                    "breach_count": breach_count,
                    "tier": 2,
                    "created_at": now,
                    "acknowledged": False,
                    "acknowledged_by": None,
                    "acknowledged_at": None,
                    "window_days": BREACH_WINDOW_DAYS,
                })
                await audit_logs_col().insert_one({
                    "complaint_id": "SYSTEM",
                    "agent": "monitoring_agent_v3",
                    "decision": f"TIER-2 ESCALATION: {department} — {breach_count} breaches in {BREACH_WINDOW_DAYS}d",
                    "rules_triggered": ["RULE_TIER2_ESCALATION"],
                    "timestamp": now,
                    "manual_override": False,
                })
                new_escalations += 1

    return new_escalations


async def _apply_tier3_escalations(now: datetime) -> None:
    """
    Tier 3: If a Tier-2 escalation is unacknowledged for 48h,
    mark all affected open complaints as ESCALATED (citizen-visible status).
    This creates public accountability pressure without extra infra.
    """
    db = get_db()
    escalations_col = db["escalations"]
    cutoff = now - timedelta(hours=TIER3_UNACK_HOURS)

    tier2_unack = escalations_col.find({
        "acknowledged": False,
        "tier": 2,
        "created_at": {"$lte": cutoff},
    })

    async for escalation in tier2_unack:
        department = escalation.get("department")

        # Update open complaints to ESCALATED (citizen-visible)
        result = await complaints_col().update_many(
            {
                "governance_and_sla.assigned_department": department,
                "common_metadata.status": {"$nin": [
                    ComplaintStatus.RESOLVED.value, "ESCALATED"
                ]},
            },
            {
                "$set": {
                    "common_metadata.status": "ESCALATED",
                    "escalation_reason": f"Department SLA breach threshold exceeded — unresolved for 48h after Tier-2 alert",
                }
            },
        )

        # Upgrade escalation record to Tier 3
        await escalations_col.update_one(
            {"_id": escalation["_id"]},
            {"$set": {"tier": 3, "tier3_applied_at": now}},
        )

        await audit_logs_col().insert_one({
            "complaint_id": "SYSTEM",
            "agent": "monitoring_agent_v3",
            "decision": f"TIER-3 ESCALATION APPLIED: {department} — {result.modified_count} complaints marked ESCALATED (citizen-visible)",
            "rules_triggered": ["RULE_TIER3_PUBLIC_ESCALATION"],
            "timestamp": now,
            "manual_override": False,
        })
        print(f"[Monitoring] Tier-3 applied to {department}: {result.modified_count} complaints now ESCALATED")


# ─── Single Complaint Check ───────────────────────────────────────────────────

async def check_single_complaint(report_id: str) -> bool:
    """
    Checks if a specific complaint has breached its SLA.
    Returns True if breached and status was updated.
    """
    now = datetime.now(timezone.utc)
    complaint = await complaints_col().find_one({"common_metadata.report_id": report_id})
    if not complaint:
        return False

    sla_deadline = complaint.get("governance_and_sla", {}).get("sla_deadline")
    if not sla_deadline:
        return False

    status = complaint.get("common_metadata", {}).get("status")
    if status in [ComplaintStatus.RESOLVED.value, ComplaintStatus.SLA_BREACHED.value, "ESCALATED"]:
        return False

    if sla_deadline < now:
        await complaints_col().update_one(
            {"common_metadata.report_id": report_id},
            {"$set": {"common_metadata.status": ComplaintStatus.SLA_BREACHED.value}},
        )
        return True
    return False

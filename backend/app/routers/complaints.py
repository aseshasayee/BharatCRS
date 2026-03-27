"""
BharathCRS — FastAPI Complaint Router
──────────────────────────────────────
Endpoints:
  POST   /api/complaints          — Submit a new complaint
  GET    /api/complaints/{id}     — Track complaint by ID
  GET    /api/complaints          — Admin: list all complaints (with filters)
  PATCH  /api/complaints/{id}/override — Admin: manual override
  POST   /api/monitoring/check    — Trigger SLA breach scan
  GET    /api/stats               — Dashboard KPIs
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.agents.monitoring_agent import run_monitoring_agent
from app.db.mongodb import audit_logs_col, complaints_col, department_metrics_col
from app.graph.workflow import process_complaint
from app.models.complaint import (
    AdminOverrideRequest,
    ComplaintStatus,
    ComplaintSubmitResponse,
    PriorityClass,
)

router = APIRouter(prefix="/api", tags=["complaints"])


# ─── ID Generator ─────────────────────────────────────────────────────────────

def generate_report_id() -> str:
    year = datetime.now(timezone.utc).year
    short_id = uuid.uuid4().hex[:6].upper()
    return f"bcrs-{year}-CHN-{short_id}"


# ─── POST /api/complaints — Submit Complaint ───────────────────────────────────

@router.post("/complaints", response_model=ComplaintSubmitResponse)
async def submit_complaint(
    raw_text: Annotated[str, Form(min_length=10, description="Complaint description")],
    latitude: Annotated[float, Form(description="GPS latitude")],
    longitude: Annotated[float, Form(description="GPS longitude")],
    language: Annotated[str, Form()] = "en",
    submission_channel: Annotated[str, Form()] = "Web App",
    is_anonymous: Annotated[bool, Form()] = True,
    photo: Annotated[UploadFile | None, File()] = None,
):
    """
    Citizen complaint submission endpoint.
    Triggers the full LangGraph pipeline (perception → duplicate → priority → routing → store).
    """
    report_id = generate_report_id()

    request_data = {
        "raw_text": raw_text,
        "latitude": latitude,
        "longitude": longitude,
        "language": language,
        "submission_channel": submission_channel,
        "is_anonymous": is_anonymous,
        "community_upvotes": 0,
        "llm_provider": os.getenv("LLM_PROVIDER", "gemini"),
    }

    # Handle photo upload (save reference — full processing is future work)
    if photo:
        request_data["has_photo"] = True
        request_data["photo_filename"] = photo.filename
        # TODO Phase 2: Store photo in cloud storage and pass URL to perception agent

    # Run the LangGraph pipeline
    try:
        final_state = await process_complaint(request_data, report_id)
    except Exception as e:
        import traceback
        traceback.print_exc()   # Full trace will appear in uvicorn terminal
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    needs_review = final_state.get("needs_human_review", False)
    has_error = final_state.get("error") is not None

    if needs_review or has_error:
        status = ComplaintStatus.HUMAN_REVIEW
        message = "Your complaint requires manual review due to classification uncertainty."
    else:
        status = ComplaintStatus.ASSIGNED
        message = "Your complaint has been successfully submitted and routed to the appropriate department."

    return ComplaintSubmitResponse(
        complaint_id=report_id,
        status=status,
        message=message,
        needs_human_review=needs_review,
    )


# ─── GET /api/complaints/{id} — Track Complaint ───────────────────────────────

@router.get("/complaints/{report_id}")
async def get_complaint(report_id: str) -> dict:
    """
    Returns the full BharathCRS JSON for a complaint.
    Used by the citizen tracking page.
    """
    complaint = await complaints_col().find_one(
        {"common_metadata.report_id": report_id},
        {"_id": 0},
    )
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint '{report_id}' not found.")

    # Convert datetime objects to ISO strings for JSON
    return _serialize_complaint(complaint)


# ─── GET /api/complaints — Admin List ────────────────────────────────────────

@router.get("/complaints")
async def list_complaints(
    status: Annotated[str | None, Query()] = None,
    department: Annotated[str | None, Query()] = None,
    priority_class: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    skip: Annotated[int, Query(ge=0)] = 0,
) -> list[dict]:
    """
    Admin endpoint: list complaints with optional filters.
    Supports filtering by status, department, and priority class.
    """
    query: dict = {}

    if status:
        query["common_metadata.status"] = status
    if department:
        query["governance_and_sla.assigned_department"] = department
    if priority_class:
        query["priority_assessment.priority_class"] = priority_class

    complaints = []
    cursor = complaints_col().find(query, {"_id": 0}).sort(
        "common_metadata.submission_timestamp", -1
    ).skip(skip).limit(limit)

    async for complaint in cursor:
        complaints.append(_serialize_complaint(complaint))

    return complaints


# ─── PATCH /api/complaints/{id}/override — Admin Override ─────────────────────

@router.patch("/complaints/{report_id}/override")
async def admin_override(report_id: str, override: AdminOverrideRequest) -> dict:
    """
    Admin manual override: changes department, priority, and SLA.
    Writes an immutable audit log entry.
    """
    complaint = await complaints_col().find_one({"common_metadata.report_id": report_id})
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint '{report_id}' not found.")

    now = datetime.now(timezone.utc)
    from datetime import timedelta
    new_deadline = now + timedelta(hours=override.new_sla_hours)

    # Apply override
    await complaints_col().update_one(
        {"common_metadata.report_id": report_id},
        {
            "$set": {
                "governance_and_sla.assigned_department": override.new_department,
                "governance_and_sla.responsible_department": override.new_department,
                "governance_and_sla.sla_hours": override.new_sla_hours,
                "governance_and_sla.sla_deadline": new_deadline,
                "governance_and_sla.sla_category": override.new_priority_class.value,
                "priority_assessment.priority_class": override.new_priority_class.value,
                "agent_traceability.manual_override_flag": True,
                "common_metadata.status": ComplaintStatus.ASSIGNED.value,
            }
        },
    )

    # Immutable audit log
    await audit_logs_col().insert_one({
        "complaint_id": report_id,
        "agent": "admin_override",
        "decision": (
            f"Manual override: dept={override.new_department}, "
            f"priority={override.new_priority_class.value}, "
            f"sla={override.new_sla_hours}h. Reason: {override.override_reason}"
        ),
        "rules_triggered": ["RULE_MANUAL_OVERRIDE"],
        "timestamp": now,
        "manual_override": True,
    })

    return {"success": True, "complaint_id": report_id, "message": "Override applied successfully."}


# ─── POST /api/monitoring/check — Trigger SLA Scan ───────────────────────────

@router.post("/monitoring/check")
async def trigger_monitoring() -> dict:
    """Triggers the monitoring agent to scan for SLA breaches."""
    result = await run_monitoring_agent()
    return {
        "success": True,
        "breached_count": result["breached_count"],
        "checked_count": result["checked_count"],
        "message": f"Scan complete. {result['breached_count']} breach(es) detected.",
    }


# ─── GET /api/stats — Dashboard KPIs ─────────────────────────────────────────

@router.get("/stats")
async def get_stats() -> dict:
    """Returns dashboard KPI metrics."""
    total = await complaints_col().count_documents({})
    resolved = await complaints_col().count_documents(
        {"common_metadata.status": ComplaintStatus.RESOLVED.value}
    )
    breached = await complaints_col().count_documents(
        {"common_metadata.status": ComplaintStatus.SLA_BREACHED.value}
    )
    human_review = await complaints_col().count_documents(
        {"common_metadata.status": ComplaintStatus.HUMAN_REVIEW.value}
    )
    assigned = await complaints_col().count_documents(
        {"common_metadata.status": ComplaintStatus.ASSIGNED.value}
    )

    sla_rate = round((resolved / total * 100), 1) if total > 0 else 0

    # Department breakdown
    dept_metrics = []
    cursor = department_metrics_col().find({}, {"_id": 0})
    async for doc in cursor:
        dept_metrics.append(doc)

    return {
        "total_complaints": total,
        "resolved": resolved,
        "sla_breached": breached,
        "human_review": human_review,
        "assigned": assigned,
        "sla_compliance_rate": sla_rate,
        "department_metrics": dept_metrics,
    }


# ─── Upvote Endpoint ──────────────────────────────────────────────────────────

@router.post("/complaints/{report_id}/upvote")
async def upvote_complaint(report_id: str) -> dict:
    """
    Increments community upvote count AND recalculates priority in real-time.
    If the upvote pushes the Frequency (F) metric enough to cross a priority threshold 
    (e.g., Medium → High), it will dynamically tighten the SLA deadline.
    """
    now = datetime.now(timezone.utc)
    db = complaints_col()
    
    # 1. Fetch current complaint
    complaint = await db.find_one({"common_metadata.report_id": report_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    # 2. Increment upvote in memory
    old_upvotes = complaint.get("common_metadata", {}).get("community_upvotes", 0)
    new_upvotes = old_upvotes + 1

    # 3. Recalculate Priority (Agent 3 logic inline for real-time update)
    from app.agents.priority_agent import run_priority_agent
    
    # Extract necessary inputs for recreation
    submission_ts = complaint.get("common_metadata", {}).get("submission_timestamp", now)
    if submission_ts.tzinfo is None:
        submission_ts = submission_ts.replace(tzinfo=timezone.utc)
        
    systemic_metrics = complaint.get("systemic_pattern_metrics", {})
    domain_class = complaint.get("domain_classification", {})
    context = complaint.get("context_derived_indicators", {})
    governance = complaint.get("governance_and_sla", {})
    spatio = complaint.get("spatio_temporal_core", {})
    
    old_priority_class = complaint.get("priority_assessment", {}).get("priority_class")
    old_score = complaint.get("priority_assessment", {}).get("priority_score")

    # Re-run priority calculation with +1 upvote
    new_assessment, _, _ = await run_priority_agent(
        submission_timestamp=submission_ts,
        duplicate_report_count=systemic_metrics.get("duplicate_report_count", 0),
        community_upvotes=new_upvotes,
        assigned_department=governance.get("assigned_department", "Unknown"),
        latitude=spatio.get("location", {}).get("latitude", 0.0),
        longitude=spatio.get("location", {}).get("longitude", 0.0),
        ward_id=spatio.get("administrative_unit", {}).get("ward_id"),
        primary_domain=domain_class.get("primary_domain", ""),
        context_indicators=context,
    )

    new_priority_doc = new_assessment.model_dump()
    new_priority_class = new_priority_doc["priority_class"]
    
    update_fields = {
        "common_metadata.community_upvotes": new_upvotes,
        "priority_assessment": new_priority_doc
    }

    # 4. Check if SLA needs tightening due to priority bump
    message = "Upvote recorded. Priority updated."
    if new_priority_class != old_priority_class:
        from app.agents.routing_agent import run_routing_agent
        new_routing, rules, _ = await run_routing_agent(
            primary_domain=domain_class.get("primary_domain", ""),
            sub_domain=domain_class.get("sub_domain", ""),
            issue_type=domain_class.get("issue_type", ""),
            priority_class=new_priority_class,
            public_safety_flag=domain_class.get("public_safety_flag", False),
            near_sensitive_institution_flag=context.get("near_sensitive_institution_flag", False),
            vulnerable_population_flag=context.get("vulnerable_population_flag", False),
        )
        
        # Only tighten, never loosen SLA on upvote
        old_sla = governance.get("sla_hours", 72)
        new_sla = new_routing.get("sla_hours", 72)
        if new_sla < old_sla:
            # Calculate new deadline relative to ORIGINAL submission time
            new_deadline = submission_ts + timedelta(hours=new_sla)
            update_fields["governance_and_sla.sla_category"] = new_routing.get("sla_category")
            update_fields["governance_and_sla.sla_hours"] = new_sla
            update_fields["governance_and_sla.sla_deadline"] = new_deadline
            
            message += f" Escalated: {old_priority_class} → {new_priority_class} (SLA updated to {new_sla}h)."
            
            # Log dynamic SLA change
            await audit_logs_col().insert_one({
                "complaint_id": report_id,
                "agent": "priority_agent",
                "decision": f"Community upvote triggered class bump ({old_priority_class} → {new_priority_class}). SLA tightened to {new_sla}h.",
                "rules_triggered": ["RULE_DYNAMIC_PRIORITY_ESCALATION"] + rules,
                "timestamp": now,
                "manual_override": False,
            })

    # 5. Commit to DB
    await db.update_one(
        {"common_metadata.report_id": report_id},
        {"$set": update_fields}
    )

    return {
        "success": True, 
        "message": message,
        "new_priority_score": new_priority_doc["priority_score"],
        "new_priority_class": new_priority_class
    }


# ─── PATCH /api/complaints/{id}/resolve — Resolution Feedback Loop ─────────────

@router.patch("/complaints/{report_id}/resolve")
async def resolve_complaint(report_id: str) -> dict:
    """
    Marks a complaint as Resolved and closes the E-metric feedback loop.

    Feedback mechanism:
      1. Calculates actual resolution time = (now - submission_timestamp) in days
      2. Updates department_metrics.avg_resolution_days using rolling average
         Formula: new_avg = (old_avg × N + resolution_days) / (N + 1)
         N is capped at 50 to prevent the metric from becoming historically rigid
      3. All changes logged immutably to audit_logs

    This is how the E metric in RFM+A improves over time — a department that
    consistently resolves in 1 day will see E rise toward 9.0, making its
    future complaints score higher in priority (rewards responsive depts).
    A slow department sees E fall, indicating systemic underperformance.
    """
    now = datetime.now(timezone.utc)

    # Fetch complaint
    complaint = await complaints_col().find_one({"common_metadata.report_id": report_id})
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint '{report_id}' not found.")

    current_status = complaint.get("common_metadata", {}).get("status", "")
    if current_status == ComplaintStatus.RESOLVED.value:
        return {"success": True, "message": "Already resolved.", "complaint_id": report_id}

    # Calculate resolution time
    submission_ts = complaint.get("common_metadata", {}).get("submission_timestamp")
    if submission_ts and isinstance(submission_ts, datetime):
        if submission_ts.tzinfo is None:
            submission_ts = submission_ts.replace(tzinfo=timezone.utc)
        resolution_days = (now - submission_ts).total_seconds() / 86400
    else:
        resolution_days = None

    department = complaint.get("governance_and_sla", {}).get("assigned_department", "Unknown")

    # Mark as resolved
    await complaints_col().update_one(
        {"common_metadata.report_id": report_id},
        {
            "$set": {
                "common_metadata.status": ComplaintStatus.RESOLVED.value,
                "resolved_at": now,
                "resolution_days": round(resolution_days, 2) if resolution_days else None,
            }
        },
    )

    # ── E-metric Feedback Loop ────────────────────────────────────────────────
    # Update department rolling average resolution time
    # E = 10 - avg_resolution_days → faster dept = better E → higher priority
    if resolution_days is not None:
        dept_doc = await department_metrics_col().find_one({"department_id": department})
        if dept_doc:
            old_avg = dept_doc.get("avg_resolution_days", 2.0)
            old_total = dept_doc.get("total_complaints", 0)
            # Cap N at 50 to prevent historic inertia (prevents metric from ossifying)
            N = min(old_total, 50)
            new_avg = (old_avg * N + resolution_days) / (N + 1)
            new_total = old_total + 1
            new_resolved = dept_doc.get("resolved_on_time", 0)

            # Count on-time resolutions (resolved before SLA deadline)
            sla_deadline = complaint.get("governance_and_sla", {}).get("sla_deadline")
            if sla_deadline and isinstance(sla_deadline, datetime):
                if sla_deadline.tzinfo is None:
                    sla_deadline = sla_deadline.replace(tzinfo=timezone.utc)
                if now <= sla_deadline:
                    new_resolved += 1

            sla_rate = round(new_resolved / new_total, 3) if new_total > 0 else 1.0

            await department_metrics_col().update_one(
                {"department_id": department},
                {
                    "$set": {
                        "avg_resolution_days": round(new_avg, 2),
                        "total_complaints": new_total,
                        "resolved_on_time": new_resolved,
                        "sla_compliance_rate": sla_rate,
                    }
                },
                upsert=True,
            )

            # Audit the metric change
            await audit_logs_col().insert_one({
                "complaint_id": report_id,
                "agent": "resolution_feedback_loop",
                "decision": (
                    f"{department} avg_resolution_days updated: "
                    f"{old_avg:.2f}d → {new_avg:.2f}d "
                    f"(this resolution: {resolution_days:.2f}d, N={N})"
                ),
                "rules_triggered": ["RULE_E_METRIC_FEEDBACK"],
                "old_values": {"avg_resolution_days": old_avg},
                "new_values": {"avg_resolution_days": round(new_avg, 2)},
                "timestamp": now,
                "manual_override": False,
            })

    return {
        "success": True,
        "complaint_id": report_id,
        "department": department,
        "resolution_days": round(resolution_days, 2) if resolution_days else None,
        "message": f"Marked as Resolved. Department E-metric updated.",
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _serialize_complaint(doc: dict) -> dict:
    """Converts MongoDB document (with datetime objects) to JSON-safe dict."""
    def convert(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, dict):
            return {k: convert(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [convert(i) for i in obj]
        return obj
    return convert(doc)

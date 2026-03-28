"""
BharathCRS — LangGraph Orchestration Workflow v3
──────────────────────────────────────────────────
Exactly 5 agents per PRD flowchart:

  [1] perception  → Neural Perception & Normalization Agent (LLM)
  [2] duplicate   → Duplicate Detection Agent (Haversine + location)
  [3] priority    → Priority Assessment Agent (context lookup + RFM+A + equity)
  [4] routing     → Routing & Department Assignment Agent (rule engine + SLA)
  [5] monitoring  → Monitoring & Reporting Agent (APScheduler, 30m interval)

  store → persist BharathCRS JSON to MongoDB
"""
from datetime import datetime, timezone
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.agents.duplicate_agent import run_duplicate_agent
from app.agents.perception_agent import run_perception_agent
from app.agents.priority_agent import run_priority_agent, resolve_ward_id
from app.agents.routing_agent import run_routing_agent
from app.db.mongodb import audit_logs_col, complaints_col, config_col, get_db
from app.models.complaint import ComplaintStatus


# ─── Graph State ─────────────────────────────────────────────────────────────

class GraphState(TypedDict):
    """Shared data carrier passed between all 5 agent nodes."""
    request: dict                      # Citizen input
    report_id: str                     # bcrs-YYYY-CHN-XXXXXX

    perception_output: dict | None     # Agent 1 output
    duplicate_result: dict | None      # Agent 2 output
    context_indicators: dict | None    # Sub-step inside Agent 3
    domain_classification: dict | None # Extracted from Agent 1
    priority_result: dict | None       # Agent 3 output
    routing_result: dict | None        # Agent 4 output
    rules_triggered: list[str]
    decision_explanation: str

    needs_human_review: bool
    assigned_department: str           # Resolved inside Agent 3
    clip_validation_result: dict | None # Result of image-text verification
    error: str | None


# ─── Ward ID Resolver (sub-step of Agent 3) ───────────────────────────────────

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    φ1, φ2 = radians(lat1), radians(lat2)
    Δφ = radians(lat2 - lat1)
    Δλ = radians(lon2 - lon1)
    a = sin(Δφ/2)**2 + cos(φ1) * cos(φ2) * sin(Δλ/2)**2
    return R * 2 * asin(sqrt(a))


async def _resolve_ward_id(lat: float, lng: float) -> int | None:
    """
    Nearest-centroid ward resolution. Compares GPS to all ward centroids
    in ward_metadata and returns the closest ward_id.
    This is a sub-step inside the Priority Agent — not a separate agent.
    """
    try:
        db = get_db()
        wards = await db["ward_metadata"].find(
            {}, {"ward_id": 1, "centroid_lat": 1, "centroid_lon": 1}
        ).to_list(length=250)
        if not wards:
            return None
        nearest = min(
            wards,
            key=lambda w: _haversine(lat, lng, w["centroid_lat"], w["centroid_lon"])
        )
        return nearest["ward_id"]
    except Exception as e:
        print(f"[WardResolver] {e}")
        return None


async def _get_user_trust_score(user_id: str | None) -> float:
    """
    Looks up the user's civic trust reputation score (0.0 to 1.0).
    Defaults to 0.5 for anonymous or unknown users.
    """
    if not user_id:
        return 0.5
    try:
        db = get_db()
        user_doc = await db["users"].find_one({"user_id": user_id})
        if user_doc:
            return float(user_doc.get("trust_score", 0.5))
        
        # Mocking for testing: string flags in ID
        if "supercitizen" in user_id.lower():
            return 0.95
        if "spammer" in user_id.lower():
            return 0.10
            
    except Exception as e:
        print(f"[CivicTrust] Error resolving user {user_id}: {e}")
    return 0.5


async def _get_department_for_domain(primary_domain: str, sub_domain: str, safety_flag: bool) -> str:
    """
    Lightweight department lookup used inside priority node to get E metric.
    Sub-step of Agent 3 — not a separate node.
    """
    if safety_flag:
        return "Emergency Response Unit"
    config = await config_col().find_one({"_id": "routing_rules"})
    if not config:
        return "GCC General"
    domain_map = config.get("domain_to_department", {})
    sub_map = domain_map.get(primary_domain, {})
    return sub_map.get(sub_domain) or (next(iter(sub_map.values())) if sub_map else "GCC General")


# ─── Agent 1: Neural Perception & Normalization ───────────────────────────────

async def perception_node(state: GraphState) -> GraphState:
    """
    Agent 1: LLM-powered classification and normalization.
    THE ONLY NODE that calls an LLM.
    Inputs:  raw_text (str), channel, city
    Outputs: domain_classification, perception_output, needs_human_review
    """
    request = state["request"]
    try:
        perception_output, needs_human_review = await run_perception_agent(
            complaint_text=request["raw_text"],
            city="Chennai",
            ward_id=None,
            channel=request.get("submission_channel", "Web App"),
        )
        return {
            **state,
            "perception_output": perception_output.model_dump(),
            "needs_human_review": needs_human_review,
            "domain_classification": {
                "primary_domain": perception_output.primary_domain,
                "sub_domain": perception_output.sub_domain,
                "issue_type": perception_output.issue_type,
                "issue_type_candidate": perception_output.issue_type_candidate,
                "severity_level": perception_output.severity_level,
                "public_safety_flag": perception_output.public_safety_flag,
                "confidence": perception_output.confidence,
                "perception_reasoning": perception_output.classification_reasoning,
            },
        }
    except Exception as e:
        import traceback
        print(f"[Perception] ERROR: {e}")
        traceback.print_exc()
        return {**state, "error": f"Perception agent failed: {str(e)}", "needs_human_review": True}

# ─── Agent 1.5: CLIP Image Validation ─────────────────────────────────────────

from app.agents.clip_agent import verify_image_context

async def clip_validation_node(state: GraphState) -> GraphState:
    """
    Validates if the user-uploaded photo matches the perception-classified text.
    Overrides needs_human_review if mismatch is detected.
    """
    if state.get("error"):
        return state

    request = state["request"]
    photo_path = request.get("photo_local_path")
    domain = state.get("domain_classification") or {}
    
    # ── Context Engine: User Reputation Bypass ────────────────────────────────
    trust_score = await _get_user_trust_score(request.get("user_id"))
    state["request"]["user_trust_score"] = trust_score  # Cache for storage
    
    if trust_score > 0.90:
        print(f"[CivicTrust] Score {trust_score} > 0.90. Bypassing CLIP verification.")
        state["rules_triggered"] = state.get("rules_triggered", []) + ["RULE_HIGH_TRUST_BYPASS"]
        return state
        
    if trust_score < 0.20:
        print(f"[CivicTrust] Score {trust_score} < 0.20. Low Trust. Forcing manual review.")
        state["needs_human_review"] = True
        state["rules_triggered"] = state.get("rules_triggered", []) + ["RULE_LOW_TRUST_HUMAN_REVIEW"]
    
    if not photo_path:
        return state

    issue_type = domain.get("issue_type", "unknown")
    sub_domain = domain.get("sub_domain", "unknown")

    try:
        clip_result = await verify_image_context(photo_path, issue_type, sub_domain)
        state["clip_validation_result"] = clip_result
        
        if not clip_result.get("is_match", True):
            print(f"[CLIP Validation] Image context mismatch! Confidence: {clip_result.get('match_probability')}")
            state["needs_human_review"] = True
            state["rules_triggered"] = state.get("rules_triggered", []) + ["RULE_CLIP_IMAGE_MISMATCH"]
            
        return state
    except Exception as e:
        print(f"[CLIP Node Error] {e}")
        return state



# ─── Agent 2: Duplicate Detection ─────────────────────────────────────────────

async def duplicate_node(state: GraphState) -> GraphState:
    """
    Agent 2: Haversine-based duplicate detection.
    Inputs:  lat, lng, issue_type
    Outputs: duplicate_result (is_duplicate, count, cluster_id)
    DB Read: complaints collection (geo + issue_type query, last 48h)
    """
    if state.get("error"):
        return state

    request = state["request"]
    domain = state.get("domain_classification") or {}

    duplicate_result = await run_duplicate_agent(
        report_id=state["report_id"],
        latitude=request["latitude"],
        longitude=request["longitude"],
        issue_type=domain.get("issue_type", "unknown"),
        submission_timestamp=datetime.now(timezone.utc),
    )
    return {**state, "duplicate_result": duplicate_result}


# ─── Agent 3: Priority Assessment ─────────────────────────────────────────────
# This node encompasses 3 sub-steps (not separate agents):
#   3a. Context lookup  — grid cell → ward aggregate → city defaults
#   3b. Ward resolution — GPS → nearest ward centroid → poverty_index
#   3c. RFM+A scoring   — formula with equity multiplier + domain bonus

async def priority_node(state: GraphState) -> GraphState:
    """
    Agent 3: Priority Assessment Agent.
    Internally handles context lookup (3a), ward resolution (3b), and RFM+A (3c).
    All sub-steps are within priority_agent.py — this node just calls and unpacks.
    """
    if state.get("error"):
        return state

    request = state["request"]
    domain = state.get("domain_classification") or {}
    duplicate_result = state.get("duplicate_result") or {}

    # Resolve department for E metric (quick config lookup)
    safety_flag = domain.get("public_safety_flag", False)
    if safety_flag:
        department = "Emergency Response Unit"
    else:
        config = await config_col().find_one({"_id": "routing_rules"})
        if config:
            domain_map = config.get("domain_to_department", {})
            sub_map = domain_map.get(domain.get("primary_domain", ""), {})
            department = (
                sub_map.get(domain.get("sub_domain", ""))
                or next(iter(sub_map.values()), "GCC General")
            )
        else:
            department = "GCC General"

    # Agent 3: runs context lookup, ward resolution, and RFM+A internally
    assessment, context, ward_id = await run_priority_agent(
        submission_timestamp=datetime.now(timezone.utc),
        duplicate_report_count=duplicate_result.get("duplicate_report_count", 0),
        community_upvotes=request.get("community_upvotes", 0),
        assigned_department=department,
        latitude=request.get("latitude", 0.0),
        longitude=request.get("longitude", 0.0),
        ward_id=request.get("ward_id"),
        primary_domain=domain.get("primary_domain", ""),
        issue_type=domain.get("issue_type", ""),
        is_cascading_failure=duplicate_result.get("is_cascading_failure", False),
    )

    updated_request = {**request, "ward_id": ward_id} if ward_id else request

    return {
        **state,
        "request": updated_request,
        "context_indicators": context,
        "assigned_department": department,
        "priority_result": assessment.model_dump(),
    }



# ─── Agent 4: Routing & Department Assignment ─────────────────────────────────

async def routing_node(state: GraphState) -> GraphState:
    """
    Agent 4: Routing & Department Assignment Agent.
    Deterministic rule engine — no LLM.
    Inputs:  domain_classification, priority_result, context_indicators
    Outputs: routing_result (department, SLA hours, SLA deadline)
    DB Read: config (routing_rules, sla_hours)
    """
    if state.get("error"):
        return state

    domain = state.get("domain_classification") or {}
    priority = state.get("priority_result") or {}
    context = state.get("context_indicators") or {}
    req = state.get("request", {})
    
    sub_time_raw = req.get("submission_timestamp")
    try:
        if isinstance(sub_time_raw, dict) and "$date" in sub_time_raw:
            sub_time_raw = sub_time_raw["$date"]
        if isinstance(sub_time_raw, str):
            sub_time = datetime.fromisoformat(sub_time_raw.replace("Z", "+00:00"))
        else:
            sub_time = datetime.now(timezone.utc)
    except Exception:
        sub_time = datetime.now(timezone.utc)

    routing_result, rules, explanation = await run_routing_agent(
        primary_domain=domain.get("primary_domain", ""),
        sub_domain=domain.get("sub_domain", ""),
        issue_type=domain.get("issue_type", "unknown"),
        priority_class=priority.get("priority_class", "Medium"),
        public_safety_flag=domain.get("public_safety_flag", False),
        vulnerable_population_flag=context.get("vulnerable_population_flag", False),
        submission_timestamp=sub_time,
    )

    routing_dict = routing_result.model_dump()

    return {
        **state,
        "routing_result": routing_dict,
        "rules_triggered": state.get("rules_triggered", []) + rules,
        "decision_explanation": explanation,
        "assigned_department": routing_dict.get("assigned_department", state.get("assigned_department", "")),
    }


# ─── Human Review Node (fallback path from Agent 1) ───────────────────────────

async def human_review_node(state: GraphState) -> GraphState:
    """
    Fallback path when perception confidence < 0.70 or fuzzy match < 55.
    Stores complaint with HUMAN_REVIEW status for admin classification.
    """
    print(f"[HumanReview] Report {state['report_id']} flagged — error: {state.get('error')}")
    return state


# ─── Store Node (persist to MongoDB) ─────────────────────────────────────────

async def store_node(state: GraphState) -> GraphState:
    """Builds and inserts the full BharathCRS document into MongoDB."""
    request = state["request"]
    report_id = state["report_id"]
    context_indicators = state.get("context_indicators") or {}
    perception = state.get("perception_output") or {}
    domain = state.get("domain_classification") or {}
    duplicate = state.get("duplicate_result") or {}
    priority = state.get("priority_result") or {}
    routing = state.get("routing_result") or {}
    needs_human = state.get("needs_human_review", False)
    error = state.get("error")

    now = datetime.now(timezone.utc)

    # Determine status
    if error or needs_human:
        status = ComplaintStatus.HUMAN_REVIEW
    elif routing:
        status = ComplaintStatus.ASSIGNED
    else:
        status = ComplaintStatus.IN_PROCESS

    # Parse language + channel safely
    from app.models.complaint import Language, SubmissionChannel
    try:
        lang = Language(request.get("language", "en"))
    except ValueError:
        lang = Language.ENGLISH
    try:
        channel = SubmissionChannel(request.get("submission_channel", "Web App"))
    except ValueError:
        channel = SubmissionChannel.WEB_APP

    complaint_doc = {
        "common_metadata": {
            "report_id": report_id,
            "submission_timestamp": now,
            "submission_channel": channel.value,
            "language": lang.value,
            "status": status.value,
            "community_upvotes": request.get("community_upvotes", 0),
            "community_comments_count": 0,
            "is_anonymous_flag": request.get("is_anonymous", True),
        },
        "spatio_temporal_core": {
            "location": {
                "latitude": request["latitude"],
                "longitude": request["longitude"],
            },
            "administrative_unit": {
                "ward_id": request.get("ward_id"),    # Now populated by Agent 3
                "zone_id": None,
                "city": "Chennai",
            },
        },
        "normalized_input": {
            "raw_text": perception.get("raw_text", request["raw_text"]),
            "normalized_text": perception.get("normalized_text", request["raw_text"]),
            "issue_summary": perception.get("issue_summary", ""),
        },
        "context_derived_indicators": {
            "nearby_schools_count": context_indicators.get("nearby_schools_count"),
            "nearby_hospitals_count": context_indicators.get("nearby_hospitals_count"),
            "land_use_density": context_indicators.get("land_use_density"),
            "road_importance_score": context_indicators.get("road_importance_score"),
            "near_sensitive_institution_flag": context_indicators.get("near_sensitive_institution_flag", False),
            "vulnerable_population_flag": context_indicators.get("vulnerable_population_flag", False),
            "area_importance_score": context_indicators.get("area_importance_score"),
            "context_source": context_indicators.get("context_source"),
        },
        "systemic_pattern_metrics": {
            "recurring_issue_flag": duplicate.get("is_duplicate", False),
            "systemic_issue_flag": False,
            "hotspot_cluster_id": duplicate.get("hotspot_cluster_id"),
            "duplicate_report_count": duplicate.get("duplicate_report_count", 0),
        },
        "domain_classification": domain or {
            "primary_domain": "Core Infrastructure & Public Works",
            "sub_domain": "General",
            "issue_type": "unknown",
            "severity_level": domain.get("severity_level", 5),
            "public_safety_flag": domain.get("public_safety_flag", False),
            "confidence": domain.get("confidence", 1.0),
            "perception_reasoning": domain.get("perception_reasoning"),
        },
        "clip_validation": state.get("clip_validation_result"),
        "priority_assessment": priority,
        "governance_and_sla": routing,
        "agent_traceability": {
            "perception_agent": f"BharathCRS-Perception-v3-{request.get('llm_provider', 'gemini')}",
            "context_agent": f"Priority3a-Grid-{context_indicators.get('context_source', 'city_default')}",
            "routing_agent": "Symbolic-Router-PHD-CHN-v1",
            "priority_agent": "RFM+A-Equity-v3",
            "rules_triggered": state.get("rules_triggered", []),
            "decision_explanation": state.get("decision_explanation", ""),
            "manual_override_flag": False,
            "user_trust_score": request.get("user_trust_score", 0.5),
        },
        "needs_human_review": needs_human,
        "error": error,
    }

    await complaints_col().insert_one(complaint_doc)
    await audit_logs_col().insert_one({
        "complaint_id": report_id,
        "agent": "5_agent_pipeline_v3",
        "decision": f"Complaint processed → {status.value} | dept={routing.get('assigned_department', 'N/A')} | priority={priority.get('priority_class', 'N/A')}",
        "rules_triggered": state.get("rules_triggered", []),
        "timestamp": now,
        "manual_override": False,
    })

    return state


# ─── Conditional Edge ─────────────────────────────────────────────────────────

def should_human_review(state: GraphState) -> str:
    if state.get("needs_human_review") or state.get("error"):
        return "human_review"
    return "routing"


# ─── Graph Assembly — 5 Agent Nodes ───────────────────────────────────────────

def build_workflow() -> StateGraph:
    """
    Builds the 5-agent LangGraph pipeline matching the BharathCRS PRD flowchart.

    perception → duplicate → priority → [routing | human_review] → store
    """
    graph = StateGraph(GraphState)

    graph.add_node("perception", perception_node)   # Agent 1
    graph.add_node("clip_validation", clip_validation_node) # Agent 1.5
    graph.add_node("duplicate",  duplicate_node)    # Agent 2
    graph.add_node("priority",   priority_node)     # Agent 3 (includes context + ward)
    graph.add_node("routing",    routing_node)      # Agent 4
    graph.add_node("human_review", human_review_node)
    graph.add_node("store",      store_node)

    graph.add_edge(START, "perception")
    graph.add_edge("perception", "clip_validation")
    graph.add_edge("clip_validation", "duplicate")
    graph.add_edge("duplicate", "priority")

    # Conditional: low confidence or error → human_review, else → routing
    graph.add_conditional_edges(
        "priority",
        should_human_review,
        {"routing": "routing", "human_review": "human_review"},
    )

    graph.add_edge("routing", "store")
    graph.add_edge("human_review", "store")
    graph.add_edge("store", END)

    return graph.compile()


# ─── Entry Point ──────────────────────────────────────────────────────────────

_workflow = None

def get_workflow():
    global _workflow
    if _workflow is None:
        _workflow = build_workflow()
    return _workflow


async def process_complaint(request_data: dict, report_id: str) -> GraphState:
    """
    Main entry point. Called by the FastAPI complaints router.
    Runs the full 5-agent pipeline and returns the final GraphState.
    """
    initial_state: GraphState = {
        "request": request_data,
        "report_id": report_id,
        "perception_output": None,
        "duplicate_result": None,
        "context_indicators": None,
        "domain_classification": None,
        "priority_result": None,
        "routing_result": None,
        "clip_validation_result": None,
        "rules_triggered": [],
        "decision_explanation": "",
        "needs_human_review": False,
        "assigned_department": "GCC General",
        "error": None,
    }
    workflow = get_workflow()
    return await workflow.ainvoke(initial_state)

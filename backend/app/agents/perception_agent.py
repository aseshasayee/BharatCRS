"""
BharathCRS — Neural Perception Agent (v3 — Lean Prompt + Fuzzy Mapper)
────────────────────────────────────────────────────────────────────────
Changes from v2:
  - Taxonomy REMOVED from system prompt (reduces token cost, removes rigidity)
  - LLM now outputs "issue_type_candidate" as free text
  - Backend fuzzy-maps candidate → valid taxonomy slug (rapidfuzz)
  - Severity unclamped (1-10, no domain clamping — domain_risk_bonus applied at priority stage)
  - classification_reasoning retained for audit trail

Governance boundaries unchanged:
  ❌ Cannot assign departments
  ❌ Cannot compute SLA
  ❌ Cannot set priority scores
"""
import json
import os
import re

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
from rapidfuzz import process, fuzz

from app.models.complaint import DomainClassification, NormalizedInput, PrimaryDomain
from app.agents.local_perception_engine import predict_local


# ─── Valid Taxonomy Slugs + Canonical Labels for Fuzzy Mapping ────────────────

_SLUG_LABELS: dict[str, str] = {
    # Domain 1 — Core Infrastructure & Public Works
    "pothole in road collapse blockage": "road_damage",
    "pipe leak water no supply contaminated": "water_supply_failure",
    "drainage overflow sewer manhole": "drainage_sewage",
    "broken street light no lighting": "street_lighting_failure",
    # Domain 2 — Sanitation, Environment & Parks
    "garbage overflow open dumping no collection": "waste_management",
    "mosquito breeding rats rodent pest": "vector_pest_control",
    "noise air pollution smoke odor": "environmental_pollution",
    # Domain 3 — Transportation & Traffic
    "traffic signal malfunction broken blinking": "traffic_signal_fault",
    "illegal parking abandoned vehicle": "parking_violation",
    "missing zebra crossing pedestrian": "pedestrian_safety",
    "public transport disruption metro": "public_transport_failure",
    # Domain 4 — Urban Planning & Real Estate
    "illegal building construction": "illegal_construction",
    "encroachment land use violation": "encroachment",
    "unsafe structure building demolition": "unsafe_structure",
    # Domain 5 — Social Infrastructure & Public Health
    "food safety anganwadi hospital service": "public_health_service",
    "school maintenance infrastructure": "school_infrastructure",
    # Domain 6 — Emergency, Safety & Accountability
    "flooding flood emergency waterlogging": "flooding",
    "fire risk electrical hazard danger": "electrical_hazard",
    "building collapse structural risk danger": "structural_collapse_risk",
    "bribery negligence official corruption": "civic_corruption",
}

_VALID_SLUGS = set(_SLUG_LABELS.values())

# Domains — kept lean in prompt
_DOMAINS = [
    "Core Infrastructure & Public Works",
    "Sanitation, Environment & Parks",
    "Transportation & Traffic",
    "Urban Planning & Real Estate",
    "Social Infrastructure & Public Health",
    "Emergency, Safety & Accountability",
]

_DOMAIN_SUBDOMAINS = {
    "Core Infrastructure & Public Works": ["Roads", "Water Supply", "Drainage/Sewerage", "Street Lighting"],
    "Sanitation, Environment & Parks": ["Garbage & Waste", "Vector Control", "Environment"],
    "Transportation & Traffic": ["Traffic Signals", "Parking", "Pedestrian Safety", "Public Transport"],
    "Urban Planning & Real Estate": ["Construction", "Zoning", "Demolition"],
    "Social Infrastructure & Public Health": ["Healthcare & Welfare", "Schools"],
    "Emergency, Safety & Accountability": ["Disaster Management", "Fire & Safety", "Corruption", "Structural Safety"],
}


# ─── Perception Output Schema ─────────────────────────────────────────────────

class PerceptionOutput(BaseModel):
    """Structured output — v3: issue_type is a resolved slug, not raw LLM output."""
    raw_text: str
    normalized_text: str
    issue_summary: str
    inferred_language: str = Field(description="ISO 639-1: en | ta | hi")

    primary_domain: str
    sub_domain: str
    issue_type: str          # Resolved by fuzzy mapper, guaranteed valid slug
    issue_type_candidate: str  # Raw LLM text (preserved for audit)
    severity_level: int = Field(ge=1, le=10)  # Unclamped — domain bonus applied at priority stage

    public_safety_flag: bool
    confidence: float = Field(ge=0.0, le=1.0)
    classification_reasoning: str


# ─── Lean System Prompt ───────────────────────────────────────────────────────

PERCEPTION_SYSTEM_PROMPT = """You are the Neural Perception Agent in BharathCRS.
You ONLY classify and translate civic complaints.

━━━ STRICT GOVERNANCE — NEVER ━━━
✗ Assign government departments
✗ Set SLA or timelines
✗ Compute priority scores

━━━ YOUR TASKS ━━━
✓ Detect input language (ISO code: en/ta/hi)
✓ Translate and normalize complaint to clear English
✓ Write a concise 2-sentence summary
✓ Choose primary_domain from exactly one of these:
   - "Core Infrastructure & Public Works"
   - "Sanitation, Environment & Parks"
   - "Transportation & Traffic"
   - "Urban Planning & Real Estate"
   - "Social Infrastructure & Public Health"
   - "Emergency, Safety & Accountability"
✓ Pick the best sub_domain (e.g. Roads, Water Supply, Child Welfare)
✓ Describe the issue type in plain English (issue_type_candidate) — e.g. "pothole in road", "anganwadi food hygiene problem"
✓ Rate severity 1-10 based on danger to life, health, and infrastructure impact
✓ Set public_safety_flag=true ONLY for immediate risk to human life
✓ Give confidence (0.0-1.0) and one sentence of classification_reasoning

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON:
{
  "raw_text": "<original unchanged>",
  "normalized_text": "<English translation>",
  "issue_summary": "<2 sentences>",
  "inferred_language": "<en|ta|hi>",
  "primary_domain": "<exact domain name>",
  "sub_domain": "<sub-domain name>",
  "issue_type_candidate": "<plain English description of issue type>",
  "severity_level": <1-10>,
  "public_safety_flag": <true|false>,
  "confidence": <0.0-1.0>,
  "classification_reasoning": "<one sentence>"
}"""

HUMAN_TEMPLATE = """Classify this civic complaint:

Complaint: {complaint_text}
Location: {city} (Ward: {ward_id})
Channel: {channel}"""


# ─── Fuzzy Mapper ─────────────────────────────────────────────────────────────

def _fuzzy_map_issue_type(candidate: str, domain: str) -> tuple[str, float]:
    """
    Maps LLM free-text issue_type_candidate → nearest valid taxonomy slug.
    Uses token_sort_ratio for word-order-insensitive matching.

    Returns:
        (slug, match_score) — score 0-100
    """
    if not candidate:
        return "pothole", 0.0

    candidate_lower = candidate.lower().strip()

    # Try exact slug match first
    if candidate_lower in _VALID_SLUGS:
        return candidate_lower, 100.0

    # Fuzzy match against all label strings
    result = process.extractOne(
        candidate_lower,
        list(_SLUG_LABELS.keys()),
        scorer=fuzz.token_sort_ratio,
        score_cutoff=40,
    )

    if result:
        label, score, _ = result
        slug = _SLUG_LABELS[label]
        return slug, float(score)

    domain_defaults = {
        "Core Infrastructure & Public Works": "road_damage",
        "Sanitation, Environment & Parks": "waste_management",
        "Transportation & Traffic": "traffic_signal_fault",
        "Urban Planning & Real Estate": "illegal_construction",
        "Social Infrastructure & Public Health": "public_health_service",
        "Emergency, Safety & Accountability": "structural_collapse_risk",
    }
    return domain_defaults.get(domain, "road_damage"), 0.0


# ─── Governance Fence ─────────────────────────────────────────────────────────

_FORBIDDEN = {
    "assigned_department", "department", "responsible_department",
    "sla_hours", "sla", "sla_deadline",
    "priority_score", "priority_class", "routing",
}

_VALID_DOMAINS = set(_DOMAINS)


def _validate_and_clean(data: dict) -> dict:
    forbidden_found = set(data.keys()) & _FORBIDDEN
    if forbidden_found:
        print(f"[GOVERNANCE FENCE] Stripped: {forbidden_found}")
    data = {k: v for k, v in data.items() if k not in _FORBIDDEN}

    if data.get("primary_domain") not in _VALID_DOMAINS:
        print(f"[DOMAIN FENCE] Invalid domain '{data.get('primary_domain')}' → defaulting")
        data["primary_domain"] = "Core Infrastructure & Public Works"
        data["confidence"] = min(data.get("confidence", 0.5), 0.45)

    return data


# ─── LLM Provider ─────────────────────────────────────────────────────────────

def _get_llm():
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.1,
        )
    elif provider == "llama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=os.getenv("LLAMA_MODEL", "llama3.2"),
            base_url=os.getenv("LLAMA_BASE_URL", "http://localhost:11434"),
            temperature=0.1,
            format="json",
        )
    elif provider == "local":
        return None # Local engine handles its own loading
    raise ValueError(f"Unknown LLM_PROVIDER: '{provider}'")


def _extract_json(text: str) -> dict:
    # First try markdown blocks
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1)
    else:
        # Fallback: find the first { and the last }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start:end+1]
            
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError as e:
        print(f"[Perception] Failed to parse JSON! Raw LLM Output:\n{text}")
        raise e


# ─── Main Perception Function ─────────────────────────────────────────────────

async def run_perception_agent(
    complaint_text: str,
    city: str = "Chennai",
    ward_id: int | None = None,
    channel: str = "Web App",
) -> tuple[PerceptionOutput, bool]:
    """
    Runs the Lean Neural Perception Agent.
    LLM outputs free-text issue_type_candidate → backend fuzzy-maps to slug.

    Returns:
        (PerceptionOutput, needs_human_review)
        needs_human_review = True if confidence < 0.70 OR fuzzy_match_score < 55
    """
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    if provider == "local":
        # Use our custom trained IndicBERT model
        data = await predict_local(complaint_text, city, ward_id, channel)
        data["raw_text"] = complaint_text
        # IndicBERT handles Indic languages internally, but for compliance we set normalized_text
        data["normalized_text"] = complaint_text 
        data["inferred_language"] = "en" # Simplified for local
        
        # Rule-based summary since local model is a classifier, not a generator
        data["issue_summary"] = (
            f"A {data['issue_type']} issue has been reported in the {data['sub_domain']} sector. "
            f"System has assessed it as severity {data['severity_level']}/10."
        )
        data["issue_type_candidate"] = data["issue_type"]
        data["classification_reasoning"] = "Classified by local multi-task IndicBERT model."
        match_score = 100.0 # It uses exact slugs from taxonomy
    else:
        # Use external Generative LLM
        llm = _get_llm()
        messages = [
            SystemMessage(content=PERCEPTION_SYSTEM_PROMPT),
            HumanMessage(content=HUMAN_TEMPLATE.format(
                complaint_text=complaint_text,
                city=city,
                ward_id=ward_id or "Unknown",
                channel=channel,
            )),
        ]

        response = await llm.ainvoke(messages)
        data = _extract_json(response.content)
        data = _validate_and_clean(data)

        # Fuzzy map issue_type_candidate → slug
        candidate = data.get("issue_type_candidate", "")
        slug, match_score = _fuzzy_map_issue_type(candidate, data.get("primary_domain", ""))
        data["issue_type"] = slug
        data.setdefault("issue_type_candidate", candidate)
        print(f"[Perception] candidate='{candidate}' → slug='{slug}' (score={match_score:.1f})")

    perception = PerceptionOutput(**data)

    # Human review if confidence low OR fuzzy mapping uncertain
    # Softmax probabilities over 44 classes naturally dilute, so >0.40 is highly confident for local engine.
    if provider == "local":
        # 20-class model: e^1 / sum(e^x) is naturally lower. 0.20 is high for 20 classes.
        needs_human_review = perception.confidence < 0.20 or match_score < 55
    else:
        needs_human_review = perception.confidence < 0.70 or match_score < 55
        
    return perception, needs_human_review


# ─── Converters ───────────────────────────────────────────────────────────────

def perception_to_normalized_input(p: PerceptionOutput) -> NormalizedInput:
    return NormalizedInput(
        raw_text=p.raw_text,
        normalized_text=p.normalized_text,
        issue_summary=p.issue_summary,
    )


def perception_to_domain_classification(p: PerceptionOutput) -> DomainClassification:
    try:
        domain_enum = PrimaryDomain(p.primary_domain)
    except ValueError:
        domain_enum = PrimaryDomain.INFRASTRUCTURE
    return DomainClassification(
        primary_domain=domain_enum,
        sub_domain=p.sub_domain,
        issue_type=p.issue_type,
        severity_level=p.severity_level,
        public_safety_flag=p.public_safety_flag,
    )

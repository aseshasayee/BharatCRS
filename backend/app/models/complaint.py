"""
BharathCRS Backend — Pydantic Models
Full BharathCRS Taxonomy v2.0 schema as Pydantic v2 models.
The LLM (Perception Agent) only populates `normalized_input` + `domain_classification`.
All other sections are filled by deterministic Python agents.
"""
from datetime import datetime
from enum import Enum
from typing import Annotated
from pydantic import BaseModel, Field


# ─── Enumerations ─────────────────────────────────────────────────────────────

class SubmissionChannel(str, Enum):
    MOBILE_APP = "Mobile App"
    WEB_APP = "Web App"
    VOICE = "Voice"
    FIELD_WORKER = "Field Worker"


class Language(str, Enum):
    TAMIL = "ta"
    HINDI = "hi"
    ENGLISH = "en"


class ComplaintStatus(str, Enum):
    PENDING = "Pending"
    IN_PROCESS = "In Process"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    SLA_BREACHED = "SLA Breached"
    HUMAN_REVIEW = "Human Review"
    ESCALATED = "ESCALATED"    # Tier-3: citizen-visible public accountability status


class LandUseDensity(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class PrimaryDomain(str, Enum):
    INFRASTRUCTURE = "Core Infrastructure & Public Works"
    SANITATION = "Sanitation, Environment & Parks"
    TRANSPORTATION = "Transportation & Traffic"
    URBAN_PLANNING = "Urban Planning & Real Estate"
    SOCIAL = "Social Infrastructure & Public Health"
    EMERGENCY = "Emergency, Safety & Accountability"


class PriorityClass(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


# ─── Section 1: Common Metadata ───────────────────────────────────────────────

class CommonMetadata(BaseModel):
    report_id: str = Field(description="Unique complaint ID, e.g. bcrs-2026-CHN-009812")
    submission_timestamp: datetime
    submission_channel: SubmissionChannel = SubmissionChannel.WEB_APP
    language: Language = Language.ENGLISH
    status: ComplaintStatus = ComplaintStatus.PENDING
    community_upvotes: int = Field(default=0, ge=0)
    community_comments_count: int = Field(default=0, ge=0)
    is_anonymous_flag: bool = True


# ─── Section 2: Spatio-Temporal Core ──────────────────────────────────────────

class Location(BaseModel):
    latitude: Annotated[float, Field(ge=-90, le=90)]
    longitude: Annotated[float, Field(ge=-180, le=180)]


class AdministrativeUnit(BaseModel):
    ward_id: int | None = None
    zone_id: int | None = None
    city: str = "Chennai"


class SpatioTemporalCore(BaseModel):
    location: Location
    administrative_unit: AdministrativeUnit = Field(default_factory=AdministrativeUnit)


# ─── Section 3: Normalized Input (LLM-filled) ─────────────────────────────────

class NormalizedInput(BaseModel):
    raw_text: str = Field(description="Original citizen input as submitted")
    normalized_text: str = Field(description="English translation/normalization")
    issue_summary: str = Field(description="AI-generated 1-2 sentence summary")


# ─── Section 4: Context-Derived Indicators ────────────────────────────────────

class ContextDerivedIndicators(BaseModel):
    nearby_schools_count: int | None = None
    nearby_hospitals_count: int | None = None
    land_use_density: LandUseDensity | None = None
    road_importance_score: int | None = Field(default=None, ge=1, le=5)
    # Factual proximity (from Context Agent)
    near_sensitive_institution_flag: bool = False
    # Policy judgment (routing agent applies SLA rules on this)
    vulnerable_population_flag: bool = False
    area_importance_score: float | None = Field(default=None, ge=0, le=10)
    context_source: str | None = None


# ─── Section 5: Systemic Pattern Metrics ──────────────────────────────────────

class SystemicPatternMetrics(BaseModel):
    recurring_issue_flag: bool = False
    systemic_issue_flag: bool = False
    hotspot_cluster_id: str | None = None
    duplicate_report_count: int = 0


# ─── Section 6: Domain Classification (LLM-filled) ────────────────────────────

class DomainClassification(BaseModel):
    primary_domain: PrimaryDomain
    sub_domain: str = Field(description="e.g. WaterSupply, Roads, FoodSafety")
    issue_type: str = Field(description="e.g. pipe_leak, pothole, food_safety_risk_flag")
    severity_level: Annotated[int, Field(ge=1, le=10)] = 5
    public_safety_flag: bool = False
    confidence: float = 1.0
    perception_reasoning: str | None = None


# ─── Section 7: Priority Assessment (RFM Agent-filled) ───────────────────────

class RFMMetrics(BaseModel):
    recency: float = Field(ge=0, le=10)
    frequency: float = Field(ge=0, le=10)
    executive_response_mean: float = Field(ge=0, le=10)


class PriorityAssessment(BaseModel):
    rfm_metrics: RFMMetrics
    area_importance_score: float | None = Field(default=None, ge=0, le=10)
    # v3 audit trail fields — stored separately for transparency
    base_score: float | None = Field(default=None, ge=0, le=10,
        description="RFM+A score before domain_risk_bonus is applied")
    domain_risk_bonus: float | None = Field(default=None,
        description="Domain-specific urgency bonus (from MongoDB config)")
    equity_adjustment: float | None = Field(default=None,
        description="How much equity multiplier shifted the area score")
    priority_score: Annotated[float, Field(ge=0, le=10)]
    priority_class: PriorityClass


# ─── Section 8: Governance & SLA (Routing Agent-filled) ───────────────────────

class GovernanceAndSLA(BaseModel):
    responsible_department: str
    assigned_department: str
    sla_category: PriorityClass
    sla_hours: int = Field(description="4 | 12 | 24 | 48 | 72")
    sla_deadline: datetime | None = None
    estimated_resource_intensity: str | None = None  # Low / Medium / High
    jurisdiction_validated: bool = True


# ─── Section 9: Agent Traceability (Audit) ────────────────────────────────────

class AgentTraceability(BaseModel):
    perception_agent: str = "BharathCRS-Perception-v3"
    context_agent: str = ""
    routing_agent: str = "Symbolic-Router-PHD-CHN-v1"
    priority_agent: str = "RFM+A-Equity-v3"
    monitoring_agent: str = "Escalation-v3"
    rules_triggered: list[str] = Field(default_factory=list)
    decision_explanation: str = ""
    manual_override_flag: bool = False


# ─── Full BharathCRS Complaint Document ───────────────────────────────────────

class BharathCRSComplaint(BaseModel):
    """
    The complete BharathCRS JSON document stored in MongoDB.
    Sections 3 and 6 are filled by the Neural Perception Agent.
    All other sections are filled by deterministic Python agents.
    """
    common_metadata: CommonMetadata
    spatio_temporal_core: SpatioTemporalCore
    normalized_input: NormalizedInput
    context_derived_indicators: ContextDerivedIndicators = Field(
        default_factory=ContextDerivedIndicators
    )
    systemic_pattern_metrics: SystemicPatternMetrics = Field(
        default_factory=SystemicPatternMetrics
    )
    domain_classification: DomainClassification
    priority_assessment: PriorityAssessment | None = None
    governance_and_sla: GovernanceAndSLA | None = None
    agent_traceability: AgentTraceability = Field(
        default_factory=AgentTraceability
    )
    needs_human_review: bool = False


# ─── API Request / Response Models ────────────────────────────────────────────

class ComplaintSubmitRequest(BaseModel):
    """What the citizen sends via the frontend form."""
    raw_text: str = Field(min_length=10, description="Complaint description")
    latitude: Annotated[float, Field(ge=8.0, le=14.0)] = Field(
        description="GPS latitude (must be within India)"
    )
    longitude: Annotated[float, Field(ge=76.0, le=85.0)] = Field(
        description="GPS longitude (must be within India)"
    )
    language: Language = Language.ENGLISH
    submission_channel: SubmissionChannel = SubmissionChannel.WEB_APP
    is_anonymous: bool = True
    community_upvotes: int = 0


class ComplaintSubmitResponse(BaseModel):
    """Response sent back to citizen after submission."""
    complaint_id: str
    status: ComplaintStatus
    message: str
    needs_human_review: bool = False


class AdminOverrideRequest(BaseModel):
    """Admin manual override payload."""
    new_department: str
    new_priority_class: PriorityClass
    new_sla_hours: int
    override_reason: str


# ─── Audit Log Entry ──────────────────────────────────────────────────────────

class AuditLogEntry(BaseModel):
    complaint_id: str
    agent: str
    decision: str
    rules_triggered: list[str] = Field(default_factory=list)
    timestamp: datetime
    manual_override: bool = False
    override_by: str | None = None

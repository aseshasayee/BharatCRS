"""
BharathCRS — Routing & SLA Agent (Deterministic Rule Engine)
─────────────────────────────────────────────────────────────
Deterministically assigns government departments and SLA deadlines
based on domain classification + priority class.

All routing is rule-based. NO ML. NO LLM. Fully auditable.

Rule Priority Order:
  1. Safety/Emergency override (always → 4h SLA, Emergency response)
  2. Domain + Sub-domain → Department lookup (from MongoDB config)
  3. Priority class → SLA hours (from MongoDB config)
  4. Vulnerable population flag → bump to High if currently Low/Medium
"""
from datetime import datetime, timedelta, timezone

from app.db.mongodb import config_col
from app.models.complaint import GovernanceAndSLA, PriorityClass


# ─── Department + SLA Lookup ───────────────────────────────────────────────────

async def _load_routing_config() -> dict:
    """Loads the routing rules from MongoDB config collection."""
    doc = await config_col().find_one({"_id": "routing_rules"})
    if not doc:
        raise RuntimeError("[Routing Agent] routing_rules config not found in DB.")
    return doc


def _lookup_department(config: dict, primary_domain: str, sub_domain: str) -> str:
    """
    Looks up the assigned department based on domain + sub-domain.
    Falls back to the domain-level default if sub-domain not found.
    """
    domain_map = config.get("domain_to_department", {})
    sub_map = domain_map.get(primary_domain, {})

    # Try exact sub-domain match first
    dept = sub_map.get(sub_domain)
    if dept:
        return dept

    # Fuzzy fallback: find the first sub-domain that starts with the same prefix
    sub_domain_lower = sub_domain.lower()
    for key, value in sub_map.items():
        if key.lower().replace(" ", "_") in sub_domain_lower or \
           sub_domain_lower in key.lower().replace(" ", "_"):
            return value

    # Final fallback: return first department in domain
    if sub_map:
        return next(iter(sub_map.values()))

    return "GCC General"


# ─── Main Routing Function ─────────────────────────────────────────────────────

async def run_routing_agent(
    primary_domain: str,
    sub_domain: str,
    issue_type: str,
    priority_class: PriorityClass | str,
    public_safety_flag: bool,
    vulnerable_population_flag: bool,
    submission_timestamp: datetime,
) -> tuple[GovernanceAndSLA, list[str], str]:
    """
    Assigns department and SLA deadline using pure rule logic.

    Returns:
        (GovernanceAndSLA, rules_triggered, decision_explanation)
    """
    config = await _load_routing_config()
    rules_triggered: list[str] = []
    explanation_parts: list[str] = []

    if isinstance(priority_class, str):
        try:
            priority_class = PriorityClass(priority_class)
        except ValueError:
            priority_class = PriorityClass.MEDIUM

    # ── Rule 1: Safety / Emergency Override ──────────────────────────────────
    if public_safety_flag:
        department = "Emergency Response Unit"
        sla_hours = config.get("safety_override_sla_hours", 4)
        rules_triggered.append("RULE_SAFETY_OVERRIDE_4H")
        explanation_parts.append(
            "Public safety flag triggered → Emergency override to 4h SLA."
        )
    else:
        # ── Rule 2: Domain + Sub-domain → Department ──────────────────────
        department = _lookup_department(config, primary_domain, sub_domain)
        rules_triggered.append(
            f"RULE_DOMAIN_{primary_domain.upper().replace(' ', '_').replace('&', 'AND')[:20]}"
        )
        explanation_parts.append(
            f"Domain '{primary_domain}' / Sub-domain '{sub_domain}' → {department}."
        )

        # ── Rule 3: Priority class → SLA hours ────────────────────────────
        sla_map = config.get("sla_hours", {"Critical": 12, "High": 24, "Medium": 48, "Low": 72})
        sla_hours = sla_map.get(priority_class.value, 48)
        rules_triggered.append(f"RULE_SLA_{priority_class.value.upper()}")
        explanation_parts.append(
            f"Priority class '{priority_class.value}' → {sla_hours}h SLA."
        )

    # ── Rule 4: Vulnerable population escalation ──────────────────────────
    if vulnerable_population_flag and priority_class in (PriorityClass.LOW, PriorityClass.MEDIUM):
        sla_hours = min(sla_hours, 24)   # Escalate to at most 24h
        rules_triggered.append("RULE_VULNERABLE_POPULATION_ESCALATION")
        explanation_parts.append(
            "Vulnerable population flag → SLA escalated to 24h maximum."
        )

    # ── Rule 5: Dynamic SLA adjustment based on historical breaches ───────
    from app.db.mongodb import department_metrics_col
    dept_metrics = await department_metrics_col().find_one({"department_id": department})
    if dept_metrics:
        compliance_rate = dept_metrics.get("sla_compliance_rate", 1.0)
        if compliance_rate < 0.80:
            # Department is struggling -> tighten SLA by 25% to force faster escalation
            sla_hours = int(sla_hours * 0.75)
            rules_triggered.append("RULE_DYNAMIC_SLA_TIGHTENING")
            explanation_parts.append(
                f"Dept compliance ({compliance_rate*100:.0f}%) < 80% → SLA tightened to {sla_hours}h to force faster escalation."
            )

    # ── Compute SLA Deadline ──────────────────────────────────────────────
    if submission_timestamp.tzinfo is None:
        submission_timestamp = submission_timestamp.replace(tzinfo=timezone.utc)

    sla_deadline = submission_timestamp + timedelta(hours=sla_hours)

    # ── Resource Intensity Estimate ───────────────────────────────────────
    if priority_class == PriorityClass.CRITICAL:
        resource_intensity = "High"
    elif priority_class == PriorityClass.HIGH:
        resource_intensity = "Medium"
    else:
        resource_intensity = "Low"

    governance = GovernanceAndSLA(
        responsible_department=department,
        assigned_department=department,
        sla_category=priority_class,
        sla_hours=sla_hours,
        sla_deadline=sla_deadline,
        estimated_resource_intensity=resource_intensity,
        jurisdiction_validated=True,
    )

    decision_explanation = " ".join(explanation_parts)
    return governance, rules_triggered, decision_explanation

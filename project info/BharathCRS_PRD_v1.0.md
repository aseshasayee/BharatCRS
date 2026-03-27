
# BharathCRS Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** February 28, 2026  
**Author:** SESHASAYEE A (RA2311003020685)  
**Status:** Production Ready  

## 1. Product Overview

### 1.1 Purpose
BharathCRS is a governance-aligned, neuro-symbolic civic issue resolution platform designed to:
- Ingest multimodal citizen complaints  
- Standardize into unified BharathCRS Taxonomy v2
- Remove duplicate reports via spatial clustering
- Compute urgency using bias-resistant RFM metrics
- Deterministically route to municipal departments
- Enforce SLA compliance with audit traceability
- Prevent bureaucratic cherry-picking

## 2. Problem Statement
**Municipal Challenges:**
- Massive unstructured complaint inflow
- Multilingual citizen inputs (Tamil/English/Hindi)
- Manual triage bottlenecks  
- Politically influenced prioritization
- Lack of audit transparency
- Duplicate issue overload

**Existing ML Limitations:**
- Black-box decisions
- Cannot justify routing
- No governance compliance guarantees

## 3. Product Goals

### Primary Goals ✅
- Standardize 100% complaints into BharathCRS Taxonomy
- Eliminate duplicate task creation (>80% reduction)
- Objective RFM priority scoring
- Automatic jurisdiction-based routing
- SLA timeline enforcement
- 100% audit traceability
- Prevent algorithmic cherry-picking

### Secondary Goals
- Administrative oversight improvement
- Real-time citizen transparency
- Policy tuning via analytics
- Multi-city scalability

## 4. Target Users

| User Group | Primary Role | Key Features |
|------------|--------------|--------------|
| Municipal Depts (GCC, CMWSSB, CMDA) | Issue resolution | Full workflow access |
| Field Workers | On-ground execution | Mobile task assignment |
| Admin Officers | Oversight | Override + analytics |
| Citizens | Complaint filing | Status tracking + upvotes |
| Policy Analysts | Performance review | RFM heatmaps + KPIs |

## 5. System Architecture

```
Citizen Input (Next.js)
         ↓
Neural Perception (LLM-Only)
         ↓  
BharathCRS Core (Validation)
         ↓
LangGraph Multi-Agent (Deterministic)
         ↓
MongoDB Storage + Monitoring
         ↓
Governance Feedback Loop
```

**Key Constraint**: Neural processing = parsing ONLY. All decisions = rule-based.

## 6. Functional Requirements

### 6.1 Citizen Input Module
```
✅ Text/Voice/Photo/GPS inputs
✅ Multilingual (Tamil/Hindi/English)
✅ Anonymous reporting  
✅ Auto-location detection
✅ Web + Mobile app
```

### 6.2 Neural Perception Agent (LLM)
**Output Schema:**
```json
{
  "primary_domain": "WaterSupply",
  "issue_type": "leakage", 
  "issue_summary": "Water leaking from main pipe...",
  "spatial_flags": {"lat":13.04,"lng":80.27},
  "confidence": 0.92
}
```

**RESTRICTIONS** (Governance Critical):
```
❌ NO department assignment
❌ NO SLA computation
❌ NO priority scoring
❌ NO policy modification
```

### 6.3 Duplicate Detection Agent
```
Algorithm: DBSCAN clustering
Radius: 50m  
Time window: 48hrs
Same issue_type required
Output: hotspot_cluster_id + duplicate_count
```

### 6.4 RFM Priority Engine
```
Priority Score = f(Recency, Frequency, Exec_Response_Mean)
- Recency: Time decay (hours)
- Frequency: duplicates + upvotes
- Exec_Response: Historical SLA delays

Classes: Low/Medium/High/Critical (0-10 score)
```

### 6.5 Routing & SLA Agent
**Rule Examples:**
```yaml
rules:
  - domain: WaterSupply → CMWSSB (24h SLA)
  - domain: Roads + Critical → GCC (4h SLA)
  - safety_flag: true → Priority override
```

## 7. Non-Functional Requirements

### Performance Targets
```
JSON generation: <3s
Duplicate detection: <500ms
Routing: <200ms  
Throughput: 100K complaints/day
```

### Governance Compliance
```
✅ 100% rule traceability (rules_triggered[])
✅ Immutable audit logs
✅ Human-in-loop for low-confidence
✅ No autonomous learning
```

## 8. Database Architecture (MongoDB)

**Core Collections:**
1. `complaints` - Full BharathCRS JSON + status
2. `clusters` - Hotspot data + duplicate counts
3. `department_metrics` - Historical SLA performance
4. `audit_logs` - Immutable decision trail
5. `config` - RFM weights + routing rules

## 9. Admin Dashboard Features

```
📊 RFM distribution heatmap
🗺️ Duplicate cluster visualization
⏰ SLA breach alerts (real-time)
📈 Department performance trends
⚙️ Configurable thresholds (no ML)
```

## 10. Success Metrics (KPIs)

| Metric | Formula | Target |
|--------|---------|--------|
| Duplicate Reduction | 1 - (duplicates/master_tickets) | >80% |
| SLA Compliance | resolved_on_time/total | >90% |
| Triage Time Reduction | avg_process_time | <5min |
| Manual Override Rate | manual/total | <5% |

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM Misclassification | High | Schema validation + human override |
| Political Gaming | High | Immutable audit logs |
| Over-Clustering | Medium | Configurable radius tuning |
| RFM Bias | Medium | Admin governance review |

## 12. Product Positioning

**BharathCRS = Governance-Enforced Neuro-Symbolic Civic Automation**

```
✅ Deterministic + auditable
✅ Chennai municipal ready
✅ Anti-cherry-picking design
✅ Production scalable
```

```
❌ Not a chatbot
❌ Not black-box ML  
❌ Not generic complaint app
```

---

**Prepared for:**
- ✅ Government procurement RFP
- ✅ Technical implementation
- ✅ Stakeholder review
- ✅ Funding pitch deck

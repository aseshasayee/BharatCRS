
# BharathCRS Technical Architecture Specification

## Document Control
**Version:** 1.0  
**Date:** February 28, 2026  
**Author:** SESHASAYEE A (RA2311003020685)  
**Status:** Production Ready  

## Executive Summary
BharathCRS implements a governance-constrained neuro-symbolic civic complaint resolution system using:
- **Frontend:** Next.js  
- **Backend:** FastAPI  
- **Agent Orchestration:** LangGraph + LangChain  
- **Database:** MongoDB  
- **LLM Options:** Gemini / Llama (configurable)  

The architecture enforces deterministic routing, auditability, and prevents bureaucratic cherry-picking through explicit neuro-symbolic boundaries.

## System Architecture Overview

[Include architecture diagram here: diagram-export-25-2-2026-9_04_02-pm.jpg]

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js | Citizen interface, admin dashboard |
| Backend API | FastAPI | API gateway, validation, auth |
| Agent Orchestration | LangGraph | Deterministic multi-agent workflow |
| LLM Interface | LangChain | Neural perception abstraction |
| LLM Models | Gemini / Llama | Structured JSON generation only |
| Database | MongoDB | Complaint storage, metrics, audit logs |
| Duplicate Detection | Python + DBSCAN | Spatial-temporal clustering |
| Priority Engine | Python RFM | Bias-resistant scoring |

## Agent Architecture (LangGraph)

### Execution Graph
```
START
  ↓
Neural Perception Agent (LLM)
  ↓
Schema Validation (Python)
  ↓
Duplicate Detection Agent (Python)
  ↓
Priority Assessment Agent (RFM Python)
  ↓
Routing & SLA Agent (Rules Python)
  ↓ [Conditional]
Monitoring Agent / Human Override
  ↓
END (MongoDB Storage)
```

### Agent Specifications

#### Agent 1: Neural Perception & Normalization
**Type:** LLM Node  
**Input:** Multimodal complaint (text/voice/photo/GPS)  
**Output:** BharathCRS JSON with:  
```
{
  "primary_domain": "WaterSupply",
  "issue_type": "leakage",
  "issue_summary": "...", 
  "spatial_flags": {...},
  "confidence": 0.92
}
```
**Restrictions:** Cannot assign departments/SLA/priority  

#### Agent 2: Duplicate Detection
**Type:** Deterministic Python  
**Logic:** DBSCAN clustering (50m radius, 48hr window)  
**Output:** `hotspot_cluster_id`, `duplicate_report_count`  

#### Agent 3: Priority Assessment (RFM Engine)
**Formula:** `Priority = f(Recency, Frequency, Executive_Response_Mean)`  
**Output:** `priority_score` (0-10), `priority_class` (Low/Medium/High/Critical)  

#### Agent 4: Routing & SLA Assignment
**Type:** Rule Engine (YAML/Python config)  
**Rules Example:**
```yaml
- if: primary_domain == "WaterSupply"
  then: department = "CMWSSB"
- if: priority_class == "Critical" and safety_flag == true
  then: sla_hours = 4
```

#### Agent 5: Monitoring & Reporting
**Type:** Scheduled Worker  
**Responsibilities:** SLA breach detection, escalation, analytics  

## Database Schema (MongoDB Collections)

### 1. complaints
```json
{
  "_id": ObjectId,
  "citizen_id": "anon_xxx",
  "timestamp": ISODate,
  "bharathcrs_json": {...},
  "hotspot_cluster_id": "cluster_123",
  "priority_score": 8.2,
  "assigned_department": "CMWSSB",
  "sla_hours": 24,
  "status": "open|in_progress|resolved",
  "rules_triggered": ["rule_water_1", "rule_priority_high"],
  "agent_versions": {...}
}
```

### 2. clusters
```json
{
  "hotspot_cluster_id": "cluster_123",
  "duplicate_report_count": 15,
  "geo_center": {"lat": 13.04, "lng": 80.27},
  "issue_type": "WaterSupply"
}
```

### 3. audit_logs (Immutable)
```json
{
  "complaint_id": ObjectId,
  "agent": "routing_agent",
  "decision": "CMWSSB assigned",
  "timestamp": ISODate,
  "manual_override": false
}
```

## Data Flow (Production Example)

```
1. Next.js → FastAPI (POST /complaints)
2. FastAPI validates → LangGraph.invoke()
3. Neural Agent → JSON extraction
4. Python nodes → Priority/Routing
5. MongoDB.store() → Response to citizen
6. Monitoring Agent schedules SLA check
```

## Governance & Compliance Features

1. **100% Rule Traceability** - `rules_triggered[]` logged
2. **Neuro-Symbolic Boundary** - LLM only for perception
3. **Human-in-Loop** - Low confidence → Admin queue
4. **Configurable Rules** - YAML/Mongo, no auto-learning
5. **Audit Immutability** - Append-only logs

## Deployment Considerations

```
Production Stack:
- FastAPI: Uvicorn + Gunicorn
- MongoDB: Replica set (3 nodes)
- Next.js: Vercel/Netlify OR Docker
- LangGraph: In-memory OR Redis state
- LLM: Gemini API OR Llama (GPU server)
```

## Success Metrics Implementation

| KPI | MongoDB Query | Target |
|-----|---------------|--------|
| Duplicate Reduction | `$group by cluster_id` | >80% |
| SLA Compliance | `$match: resolved < sla_hours` | >90% |
| Triage Time | `avg(process_time)` | <5min |
| Manual Override Rate | `count(manual_override=true)` | <5% |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM Hallucination | Schema validation + confidence threshold |
| Rule Gaming | Immutable audit logs + admin review |
| Scalability | Horizontal MongoDB + async FastAPI |
| LLM Vendor Lock | LangChain abstraction (Gemini/Llama) |

**Next Steps:**
1. Prototype LangGraph workflow
2. Implement RFM engine
3. MongoDB schema migration
4. Next.js complaint form
5. Chennai department mapping

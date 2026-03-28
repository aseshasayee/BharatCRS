import pandas as pd
import sys
import os

# 1. Load config arrays manually to be safe
PRIMARY_DOMAIN_LABELS = set([
    "Core Infrastructure & Public Works",
    "Emergency, Safety & Accountability",
    "Sanitation, Environment & Parks",
    "Social Infrastructure & Public Health",
    "Transportation & Traffic",
    "Urban Planning & Real Estate",
])

ISSUE_TYPE_LABELS = set([
    "civic_corruption", "drainage_sewage", "electrical_hazard", "encroachment",
    "environmental_pollution", "flooding", "illegal_construction", "parking_violation",
    "pedestrian_safety", "public_health_service", "public_transport_failure", "road_damage",
    "school_infrastructure", "street_lighting_failure", "structural_collapse_risk",
    "traffic_signal_fault", "unsafe_structure", "vector_pest_control", "waste_management",
    "water_supply_failure"
])

# 2. Load dataset
csv_path = r"c:\Users\asesh\OneDrive\Desktop\projects\civic issue reporting\implementation\ml\bharatcrs_v6.csv"
if not os.path.exists(csv_path):
    print(f"ERROR: Dataset not found at {csv_path}")
    sys.exit(1)

df = pd.read_csv(csv_path)

# Verify required columns
required_cols = ["primary_domain", "issue_type"]
for col in required_cols:
    if col not in df.columns:
        print(f"ERROR: Expected column '{col}' missing from dataset.")

# Verify primary_domain
csv_domains = set(df["primary_domain"].dropna().unique())
extra_domains = csv_domains - PRIMARY_DOMAIN_LABELS
missing_domains = PRIMARY_DOMAIN_LABELS - csv_domains

print("--- PRIMARY DOMAIN VALIDATION ---")
if extra_domains:
    print(f"❌ FOUND EXTRA DOMAINS IN CSV NOT IN CONFIG: {extra_domains}")
if missing_domains:
    print(f"⚠️ CONFIG DOMAINS NEVER SEEN IN CSV: {missing_domains}")
if not extra_domains and not missing_domains:
    print("✅ Primary Domains perfectly match!")
    
# Verify issue_type
csv_issues = set(df["issue_type"].dropna().unique())
extra_issues = csv_issues - ISSUE_TYPE_LABELS
missing_issues = ISSUE_TYPE_LABELS - csv_issues

print("\n--- ISSUE TYPE VALIDATION ---")
if extra_issues:
    print(f"❌ FOUND EXTRA ISSUE TYPES IN CSV NOT IN CONFIG:")
    for e in sorted(list(extra_issues)):
        print(f"  - {e}")
if missing_issues:
    print(f"⚠️ CONFIG ISSUE TYPES NEVER SEEN IN CSV:")
    for m in sorted(list(missing_issues)):
        print(f"  - {m}")
if not extra_issues and not missing_issues:
    print("✅ Issue Types perfectly match!")

print(f"\nTotal rows in v6 dataset: {len(df)}")

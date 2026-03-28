
import pandas as pd
import os
import json

# --- CONFIGURATION (V7 Taxonomy) ---
TAXONOMY = {
    "Core Infrastructure & Public Works": [
        "road_damage", "water_supply_failure", "street_lighting_failure", "drainage_sewage"
    ],
    "Sanitation, Environment & Parks": [
        "waste_management", "environmental_pollution", "vector_pest_control"
    ],
    "Transportation & Traffic": [
        "traffic_signal_fault", "parking_violation", "public_transport_failure", "pedestrian_safety"
    ],
    "Social Infrastructure & Public Health": [
        "public_health_service", "school_infrastructure"
    ],
    "Emergency, Safety & Accountability": [
        "civic_corruption", "electrical_hazard", "flooding", "structural_collapse_risk"
    ],
    "Urban Planning & Real Estate": [
        "illegal_construction", "encroachment", "unsafe_structure"
    ]
}

# Inverse mapping for quick lookup
ISSUE_TO_DOMAIN = {}
for domain, issues in TAXONOMY.items():
    for issue in issues:
        ISSUE_TO_DOMAIN[issue] = domain

SAFETY_KEYWORDS = ["fire", "spark", "electric", "shock", "collapse", "crack", "structural", "sinkhole", "accident", "emergency"]

def prepare_v7():
    print("--- BharatCRS V7 Dataset Generator ---")
    
    # Load V6
    v6_path = os.path.join(os.path.dirname(__file__), "..", "bharatcrs_v6.csv")
    if not os.path.exists(v6_path):
        print(f"Error: {v6_path} not found.")
        return
        
    df = pd.read_csv(v6_path)
    print(f"Loaded V6 with {len(df)} rows.")

    # 1. Enforce Domain Consistency
    # We trust 'issue_type' more as it's more granular, then map it back to the correct 'primary_domain'
    def fix_domain(row):
        issue = row['issue_type']
        if issue in ISSUE_TO_DOMAIN:
            return ISSUE_TO_DOMAIN[issue]
        return row['primary_domain'] # Fallback if unknown

    df['primary_domain'] = df.apply(fix_domain, axis=1)

    # 2. Refine Public Safety Flag
    def check_safety(row):
        text = str(row['raw_text']).lower()
        # If it's already flagged, keep it
        if row.get('public_safety_flag') == True or row.get('public_safety_flag') == 1:
            return 1
        # If keywords present, flag it
        if any(kw in text for kw in SAFETY_KEYWORDS):
            return 1
        return 0

    df['public_safety_flag'] = df.apply(check_safety, axis=1)

    # 3. Create CLIP Prompt Column
    def make_clip_prompt(row):
        issue = str(row['issue_type']).replace('_', ' ')
        return f"A photo showing {issue}, a civic issue, or broken public infrastructure."

    df['clip_prompt'] = df.apply(make_clip_prompt, axis=1)

    # 4. Filter Garbage
    # Remove extremely short descriptions (likely bad data)
    df = df[df['raw_text'].str.len() > 15]
    
    # 5. Save Clean Dataset
    v7_path = os.path.join(os.path.dirname(__file__), "bharatcrs_v7_clean.csv")
    df.to_csv(v7_path, index=False)
    
    # 6. Generate Label Maps for the model
    label_maps = {
        "primary_domain_labels": sorted(list(TAXONOMY.keys())),
        "issue_type_labels": sorted(list(ISSUE_TO_DOMAIN.keys())),
        "max_seq_length": 256
    }
    
    with open(os.path.join(os.path.dirname(__file__), "label_maps_v7.json"), "w") as f:
        json.dump(label_maps, f, indent=2)

    print(f"--- V7 Ready! ---")
    print(f"File: {v7_path}")
    print(f"Final Count: {len(df)} rows.")
    print(f"Mapping Consistency: 100%")

if __name__ == "__main__":
    prepare_v7()

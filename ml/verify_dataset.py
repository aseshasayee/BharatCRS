import pandas as pd
import os

df_path = r"c:\Users\asesh\OneDrive\Desktop\projects\civic issue reporting\implementation\ml\bharatcrs_v4_balanced.csv"

# Current config labels (copy-pasted from config.py for comparison)
PRIMARY_DOMAIN_LABELS = [
    "Core Infrastructure & Public Works",
    "Emergency, Safety & Accountability",
    "Sanitation, Environment & Parks",
    "Social Infrastructure & Public Health",
    "Transportation & Traffic",
    "Urban Planning & Real Estate",
]

SUB_DOMAIN_LABELS = [
    "Construction", "Corruption", "Demolition", "Drainage/Sewerage", "Emergency",
    "Environment", "Food Safety", "Garbage", "Healthcare", "Child Welfare",
    "Parking", "Parks", "Pedestrian Safety", "Public Transport", "Roads",
    "Safety", "Schools", "Sewage", "Street Lighting", "Traffic Signals",
    "Vector Control", "Water Supply", "Zoning",
]

ISSUE_TYPE_LABELS = [
    "abandoned_vehicle", "air_pollution", "anganwadi_issue", "blinking", "blockage",
    "bribery", "broken_light", "broken_playground", "bus_stop_damage", "collapse",
    "contaminated_water", "encroachment", "failed", "fire_risk", "flooding",
    "food_safety_risk_flag", "hospital_service_failure", "illegal_building",
    "illegal_parking", "land_use_violation", "signal_malfunction", "transport_disruption", 
    "manhole_overflow", "metro_issue", "missing_zebra_crossing", "mosquito_breeding", 
    "negligence", "no_collection", "no_lighting", "no_water", "noise_pollution", 
    "odor", "open_dumping", "open_sewage", "overflow", "pipe_leak", "poor_maintenance",
    "pothole", "road_blockage", "road_collapse", "rodent_infestation",
    "school_maintenance", "sewer_collapse", "structural_hazard", "unsafe_structure",
]

if os.path.exists(df_path):
    df = pd.read_csv(df_path)
    
    print("\n--- DATASET VERIFICATION ---")
    
    def check_labels(col_name, expected_list):
        actual = set(df[col_name].dropna().unique())
        expected = set(expected_list)
        
        missing = actual - expected
        unused = expected - actual
        
        print(f"\n{col_name}:")
        if missing:
            print(f"  ❌ MISSING in config: {missing}")
        else:
            print("  ✅ All dataset labels are in config!")
            
        if unused:
            print(f"  ⚠️  UNUSED in dataset: {unused}")

    check_labels("primary_domain", PRIMARY_DOMAIN_LABELS)
    check_labels("sub_domain", SUB_DOMAIN_LABELS)
    check_labels("issue_type", ISSUE_TYPE_LABELS)
    
    # Save results to file to read if stdout is weird
    with open('verification_results.txt', 'w') as f:
        f.write(f"Missing Domain: {set(df['primary_domain'].unique()) - set(PRIMARY_DOMAIN_LABELS)}\n")
        f.write(f"Missing Subdomain: {set(df['sub_domain'].unique()) - set(SUB_DOMAIN_LABELS)}\n")
        f.write(f"Missing Issue: {set(df['issue_type'].unique()) - set(ISSUE_TYPE_LABELS)}\n")

else:
    print("Dataset not found at path.")

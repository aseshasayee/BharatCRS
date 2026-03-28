
import asyncio
import os
import sys
import json
import pandas as pd
from datetime import datetime

# Add redundant paths to ensure imports work
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
from app.agents.local_perception_engine import predict_local

TEST_CASES = [
    # --- Core Infrastructure & Public Works ---
    {"text": "Huge pothole in front of my house in Adyar, nearly caused a crash.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "road_damage"},
    {"text": "Road has completely collapsed near the metro station after the rain.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "road_damage"},
    {"text": "The pavement is broken and stones are coming out, very dangerous for walkers.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "road_damage"},
    {"text": "Water pipeline burst near the main junction, road is flooded with fresh water.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "water_supply_failure"},
    {"text": "No water supply for last 3 days in my apartment, please check the main valve.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "water_supply_failure"},
    {"text": "Storm drain is clogged with plastic, road is flooding every time it rains.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "drainage_sewage"},
    {"text": "Sewage leaking from manhole in T. Nagar, smell is unbearable.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "drainage_sewage"},
    {"text": "Street lights not working near the park, it's pitch black at night.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "street_lighting_failure"},
    {"text": "The lamp post is leaning dangerously and looks like it will fall on the road.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "street_lighting_failure"},
    {"text": "Public well in our area is being used for garbage dumping, water is contaminated.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "water_supply_failure"},
    {"text": "Road repair work started but left unfinished for 2 weeks, big dust problem.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "road_damage"},
    {"text": "Manhole cover is missing on a busy street, serious accident risk.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "drainage_sewage"},
    {"text": "Underground cable work has left the road very bumpy and unusable.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "road_damage"},
    {"text": "Drinking water smells like drainage, possible pipe mix-up underground.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "water_supply_failure"},
    {"text": "Footpath was dug up for cables but never covered back, senior citizens falling.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "road_damage"},

    # --- Sanitation, Environment & Parks ---
    {"text": "Garbage bin in our street is overflowing and hasn't been cleared in a week.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "waste_management"},
    {"text": "Someone is burning plastic in the open plot at night, air is toxic.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "environmental_pollution"},
    {"text": "Dead animal on the road near the market, needs immediate removal for hygiene.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "waste_management"},
    {"text": "Mosquito problem is out of control, no fogging done in our area this month.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "vector_pest_control"},
    {"text": "Public park benches are broken and the lawn is completely overgrown.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "environmental_pollution"},
    {"text": "Industrial waste being dumped into the local pond illegally.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "environmental_pollution"},
    {"text": "Public toilet is extremely dirty and has no water or lights.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "waste_management"},
    {"text": "Dustbins are missing in the busy market area, people throwing trash on road.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "waste_management"},
    {"text": "Illegal tree cutting happening in the colony park without permission.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "environmental_pollution"},
    {"text": "Severe smell coming from the nearby chemical factory exhausts.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "environmental_pollution"},
    {"text": "Rainwater harvesting pit in current colony is filled with mud, not working.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "environmental_pollution"},
    {"text": "Garbage truck spills half the waste on the road while driving away.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "waste_management"},
    {"text": "Construction debris dumped on the road side, blocking half the lane.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "waste_management"},
    {"text": "Rats everywhere in the street due to food waste from nearby shops.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "vector_pest_control"},
    {"text": "High noise levels from the construction site after 10 PM.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "environmental_pollution"},

    # --- Transportation & Traffic ---
    {"text": "The traffic signal at the main junction is blinking orange for 2 days.", "expected_domain": "Transportation & Traffic", "expected_issue": "traffic_signal_fault"},
    {"text": "Heavy trucks are parked in the narrow residential lane, blocking traffic.", "expected_domain": "Transportation & Traffic", "expected_issue": "parking_violation"},
    {"text": "Buses are not stopping at the designated bus stop near the hospital.", "expected_domain": "Transportation & Traffic", "expected_issue": "public_transport_failure"},
    {"text": "Auto rickshaws are overcharging and not using the meter in our area.", "expected_domain": "Transportation & Traffic", "expected_issue": "public_transport_failure"},
    {"text": "Zebra crossing has faded, very risky for children to cross the road.", "expected_domain": "Transportation & Traffic", "expected_issue": "pedestrian_safety"},
    {"text": "Cars are parked on the footpath, forcing us to walk on the busy road.", "expected_domain": "Transportation & Traffic", "expected_issue": "parking_violation"},
    {"text": "Bus stand roof is missing, people getting wet in the rain while waiting.", "expected_domain": "Transportation & Traffic", "expected_issue": "public_transport_failure"},
    {"text": "Severe traffic jam every evening due to illegal roadside shops.", "expected_domain": "Transportation & Traffic", "expected_issue": "traffic_signal_fault"},
    {"text": "Traffic light timer is too short, only 3 cars can pass at a time.", "expected_domain": "Transportation & Traffic", "expected_issue": "traffic_signal_fault"},
    {"text": "No signboards near the one-way street, causing confusion and fines.", "expected_domain": "Transportation & Traffic", "expected_issue": "traffic_signal_fault"},
    {"text": "Metro construction work has blocked the service road completely.", "expected_domain": "Transportation & Traffic", "expected_issue": "road_damage"},
    {"text": "Wrong side driving is rampant on this road, no police check.", "expected_domain": "Transportation & Traffic", "expected_issue": "pedestrian_safety"},
    {"text": "Road divider is broken and cars are taking illegal U-turns.", "expected_domain": "Transportation & Traffic", "expected_issue": "traffic_signal_fault"},
    {"text": "Bridge expansion joints are too wide, two-wheelers getting stuck.", "expected_domain": "Transportation & Traffic", "expected_issue": "road_damage"},
    {"text": "Street vendors have taken over the entire entrance of the railway station.", "expected_domain": "Transportation & Traffic", "expected_issue": "pedestrian_safety"},

    # --- Social Infrastructure & Public Health ---
    {"text": "Primary health center is closed during working hours, no doctor available.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "Government school roof is leaking and classrooms are flooded.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "school_infrastructure"},
    {"text": "No essential medicines available in the local dispensary for a month.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "School toilets are in a pathetic condition, kids are falling sick.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "school_infrastructure"},
    {"text": "Anganwadi center building has developed huge cracks on the walls.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "Lack of cleaning staff in the government hospital, toilets are filthy.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "The school compound wall is about to collapse, dangerous for students.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "school_infrastructure"},
    {"text": "Public library is closed for months without any explanation.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "No benches or chairs in the hospital waiting area for the elderly.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "Poor quality food being served in the government school mid-day meal.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "school_infrastructure"},
    {"text": "Community hall in our ward is being used as a private godown illegally.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "Lack of vaccine stock in the PHC for infant immunization.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "Government office lift is not working for 6 months, disabled people struggling.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "Stray dog menace near the school, multiple children bitten.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},
    {"text": "Public park playground equipment is broken and rusty.", "expected_domain": "Social Infrastructure & Public Health", "expected_issue": "public_health_service"},

    # --- Emergency, Safety & Accountability ---
    {"text": "Transformer is sparking near the school gate, looks very scary.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "electrical_hazard"},
    {"text": "The ward officer is asking for a bribe to issue my birth certificate.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "civic_corruption"},
    {"text": "Live electric wire is hanging low after the tree fell on it.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "electrical_hazard"},
    {"text": "Building materials are being stored illegally on the public road.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "civic_corruption"},
    {"text": "No fire safety equipment in the crowded market building.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "electrical_hazard"},
    {"text": "The bridge over the river shows structural cracks after years of neglect.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "structural_collapse_risk"},
    {"text": "Open electrical box on the pavement, kids could get electrocuted.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "electrical_hazard"},
    {"text": "Corruption in the local road work, poor materials being used.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "civic_corruption"},
    {"text": "A deep sinkhole has appeared in the middle of our street.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "structural_collapse_risk"},
    {"text": "The building next door is leaning too much and might collapse.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "structural_collapse_risk"},
    {"text": "Gas cylinder leakage in the apartment basement, please send help.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "electrical_hazard"},
    {"text": "Heavy waterlogging inside homes due to improper storm drain design.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "flooding"},
    {"text": "Electric pole is about to fall, cable reaching the ground.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "electrical_hazard"},
    {"text": "Short circuit in the apartment main board, entire building has no power.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "electrical_hazard"},
    {"text": "Municipal officials ignoring repeated complaints about illegal shops.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "civic_corruption"},

    # --- Urban Planning & Real Estate ---
    {"text": "New building construction is exceeding the permitted floor limit.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "illegal_construction"},
    {"text": "A restaurant has encroached the entire footpath for seating.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "encroachment"},
    {"text": "Old building without any safety measures being demolished in a rush.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "unsafe_structure"},
    {"text": "Zoning violation: Factory running in a purely residential area.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "illegal_construction"},
    {"text": "Shopping complex being built without leaving any parking space.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "illegal_construction"},
    {"text": "Public land is being fenced off by a private builder illegally.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "encroachment"},
    {"text": "High-rise building being constructed too close to the shoreline.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "illegal_construction"},
    {"text": "Balcony of the old building fell down on the road today morning.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "unsafe_structure"},
    {"text": "Temporary sheds built on the pavement by workers, blocking the way.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "encroachment"},
    {"text": "Illegal hoardings installed on the main road distract drivers.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "encroachment"},
    {"text": "The building plan was approved ignoring the narrow road requirements.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "illegal_construction"},
    {"text": "Basement commercial conversion in residential zone without permit.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "illegal_construction"},
    {"text": "Rainwater canal being filled with mud to build a private road.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "encroachment"},
    {"text": "Dangerous hoarding leaning over the road, could fall on cars.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "unsafe_structure"},
    {"text": "Unauthorized parking lot charging people for free municipal space.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "encroachment"},

    # --- Mixed / Tricky Cases ---
    {"text": "The hospital entrance is flooded after rain, ambulance can't enter.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "flooding"},
    {"text": "Live wire dropped into the flood water in our street.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "electrical_hazard"},
    {"text": "Garbage fire producing toxic smoke near the baby care center.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "electrical_hazard"},
    {"text": "The road bridge across the drain has collapsed, traffic blocked.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "road_damage"},
    {"text": "Illegal parking has blocked the fire engine access to our colony.", "expected_domain": "Transportation & Traffic", "expected_issue": "parking_violation"},
    {"text": "Severe leakage in the overhead water tank, building wall is damp.", "expected_domain": "Core Infrastructure & Public Works", "expected_issue": "water_supply_failure"},
    {"text": "Children playing near the open drainage manhole, very scared.", "expected_domain": "Emergency, Safety & Accountability", "expected_issue": "drainage_sewage"},
    {"text": "Unsafe structure near the primary school is becoming a den for crimes.", "expected_domain": "Urban Planning & Real Estate", "expected_issue": "unsafe_structure"},
    {"text": "Broken glass all over the road from last night's accident.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "waste_management"},
    {"text": "The city bus is emitting black smoke, heavy air pollution.", "expected_domain": "Sanitation, Environment & Parks", "expected_issue": "environmental_pollution"}
]

async def run_audit():
    print("\n" + "═"*60)
    print("      BharathCRS Local Perception Engine Audit Report (V7-PRE)")
    print("═"*60)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Test Count: {len(TEST_CASES)}")
    print("-" * 60)

    results = []
    correct_domain = 0
    correct_issue = 0

    for i, case in enumerate(TEST_CASES):
        if (i+1) % 10 == 0:
             print(f"[{i+1}/{len(TEST_CASES)}] Processing...")
        
        try:
            pred = await predict_local(case["text"])
            
            domain_match = pred["primary_domain"] == case["expected_domain"]
            issue_match = pred["issue_type"] == case["expected_issue"]
            
            if domain_match: correct_domain += 1
            if issue_match: correct_issue += 1
            
            results.append({
                "Text": case["text"],
                "Exp Domain": case["expected_domain"],
                "Pred Domain": pred["primary_domain"],
                "Domain OK": "✅" if domain_match else "❌",
                "Exp Issue": case["expected_issue"],
                "Pred Issue": pred["issue_type"],
                "Issue OK": "✅" if issue_match else "❌",
                "Conf": f"{pred['confidence']*100:.1f}%",
                "Safety": "⚠️" if pred["public_safety_flag"] else "✓"
            })
        except Exception as e:
            results.append({
                "Text": case["text"],
                "Exp Domain": case["expected_domain"],
                "Pred Domain": "ERROR",
                "Domain OK": "❌",
                "Exp Issue": case["expected_issue"],
                "Pred Issue": "ERROR",
                "Issue OK": "❌",
                "Conf": "0%",
                "Safety": "-"
            })

    # Summary Table
    df = pd.DataFrame(results)
    
    print("\n" + "═"*60)
    print("FINAL SCORECARD")
    print("-" * 60)
    domain_acc = correct_domain/len(TEST_CASES)*100
    issue_acc = correct_issue/len(TEST_CASES)*100
    print(f"Domain Accuracy:   {correct_domain}/{len(TEST_CASES)} ({domain_acc:.1f}%)")
    print(f"Issue Accuracy:    {correct_issue}/{len(TEST_CASES)} ({issue_acc:.1f}%)")
    print(f"System Status:     {'ULTRA-STABLE' if domain_acc > 90 else 'STABLE' if domain_acc > 75 else 'NEEDS RETRAINING'}")
    print("═"*60 + "\n")

    # Save to file in the current directory (ml/)
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit_report_100.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"BharathCRS Local Perception Audit - {datetime.now()}\n")
        f.write("=" * 100 + "\n")
        f.write(df.to_string())
        f.write("\n" + "=" * 100 + "\n")
        f.write(f"Overall: Domain {domain_acc:.1f}%, Issue {issue_acc:.1f}%\n")
        
    print(f"Detailed 100-case report saved to: {report_path}")

if __name__ == "__main__":
    asyncio.run(run_audit())

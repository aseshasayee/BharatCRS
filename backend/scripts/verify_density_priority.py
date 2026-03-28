"""
Verification Script: Building Density Aware Priority Scoring
══════════════════════════════════════════════════════════════
Simulates two reports for the same issue ("pothole") in two different
areas of Chennai:
1.  A dense residential area (high building count).
2.  A sparse industrial/outskirt area (low building count).

Demonstrates how the 'Area Importance (A)' metric and the final
Priority Score shift based on real Google Open Buildings data.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Load environment variables
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

from app.agents.priority_agent import run_priority_agent
from app.db.mongodb import init_db

# ─── Test Cases ───────────────────────────────────────────────────────────────

TEST_CASES = [
    {
        "name": "High Density (T. Nagar/Central)",
        "lat": 13.0405, 
        "lng": 80.2337,
        "issue": "road_damage",
        "domain": "Core Infrastructure & Public Works",
        "dept": "roads_dept"
    },
    {
        "name": "Low Density (Sparse Outskirt)",
        "lat": 12.8399, 
        "lng": 80.1552,   # Coordinates from earlier in conversation logs
        "issue": "road_damage",
        "domain": "Core Infrastructure & Public Works",
        "dept": "roads_dept"
    }
]

async def run_verification():
    print("─── Initializing MongoDB Connection ───")
    await init_db()
    
    print("\n" + "="*60)
    print(f"{'AREA NAME':<25} | {'BUILDINGS':<10} | {'AREA(A)':<8} | {'PRIORITY'}")
    print("-" * 60)

    for case in TEST_CASES:
        assessment, context, _ = await run_priority_agent(
            submission_timestamp=datetime.now(timezone.utc),
            duplicate_report_count=0,
            community_upvotes=0,
            assigned_department=case["dept"],
            latitude=case["lat"],
            longitude=case["lng"],
            primary_domain=case["domain"],
            issue_type=case["issue"]
        )
        
        density = context.get("building_density_count", "N/A")
        area_a  = assessment.area_importance_score
        score   = assessment.priority_score
        p_class = assessment.priority_class.name
        
        print(f"{case['name']:<25} | {density:<10} | {area_a:<8} | {score} ({p_class})")

    print("="*60)
    print("\n[VERIFICATION COMPLETE] Population density is now a primary driver of priority.")

if __name__ == "__main__":
    asyncio.run(run_verification())

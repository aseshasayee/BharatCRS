import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

async def seed():
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "bharathcrs")
    client = AsyncIOMotorClient(uri)
    db = client[db_name]
    users_col = db.users
    
    depts = [
        {"username": "dept_roads", "password": "password123", "role": "department", "department_name": "GCC Roads Department"},
        {"username": "dept_water", "password": "password123", "role": "department", "department_name": "CMWSSB"},
        {"username": "dept_electricity", "password": "password123", "role": "department", "department_name": "GCC Electrical"},
        {"username": "dept_sanitation", "password": "password123", "role": "department", "department_name": "GCC Sanitation"},
        {"username": "dept_traffic", "password": "password123", "role": "department", "department_name": "Traffic Police"},
        {"username": "dept_health", "password": "password123", "role": "department", "department_name": "Public Health Department"},
        {"username": "dept_general", "password": "password123", "role": "department", "department_name": "GCC General"},
        {"username": "admin", "password": "password123", "role": "admin", "department_name": "System Admin"}
    ]
    
    for d in depts:
        await users_col.update_one({"username": d["username"]}, {"$set": d}, upsert=True)
        
    print("Seeded departments:", [d["username"] for d in depts])

if __name__ == "__main__":
    asyncio.run(seed())

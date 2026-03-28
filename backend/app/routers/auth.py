from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.mongodb import users_col

router = APIRouter(tags=["Auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    role: str

@router.post("/auth/login")
async def login(req: LoginRequest):
    user = await users_col().find_one({"username": req.username, "password": req.password}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return {
        "success": True,
        "username": user["username"],
        "role": user["role"],
        "department_name": user.get("department_name")
    }

@router.post("/auth/signup")
async def signup(req: SignupRequest):
    # Enforce role logic if needed, or simply accept.
    if req.role not in ["citizen", "admin", "department"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Check if user already exists
    existing = await users_col().find_one({"username": req.username})
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    new_user = {
        "username": req.username,
        "password": req.password,
        "role": req.role
    }
    
    # Add dummy department for dept role if none provided
    if req.role == "department":
        new_user["department_name"] = "Water Board" # Placeholder

    await users_col().insert_one(new_user)
    
    return {
        "success": True,
        "message": "User created successfully",
        "username": req.username,
        "role": req.role
    }

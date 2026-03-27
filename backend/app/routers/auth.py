from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.mongodb import users_col

router = APIRouter(tags=["Auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

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

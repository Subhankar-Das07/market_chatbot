from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from models.user import UserCreate, UserResponse, User
from utils.auth import get_password_hash, verify_password, create_access_token, get_current_user
from services.db import get_db
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(tags=["auth"])

@router.post("/register")
async def register(user: UserCreate):
    print(f"🔥 REGISTRATION INITIATED FOR: {user.email}")
    try:
        db = get_db()
        
        # 1. Validate incoming registration data
        existing_user = await db["users"].find_one({"email": user.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        hashed_password = get_password_hash(user.password)
        user_dict = {
            "email": user.email,
            "hashed_password": hashed_password,
            "created_at": datetime.now(timezone.utc)
        }
        
        # 2. Insert the new User into the Users collection
        print("⏳ Attempting MongoDB insertion...")
        result = await db["users"].insert_one(user_dict)
        print("✅ MongoDB insertion successful")
        
        # 3. AWAIT and retrieve the newly generated user_id
        user_id_str = str(result.inserted_id)
        if not user_id_str:
            raise HTTPException(status_code=500, detail="Failed to generate user ID")
        
        # 4. Only after confirming the user_id, insert the new "General Chat" document
        await db["chat_sessions"].insert_one({
            "user_id": user_id_str,
            "title": "General Chat",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "message_count": 0,
            "is_archived": False
        })
        
        # 5. Generate the Auth Token
        access_token = create_access_token(data={"sub": user_id_str})
        
        # 6. Return the Token and User object to the frontend
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "user_id": user_id_str,
                "email": user.email
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database or Server Error: {str(e)}")

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": str(user["_id"])})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user_id: str = Depends(get_current_user)):
    db = get_db()
    user = await db["users"].find_one({"_id": ObjectId(current_user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(user_id=str(user["_id"]), email=user["email"])

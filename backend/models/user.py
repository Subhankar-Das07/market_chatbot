from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class User(BaseModel):
    """Pydantic model for a user document."""
    user_id: Optional[str] = None
    email: str
    hashed_password: str
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    user_id: str
    email: str

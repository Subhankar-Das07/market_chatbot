"""
ChatSession model — stores conversation sessions.
Each session groups multiple messages under one context thread.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChatSession(BaseModel):
    """Pydantic model for a chat session document."""
    session_id: Optional[str] = None          # MongoDB _id as string
    user_id: str                              # ID of the user who owns the session
    title: str = "New Conversation"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    message_count: int = 0
    is_archived: bool = False

    class Config:
        populate_by_name = True


class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Conversation"


class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    is_archived: Optional[bool] = None

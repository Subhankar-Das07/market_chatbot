"""
ChatMessage model — individual messages within a session.
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class ChatMessage(BaseModel):
    """Pydantic model for a single chat message document."""
    message_id: Optional[str] = None         # MongoDB _id as string
    session_id: str                           # Parent session ObjectId as string
    role: Literal["user", "assistant"]
    content: str
    sources: Optional[list[str]] = []
    token_count: Optional[int] = 0
    response_time_ms: Optional[int] = None   # Only for assistant messages
    feedback: Optional[Literal["up", "down"]] = None
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True


class MessageFeedbackRequest(BaseModel):
    feedback: Literal["up", "down", "none"]

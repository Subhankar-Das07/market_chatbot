"""
UserQuery model — retained for legacy compatibility or basic analytics.
Extended with session info, token count, response time.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserQuery(BaseModel):
    query_id: Optional[str] = None            # MongoDB _id as string
    session_id: str                           # Now maps to ChatSession._id as string
    query_text: str
    ai_response: Optional[str] = ""
    sources: Optional[list[str]] = []
    timestamp: Optional[datetime] = None
    token_count: Optional[int] = 0
    response_time_ms: Optional[int] = None
    feedback: Optional[str] = None

    class Config:
        populate_by_name = True

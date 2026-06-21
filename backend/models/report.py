"""
MarketReport model — enhanced with chunk count, file size, reindex support.
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class MarketReport(BaseModel):
    """Pydantic model for a market report document."""
    report_id: Optional[str] = None           # MongoDB _id as string
    user_id: str                              # ID of the user who uploaded the report
    title: str
    sector: Optional[str] = "General"
    uploaded_date: Optional[datetime] = None
    summary: Optional[str] = ""
    file_path: Optional[str] = ""
    file_size_bytes: Optional[int] = 0
    embedding_status: Optional[Literal["pending", "indexed", "failed"]] = "pending"
    chunk_count: Optional[int] = 0
    last_indexed_at: Optional[datetime] = None

    class Config:
        populate_by_name = True


class UpdateReportRequest(BaseModel):
    title: Optional[str] = None
    sector: Optional[str] = None

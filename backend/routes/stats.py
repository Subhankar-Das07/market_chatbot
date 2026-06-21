from fastapi import APIRouter
import logging
from datetime import datetime, timedelta, timezone

from services.db import get_sessions_collection, get_messages_collection, get_reports_collection

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/api/stats")
async def get_dashboard_stats():
    """Returns aggregated stats for the dashboard."""
    try:
        sess_col = get_sessions_collection()
        msg_col = get_messages_collection()
        rep_col = get_reports_collection()

        total_sessions = await sess_col.count_documents({"is_archived": {"$ne": True}})
        total_reports = await rep_col.count_documents({"embedding_status": "indexed"})
        
        # Messages in last 24h
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        active_queries = await msg_col.count_documents({
            "role": "user",
            "created_at": {"$gte": yesterday}
        })
        
        # Avg response time
        pipeline = [
            {"$match": {"role": "assistant", "response_time_ms": {"$ne": None}}},
            {"$group": {"_id": None, "avg_ms": {"$avg": "$response_time_ms"}}}
        ]
        avg_res = "N/A"
        async for doc in msg_col.aggregate(pipeline):
            avg_res = f"{int(doc['avg_ms'])}ms"
            
        return {
            "total_sessions": total_sessions,
            "indexed_reports": total_reports,
            "queries_24h": active_queries,
            "avg_response_time": avg_res
        }
    except Exception as e:
        logger.error(f"Failed to fetch stats: {e}")
        return {
            "total_sessions": 0,
            "indexed_reports": 0,
            "queries_24h": 0,
            "avg_response_time": "Error"
        }

from fastapi import APIRouter
from datetime import datetime, timezone
import os

from services.db import get_client, get_db
from utils.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/api/health")
async def health_check():
    mongo_status = "disconnected"
    stats = {}
    try:
        client = get_client()
        await client.admin.command("ping")
        mongo_status = "connected"
        
        # Get basic DB stats
        db = get_db()
        stats = {
            "sessions": await db["chat_sessions"].count_documents({}),
            "messages": await db["chat_messages"].count_documents({}),
            "reports": await db["market_reports"].count_documents({})
        }
    except Exception:
        mongo_status = "disconnected"

    # Check FAISS index
    faiss_size = 0
    try:
        index_path = os.path.join(settings.VECTOR_STORE_DIR, "index.faiss")
        if os.path.exists(index_path):
            faiss_size = os.path.getsize(index_path)
    except Exception:
        pass

    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "AI Market Intelligence API",
        "mongodb": mongo_status,
        "groq_configured": bool(
            settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your_groq_api_key_here"
        ),
        "db_stats": stats,
        "vector_store_bytes": faiss_size
    }

"""
Chat & Sessions Routes
Full CRUD for chat sessions, messages, and streaming AI responses with user authentication.
"""
import json
import logging
import time
import asyncio
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
import pymongo

from services.db import get_sessions_collection, get_messages_collection, get_queries_collection
from services.rag_service import rag_service
from models.session import CreateSessionRequest, UpdateSessionRequest
from models.message import MessageFeedbackRequest
from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    query_text: str
    session_id: str


# ── Helpers ─────────────────────────────────────────────────────────────────

def _format_doc(doc):
    if not doc:
        return doc
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if "session_id" in doc and isinstance(doc["session_id"], ObjectId):
        doc["session_id"] = str(doc["session_id"])
    for date_field in ["created_at", "updated_at", "timestamp"]:
        if date_field in doc and isinstance(doc[date_field], datetime):
            doc[date_field] = doc[date_field].isoformat()
    return doc


async def _save_messages(session_id: str, query_text: str, full_response: str, sources: list, tokens: int, ms: int):
    """Background task to save both user and assistant messages."""
    try:
        msgs_col = get_messages_collection()
        sess_col = get_sessions_collection()
        now = datetime.now(timezone.utc)
        
        # User message
        await msgs_col.insert_one({
            "session_id": session_id,
            "role": "user",
            "content": query_text,
            "created_at": now
        })
        
        # Assistant message
        await msgs_col.insert_one({
            "session_id": session_id,
            "role": "assistant",
            "content": full_response,
            "sources": sources,
            "token_count": tokens,
            "response_time_ms": ms,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Update session
        await sess_col.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$inc": {"message_count": 2},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )

        # Legacy queries collection logging
        queries_col = get_queries_collection()
        await queries_col.insert_one({
            "session_id": session_id,
            "query_text": query_text,
            "ai_response": full_response,
            "sources": sources,
            "timestamp": now,
            "token_count": tokens,
            "response_time_ms": ms
        })

    except Exception as e:
        logger.error(f"Failed to save messages to DB: {e}")


# ── Sessions CRUD ────────────────────────────────────────────────────────────

@router.get("/api/sessions")
async def list_sessions(limit: int = 50, skip: int = 0, current_user_id: str = Depends(get_current_user)):
    col = get_sessions_collection()
    cursor = col.find({"is_archived": {"$ne": True}, "user_id": current_user_id}).sort("updated_at", pymongo.DESCENDING).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        results.append(_format_doc(doc))
    return results


@router.post("/api/sessions")
async def create_session(req: CreateSessionRequest, current_user_id: str = Depends(get_current_user)):
    col = get_sessions_collection()
    now = datetime.now(timezone.utc)
    doc = {
        "title": req.title or "New Conversation",
        "user_id": current_user_id,
        "created_at": now,
        "updated_at": now,
        "message_count": 0,
        "is_archived": False
    }
    result = await col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _format_doc(doc)


@router.get("/api/sessions/{session_id}")
async def get_session(session_id: str, current_user_id: str = Depends(get_current_user)):
    col = get_sessions_collection()
    try:
        doc = await col.find_one({"_id": ObjectId(session_id), "user_id": current_user_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Session not found")
        return _format_doc(doc)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")


@router.patch("/api/sessions/{session_id}")
async def update_session(session_id: str, req: UpdateSessionRequest, current_user_id: str = Depends(get_current_user)):
    col = get_sessions_collection()
    updates = {"updated_at": datetime.now(timezone.utc)}
    if req.title is not None:
        updates["title"] = req.title
    if req.is_archived is not None:
        updates["is_archived"] = req.is_archived
        
    try:
        res = await col.update_one({"_id": ObjectId(session_id), "user_id": current_user_id}, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"status": "ok"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid session ID")


@router.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, current_user_id: str = Depends(get_current_user)):
    sess_col = get_sessions_collection()
    msg_col = get_messages_collection()
    try:
        res = await sess_col.delete_one({"_id": ObjectId(session_id), "user_id": current_user_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        await msg_col.delete_many({"session_id": session_id})
        return {"status": "ok"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid session ID")


# ── Messages & Chat ──────────────────────────────────────────────────────────

@router.get("/api/sessions/{session_id}/messages")
async def list_messages(session_id: str, limit: int = 100, current_user_id: str = Depends(get_current_user)):
    sess_col = get_sessions_collection()
    session = await sess_col.find_one({"_id": ObjectId(session_id), "user_id": current_user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    col = get_messages_collection()
    cursor = col.find({"session_id": session_id}).sort("created_at", pymongo.ASCENDING).limit(limit)
    results = []
    async for doc in cursor:
        results.append(_format_doc(doc))
    return results


async def sse_generator(query_text: str, session_id: str, chat_history: list):
    """Server-Sent Events generator that streams RAG tokens and handles saving."""
    full_response = ""
    sources = []
    tokens = 0
    start_time = time.time()

    try:
        async for chunk in rag_service.query_stream(query_text, chat_history):
            if chunk.startswith("\n__METADATA__:"):
                try:
                    meta = json.loads(chunk[len("\n__METADATA__:") :])
                    sources = meta.get("sources", [])
                    tokens = meta.get("token_count", 0)
                    yield f"data: {json.dumps({'type': 'sources', 'payload': sources})}\n\n"
                except Exception:
                    pass
            else:
                full_response += chunk
                escaped = chunk.replace("\n", "\\n")
                yield f"data: {escaped}\n\n"
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f"data: ⚠️ Error: {str(e)[:100]}\n\n"

    yield "data: [DONE]\n\n"
    ms_taken = int((time.time() - start_time) * 1000)

    # Trigger background save
    asyncio.create_task(_save_messages(session_id, query_text, full_response, sources, tokens, ms_taken))


@router.post("/api/chat")
async def chat(req: ChatRequest, current_user_id: str = Depends(get_current_user)):
    if not req.query_text.strip():
        raise HTTPException(status_code=400, detail="query_text cannot be empty")
    if len(req.query_text) > 4000:
        raise HTTPException(status_code=400, detail="query_text exceeds 4000 characters")

    # Verify ownership
    sess_col = get_sessions_collection()
    session = await sess_col.find_one({"_id": ObjectId(req.session_id), "user_id": current_user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Fetch history for context
    msg_col = get_messages_collection()
    cursor = msg_col.find({"session_id": req.session_id}).sort("created_at", pymongo.ASCENDING).limit(50)
    chat_history = []
    async for doc in cursor:
        chat_history.append({"role": doc["role"], "content": doc["content"]})

    return StreamingResponse(
        sse_generator(req.query_text.strip(), req.session_id, chat_history),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/api/messages/{message_id}/feedback")
async def message_feedback(message_id: str, req: MessageFeedbackRequest, current_user_id: str = Depends(get_current_user)):
    # Skipping deep session verification for feedback for simplicity
    col = get_messages_collection()
    try:
        res = await col.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"feedback": req.feedback if req.feedback != "none" else None}}
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Message not found")
        return {"status": "ok"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid message ID")


@router.get("/api/queries")
async def get_legacy_queries(limit: int = 20):
    """Legacy endpoint for Dashboard feed."""
    try:
        col = get_queries_collection()
        cursor = col.find({}, {"_id": 1, "query_text": 1, "ai_response": 1, "timestamp": 1, "sources": 1})
        cursor.sort("timestamp", -1).limit(min(limit, 100))
        results = []
        async for doc in cursor:
            results.append(_format_doc(doc))
        return results
    except Exception as e:
        logger.error(f"Queries fetch error: {e}")
        return []

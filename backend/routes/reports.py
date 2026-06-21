"""
Reports routes:
  GET    /api/reports           - list reports (with pagination & filter)
  POST   /api/reports/upload    - upload & index a document
  GET    /api/reports/{id}      - get a report
  PATCH  /api/reports/{id}      - update title/sector
  DELETE /api/reports/{id}      - delete a report
  POST   /api/reports/{id}/reindex - re-run embedding pipeline
"""
import os
import logging
import asyncio
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query, Depends
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional

from services.db import get_reports_collection
from services.embeddings import extract_text_from_file, detect_sector
from services.rag_service import rag_service
from utils.config import get_settings
from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf", ".csv", ".txt", ".md"}
MAX_BYTES = settings.MAX_UPLOAD_MB * 1024 * 1024


class UpdateReportRequest(BaseModel):
    title: Optional[str] = None
    sector: Optional[str] = None


def serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    if doc.get("uploaded_date"):
        doc["uploaded_date"] = doc["uploaded_date"].isoformat()
    if doc.get("last_indexed_at"):
        doc["last_indexed_at"] = doc["last_indexed_at"].isoformat()
    return doc


async def index_document_bg(report_id: str, file_path: str, title: str, sector: str):
    """Background task: extract text → index → update DB status."""
    col = get_reports_collection()
    try:
        text = await asyncio.get_event_loop().run_in_executor(
            None, extract_text_from_file, file_path
        )
        if not text.strip():
            await col.update_one(
                {"_id": ObjectId(report_id)},
                {"$set": {"embedding_status": "failed", "summary": "No extractable text."}}
            )
            return

        summary = text[:500].replace("\n", " ").strip()

        chunks = await rag_service.index_document(
            text=text,
            metadata={"title": title, "sector": sector, "report_id": report_id},
        )
        status = "indexed" if chunks > 0 else "failed"
        await col.update_one(
            {"_id": ObjectId(report_id)},
            {
                "$set": {
                    "embedding_status": status,
                    "summary": summary,
                    "chunk_count": chunks,
                    "last_indexed_at": datetime.now(timezone.utc)
                }
            }
        )
        logger.info(f"Indexed report {report_id}: {status} ({chunks} chunks)")
    except Exception as e:
        logger.error(f"Background indexing failed for {report_id}: {e}")
        await col.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"embedding_status": "failed"}}
        )

async def index_url_bg(report_id: str, url: str, title: str, sector: str):
    """Background task: extract text from URL → index → update DB status."""
    from services.embeddings import extract_text_from_url
    col = get_reports_collection()
    try:
        text = await asyncio.get_event_loop().run_in_executor(
            None, extract_text_from_url, url
        )
        if not text.strip():
            await col.update_one(
                {"_id": ObjectId(report_id)},
                {"$set": {"embedding_status": "failed", "summary": "No extractable text from URL."}}
            )
            return

        summary = text[:500].replace("\n", " ").strip()
        chunks = await rag_service.index_document(
            text=text,
            metadata={"title": title, "sector": sector, "report_id": report_id, "url": url},
        )
        status = "indexed" if chunks > 0 else "failed"
        await col.update_one(
            {"_id": ObjectId(report_id)},
            {
                "$set": {
                    "embedding_status": status,
                    "summary": summary,
                    "chunk_count": chunks,
                    "last_indexed_at": datetime.now(timezone.utc)
                }
            }
        )
        logger.info(f"Indexed URL {report_id}: {status} ({chunks} chunks)")
    except Exception as e:
        logger.error(f"Background indexing failed for URL {report_id}: {e}")
        await col.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"embedding_status": "failed"}}
        )

class URLUploadRequest(BaseModel):
    url: str

@router.post("/api/reports/url")
async def upload_url(
    req: URLUploadRequest,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(get_current_user)
):
    if not req.url or not req.url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL provided.")

    title = req.url.split("://")[-1].split("/")[0] # Simple title from domain
    sector = "General"

    col = get_reports_collection()
    result = await col.insert_one({
        "user_id": current_user_id,
        "title": title,
        "sector": sector,
        "uploaded_date": datetime.now(timezone.utc),
        "summary": "",
        "file_path": req.url, # storing url here for reference
        "file_size_bytes": 0,
        "embedding_status": "pending",
        "chunk_count": 0
    })
    report_id = str(result.inserted_id)

    background_tasks.add_task(
        index_url_bg, report_id, req.url, title, sector
    )

    return {
        "message": "URL queued for indexing",
        "_id": report_id,
        "title": title,
        "sector": sector,
        "embedding_status": "pending",
    }


@router.get("/api/reports")
async def list_reports(
    sector: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = Query(0),
    current_user_id: str = Depends(get_current_user)
):
    try:
        col = get_reports_collection()
        query = {"user_id": current_user_id}
        if sector:
            query["sector"] = sector
        if status:
            query["embedding_status"] = status
        if search:
            query["$text"] = {"$search": search}
            
        cursor = col.find(query).sort("uploaded_date", -1).skip(skip).limit(limit)
        docs = []
        async for doc in cursor:
            docs.append(serialize(doc))
        return docs
    except Exception as e:
        logger.warning(f"MongoDB unavailable for list_reports: {e}")
        return []


@router.get("/api/reports/{report_id}")
async def get_report(report_id: str, current_user_id: str = Depends(get_current_user)):
    try:
        col = get_reports_collection()
        doc = await col.find_one({"_id": ObjectId(report_id), "user_id": current_user_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Report not found")
        return serialize(doc)
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid ID")

@router.get("/api/reports/{report_id}/summary")
async def get_report_summary(report_id: str, current_user_id: str = Depends(get_current_user)):
    col = get_reports_collection()
    try:
        doc = await col.find_one({"_id": ObjectId(report_id), "user_id": current_user_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Report not found")
        
        existing_summary = doc.get("ai_summary")
        if existing_summary:
            return {"summary": existing_summary}
            
        new_summary = await rag_service.generate_summary(report_id)
        
        await col.update_one({"_id": ObjectId(report_id)}, {"$set": {"ai_summary": new_summary}})
        return {"summary": new_summary}
        
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid ID")

@router.patch("/api/reports/{report_id}")
async def update_report(report_id: str, req: UpdateReportRequest, current_user_id: str = Depends(get_current_user)):
    try:
        col = get_reports_collection()
        updates = {}
        if req.title: updates["title"] = req.title
        if req.sector: updates["sector"] = req.sector
        if not updates:
            return {"status": "no_changes"}
            
        res = await col.update_one({"_id": ObjectId(report_id), "user_id": current_user_id}, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"status": "ok"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid ID")


@router.post("/api/reports/upload")
async def upload_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user)
):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    file_size = len(content)
    if file_size > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_MB}MB"
        )

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = upload_dir / safe_name
    file_path.write_bytes(content)

    sector = detect_sector("", file.filename)
    title = Path(file.filename).stem.replace("_", " ").replace("-", " ").title()

    col = get_reports_collection()
    result = await col.insert_one({
        "user_id": current_user_id,
        "title": title,
        "sector": sector,
        "uploaded_date": datetime.now(timezone.utc),
        "summary": "",
        "file_path": str(file_path),
        "file_size_bytes": file_size,
        "embedding_status": "pending",
        "chunk_count": 0
    })
    report_id = str(result.inserted_id)

    background_tasks.add_task(
        index_document_bg, report_id, str(file_path), title, sector
    )

    return {
        "message": "Report uploaded and queued for indexing",
        "_id": report_id,
        "title": title,
        "sector": sector,
        "embedding_status": "pending",
    }


@router.post("/api/reports/{report_id}/reindex")
async def reindex_report(report_id: str, background_tasks: BackgroundTasks, current_user_id: str = Depends(get_current_user)):
    col = get_reports_collection()
    try:
        doc = await col.find_one({"_id": ObjectId(report_id), "user_id": current_user_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Report not found")
        
        await col.update_one({"_id": ObjectId(report_id)}, {"$set": {"embedding_status": "pending"}})
        
        background_tasks.add_task(
            index_document_bg, report_id, doc["file_path"], doc["title"], doc["sector"]
        )
        return {"status": "ok", "message": "Re-indexing started"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid ID")


@router.delete("/api/reports/{report_id}")
async def delete_report(report_id: str, current_user_id: str = Depends(get_current_user)):
    try:
        col = get_reports_collection()
        doc = await col.find_one({"_id": ObjectId(report_id), "user_id": current_user_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Report not found")

        if doc.get("file_path"):
            try:
                Path(doc["file_path"]).unlink(missing_ok=True)
            except Exception:
                pass

        # Remove vectors from FAISS
        await rag_service.delete_document(report_id)

        await col.delete_one({"_id": ObjectId(report_id)})
        return {"message": "Report deleted", "_id": report_id}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Invalid report ID")

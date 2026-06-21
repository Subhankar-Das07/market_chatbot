"""
FastAPI Application Entry Point
AI Market Intelligence Suite Backend
"""
import logging
from contextlib import asynccontextmanager

# IMPORT RAG SERVICE FIRST to prevent silent C-extension crash with motor/asyncio
import services.rag_service

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import chat, reports, stats, auth

from utils.config import get_settings
from services.db import close_db, create_indexes
from routes.health import router as health_router
from routes.chat import router as chat_router
from routes.reports import router as reports_router
from routes.stats import router as stats_router

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


# ── Lifespan (startup/shutdown) ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 AI Market Intelligence API starting up...")
    logger.info(f"   MongoDB: {settings.MONGODB_URI}")
    logger.info(f"   Frontend origin: {settings.FRONTEND_ORIGIN}")
    logger.info(f"   Groq model: {settings.GROQ_MODEL}")
    if not settings.GROQ_API_KEY:
        logger.error("⚠️  GROQ_API_KEY not set — backend AI will fail to respond")
    
    await create_indexes()
    
    yield
    logger.info("Shutting down...")
    await close_db()


# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Market Intelligence API",
    description="RAG-powered market analysis backend with FastAPI, MongoDB, and LangChain",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────
import os
FRONTEND_URL = os.environ.get("FRONTEND_URL")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
if FRONTEND_URL and FRONTEND_URL not in origins:
    origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(reports.router)
app.include_router(stats.router)


@app.get("/")
async def root():
    return {
        "message": "AI Market Intelligence API",
        "docs": "/docs",
        "health": "/api/health",
    }

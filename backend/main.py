"""
FastAPI Application Entry Point
AI Market Intelligence Suite Backend
"""
import logging
from contextlib import asynccontextmanager

# IMPORT RAG SERVICE FIRST to prevent silent C-extension crash with motor/asyncio
import services.rag_service

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from routes import chat, reports, stats, auth
from routes import ws as ws_routes
from routes import portfolio as portfolio_routes

from utils.config import get_settings
from services.db import close_db, create_indexes
from services.market_data import MarketDataService
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

    # ── Start real-time market data engine ─────────────────────────────────
    market_service = MarketDataService.instance()
    await market_service.start_background_feed()
    logger.info("📈 MarketDataService background feed started.")

    yield

    # ── Graceful shutdown ──────────────────────────────────────────────────
    await market_service.stop_background_feed()
    logger.info("📉 MarketDataService background feed stopped.")
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
    "https://market-chatbot.vercel.app",
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
app.add_middleware(GZipMiddleware, minimum_size=500)

# ── Routes ─────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(auth.router, prefix="/api/auth")
app.include_router(chat.router)
app.include_router(reports.router)
app.include_router(stats.router)
# Real-time engine routes
app.include_router(ws_routes.router)          # WebSocket: /api/ws/market
app.include_router(portfolio_routes.router)   # REST CRUD: /api/portfolio/**

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Global Server Crash: {str(exc)}"}
    )


@app.get("/")
async def root():
    return {
        "message": "AI Market Intelligence API",
        "docs": "/docs",
        "health": "/api/health",
    }

from motor.motor_asyncio import AsyncIOMotorClient
import pymongo
from utils.config import get_settings
import logging
import certifi

logger = logging.getLogger(__name__)

settings = get_settings()

_client: AsyncIOMotorClient = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        kwargs = {"serverSelectionTimeoutMS": 5000}
        if "mongodb+srv" in settings.MONGODB_URI:
            kwargs["tlsCAFile"] = certifi.where()
            
        _client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            **kwargs
        )
        logger.info(f"MongoDB client created: {settings.MONGODB_URI}")
    return _client


def get_db():
    return get_client()[settings.MONGODB_DB]


def get_sessions_collection():
    return get_db()["chat_sessions"]


def get_messages_collection():
    return get_db()["chat_messages"]


def get_queries_collection():
    return get_db()["user_queries"]


def get_reports_collection():
    return get_db()["market_reports"]


async def create_indexes():
    """Create all necessary MongoDB indexes on startup."""
    try:
        db = get_db()
        # Chat Sessions indexes
        await db["chat_sessions"].create_index([("updated_at", pymongo.DESCENDING)])
        await db["chat_sessions"].create_index([("created_at", pymongo.DESCENDING)])
        
        # Chat Messages indexes
        await db["chat_messages"].create_index([("session_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])
        
        # Market Reports indexes
        await db["market_reports"].create_index([("uploaded_date", pymongo.DESCENDING)])
        await db["market_reports"].create_index([("sector", pymongo.ASCENDING)])
        await db["market_reports"].create_index([("embedding_status", pymongo.ASCENDING)])
        # Text search index
        await db["market_reports"].create_index([("title", pymongo.TEXT), ("summary", pymongo.TEXT)])
        
        logger.info("MongoDB indexes created successfully.")
    except Exception as e:
        logger.error(f"Failed to create MongoDB indexes: {e}")


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("MongoDB connection closed.")

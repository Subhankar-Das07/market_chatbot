import sys
print("Starting imports...", flush=True)

try:
    print("Importing logging...", flush=True)
    import logging
    print("Importing contextlib...", flush=True)
    from contextlib import asynccontextmanager

    print("Importing fastapi...", flush=True)
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    print("Importing config...", flush=True)
    from utils.config import get_settings
    
    print("Importing db...", flush=True)
    from services.db import close_db, create_indexes
    
    print("Importing health...", flush=True)
    from routes.health import router as health_router
    
    print("Importing auth...", flush=True)
    from routes import auth
    
    print("Importing chat...", flush=True)
    from routes import chat
    
    print("Importing reports...", flush=True)
    from routes import reports
    
    print("Importing stats...", flush=True)
    from routes import stats
    
    print("All imports successful!", flush=True)
except Exception as e:
    print(f"Exception caught: {e}", flush=True)

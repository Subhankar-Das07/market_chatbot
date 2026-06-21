import sys
print("Debugging chat.py imports...", flush=True)

try:
    print("Importing json...", flush=True)
    import json
    import logging
    import time
    import asyncio
    
    print("Importing fastapi...", flush=True)
    from fastapi import APIRouter
    
    print("Importing db...", flush=True)
    from services.db import get_sessions_collection
    
    print("Importing rag_service...", flush=True)
    from services.rag_service import rag_service
    
    print("Importing auth...", flush=True)
    from utils.auth import get_current_user
    
    print("All chat imports successful!", flush=True)
except Exception as e:
    print(f"Exception: {e}", flush=True)

import os
import sys

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

print("Debugging combinations with KMP_DUPLICATE_LIB_OK=TRUE...", flush=True)
try:
    print("Importing db...", flush=True)
    from services.db import get_sessions_collection
    print("Importing rag_service...", flush=True)
    from services.rag_service import rag_service
    print("Success!", flush=True)
except Exception as e:
    print(f"Exception: {e}", flush=True)

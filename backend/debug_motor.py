import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    print("Testing motor connection...", flush=True)
    try:
        client = AsyncIOMotorClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
        db = client["test"]
        print("Calling create_index...", flush=True)
        await db["test"].create_index([("test", 1)])
        print("Success?", flush=True)
    except Exception as e:
        print(f"Exception: {e}", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

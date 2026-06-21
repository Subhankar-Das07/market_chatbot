import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import os
from dotenv import load_dotenv

load_dotenv()
uri = os.getenv("MONGODB_URI")

async def test_conn():
    print(f"Connecting to {uri}...")
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
    try:
        await client.admin.command('ping')
        print("Connected successfully!")
    except Exception as e:
        print(f"Connection failed: {e}")

asyncio.run(test_conn())

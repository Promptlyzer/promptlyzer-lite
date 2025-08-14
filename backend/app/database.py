"""
Database connection and management for MongoDB
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os
from .config import settings

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db = None

db = Database()

async def connect_to_mongo():
    """Create database connection"""
    mongodb_url = os.getenv("MONGODB_URI", "mongodb://localhost:27017/promptlyzer_os")
    db.client = AsyncIOMotorClient(mongodb_url)
    db.db = db.client.promptlyzer_os
    
    # Create indexes
    await db.db.experiments.create_index("experiment_id", unique=True)
    await db.db.experiments.create_index("created_at")
    
    print(f"Connected to MongoDB")

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        print("Disconnected from MongoDB")

def get_database():
    """Get database instance"""
    return db.db
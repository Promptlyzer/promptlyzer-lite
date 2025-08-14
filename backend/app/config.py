"""
Configuration for Promptlyzer Open Source Edition
"""
import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # App Info
    APP_NAME: str = "Promptlyzer OS"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "Open source prompt optimization platform"
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database (Local MongoDB)
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/promptlyzer_os")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "promptlyzer_os")
    
    # Open Source Limits
    MAX_TEST_SAMPLES: int = 10000  # High limit to prevent abuse
    MAX_EXPERIMENTS_PER_DAY: int = 10000  # Practically unlimited
    MAX_SAVED_PROMPTS: int = 10000  # Practically unlimited
    MAX_DATASETS: int = 10000  # Practically unlimited
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",  # Current frontend port
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173"
    ]
    
    # LLM Settings (User provides their own keys)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Features Flags (for OS version)
    ENABLE_MULTI_MODEL: bool = False  # Pro feature
    ENABLE_TREE_OPTIMIZATION: bool = False  # Pro feature
    ENABLE_API_ACCESS: bool = False  # Pro feature
    ENABLE_TEAM_FEATURES: bool = False  # Pro feature
    ENABLE_PRODUCTION_DATA: bool = False  # Pro feature
    
    # Cloud Version Promotion
    CLOUD_URL: str = "https://promptlyzer.com"
    SHOW_UPGRADE_PROMPTS: bool = True

settings = Settings()
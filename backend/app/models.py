"""
Simplified models for Open Source version
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ModelType(str, Enum):
    """Supported models in OS version"""
    GPT_5 = "gpt-5"
    GPT_5_MINI = "gpt-5-mini"
    GPT_5_NANO = "gpt-5-nano"
    GPT_4O = "gpt-4o"
    GPT_4_TURBO = "gpt-4-turbo"
    GPT_4 = "gpt-4"
    GPT_35_TURBO = "gpt-3.5-turbo"
    CLAUDE_35_SONNET = "claude-3.5-sonnet"
    CLAUDE_3_HAIKU = "claude-3-haiku"
    CLAUDE_3_OPUS = "claude-3-opus"
    LLAMA_33_70B_TURBO = "llama-3.3-70b-turbo"
    LLAMA_32_3B = "llama-3.2-3b"
    QWEN_25_72B = "qwen-2.5-72b"
    QWEN_25_7B = "qwen-2.5-7b"
    DEEPSEEK_V3 = "deepseek-v3"
    DEEPSEEK_R1_QWEN_15B = "deepseek-r1-qwen-1.5b"
    MIXTRAL_8X7B = "mixtral-8x7b"
    LLAMA_4_SCOUT = "llama-4-scout"
    KIMI_K2_INSTRUCT = "kimi-k2-instruct"

class SampleResult(BaseModel):
    """Result for a single test sample"""
    input: str
    expected: Optional[str] = None
    output: str
    tokens: int
    cost: float
    accuracy: float
    success: bool
    error: Optional[str] = None

class ExperimentRequest(BaseModel):
    """Request for running a prompt experiment"""
    prompt: str = Field(..., description="The prompt template to test")
    model: str = Field(..., description="LLM model to use")
    test_samples: List[Dict[str, Any]] = Field(..., description="Test data samples")
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "Summarize this text in 2 sentences: {text}",
                "model": "gpt-3.5-turbo",
                "test_samples": [
                    {"text": "Long article text here..."},
                    {"text": "Another article..."}
                ]
            }
        }

class ExperimentResult(BaseModel):
    """Result from a prompt experiment"""
    experiment_id: str
    prompt: str
    model: str
    accuracy: float = Field(..., ge=0, le=100)
    avg_tokens: int
    estimated_cost: float
    samples_tested: int
    created_at: datetime
    sample_results: List[SampleResult] = []
    
    # Upgrade prompts for OS users
    upgrade_message: Optional[str] = None

class Dataset(BaseModel):
    """Dataset for testing prompts"""
    name: str
    description: Optional[str] = None
    samples: List[Dict[str, Any]] = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PromptTemplate(BaseModel):
    """Saved prompt template"""
    name: str
    template: str
    description: Optional[str] = None
    model: ModelType
    avg_accuracy: Optional[float] = None
    usage_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UsageStats(BaseModel):
    """Track usage for OS limits"""
    experiments_today: int
    saved_prompts: int
    datasets_count: int
    total_tokens_used: int
    total_cost: float
    
    # Limits for OS version
    max_experiments_per_day: int = 10000
    max_saved_prompts: int = 10000
    max_datasets: int = 10000
    
    # Upgrade prompts
    show_upgrade: bool = False
    upgrade_message: Optional[str] = None

class ComparisonRequest(BaseModel):
    """Compare two prompts (simplified for OS)"""
    prompt_a: str
    prompt_b: str
    model: ModelType
    test_samples: List[Dict[str, Any]] = Field(...)

class OptimizationHint(BaseModel):
    """Hints for manual optimization (Pro has automatic)"""
    current_accuracy: float
    suggestions: List[str]
    pro_message: str = "Upgrade to Pro for automatic optimization with 50+ variations!"
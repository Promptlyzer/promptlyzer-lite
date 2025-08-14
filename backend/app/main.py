"""
Promptlyzer Open Source - Main FastAPI Application
"""
from fastapi import FastAPI, HTTPException, Depends, Header, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from datetime import datetime
from typing import Optional
import asyncio
import hashlib

from app.config import settings
from app.models import ExperimentRequest, ExperimentResult, UsageStats, SampleResult
from app.llm_service import LLMService
from app.database import db, connect_to_mongo, close_mongo_connection, get_database
from app.exceptions import (
    PromptilyzerException, APIKeyError, RateLimitError, ValidationError,
    promptlyzer_exception_handler, http_exception_handler, general_exception_handler,
    validate_prompt, validate_samples, validate_model
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add exception handlers
app.add_exception_handler(PromptilyzerException, promptlyzer_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# MongoDB event handlers
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    logger.info("Connected to MongoDB")

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()
    logger.info("Disconnected from MongoDB")

@app.get("/")
async def root():
    """Welcome endpoint"""
    return {
        "message": "Welcome to Promptlyzer Open Source",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "limits": {
            "max_samples": settings.MAX_TEST_SAMPLES,
            "max_experiments_per_day": settings.MAX_EXPERIMENTS_PER_DAY
        },
        "pro_features": "Visit https://promptlyzer.com for unlimited access"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.delete("/api/reset")
async def reset_data(
    reset_type: str = Query("experiments", description="Type of data to reset"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    """
    Reset user data
    reset_type: 'all' | 'experiments' | 'usage'
    """
    database = get_database()
    
    try:
        if reset_type in ["all", "experiments"]:
            # Delete all experiments
            result = await database.experiments.delete_many({})
            logger.info(f"Deleted {result.deleted_count} experiments")
        
        if reset_type in ["all", "usage"]:
            # Reset usage stats
            await database.usage.delete_one({"_id": "global_usage"})
            logger.info("Reset usage statistics")
        
        return {
            "success": True,
            "message": f"Successfully reset {reset_type} data",
            "reset_type": reset_type
        }
    except Exception as e:
        logger.error(f"Error resetting data: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset data")

@app.post("/api/experiments", response_model=ExperimentResult)
async def run_experiment(
    request: ExperimentRequest,
    x_openai_api_key: Optional[str] = Header(None),
    x_anthropic_api_key: Optional[str] = Header(None),
    x_together_api_key: Optional[str] = Header(None)
):
    """
    Run a prompt optimization experiment
    """
    # Check if API keys are provided for the selected model
    if request.model.startswith('gpt') and not x_openai_api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenAI API key required for GPT models. Please configure in API Settings."
        )
    elif request.model.startswith('claude') and not x_anthropic_api_key:
        raise HTTPException(
            status_code=400,
            detail="Anthropic API key required for Claude models. Please configure in API Settings."
        )
    elif request.model.startswith('together/') and not x_together_api_key:
        raise HTTPException(
            status_code=400,
            detail="Together AI API key required for Together models. Please configure in API Settings."
        )
    
    # Generate experiment ID
    import hashlib
    experiment_id = hashlib.md5(f"{request.prompt}{datetime.utcnow()}".encode()).hexdigest()[:8]
    
    # Initialize LLM service
    llm_service = LLMService()
    
    # Run experiments on all test samples
    total_tokens = 0
    total_cost = 0.0
    successful_runs = 0
    
    tasks = []
    for sample in request.test_samples:
        task = llm_service.run_prompt(
            prompt=request.prompt,
            model=request.model,
            test_sample=sample,
            openai_key=x_openai_api_key,
            anthropic_key=x_anthropic_api_key,
            together_key=x_together_api_key
        )
        tasks.append(task)
    
    # Run all prompts in parallel - return_exceptions=True ensures all tasks complete even if some fail
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results and create sample results
    sample_results = []
    for i, result_data in enumerate(results):
        sample = request.test_samples[i]
        input_text = sample.get("text", str(sample))
        expected_answer = sample.get("expected_answer")
        
        # Handle exceptions that were returned
        if isinstance(result_data, Exception):
            sample_results.append(SampleResult(
                input=input_text,
                expected=expected_answer,
                output="",
                tokens=0,
                cost=0,
                accuracy=0,
                success=False,
                error=str(result_data)
            ))
            continue
        
        # Handle normal results
        if isinstance(result_data, dict) and result_data.get("success"):
            successful_runs += 1
            total_tokens += result_data["tokens"]
            total_cost += result_data["cost"]
            
            sample_results.append(SampleResult(
                input=input_text,
                expected=expected_answer,
                output=result_data["response"],
                tokens=result_data["tokens"],
                cost=result_data["cost"],
                accuracy=0.0,  # Will be set by manual rating
                success=True,
                error=None
            ))
        else:
            # Handle failed results
            error_msg = "Unknown error"
            if isinstance(result_data, dict):
                error_msg = result_data.get("error", "Unknown error")
            
            sample_results.append(SampleResult(
                input=input_text,
                expected=expected_answer,
                output="",
                tokens=0,
                cost=0,
                accuracy=0,
                success=False,
                error=error_msg
            ))
    
    # Check if all samples failed
    if successful_runs == 0:
        # Don't save the experiment if all samples failed
        # Still return the result so the user can see what went wrong
        result = ExperimentResult(
            experiment_id=experiment_id,
            prompt=request.prompt,
            model=request.model,
            accuracy=0.0,
            avg_tokens=0,
            estimated_cost=0,
            samples_tested=len(request.test_samples),
            created_at=datetime.utcnow(),
            sample_results=sample_results
        )
        
        # Don't increment experiment count for failed experiments
        # But still update usage for tracking API calls
        database = get_database()
        await database.usage.update_one(
            {"_id": "global_usage"},
            {
                "$set": {
                    "last_updated": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return result
    
    # Calculate averages for successful runs
    avg_tokens = total_tokens // successful_runs
    
    # Create result - accuracy will be set by manual rating
    result = ExperimentResult(
        experiment_id=experiment_id,
        prompt=request.prompt,
        model=request.model,
        accuracy=0.0,  # Will be set by manual rating
        avg_tokens=avg_tokens,
        estimated_cost=total_cost,
        samples_tested=len(request.test_samples),
        created_at=datetime.utcnow(),
        sample_results=sample_results
    )
    
    # Store experiment in MongoDB only if there are successful samples
    database = get_database()
    experiment_doc = result.dict()
    await database.experiments.insert_one(experiment_doc)
    
    # Update usage stats in database (only for successful experiments)
    await database.usage.update_one(
        {"_id": "global_usage"},
        {
            "$inc": {
                "total_experiments": 1,  # Total count instead of daily
                "total_samples": result.samples_tested,
                "total_tokens": result.avg_tokens * result.samples_tested,
                "total_cost": result.estimated_cost
            },
            "$set": {
                "last_updated": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return result

@app.get("/api/experiments")
async def list_experiments():
    """List recent experiments"""
    database = get_database()
    
    # Get last 10 experiments from MongoDB
    experiments = await database.experiments.find(
        {}, 
        {"_id": 0}  # Exclude MongoDB _id from response
    ).sort("created_at", -1).limit(10).to_list(10)
    
    total_count = await database.experiments.count_documents({})
    
    return {
        "experiments": experiments,
        "total": total_count,
        "message": "Showing last 10 experiments"
    }

@app.get("/api/usage", response_model=UsageStats)
async def get_usage_stats():
    """Get current usage statistics"""
    database = get_database()
    
    # Get usage stats from MongoDB
    usage = await database.usage.find_one({"_id": "global_usage"})
    
    if not usage:
        # Initialize if not exists
        usage = {
            "total_experiments": 0,
            "total_samples": 0,
            "saved_prompts": 0,
            "datasets_count": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
            "last_updated": datetime.utcnow()
        }
    
    return UsageStats(
        experiments_today=usage.get("total_experiments", 0),  # Now shows total experiments
        saved_prompts=usage.get("total_samples", 0),  
        datasets_count=usage.get("datasets_count", 0),
        total_tokens_used=usage.get("total_tokens", 0),
        total_cost=usage.get("total_cost", 0.0),
        show_upgrade=False,  
        upgrade_message=None
    )


@app.post("/api/export")
async def export_results(experiment_ids: list):
    """
    Export experiment results
    OS version only supports CSV, Pro supports multiple formats
    """
    if not experiment_ids:
        raise HTTPException(status_code=400, detail="No experiments selected")
    
    # Simple CSV export for OS
    csv_data = "experiment_id,prompt,model,accuracy,cost\n"
    for exp in experiments_store:
        if exp.experiment_id in experiment_ids:
            csv_data += f"{exp.experiment_id},{exp.prompt},{exp.model},{exp.accuracy},{exp.estimated_cost}\n"
    
    return {
        "format": "csv",
        "data": csv_data,
        "pro_formats": ["json", "excel", "pdf", "api"],
        "message": "Pro version supports multiple export formats and automated reports"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
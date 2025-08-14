"""
Custom exceptions and error handlers for Promptlyzer OS
"""
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from typing import Any, Optional, Dict
import logging

logger = logging.getLogger(__name__)

class PromptilyzerException(Exception):
    """Base exception for Promptlyzer"""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class APIKeyError(PromptilyzerException):
    """Raised when API key is missing or invalid"""
    def __init__(self, provider: str, message: Optional[str] = None):
        msg = message or f"{provider} API key required. Please configure in API Settings."
        super().__init__(
            message=msg,
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"provider": provider, "error_type": "api_key_missing"}
        )

class RateLimitError(PromptilyzerException):
    """Raised when rate limit is exceeded"""
    def __init__(self, message: Optional[str] = None):
        msg = message or "Rate limit exceeded. Please try again later or upgrade to Pro."
        super().__init__(
            message=msg,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={"error_type": "rate_limit"}
        )

class ValidationError(PromptilyzerException):
    """Raised when input validation fails"""
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"error_type": "validation_error", "field": field}
        )

class LLMError(PromptilyzerException):
    """Raised when LLM API call fails"""
    def __init__(self, provider: str, message: str, original_error: Optional[str] = None):
        super().__init__(
            message=f"LLM Error ({provider}): {message}",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details={
                "error_type": "llm_error",
                "provider": provider,
                "original_error": original_error
            }
        )

class QuotaExceededError(PromptilyzerException):
    """Raised when usage quota is exceeded"""
    def __init__(self, resource: str, limit: int, current: int):
        super().__init__(
            message=f"{resource} limit exceeded. Current: {current}, Limit: {limit}",
            status_code=status.HTTP_403_FORBIDDEN,
            details={
                "error_type": "quota_exceeded",
                "resource": resource,
                "limit": limit,
                "current": current
            }
        )

def create_error_response(
    status_code: int,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """Create a standardized error response"""
    content = {
        "error": True,
        "message": message,
        "details": details or {}
    }
    
    # Log error
    logger.error(f"Error {status_code}: {message}", extra={"details": details})
    
    return JSONResponse(
        status_code=status_code,
        content=content
    )

async def promptlyzer_exception_handler(request: Request, exc: PromptilyzerException):
    """Handle custom Promptlyzer exceptions"""
    return create_error_response(
        status_code=exc.status_code,
        message=exc.message,
        details=exc.details
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTP exceptions"""
    return create_error_response(
        status_code=exc.status_code,
        message=exc.detail,
        details={"error_type": "http_error"}
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.exception("Unexpected error occurred", exc_info=exc)
    
    # Don't expose internal errors in production
    message = "An unexpected error occurred. Please try again."
    if hasattr(exc, '__class__'):
        details = {"error_type": exc.__class__.__name__}
    else:
        details = {"error_type": "unknown"}
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=message,
        details=details
    )

# Validation helpers
def validate_prompt(prompt: str) -> None:
    """Validate prompt template"""
    if not prompt or not prompt.strip():
        raise ValidationError("Prompt template cannot be empty", field="prompt")
    
    if len(prompt) > 10000:
        raise ValidationError("Prompt template too long (max 10000 characters)", field="prompt")

def validate_samples(samples: list) -> None:
    """Validate test samples"""
    if not samples:
        raise ValidationError("At least one test sample is required", field="test_samples")
    
    for i, sample in enumerate(samples):
        if not sample.get("text") or not sample["text"].strip():
            raise ValidationError(f"Sample {i+1} has empty text", field=f"test_samples[{i}]")

def validate_model(model: str) -> None:
    """Validate model selection"""
    valid_models = [
        "gpt-3.5-turbo", "gpt-4", "gpt-4-turbo",
        "claude-3-haiku", "claude-3-sonnet", "claude-3-opus",
    ]
    
    if not model:
        raise ValidationError("Model selection is required", field="model")
    
    # Allow Together AI models with prefix
    if not (model in valid_models or model.startswith("together/")):
        raise ValidationError(f"Invalid model: {model}", field="model")
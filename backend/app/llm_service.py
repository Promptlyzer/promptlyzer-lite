"""
LLM Service for real API integration
"""
import os
import logging
from typing import List, Dict, Optional
import openai
import anthropic
import httpx
import json
import asyncio

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        self.together_client = None
        self.openai_api_key = None
        self.together_key = None
        
    def initialize_clients(self, openai_key: Optional[str] = None, 
                         anthropic_key: Optional[str] = None,
                         together_key: Optional[str] = None):
        """Initialize LLM clients with provided API keys"""
        if openai_key:
            try:
                self.openai_client = openai.OpenAI(api_key=openai_key)
                self.openai_api_key = openai_key  # Store for direct API calls
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                self.openai_client = None
                self.openai_api_key = None
            
        if anthropic_key:
            try:
                self.anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic client: {e}")
                self.anthropic_client = None
            
        if together_key:
            self.together_key = together_key
    
    async def run_prompt(self, prompt: str, model: str, test_sample: Dict,
                        openai_key: Optional[str] = None,
                        anthropic_key: Optional[str] = None,
                        together_key: Optional[str] = None) -> Dict:
        """Run a single prompt with a test sample"""
        
        # Initialize clients with provided keys
        self.initialize_clients(openai_key, anthropic_key, together_key)
        
        # Replace variables in prompt
        filled_prompt = prompt
        for key, value in test_sample.items():
            filled_prompt = filled_prompt.replace(f"{{{key}}}", str(value))
        
        try:
            # OpenAI models
            if model.startswith('gpt'):
                if not self.openai_client:
                    return {
                        "success": False,
                        "error": "OpenAI API key not provided",
                        "response": None,
                        "tokens": 0,
                        "cost": 0
                    }
                
                # Handle GPT-5 models with responses API
                if model in ['gpt-5', 'gpt-5-mini', 'gpt-5-nano']:
                    # Try to use Responses API via direct HTTP call
                    if hasattr(self, 'openai_api_key') and self.openai_api_key:
                        try:
                            async with httpx.AsyncClient() as client:
                                response = await client.post(
                                    "https://api.openai.com/v1/responses",
                                    headers={
                                        "Authorization": f"Bearer {self.openai_api_key}",
                                        "Content-Type": "application/json"
                                    },
                                    json={
                                        "model": model,
                                        "input": filled_prompt,
                                        "reasoning": {
                                            "effort": "minimal"  # Fast response
                                        },
                                        "text": {
                                            "verbosity": "medium"  # Balanced output
                                        }
                                    },
                                    timeout=60.0
                                )
                                
                                if response.status_code == 200:
                                    data = response.json()
                                    
                                    # Extract response content from GPT-5 response
                                    response_content = data.get('output', data.get('text', ''))
                                    
                                    # Get usage info
                                    usage_info = data.get('usage', {})
                                    tokens = usage_info.get('total_tokens', 100)
                                    
                                    return {
                                        "success": True,
                                        "response": response_content,
                                        "tokens": tokens,
                                        "cost": self.calculate_gpt5_cost(model, usage_info)
                                    }
                                else:
                                    # Log error and check if it's a verification issue
                                    error_data = response.json()
                                    logger.warning(f"GPT-5 Responses API error: {error_data}")
                                    
                                    # Check if it's a verification error
                                    error_msg = error_data.get('error', {}).get('message', '')
                                    if 'verified' in error_msg.lower() or 'verify organization' in error_msg.lower():
                                        return {
                                            "success": False,
                                            "error": f"Your OpenAI organization needs to be verified to use {model}. Please visit https://platform.openai.com/settings/organization/general to verify your organization.",
                                            "response": None,
                                            "tokens": 0,
                                            "cost": 0
                                        }
                                    # Fall back to standard Chat Completions API for other errors
                                    pass
                                    
                        except Exception as e:
                            logger.warning(f"GPT-5 Responses API failed: {str(e)}, falling back to Chat Completions")
                            # Fall back to standard API
                            pass
                
                # Standard chat completions API for other GPT models (and fallback)
                # Don't fall back for GPT-5 models as they only work with Responses API
                if model in ['gpt-5', 'gpt-5-mini', 'gpt-5-nano']:
                    return {
                        "success": False,
                        "error": f"Your OpenAI organization needs to be verified to use {model}. Please visit https://platform.openai.com/settings/organization/general to verify your organization.",
                        "response": None,
                        "tokens": 0,
                        "cost": 0
                    }
                
                response = self.openai_client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": filled_prompt}],
                    max_tokens=500,
                    temperature=0.7
                )
                
                # Extract response - standard GPT models
                response_content = response.choices[0].message.content
                tokens = response.usage.total_tokens if response.usage else 0
                
                return {
                    "success": True,
                    "response": response_content,
                    "tokens": tokens,
                    "cost": self.calculate_openai_cost(model, response.usage)
                }
            
            # Anthropic models
            elif model.startswith('claude'):
                if not self.anthropic_client:
                    return {
                        "success": False,
                        "error": "Anthropic API key not provided",
                        "response": None,
                        "tokens": 0,
                        "cost": 0
                    }
                
                try:
                    # Map model names
                    anthropic_model = {
                        'claude-3-haiku': 'claude-3-haiku-20240307',
                        'claude-3-sonnet': 'claude-3-sonnet-20240229',
                        'claude-3-opus': 'claude-3-opus-20240229',
                        'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022'
                    }.get(model, model)
                    
                    # Use the correct method name for Anthropic client
                    message = self.anthropic_client.messages.create(
                        model=anthropic_model,
                        max_tokens=500,
                        messages=[{"role": "user", "content": filled_prompt}]
                    )
                    
                    # Extract response text and token usage
                    response_text = ""
                    if hasattr(message, 'content') and message.content:
                        if isinstance(message.content, list) and len(message.content) > 0:
                            response_text = message.content[0].text
                        elif isinstance(message.content, str):
                            response_text = message.content
                    
                    # Calculate tokens
                    tokens = 0
                    if hasattr(message, 'usage'):
                        tokens = message.usage.input_tokens + message.usage.output_tokens
                    
                    return {
                        "success": True,
                        "response": response_text,
                        "tokens": tokens,
                        "cost": self.calculate_anthropic_cost(model, tokens)
                    }
                except Exception as e:
                    logger.error(f"Anthropic API error: {str(e)}")
                    return {
                        "success": False,
                        "error": str(e),
                        "response": None,
                        "tokens": 0,
                        "cost": 0
                    }
            
            # Together AI models and other models using Together API
            elif model.startswith('together/') or model in ['llama-3.3-70b-turbo', 'llama-3.2-3b', 'qwen-2.5-72b', 'qwen-2.5-7b', 'deepseek-v3', 'deepseek-r1-qwen-1.5b', 'mixtral-8x7b', 'llama-4-scout', 'kimi-k2-instruct']:
                if not self.together_key:
                    return {
                        "success": False,
                        "error": "Together AI API key not provided",
                        "response": None,
                        "tokens": 0,
                        "cost": 0
                    }
                
                # Map model names to Together AI format
                model_mapping = {
                    'llama-3.3-70b-turbo': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
                    'llama-3.2-3b': 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
                    'qwen-2.5-72b': 'Qwen/Qwen2.5-72B-Instruct-Turbo',
                    'qwen-2.5-7b': 'Qwen/Qwen2.5-7B-Instruct-Turbo',
                    'deepseek-v3': 'deepseek-ai/DeepSeek-V3',
                    'deepseek-r1-qwen-1.5b': 'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B',
                    'mixtral-8x7b': 'mistralai/Mixtral-8x7B-Instruct-v0.1',
                    'llama-4-scout': 'meta-llama/Llama-4-Scout',
                    'kimi-k2-instruct': 'kimi/Kimi-K2-Instruct'
                }
                
                if model in model_mapping:
                    model_name = model_mapping[model]
                else:
                    model_name = model.replace('together/', '')
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.together.xyz/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.together_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model_name,
                            "messages": [{"role": "user", "content": filled_prompt}],
                            "max_tokens": 500,
                            "temperature": 0.7
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        tokens = data.get('usage', {}).get('total_tokens', 0)
                        
                        return {
                            "success": True,
                            "response": data['choices'][0]['message']['content'],
                            "tokens": tokens,
                            "cost": tokens * 0.0001  # Approximate cost
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Together AI error: {response.text}",
                            "response": None,
                            "tokens": 0,
                            "cost": 0
                        }
            
            else:
                return {
                    "success": False,
                    "error": f"Unsupported model: {model}",
                    "response": None,
                    "tokens": 0,
                    "cost": 0
                }
                
        except Exception as e:
            logger.error(f"Error running prompt: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "response": None,
                "tokens": 0,
                "cost": 0
            }
    
    def calculate_openai_cost(self, model: str, usage) -> float:
        """Calculate cost for OpenAI models"""
        if not usage:
            return 0.0
            
        # Prices per 1K tokens (as of 2024)
        pricing = {
            'gpt-5': {'input': 0.015, 'output': 0.075},
            'gpt-5-mini': {'input': 0.003, 'output': 0.015},
            'gpt-5-nano': {'input': 0.0003, 'output': 0.0015},
            'gpt-4o': {'input': 0.005, 'output': 0.015},
            'gpt-4-turbo': {'input': 0.01, 'output': 0.03},
            'gpt-4': {'input': 0.03, 'output': 0.06},
            'gpt-3.5-turbo': {'input': 0.0005, 'output': 0.0015}
        }
        
        model_pricing = pricing.get(model, pricing['gpt-3.5-turbo'])
        
        input_cost = (usage.prompt_tokens / 1000) * model_pricing['input']
        output_cost = (usage.completion_tokens / 1000) * model_pricing['output']
        
        return input_cost + output_cost
    
    def calculate_gpt5_cost(self, model: str, usage_info: Dict) -> float:
        """Calculate cost for GPT-5 models using Responses API"""
        # Prices per 1K tokens for GPT-5 models
        pricing = {
            'gpt-5': {'input': 0.015, 'output': 0.075, 'reasoning': 0.001},
            'gpt-5-mini': {'input': 0.003, 'output': 0.015, 'reasoning': 0.0005},
            'gpt-5-nano': {'input': 0.0003, 'output': 0.0015, 'reasoning': 0.0001}
        }
        
        model_pricing = pricing.get(model, pricing['gpt-5-mini'])
        
        # Get token counts
        input_tokens = usage_info.get('input_tokens', 0)
        output_tokens = usage_info.get('output_tokens', 0)
        reasoning_tokens = usage_info.get('reasoning_tokens', 0)
        
        # Calculate costs
        input_cost = (input_tokens / 1000) * model_pricing['input']
        output_cost = (output_tokens / 1000) * model_pricing['output']
        reasoning_cost = (reasoning_tokens / 1000) * model_pricing['reasoning']
        
        return input_cost + output_cost + reasoning_cost
    
    def calculate_anthropic_cost(self, model: str, total_tokens: int) -> float:
        """Calculate cost for Anthropic models"""
        # Prices per 1K tokens (as of 2024)
        pricing = {
            'claude-3-haiku': 0.00025,
            'claude-3-sonnet': 0.003,
            'claude-3-opus': 0.015,
            'claude-3.5-sonnet': 0.003
        }
        
        price_per_1k = pricing.get(model, 0.003)
        return (total_tokens / 1000) * price_per_1k
    
    async def evaluate_response(self, response: str, expected_answer: Optional[str] = None) -> float:
        """Simple evaluation of response accuracy"""
        if not expected_answer:
            # If no expected answer, assume it's correct if there's a response
            return 100.0 if response else 0.0
        
        # Simple similarity check (can be improved with better metrics)
        response_lower = response.lower().strip()
        expected_lower = expected_answer.lower().strip()
        
        # Check for exact match
        if response_lower == expected_lower:
            return 100.0
        
        # Check if expected answer is contained in response
        if expected_lower in response_lower:
            return 80.0
        
        # Check for key words match
        response_words = set(response_lower.split())
        expected_words = set(expected_lower.split())
        
        if len(expected_words) > 0:
            overlap = len(response_words.intersection(expected_words))
            accuracy = (overlap / len(expected_words)) * 100
            return min(accuracy, 90.0)
        
        return 0.0
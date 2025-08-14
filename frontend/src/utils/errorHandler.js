import toast from 'react-hot-toast'

// Error types
export const ErrorTypes = {
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
}

// Error messages for different scenarios
const errorMessages = {
  // API Errors
  400: 'Invalid request. Please check your input.',
  401: 'Authentication failed. Please check your API keys.',
  403: 'Access denied. You don\'t have permission for this action.',
  404: 'Resource not found.',
  429: 'Too many requests. Please slow down.',
  500: 'Server error. Please try again later.',
  502: 'Bad gateway. Please try again.',
  503: 'Service unavailable. Please try again later.',
  
  // Network Errors
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  
  // Validation Errors
  MISSING_API_KEY: 'API key is required. Please configure in API Settings.',
  INVALID_JSON: 'Invalid JSON format. Please check your file.',
  EMPTY_PROMPT: 'Prompt template cannot be empty.',
  NO_SAMPLES: 'Please add at least one test sample.',
  
  // Default
  DEFAULT: 'An unexpected error occurred. Please try again.'
}

// Main error handler
export const handleError = (error, context = '') => {
  console.error(`Error in ${context}:`, error)
  
  let errorType = ErrorTypes.UNKNOWN_ERROR
  let message = errorMessages.DEFAULT
  let details = null
  
  // Handle Axios/Fetch errors
  if (error.response) {
    // Server responded with error
    const status = error.response.status
    errorType = getErrorTypeFromStatus(status)
    
    // Check for custom error message from backend
    if (error.response.data?.detail) {
      // Handle both string and object details
      if (typeof error.response.data.detail === 'string') {
        message = error.response.data.detail
      } else if (typeof error.response.data.detail === 'object') {
        // Handle validation error objects
        if (error.response.data.detail.msg) {
          message = error.response.data.detail.msg
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle array of validation errors
          message = error.response.data.detail.map(err => 
            err.msg || err.message || JSON.stringify(err)
          ).join(', ')
        } else {
          message = JSON.stringify(error.response.data.detail)
        }
      }
    } else if (error.response.data?.message) {
      message = error.response.data.message
    } else {
      message = errorMessages[status] || errorMessages.DEFAULT
    }
    
    details = error.response.data
  } else if (error.request) {
    // Request made but no response
    errorType = ErrorTypes.NETWORK_ERROR
    message = errorMessages.NETWORK_ERROR
  } else if (error.message) {
    // Something else happened
    message = error.message
  }
  
  // Show user-friendly error message
  showErrorNotification(message, errorType)
  
  // Return structured error for component handling
  return {
    type: errorType,
    message,
    details,
    originalError: error
  }
}

// Get error type from HTTP status
const getErrorTypeFromStatus = (status) => {
  if (status === 401 || status === 403) return ErrorTypes.AUTH_ERROR
  if (status === 429) return ErrorTypes.RATE_LIMIT
  if (status >= 400 && status < 500) return ErrorTypes.VALIDATION_ERROR
  if (status >= 500) return ErrorTypes.API_ERROR
  return ErrorTypes.UNKNOWN_ERROR
}

// Show error notification
const showErrorNotification = (message, errorType) => {
  const options = {
    duration: 5000,
    position: 'top-right'
  }
  
  // Add icon based on error type
  let icon = '❌'
  if (errorType === ErrorTypes.AUTH_ERROR) icon = '🔐'
  if (errorType === ErrorTypes.NETWORK_ERROR) icon = '🌐'
  if (errorType === ErrorTypes.RATE_LIMIT) icon = '⏱️'
  
  toast.error(message, {
    ...options,
    icon,
    id: `error-${Date.now()}` // Prevent duplicate toasts
  })
}

// Validation helpers
export const validateApiKey = (apiKey, provider) => {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(`${provider} API key is required`)
  }
  
  // Basic format validation
  if (provider === 'OpenAI' && !apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format')
  }
  
  if (provider === 'Anthropic' && !apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid Anthropic API key format')
  }
  
  return true
}

export const validatePrompt = (prompt) => {
  if (!prompt || prompt.trim() === '') {
    throw new Error('Prompt template cannot be empty')
  }
  
  if (!prompt.includes('{text}') && !prompt.includes('{')) {
    console.warn('Prompt template should include variables like {text}')
  }
  
  return true
}

export const validateSamples = (samples) => {
  if (!samples || samples.length === 0) {
    throw new Error('Please add at least one test sample')
  }
  
  const invalidSamples = samples.filter(s => !s.text || s.text.trim() === '')
  if (invalidSamples.length > 0) {
    throw new Error('Some samples have empty text')
  }
  
  return true
}

// Retry logic for transient errors
export const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry on validation or auth errors
      if (error.response?.status === 400 || error.response?.status === 401) {
        throw error
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
      }
    }
  }
  
  throw lastError
}

export default handleError
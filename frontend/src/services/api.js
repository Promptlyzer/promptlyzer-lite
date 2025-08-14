import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add API keys to requests
api.interceptors.request.use((config) => {
  const openaiKey = localStorage.getItem('openai_api_key')
  const anthropicKey = localStorage.getItem('anthropic_api_key')
  const togetherKey = localStorage.getItem('together_api_key')
  
  if (openaiKey) config.headers['X-OpenAI-API-Key'] = openaiKey
  if (anthropicKey) config.headers['X-Anthropic-API-Key'] = anthropicKey
  if (togetherKey) config.headers['X-Together-API-Key'] = togetherKey
  
  return config
})

export default {
  // Run experiment
  runExperiment: (data) => api.post('/api/experiments', data),
  
  // Get experiments list
  getExperiments: () => api.get('/api/experiments'),
  
  // Get usage statistics
  getUsage: () => api.get('/api/usage'),
  
  // Export results
  exportResults: (experimentIds) => api.post('/api/export', { experiment_ids: experimentIds }),
  
  // Reset data
  resetData: (resetType = 'experiments') => api.delete(`/api/reset?reset_type=${resetType}`),
  
  // Health check
  healthCheck: () => api.get('/health')
}
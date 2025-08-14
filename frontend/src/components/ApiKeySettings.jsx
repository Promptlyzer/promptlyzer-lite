import { useState, useEffect } from 'react'
import { Settings, Eye, EyeOff, Save, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function ApiKeySettings() {
  const [isOpen, setIsOpen] = useState(false)
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    together: false
  })
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    together: ''
  })

  // Load saved keys from localStorage
  useEffect(() => {
    const savedKeys = {
      openai: localStorage.getItem('openai_api_key') || '',
      anthropic: localStorage.getItem('anthropic_api_key') || '',
      together: localStorage.getItem('together_api_key') || ''
    }
    setApiKeys(savedKeys)
  }, [])

  const handleSaveKeys = () => {
    // Save to localStorage
    localStorage.setItem('openai_api_key', apiKeys.openai)
    localStorage.setItem('anthropic_api_key', apiKeys.anthropic)
    localStorage.setItem('together_api_key', apiKeys.together)
    
    toast.success('API keys saved successfully!')
    setIsOpen(false)
  }

  const toggleShowKey = (provider) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }))
  }

  const maskKey = (key) => {
    if (!key) return ''
    if (key.length <= 8) return '••••••••'
    return key.substring(0, 4) + '••••' + key.substring(key.length - 4)
  }

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
      >
        <Settings className="w-4 h-4" />
        <span>API Settings</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">API Key Configuration</h2>
            
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>API keys are stored locally in your browser</li>
                    <li>Never share your API keys with anyone</li>
                    <li>You need at least one API key to run experiments</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* OpenAI API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key (for GPT models)
                </label>
                <div className="flex space-x-2">
                  <input
                    type={showKeys.openai ? 'text' : 'password'}
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                    placeholder="sk-..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={() => toggleShowKey('openai')}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    {showKeys.openai ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
                >
                  Get your OpenAI API key →
                </a>
              </div>

              {/* Anthropic API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anthropic API Key (for Claude models)
                </label>
                <div className="flex space-x-2">
                  <input
                    type={showKeys.anthropic ? 'text' : 'password'}
                    value={apiKeys.anthropic}
                    onChange={(e) => setApiKeys({...apiKeys, anthropic: e.target.value})}
                    placeholder="sk-ant-..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={() => toggleShowKey('anthropic')}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    {showKeys.anthropic ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <a 
                  href="https://console.anthropic.com/account/keys" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
                >
                  Get your Anthropic API key →
                </a>
              </div>

              {/* Together AI API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Together AI API Key (for open models)
                </label>
                <div className="flex space-x-2">
                  <input
                    type={showKeys.together ? 'text' : 'password'}
                    value={apiKeys.together}
                    onChange={(e) => setApiKeys({...apiKeys, together: e.target.value})}
                    placeholder="..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={() => toggleShowKey('together')}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    {showKeys.together ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <a 
                  href="https://api.together.xyz/settings/api-keys" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
                >
                  Get your Together AI API key →
                </a>
              </div>
            </div>

            {/* Current Keys Status */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Configuration:</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${apiKeys.openai ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>OpenAI: {apiKeys.openai ? maskKey(apiKeys.openai) : 'Not configured'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${apiKeys.anthropic ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Anthropic: {apiKeys.anthropic ? maskKey(apiKeys.anthropic) : 'Not configured'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${apiKeys.together ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Together AI: {apiKeys.together ? maskKey(apiKeys.together) : 'Not configured'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKeys}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Keys</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ApiKeySettings
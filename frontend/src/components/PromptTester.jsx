import { useState } from 'react'
import { Play, Upload, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { handleError, validatePrompt, validateSamples } from '../utils/errorHandler'

const MODELS = [
  { value: 'gpt-5', label: 'GPT-5 (OpenAI)' },
  { value: 'gpt-5-mini', label: 'GPT-5-Mini (OpenAI)' },
  { value: 'gpt-5-nano', label: 'GPT-5-Nano (OpenAI)' },
  { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (OpenAI)' },
  { value: 'gpt-4', label: 'GPT-4 (OpenAI)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (OpenAI)' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Anthropic)' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Anthropic)' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus (Anthropic)' },
  { value: 'llama-3.3-70b-turbo', label: 'Llama 3.3 70B Turbo (Togetherai)' },
  { value: 'llama-3.2-3b', label: 'Llama 3.2 3B (Togetherai)' },
  { value: 'qwen-2.5-72b', label: 'Qwen 2.5 72B (Togetherai)' },
  { value: 'qwen-2.5-7b', label: 'Qwen 2.5 7B (Togetherai)' },
  { value: 'deepseek-v3', label: 'DeepSeek V3 (Togetherai)' },
  { value: 'deepseek-r1-qwen-1.5b', label: 'DeepSeek R1 Qwen 1.5B (Togetherai)' },
  { value: 'mixtral-8x7b', label: 'Mixtral 8×7B (Togetherai)' },
  { value: 'llama-4-scout', label: 'Llama 4 Scout (Togetherai)' },
  { value: 'kimi-k2-instruct', label: 'Kimi K2 Instruct (Togetherai)' }
]

function PromptTester({ onExperimentComplete, setLoading, setUsage }) {
  const [systemContext, setSystemContext] = useState('')
  const [prompt, setPrompt] = useState('Answer this question: {text}')
  const [model, setModel] = useState('gpt-3.5-turbo')
  const [testSamples, setTestSamples] = useState([
    { text: "How do I reset my password?" },
    { text: "What are your business hours?" }
  ])
  const [sampleInput, setSampleInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  const handleAddSample = () => {
    if (sampleInput.trim() && testSamples.length < 10) {
      setTestSamples([...testSamples, { text: sampleInput.trim() }])
      setSampleInput('')
    } else if (testSamples.length >= 10) {
      toast.error('Maximum 10 samples allowed in OS version. Upgrade to Pro for unlimited samples!')
    }
  }

  const handleRemoveSample = (index) => {
    setTestSamples(testSamples.filter((_, i) => i !== index))
  }

  const handleRunExperiment = async () => {
    try {
      // Validate inputs
      validatePrompt(prompt)
      validateSamples(testSamples)
      
      setIsRunning(true)
      setLoading(true)
      
      // Show loading toast
      toast.loading(`Running experiment with ${testSamples.length} samples...`, {
        id: 'experiment-running'
      })
      
      // System context varsa prompt'a ekle
      const finalPrompt = systemContext ? 
        `${systemContext}\n\n${prompt}` : 
        prompt
      
      const response = await api.runExperiment({
        prompt: finalPrompt,
        model,
        test_samples: testSamples
      })
      
      onExperimentComplete(response.data)
      
      // Eğer hiçbir sample başarılı değilse uyar
      const successfulSamples = response.data.sample_results?.filter(s => s.success).length || 0
      
      if (successfulSamples === 0 && response.data.sample_results?.length > 0) {
        // Check if it's a verification error for GPT-5
        const firstError = response.data.sample_results[0]?.error || ''
        if (firstError.includes('verified') || firstError.includes('verify organization')) {
          toast.error(
            <div>
              <strong>Organization Verification Required</strong>
              <br />
              <span style={{ fontSize: '0.9em' }}>
                Your OpenAI organization needs to be verified to use {model}.
                <br />
                <a href="https://platform.openai.com/settings/organization/general" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                  Click here to verify your organization
                </a>
              </span>
            </div>,
            {
              id: 'experiment-running',
              duration: 8000
            }
          )
        } else {
          // Other failures
          toast.error(`Experiment completed but all ${testSamples.length} samples failed. Check your API key.`, {
            id: 'experiment-running',
            duration: 5000
          })
        }
      } else if (successfulSamples < testSamples.length) {
        // Bazı sample'lar başarısız
        toast(`Experiment completed. ${successfulSamples}/${testSamples.length} samples successful.`, {
          id: 'experiment-running',
          duration: 4000
        })
      } else {
        // Hepsi başarılı
        toast.success(`Experiment completed! All ${testSamples.length} samples tested successfully.`, {
          id: 'experiment-running',
          duration: 3000
        })
      }
      
      // Update usage stats
      const usageResponse = await api.getUsage()
      setUsage(usageResponse.data)
      
      // Show upgrade message if present
      if (response.data.upgrade_message) {
        setTimeout(() => {
          toast(response.data.upgrade_message, {
            duration: 5000
          })
        }, 2000)
      }
    } catch (error) {
      // Handle error with centralized handler
      const errorInfo = handleError(error, 'Experiment')
      
      // Clear loading toast
      toast.dismiss('experiment-running')
      
      // Show specific help messages
      if (errorInfo.type === 'AUTH_ERROR' || 
          (typeof error.response?.data?.detail === 'string' && 
           error.response?.data?.detail?.includes('API key'))) {
        setTimeout(() => {
          toast('💡 Click "API Settings" in the header to configure your API keys', {
            duration: 7000
          })
        }, 1000)
      }
      
      if (errorInfo.type === 'RATE_LIMIT') {
        setTimeout(() => {
          toast('Upgrade to Pro for unlimited experiments!', {
            duration: 5000,
            icon: '🚀'
          })
        }, 2000)
      }
    } finally {
      setIsRunning(false)
      setLoading(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target.result
          const jsonData = JSON.parse(text)
          let samples = []
          
          // QA dataset formatı
          if (jsonData.qa_pairs) {
            samples = jsonData.qa_pairs.map(pair => ({
              text: pair.question,
              expected_answer: pair.answer
            }))
            // System context varsa otomatik doldur
            if (jsonData.system_context) {
              setSystemContext(jsonData.system_context)
              // Prompt template'i de basit bir şekilde güncelle
              setPrompt('Answer this question helpfully: {text}')
            }
          } 
          // Array formatı
          else if (Array.isArray(jsonData)) {
            samples = jsonData.map(item => ({
              text: item.question || item.text || item,
              expected_answer: item.answer || item.expected_answer || ''
            }))
          }
          // Basit text array
          else if (jsonData.samples || jsonData.texts) {
            const items = jsonData.samples || jsonData.texts
            samples = items.map(item => ({ text: item }))
          }
          
          setTestSamples(samples)
          toast.success(`Loaded ${samples.length} samples from JSON`)
        } catch (error) {
          toast.error('Failed to parse JSON file. Please check the format.')
        }
      }
      reader.readAsText(file)
    } else {
      toast.error('Please upload a JSON file')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">Create Experiment</h2>
      
      {/* Complete Prompt Template */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {systemContext ? 'Complete Prompt Template (System Context + Prompt)' : 'Prompt Template'}
        </label>
        <textarea
          value={systemContext ? `${systemContext}\n\n${prompt}` : prompt}
          onChange={(e) => {
            const value = e.target.value
            if (systemContext) {
              // System context varsa, sadece prompt kısmını güncelle
              const contextEnd = value.indexOf('\n\n')
              if (contextEnd > -1) {
                const newContext = value.substring(0, contextEnd)
                const newPrompt = value.substring(contextEnd + 2)
                setSystemContext(newContext)
                setPrompt(newPrompt)
              } else {
                // Eğer \n\n yoksa tamamını system context yap
                setSystemContext(value)
              }
            } else {
              setPrompt(value)
            }
          }}
          disabled={isRunning}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            isRunning ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-300'
          }`}
          rows={systemContext ? "8" : "4"}
          placeholder={systemContext ? "System context and prompt are combined here..." : "Enter your prompt template with {variables}"}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Use {`{text}`} for variable substitution
          </p>
          {systemContext && (
            <button
              onClick={() => {
                setSystemContext('')
                // Prompt'u koru
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove System Context
            </button>
          )}
          {!systemContext && (
            <button
              onClick={() => setSystemContext('You are a helpful assistant.')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Add System Context
            </button>
          )}
        </div>
      </div>

      {/* Model Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={isRunning}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            isRunning ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-300'
          }`}
        >
          {MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Test Samples */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Test Samples ({testSamples.length})
          </label>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700">
              <Upload className="w-4 h-4" />
              <span>Upload JSON Dataset</span>
            </span>
          </label>
        </div>
        
        {/* Sample List */}
        <div className="space-y-2 mb-2 max-h-40 overflow-y-auto">
          {testSamples.map((sample, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700 truncate flex-1">
                {sample.text}
              </span>
              <button
                onClick={() => handleRemoveSample(index)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        {/* Add Sample */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={sampleInput}
            onChange={(e) => setSampleInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSample()}
            placeholder="Add a test question or sample..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            onClick={handleAddSample}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg transition ${
              isRunning 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Add
          </button>
        </div>
        
        {testSamples.length >= 8 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Approaching 10 sample limit. Pro version supports 10,000+ samples!
            </p>
          </div>
        )}
      </div>

      {/* Run Button */}
      <button
        onClick={handleRunExperiment}
        disabled={isRunning}
        className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition ${
          isRunning 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {isRunning ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Running Experiment... ({testSamples.length} samples)</span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            <span>Run Experiment</span>
          </>
        )}
      </button>
    </div>
  )
}

export default PromptTester
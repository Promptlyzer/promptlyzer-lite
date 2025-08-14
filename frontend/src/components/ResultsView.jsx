import { useState, useEffect } from 'react'
import { CheckCircle, DollarSign, Zap, TrendingUp, Download, ChevronDown, ChevronUp, XCircle, Star } from 'lucide-react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Cell } from 'recharts'
import toast from 'react-hot-toast'
import RatingModal from './RatingModal'
import api from '../services/api'

function ResultsView({ results, loading, autoOpenRating = false, onRatingClose }) {
  const [showSamples, setShowSamples] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [manualAccuracy, setManualAccuracy] = useState(null)
  const [allExperiments, setAllExperiments] = useState([])
  
  // Auto-open rating modal when new results arrive (only if there are successful samples)
  useEffect(() => {
    if (autoOpenRating && results && results.sample_results && results.sample_results.length > 0) {
      // Check if at least one sample was successful
      const hasSuccessfulSamples = results.sample_results.some(sample => sample.success)
      
      if (hasSuccessfulSamples) {
        // Kısa bir gecikme ile modal'ı aç
        setTimeout(() => {
          setShowRatingModal(true)
        }, 1000)
      }
    }
  }, [results, autoOpenRating])
  
  // Fetch all experiments for comparison chart
  useEffect(() => {
    fetchAllExperiments()
  }, [results, manualAccuracy])
  
  const fetchAllExperiments = async () => {
    try {
      const response = await api.getExperiments()
      const experiments = response.data.experiments || []
      
      // Get manual ratings from localStorage
      const savedRatings = localStorage.getItem('manualRatings')
      const manualRatings = savedRatings ? JSON.parse(savedRatings) : {}
      
      // Merge manual ratings with experiments
      const experimentsWithRatings = experiments.map(exp => {
        if (manualRatings[exp.experiment_id]) {
          return {
            ...exp,
            accuracy: manualRatings[exp.experiment_id].accuracy,
            has_manual_rating: true
          }
        }
        return exp
      })
      
      setAllExperiments(experimentsWithRatings)
    } catch (error) {
      console.error('Failed to fetch experiments:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (!results) return null

  const handleSaveRatings = (ratings, averageAccuracy) => {
    setManualAccuracy(averageAccuracy)
    
    // Save to localStorage
    const savedRatings = localStorage.getItem('manualRatings')
    const manualRatings = savedRatings ? JSON.parse(savedRatings) : {}
    manualRatings[results.experiment_id] = {
      ratings,
      accuracy: averageAccuracy
    }
    localStorage.setItem('manualRatings', JSON.stringify(manualRatings))
    
    // Refresh experiments list to update chart
    fetchAllExperiments()
  }

  const displayAccuracy = manualAccuracy !== null ? manualAccuracy : results.accuracy

  const exportResults = () => {
    // Create comprehensive JSON export
    const exportData = {
      metadata: {
        experiment_id: results.experiment_id,
        export_date: new Date().toISOString(),
        version: "1.0"
      },
      experiment: {
        prompt: results.prompt,
        model: results.model,
        created_at: results.created_at,
        samples_tested: results.samples_tested,
        successful_samples: results.sample_results?.filter(s => s.success).length || 0
      },
      performance: {
        accuracy: displayAccuracy.toFixed(2),
        avg_tokens: results.avg_tokens,
        total_tokens: results.sample_results?.reduce((sum, s) => sum + (s.tokens || 0), 0) || 0,
        estimated_cost: results.estimated_cost,
        total_cost: results.sample_results?.reduce((sum, s) => sum + (s.cost || 0), 0) || 0
      },
      samples: results.sample_results?.map((sample, index) => ({
        sample_number: index + 1,
        input: sample.input,
        output: sample.output || null,
        success: sample.success,
        tokens: sample.tokens || 0,
        cost: sample.cost || 0,
        accuracy: sample.accuracy || 0,
        error: sample.error || null,
        expected: sample.expected || null
      })) || [],
      manual_rating: manualAccuracy !== null ? {
        manual_accuracy: manualAccuracy,
        rated_at: new Date().toISOString()
      } : null
    }
    
    // Create and download JSON file
    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `experiment-${results.experiment_id}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Results exported as JSON!')
    toast('Pro version includes API integration and automated analysis', {
      duration: 4000
    })
  }

  // Prepare data for accuracy vs cost scatter chart - only show evaluated experiments
  const chartData = allExperiments
    .filter(exp => exp.accuracy > 0 && exp.estimated_cost) // Only experiments with real accuracy
    .map(exp => ({
      name: `${exp.model} #${exp.experiment_id}`,
      model: exp.model,
      experimentId: exp.experiment_id,
      accuracy: exp.accuracy,
      cost: exp.estimated_cost * 1000, // Convert to show in dollars * 1000 for better visibility
      tokens: exp.avg_tokens * exp.samples_tested,
      isCurrent: exp.experiment_id === results.experiment_id,
      samples: exp.samples_tested
    }))
  
  // Custom tooltip for the scatter chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{data.model}</p>
          <p className="text-xs font-mono text-gray-500">Experiment #{data.experimentId}</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-600">Accuracy: {data.accuracy.toFixed(1)}%</p>
            <p className="text-xs text-gray-600">Cost: ${(data.cost / 1000).toFixed(4)}</p>
            <p className="text-xs text-gray-600">Tokens: {data.tokens.toLocaleString()}</p>
            <p className="text-xs text-gray-600">Samples: {data.samples}</p>
          </div>
        </div>
      )
    }
    return null
  }
  
  // Custom dot to highlight current experiment
  const CustomDot = (props) => {
    const { cx, cy, payload } = props
    if (payload.isCurrent) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={8} fill="#0ea5e9" stroke="#fff" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={12} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeOpacity={0.5} />
        </g>
      )
    }
    return <circle cx={cx} cy={cy} r={6} fill="#6366f1" opacity={0.8} />
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Experiment Results</h2>
        <div className="flex items-center space-x-2">
          {results.sample_results && results.sample_results.length > 0 && (
            <button
              onClick={() => setShowRatingModal(true)}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <Star className="w-4 h-4" />
              <span>{manualAccuracy !== null ? 'Re-rate' : 'Rate Responses'}</span>
            </button>
          )}
          <button
            onClick={exportResults}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Success/Failure Summary */}
      {results.sample_results && (
        (() => {
          const successCount = results.sample_results.filter(s => s.success).length
          const failCount = results.sample_results.filter(s => !s.success).length
          const successRate = (successCount / results.sample_results.length) * 100
          
          return failCount > 0 ? (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Partial Success:</strong> {successCount} of {results.sample_results.length} samples completed successfully ({successRate.toFixed(0)}% success rate).
                {failCount === 1 ? ' 1 sample failed.' : ` ${failCount} samples failed.`}
              </p>
            </div>
          ) : null
        })()
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Accuracy {manualAccuracy !== null && '(Manual)'}
            </span>
          </div>
          <p className="text-2xl font-bold text-green-900">{displayAccuracy.toFixed(1)}%</p>
          {manualAccuracy === null && results.sample_results && (
            <p className="text-xs text-green-700 mt-1">Click "Rate Responses" for manual rating</p>
          )}
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Est. Cost</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">${results.estimated_cost.toFixed(3)}</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Avg Tokens</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{results.avg_tokens}</p>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Samples</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{results.samples_tested}</p>
        </div>
      </div>

      {/* Accuracy vs Cost Comparison Chart */}
      {chartData.length > 0 ? (
        <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Accuracy vs Cost Analysis</h3>
          <p className="text-xs text-gray-500 mb-3">Showing only evaluated experiments with accuracy scores</p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="cost" 
                name="Cost" 
                unit="$"
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                tickFormatter={(value) => `$${(value / 1000).toFixed(3)}`}
                stroke="#6b7280"
              >
                <Label value="Cost per Experiment ($)" position="insideBottom" offset={-5} style={{ fill: '#374151' }} />
              </XAxis>
              <YAxis 
                dataKey="accuracy" 
                name="Accuracy" 
                unit="%"
                domain={[0, 100]}
                stroke="#6b7280"
              >
                <Label value="Accuracy (%)" angle={-90} position="insideLeft" style={{ fill: '#374151' }} />
              </YAxis>
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter 
                name="Experiments" 
                data={chartData} 
                fill="#6366f1"
                shape={<CustomDot />}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isCurrent ? "#0ea5e9" : "#6366f1"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-indigo-500 rounded-full mr-1"></span>
                Previous experiments
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 bg-cyan-500 rounded-full mr-1 ring-2 ring-cyan-500 ring-opacity-50"></span>
                Current experiment
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {chartData.length} evaluated experiment{chartData.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-2">No evaluated experiments yet</p>
          <p className="text-xs text-gray-500">Rate your experiments to see the accuracy vs cost analysis</p>
        </div>
      )}

      {/* Experiment Details */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Experiment Details</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Experiment ID:</span>
            <span className="font-mono text-gray-900">{results.experiment_id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Model:</span>
            <span className="text-gray-900">{results.model}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Created:</span>
            <span className="text-gray-900">{new Date(results.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Prompt Display */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs font-medium text-gray-500 mb-1">Tested Prompt:</p>
        <p className="text-sm font-mono text-gray-700">{results.prompt}</p>
      </div>

      {/* Sample Results Section */}
      {results.sample_results && results.sample_results.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowSamples(!showSamples)}
            className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <span className="text-sm font-medium text-gray-700">
              View Sample Results ({results.sample_results.length} samples)
            </span>
            {showSamples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showSamples && (
            <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
              {results.sample_results.map((sample, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-600">Sample {idx + 1}</span>
                    <div className="flex items-center space-x-3">
                      {sample.success ? (
                        <span className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 text-sm">
                          <XCircle className="w-4 h-4 mr-1" />
                          Failed
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {sample.accuracy?.toFixed(0)}% accuracy
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Input:</label>
                      <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded">{sample.input}</p>
                    </div>
                    
                    {sample.expected && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500">Expected Answer:</label>
                        <p className="text-sm text-gray-700 mt-1 p-2 bg-green-50 rounded">{sample.expected}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-500">
                        {sample.success ? 'AI Response:' : 'Error:'}
                      </label>
                      <p className={`text-sm mt-1 p-2 rounded ${
                        sample.success ? 'text-gray-700 bg-blue-50' : 'text-red-700 bg-red-50'
                      }`}>
                        {sample.success ? (sample.output || 'No response') : (sample.error || 'Unknown error occurred')}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 pt-2 border-t">
                      <span>Tokens: {sample.tokens}</span>
                      <span>Cost: ${sample.cost?.toFixed(4)}</span>
                      <span>Accuracy: {sample.accuracy?.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false)
          if (onRatingClose) onRatingClose()
        }}
        samples={results.sample_results}
        onSaveRatings={handleSaveRatings}
      />
    </div>
  )
}

export default ResultsView
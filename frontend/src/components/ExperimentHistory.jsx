import { useState, useEffect } from 'react'
import { Clock, ChevronDown, ChevronUp, Database, DollarSign, Zap, CheckCircle, XCircle, Star, Trash2 } from 'lucide-react'
import api from '../services/api'
import RatingModal from './RatingModal'
import toast from 'react-hot-toast'

function ExperimentHistory({ currentExperiment }) {
  const [experiments, setExperiments] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedExperiment, setSelectedExperiment] = useState(null)
  const [isClearing, setIsClearing] = useState(false)
  
  // Load manual ratings from localStorage
  const [manualRatings, setManualRatings] = useState(() => {
    const saved = localStorage.getItem('manualRatings')
    return saved ? JSON.parse(saved) : {}
  })

  useEffect(() => {
    fetchExperiments()
  }, [currentExperiment])
  
  // Save manual ratings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('manualRatings', JSON.stringify(manualRatings))
  }, [manualRatings])

  const fetchExperiments = async () => {
    setLoading(true)
    try {
      const response = await api.getExperiments()
      const exps = response.data.experiments || []
      
      // Manual rating'leri experiment'lere ekle
      const experimentsWithManualRatings = exps.map(exp => {
        if (manualRatings[exp.experiment_id]) {
          return {
            ...exp,
            manual_accuracy: manualRatings[exp.experiment_id].accuracy,
            original_accuracy: exp.accuracy
          }
        }
        return exp
      })
      
      setExperiments(experimentsWithManualRatings)
    } catch (error) {
      console.error('Failed to fetch experiments:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }
  
  const handleRateExperiment = (exp) => {
    setSelectedExperiment(exp)
    setShowRatingModal(true)
  }
  
  const handleSaveRatings = (ratings, averageAccuracy) => {
    console.log('Saving ratings for experiment:', selectedExperiment.experiment_id, 'Accuracy:', averageAccuracy)
    
    // Manual rating'leri sakla
    const newRatings = {
      ...manualRatings,
      [selectedExperiment.experiment_id]: {
        ratings,
        accuracy: averageAccuracy
      }
    }
    setManualRatings(newRatings)
    
    // Experiment listesini güncelle
    setExperiments(experiments.map(exp => 
      exp.experiment_id === selectedExperiment.experiment_id
        ? { ...exp, manual_accuracy: averageAccuracy }
        : exp
    ))
  }
  
  const handleClearExperiments = async () => {
    if (!confirm('Are you sure you want to clear all experiments? This action cannot be undone.')) {
      return
    }
    
    setIsClearing(true)
    try {
      await api.resetData('experiments')
      toast.success('All experiments cleared successfully')
      setExperiments([])
      // Clear manual ratings from localStorage too
      localStorage.removeItem('manualRatings')
      setManualRatings({})
    } catch (error) {
      toast.error('Failed to clear experiments')
      console.error('Clear experiments error:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Experiment History</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Experiment History</h2>
        {experiments.length > 0 && (
          <button
            onClick={handleClearExperiments}
            disabled={isClearing}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
            title="Clear all experiments"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isClearing ? 'Clearing...' : 'Clear All'}</span>
          </button>
        )}
      </div>
      
      {experiments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No experiments yet</p>
          <p className="text-sm mt-1">Run your first experiment to see results here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {experiments.map((exp) => (
            <div key={exp.experiment_id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Summary Header */}
              <div 
                className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                onClick={() => toggleExpand(exp.experiment_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-mono text-gray-500">#{exp.experiment_id}</span>
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                        {exp.model}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(exp.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 truncate">
                      {exp.prompt.substring(0, 100)}...
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      {(() => {
                        const failedCount = exp.sample_results?.filter(s => !s.success).length || 0
                        const totalCount = exp.sample_results?.length || 0
                        const allFailed = failedCount === totalCount && totalCount > 0
                        
                        if (allFailed) {
                          return (
                            <span className="flex items-center text-red-600">
                              <XCircle className="w-4 h-4 mr-1" />
                              All {totalCount} samples failed
                            </span>
                          )
                        } else if (exp.manual_accuracy) {
                          return (
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {exp.manual_accuracy.toFixed(1)}% Accuracy
                            </span>
                          )
                        } else {
                          return (
                            <span className="flex items-center text-gray-400">
                              <Star className="w-4 h-4 mr-1" />
                              Not rated yet
                            </span>
                          )
                        }
                      })()}
                      <span className="flex items-center text-blue-600">
                        <Zap className="w-4 h-4 mr-1" />
                        {(exp.avg_tokens * exp.samples_tested) || 0} tokens
                      </span>
                      <span className="flex items-center text-yellow-600">
                        <DollarSign className="w-4 h-4 mr-1" />
                        ${exp.estimated_cost?.toFixed(6) || '0.000000'}
                      </span>
                      <span className="text-gray-500">
                        {exp.samples_tested} samples
                      </span>
                      {exp.sample_results && exp.sample_results.length > 0 && 
                       exp.sample_results.some(s => s.success) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRateExperiment(exp)
                          }}
                          className="flex items-center text-primary-600 hover:text-primary-700"
                        >
                          <Star className="w-4 h-4 mr-1" />
                          {manualRatings[exp.experiment_id] ? 'Re-rate' : 'Rate'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    {expandedId === exp.experiment_id ? 
                      <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === exp.experiment_id && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Prompt Template:</h4>
                    <pre className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">{exp.prompt}</pre>
                  </div>

                  {exp.sample_results && exp.sample_results.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Sample Results:</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {exp.sample_results.map((sample, idx) => (
                          <div key={idx} className="border border-gray-200 rounded p-3">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-500">Sample {idx + 1}</span>
                              <div className="flex items-center space-x-2">
                                {sample.success ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="text-xs text-gray-500">
                                  {manualRatings[exp.experiment_id]?.ratings[idx] 
                                    ? `${manualRatings[exp.experiment_id].ratings[idx] * 20}% (★${manualRatings[exp.experiment_id].ratings[idx]})`
                                    : `${sample.accuracy?.toFixed(0)}% match`}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-semibold text-gray-600">Input:</span>
                                <p className="text-gray-700 mt-1">{sample.input}</p>
                              </div>
                              
                              {sample.expected && (
                                <div>
                                  <span className="font-semibold text-gray-600">Expected:</span>
                                  <p className="text-gray-700 mt-1 bg-green-50 p-2 rounded">{sample.expected}</p>
                                </div>
                              )}
                              
                              <div>
                                <span className="font-semibold text-gray-600">
                                  {sample.success ? 'AI Response:' : 'Error:'}
                                </span>
                                <p className={`mt-1 p-2 rounded ${
                                  sample.success 
                                    ? 'text-gray-700 bg-blue-50' 
                                    : 'text-red-700 bg-red-50'
                                }`}>
                                  {sample.success 
                                    ? (sample.output || 'No response') 
                                    : (sample.error || 'Unknown error occurred')}
                                </p>
                              </div>
                              
                              <div className="flex items-center space-x-3 text-xs text-gray-500 pt-1">
                                <span>{sample.tokens} tokens</span>
                                <span>${sample.cost?.toFixed(4)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Rating Modal */}
      {selectedExperiment && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          samples={selectedExperiment.sample_results}
          onSaveRatings={handleSaveRatings}
        />
      )}
    </div>
  )
}

export default ExperimentHistory
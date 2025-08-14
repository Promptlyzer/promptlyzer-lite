import { useState, useEffect } from 'react'
import { Star, ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function RatingModal({ isOpen, onClose, samples, onSaveRatings, skipForNow = false }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [ratings, setRatings] = useState({})
  const [hoveredStar, setHoveredStar] = useState(0)
  
  // Filter only successful samples for rating
  const successfulSamples = samples ? samples.filter(s => s.success) : []

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0)
      setRatings({})
    }
  }, [isOpen])

  if (!isOpen || !successfulSamples || successfulSamples.length === 0) {
    // If there are no successful samples, show a message
    if (isOpen && samples && samples.length > 0 && successfulSamples.length === 0) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">No Samples to Rate</h2>
            <p className="text-gray-600 mb-6">
              All samples failed during execution. There are no successful responses to rate.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )
    }
    return null
  }

  const currentSample = successfulSamples[currentIndex]

  const handleRating = (rating) => {
    setRatings({
      ...ratings,
      [currentIndex]: rating
    })
    
    // Otomatik sonraki soruya geç
    setTimeout(() => {
      if (currentIndex < successfulSamples.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }, 300) // Kısa bir gecikme ile daha smooth geçiş
  }

  const handleNext = () => {
    if (currentIndex < successfulSamples.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSave = () => {
    // Check if all successful samples are rated
    const unratedCount = successfulSamples.length - Object.keys(ratings).length
    if (unratedCount > 0) {
      toast.error(`Please rate all samples (${unratedCount} remaining)`)
      return
    }

    // Calculate average accuracy (only for successful samples)
    const totalRating = Object.values(ratings).reduce((sum, rating) => sum + rating, 0)
    const averageAccuracy = Math.min(100, Math.max(0, (totalRating / successfulSamples.length) * 20)) // Convert 1-5 to 0-100%, ensure 0-100 range

    onSaveRatings(ratings, averageAccuracy)
    toast.success(`Evaluation complete! Accuracy: ${averageAccuracy.toFixed(1)}%`)
    onClose()
  }

  const getRatingDescription = (rating) => {
    const descriptions = {
      1: 'Poor - Completely wrong or irrelevant',
      2: 'Below Average - Partially correct but missing key points',
      3: 'Average - Acceptable but could be better',
      4: 'Good - Mostly correct with minor issues',
      5: 'Excellent - Perfect or near-perfect response'
    }
    return descriptions[rating] || ''
  }

  const currentRating = ratings[currentIndex] || 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Rate AI Responses</h2>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Sample {currentIndex + 1} of {successfulSamples.length}
              {samples.length > successfulSamples.length && (
                <span className="text-sm text-amber-600 ml-2">
                  ({samples.length - successfulSamples.length} failed samples excluded)
                </span>
              )}
            </p>
            <div className="flex items-center space-x-2">
              {[...Array(successfulSamples.length)].map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    ratings[idx] ? 'bg-green-500' : 
                    idx === currentIndex ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sample Content */}
        <div className="space-y-4 mb-6">
          {/* Input */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 mb-2 block">
              Input Question/Prompt:
            </label>
            <p className="text-gray-800">{currentSample.input}</p>
          </div>

          {/* Expected Answer (if provided) */}
          {currentSample.expected && (
            <div className="bg-green-50 rounded-lg p-4">
              <label className="text-sm font-semibold text-green-700 mb-2 block">
                Expected Answer (Reference):
              </label>
              <p className="text-gray-800">{currentSample.expected}</p>
            </div>
          )}

          {/* AI Response */}
          <div className="bg-blue-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-blue-700 mb-2 block">
              AI Response:
            </label>
            <p className="text-gray-800">
              {currentSample.output || currentSample.error || 'No response generated'}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Tokens: {currentSample.tokens}</span>
            <span>Cost: ${currentSample.cost?.toFixed(4)}</span>
          </div>
        </div>

        {/* Rating Section */}
        <div className="border-t pt-6">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">
            How accurate is this AI response?
          </label>
          
          {/* Star Rating */}
          <div className="flex items-center justify-center space-x-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="transition-all transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= (hoveredStar || currentRating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Rating Description */}
          <p className="text-center text-sm text-gray-600 mb-6 h-5">
            {getRatingDescription(hoveredStar || currentRating)}
          </p>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Rating Guidelines:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>5 stars:</strong> Perfect answer, exactly what you expected</li>
                  <li><strong>4 stars:</strong> Good answer with minor improvements needed</li>
                  <li><strong>3 stars:</strong> Acceptable but missing some important details</li>
                  <li><strong>2 stars:</strong> Poor answer, mostly incorrect or off-topic</li>
                  <li><strong>1 star:</strong> Completely wrong or didn't answer the question</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
              currentIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              {Object.keys(ratings).length === 0 ? 'Skip for now' : 'Cancel'}
            </button>
            
            {Object.keys(ratings).length === successfulSamples.length && (
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Ratings</span>
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === successfulSamples.length - 1}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
              currentIndex === successfulSamples.length - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Summary */}
        <div className="mt-4 text-center text-sm text-gray-500">
          {Object.keys(ratings).length === successfulSamples.length ? (
            <span className="text-green-600 font-semibold">
              ✓ All successful samples rated! Click "Save Ratings" to finish.
            </span>
          ) : (
            <span>
              {Object.keys(ratings).length} of {successfulSamples.length} successful samples rated
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default RatingModal
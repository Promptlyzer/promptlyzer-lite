import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Header from './components/Header'
import PromptTester from './components/PromptTester'
import ResultsView from './components/ResultsView'
import UsageStats from './components/UsageStats'
import UpgradePrompt from './components/UpgradePrompt'
import ExperimentHistory from './components/ExperimentHistory'

function App() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState(null)
  const [isNewExperiment, setIsNewExperiment] = useState(false)

  const handleExperimentComplete = (experimentResult) => {
    setResults(experimentResult)
    setIsNewExperiment(true) // Yeni experiment tamamlandı
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <PromptTester 
              onExperimentComplete={handleExperimentComplete}
              setLoading={setLoading}
              setUsage={setUsage}
            />
            
            {results && (
              <ResultsView 
                results={results} 
                loading={loading} 
                autoOpenRating={isNewExperiment}
                onRatingClose={() => setIsNewExperiment(false)}
              />
            )}
            
            <ExperimentHistory currentExperiment={results} />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <UsageStats usage={usage} />
            <UpgradePrompt />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
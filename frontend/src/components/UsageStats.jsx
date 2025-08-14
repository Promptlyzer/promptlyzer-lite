import { useEffect } from 'react'
import { Activity, Database, FileText, TrendingUp } from 'lucide-react'
import api from '../services/api'

function UsageStats({ usage }) {
  useEffect(() => {
    // Fetch initial usage stats
    const fetchUsage = async () => {
      try {
        const response = await api.getUsage()
        // Parent component should handle this
      } catch (error) {
        console.error('Failed to fetch usage', error)
      }
    }
    fetchUsage()
  }, [])

  if (!usage) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Usage Statistics</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const usagePercentage = (usage.experiments_today / usage.max_experiments_per_day) * 100

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Usage Statistics</h3>
      
      <div className="space-y-4">
        {/* Total Experiments */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Total Experiments</span>
          </div>
          <span className="text-sm font-medium">
            {usage.experiments_today || 0}
          </span>
        </div>

        {/* Total Samples Tested */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Total Samples Tested</span>
          </div>
          <span className="text-sm font-medium">
            {usage.saved_prompts || 0}
          </span>
        </div>

        {/* Total Tokens Used */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Total Tokens Used</span>
          </div>
          <span className="text-sm font-medium">
            {(usage.total_tokens_used || 0).toLocaleString()}
          </span>
        </div>

        {/* Total Cost */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Total API Cost</span>
          </div>
          <span className="text-sm font-medium text-green-600">
            ${usage.total_cost?.toFixed(4) || '0.0000'}
          </span>
        </div>
      </div>

      {/* Warning Messages */}
      {usage.show_upgrade && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            {usage.upgrade_message || "You're approaching your daily limits!"}
          </p>
        </div>
      )}

      {usagePercentage >= 100 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Daily limit reached! Upgrade to Pro for unlimited access.
          </p>
          <a 
            href="https://promptlyzer.com" 
            target="_blank"
            className="inline-block mt-2 text-sm font-medium text-red-600 hover:text-red-700"
          >
            View Pricing →
          </a>
        </div>
      )}
    </div>
  )
}

export default UsageStats
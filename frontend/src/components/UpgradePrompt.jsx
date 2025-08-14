import { Sparkles, Check, ArrowRight } from 'lucide-react'

function UpgradePrompt() {
  const features = [
    "Automatic Prompt Optimization",
    "Smart Inference & Model Selection",
    "Production Dataset Generation",
    "Auto Accuracy Evaluation",
    "Adaptive Prompt System"
  ]

  return (
    <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
      <div className="flex items-center space-x-2 mb-3">
        <Sparkles className="w-6 h-6" />
        <h3 className="text-lg font-semibold">Upgrade to Pro</h3>
      </div>
      
      <p className="text-sm opacity-90 mb-4">
        Your prompts improve automatically based on production usage
      </p>
      
      <ul className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start space-x-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      
      <div className="space-y-3">
        <a
          href="https://promptlyzer.com"
          target="_blank"
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition font-medium"
        >
          <span>Explore</span>
          <ArrowRight className="w-4 h-4" />
        </a>
        
      </div>
    </div>
  )
}

export default UpgradePrompt
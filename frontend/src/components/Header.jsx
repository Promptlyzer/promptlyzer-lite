import { Beaker, Github, FileText } from 'lucide-react'
import ApiKeySettings from './ApiKeySettings'

function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Beaker className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Promptlyzer
                <span className="ml-2 px-2 py-1 text-xs font-normal bg-gray-100 text-gray-600 rounded-full">LITE</span>
              </h1>
              <p className="text-sm text-gray-500">Open Source Prompt Testing for Developers</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <ApiKeySettings />
            <a 
              href="http://localhost:8000/docs" 
              target="_blank"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <FileText className="w-5 h-5" />
              <span>API Docs</span>
            </a>
            <a 
              href="https://github.com/promptlyzer/promptlyzer-lite" 
              target="_blank"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </a>
            <a 
              href="https://promptlyzer.com" 
              target="_blank"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Upgrade to Pro
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
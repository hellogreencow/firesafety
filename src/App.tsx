import React, { useState, useEffect } from 'react';
import { ModelConfig } from './types';
import ModelSelector from './components/ModelSelector';
import Chat from './components/Chat';
import { Flame, Settings } from 'lucide-react';

function App() {
  console.log('App component rendering');
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    type: 'ollama',
    endpoint: 'http://localhost:11434',
    modelName: 'llama2',
    parameters: {
      temperature: 0.7,
      maxTokens: 2048,
    },
  });
  const [showModelConfig, setShowModelConfig] = useState(false);

  useEffect(() => {
    console.log('App mounted');
  }, []);

  // Add a simple error boundary
  if (!ModelSelector || !Chat) {
    console.error('Components not loaded properly');
    return <div className="text-white p-4">Error loading components</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,56,56,0.1),transparent_80%)]" />
      
      {/* Header */}
      <header className="relative bg-black/20 backdrop-blur-sm border-b border-white/10 py-4 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 backdrop-blur-sm rounded-lg border border-primary-500/30">
              <Flame className="w-6 h-6 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Fire Safety AI Assistant
            </h1>
          </div>
          
          {/* Model Configuration Button */}
          <button
            onClick={() => setShowModelConfig(!showModelConfig)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Model Settings</span>
          </button>
        </div>
      </header>

      {/* Model Configuration Dropdown */}
      <div className={`
        fixed right-0 top-[72px] w-[400px] max-h-[calc(100vh-72px)] overflow-y-auto
        bg-gray-900/95 backdrop-blur-sm border-l border-white/10 shadow-xl
        transform transition-transform duration-300 ease-in-out z-50
        ${showModelConfig ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-4">
          <ModelSelector config={modelConfig} onConfigChange={setModelConfig} />
        </div>
      </div>

      {/* Main Chat Area */}
      <main className="container mx-auto p-4 h-[calc(100vh-88px)]">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 h-full shadow-xl overflow-hidden">
          <Chat modelConfig={modelConfig} />
        </div>
      </main>
    </div>
  );
}

export default App;
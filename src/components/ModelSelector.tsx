import React, { useEffect, useState } from 'react';
import { Settings, Server, Brain, AlertCircle, ChevronDown } from 'lucide-react';
import { ModelConfig, OllamaModel } from '../types';
import axios from 'axios';
import OllamaInstaller from './OllamaInstaller';

interface ModelSelectorProps {
  config: ModelConfig;
  onConfigChange: (config: ModelConfig) => void;
}

export default function ModelSelector({ config, onConfigChange }: ModelSelectorProps) {
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [showInstaller, setShowInstaller] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const axiosInstance = axios.create({
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: 2000,
    withCredentials: false // This is important for CORS
  });

  const fetchOllamaModels = async () => {
    if (config.type !== 'ollama') return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching Ollama models...');
      const response = await axiosInstance.get(`${config.endpoint}/api/tags`);
      console.log('Models response:', response.data);
      
      if (response.data && Array.isArray(response.data.models)) {
        setOllamaModels(response.data.models);
        setConnectionStatus('connected');
        setShowInstaller(false);
      } else {
        console.error('Invalid response format:', response.data);
        throw new Error('Invalid response format from Ollama');
      }
    } catch (err: any) {
      console.error('Error fetching models:', err);
      const isConnectionRefused = err.message.includes('Network Error') || 
                                err.message.includes('Connection refused') || 
                                err.code === 'ECONNREFUSED';
      
      if (isConnectionRefused) {
        setError('Ollama is not running. Please start Ollama first by running "ollama serve" in your terminal.');
        setShowInstaller(false);
      } else if (err.code === 'ECONNABORTED') {
        setError('Connection timeout. Is Ollama running on the correct port?');
        setShowInstaller(false);
      } else {
        setError('Could not connect to Ollama. Is it installed? Click below to install.');
        setShowInstaller(true);
      }
      setConnectionStatus('disconnected');
      setOllamaModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnection = async () => {
    if (config.type !== 'ollama') return;
    
    setConnectionStatus('checking');
    try {
      // First check if Ollama is running using version endpoint
      console.log('Checking Ollama version at:', config.endpoint);
      const versionResponse = await axiosInstance.get(`${config.endpoint}/api/version`)
        .catch(err => {
          console.error('Version check details:', {
            message: err.message,
            code: err.code,
            response: err.response,
            config: err.config
          });
          throw err;
        });

      console.log('Version response:', versionResponse.data);
      
      // If version check succeeds, try to get the models
      console.log('Checking Ollama models...');
      const response = await axiosInstance.get(`${config.endpoint}/api/tags`)
        .catch(err => {
          console.error('Models check details:', {
            message: err.message,
            code: err.code,
            response: err.response,
            config: err.config
          });
          throw err;
        });
      
      console.log('Models response:', response.data);

      if (response.data && Array.isArray(response.data.models)) {
        console.log('Successfully connected to Ollama:', response.data.models);
        setOllamaModels(response.data.models);
        setConnectionStatus('connected');
        setShowInstaller(false);
        setError(null);
      } else {
        console.error('Invalid response format:', response.data);
        throw new Error('Invalid response format from Ollama');
      }
    } catch (err: any) {
      console.error('Connection error details:', {
        message: err.message,
        code: err.code,
        response: err.response,
        config: err.config,
        stack: err.stack
      });
      
      setConnectionStatus('disconnected');
      
      if (err.message.includes('Network Error')) {
        setError('Cannot connect to Ollama. Please ensure Ollama is running.');
        setShowInstaller(false);
      } else if (err.code === 'ECONNABORTED') {
        setError('Connection timeout. Is Ollama running on the correct port?');
        setShowInstaller(false);
      } else {
        const errorMessage = err.response?.data?.error || err.message;
        setError(`Could not connect to Ollama: ${errorMessage}`);
        setShowInstaller(false);
      }
      setOllamaModels([]);
    }
  };

  const retryConnection = async () => {
    console.log('Manually retrying connection...');
    setError(null);
    await checkConnection();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (config.type === 'ollama') {
      console.log('Starting connection checks...');
      checkConnection();
      interval = setInterval(checkConnection, 5000);
    }

    return () => {
      if (interval) {
        console.log('Stopping connection checks...');
        clearInterval(interval);
      }
    };
  }, [config.type, config.endpoint]);

  const handleModelTypeChange = (type: ModelConfig['type']) => {
    const newConfig: ModelConfig = {
      ...config,
      type,
      endpoint: type === 'ollama' 
        ? 'http://localhost:11434' 
        : type === 'lmstudio'
          ? 'http://localhost:1234/v1/chat/completions'
          : '',
      modelName: type === 'ollama' ? '' : '',
    };
    onConfigChange(newConfig);
  };

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="text-white">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Model Type</label>
            <div className="text-xs text-white/60">
              <code className="bg-black/30 px-1.5 py-0.5 rounded">{config.endpoint}</code>
            </div>
          </div>
          <select
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors text-sm"
            value={config.type}
            onChange={(e) => handleModelTypeChange(e.target.value as ModelConfig['type'])}
          >
            <option value="ollama" className="bg-gray-900">Ollama (Local AI Model Server)</option>
            <option value="lmstudio" className="bg-gray-900">LM Studio (Local OpenAI Compatible)</option>
            <option value="custom" className="bg-gray-900">Custom Endpoint</option>
          </select>
        </div>

        {config.type === 'ollama' && showInstaller && (
          <div className="mb-4">
            <OllamaInstaller onComplete={fetchOllamaModels} />
          </div>
        )}

        {config.type === 'ollama' && connectionStatus === 'connected' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Model Selection</label>
                <button
                  onClick={fetchOllamaModels}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Refresh Models
                </button>
              </div>
              {isLoading ? (
                <div className="text-sm text-white/60">Loading models...</div>
              ) : ollamaModels.length > 0 ? (
                <div className="space-y-1">
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors text-sm"
                    value={config.modelName}
                    onChange={(e) => onConfigChange({ ...config, modelName: e.target.value })}
                  >
                    <option value="" className="bg-gray-900">Select a model</option>
                    {ollamaModels.map((model) => (
                      <option key={model.name} value={model.name} className="bg-gray-900">
                        {model.name}
                      </option>
                    ))}
                  </select>
                  {config.modelName && (
                    <div className="text-xs text-white/60">
                      {ollamaModels.find(m => m.name === config.modelName)?.size && (
                        <p>Size: {formatSize(ollamaModels.find(m => m.name === config.modelName)?.size || 0)}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white/60">No models found. Pull a model using the Ollama CLI first.</div>
              )}
            </div>

            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors w-full justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/10"
              >
                <span>Advanced Parameters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-3 bg-black/20 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-white/80">Temperature</label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors text-sm"
                        value={config.parameters?.temperature ?? 0.7}
                        onChange={(e) => onConfigChange({
                          ...config,
                          parameters: { ...config.parameters, temperature: parseFloat(e.target.value) }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-white/80">Max Tokens</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors text-sm"
                        value={config.parameters?.maxTokens ?? 2048}
                        onChange={(e) => onConfigChange({
                          ...config,
                          parameters: { ...config.parameters, maxTokens: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-white/80">Top P</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors text-sm"
                        value={config.parameters?.topP ?? 0.9}
                        onChange={(e) => onConfigChange({
                          ...config,
                          parameters: { ...config.parameters, topP: parseFloat(e.target.value) }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-white/80">Frequency Penalty</label>
                      <input
                        type="number"
                        min="-2"
                        max="2"
                        step="0.1"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors text-sm"
                        value={config.parameters?.frequencyPenalty ?? 0}
                        onChange={(e) => onConfigChange({
                          ...config,
                          parameters: { ...config.parameters, frequencyPenalty: parseFloat(e.target.value) }
                        })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white/80">Presence Penalty</label>
                    <input
                      type="number"
                      min="-2"
                      max="2"
                      step="0.1"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors text-sm"
                      value={config.parameters?.presencePenalty ?? 0}
                      onChange={(e) => onConfigChange({
                        ...config,
                        parameters: { ...config.parameters, presencePenalty: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {config.type !== 'ollama' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Endpoint URL</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors text-sm"
                value={config.endpoint}
                onChange={(e) => onConfigChange({ ...config, endpoint: e.target.value })}
                placeholder="http://localhost:xxxx"
              />
              {config.type === 'lmstudio' && (
                <p className="mt-1 text-xs text-white/60">Default: http://localhost:1234/v1/chat/completions</p>
              )}
            </div>

            {config.type !== 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2">Model Name</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors text-sm"
                  value={config.modelName}
                  onChange={(e) => onConfigChange({ ...config, modelName: e.target.value })}
                  placeholder="Enter model name"
                />
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400">{error}</p>
                {error.includes('not running') && (
                  <div className="mt-2 bg-black/20 rounded p-2">
                    <p className="text-xs text-white/80 mb-1">To start Ollama:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-xs text-white/70">
                      <li>Open Terminal</li>
                      <li>
                        Run: <code className="bg-black/30 px-1.5 py-0.5 rounded text-primary-400">ollama serve</code>
                      </li>
                      <li>Keep the terminal window open</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-black/20 rounded-lg p-3">
          <h3 className="text-xs font-medium mb-2 text-white/80">Connection Status</h3>
          <div className="space-y-1.5 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <div className={`
                w-2 h-2 rounded-full 
                ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'}
                ${connectionStatus !== 'checking' ? 'animate-pulse' : ''}
              `} />
              <span>
                {connectionStatus === 'checking' ? 'Checking Connection...' :
                 connectionStatus === 'connected' ? 'Connected to Ollama' :
                 'Not Connected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Auto-retry:</span>
              <span>Every 5s</span>
            </div>
            <div className="flex justify-between">
              <span>Timeout:</span>
              <span>2s</span>
            </div>
            {connectionStatus === 'connected' && (
              <div className="flex justify-between">
                <span>Last Check:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
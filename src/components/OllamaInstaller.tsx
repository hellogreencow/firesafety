import React, { useState, useEffect } from 'react';
import { Download, Check, Loader2, AlertCircle, Terminal } from 'lucide-react';
import axios from 'axios';

interface OllamaInstallerProps {
  onComplete: () => void;
}

export default function OllamaInstaller({ onComplete }: OllamaInstallerProps) {
  const [status, setStatus] = useState<'checking' | 'not_running' | 'not_installed'>('checking');
  const [isChecking, setIsChecking] = useState(false);

  const axiosInstance = axios.create({
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: 2000,
    withCredentials: false
  });

  const checkOllama = async () => {
    if (isChecking) return;
    setIsChecking(true);
    
    try {
      console.log('Checking Ollama installation...');
      // First try version endpoint (faster)
      const versionResponse = await axiosInstance.get('http://localhost:11434/api/version');
      console.log('Version response:', versionResponse.data);

      // If version check succeeds, try models endpoint to ensure full functionality
      const modelsResponse = await axiosInstance.get('http://localhost:11434/api/tags');
      console.log('Models response:', modelsResponse.data);

      if (modelsResponse.data && Array.isArray(modelsResponse.data.models)) {
        onComplete();
        return true;
      } else {
        console.error('Invalid response format:', modelsResponse.data);
        throw new Error('Invalid response format from Ollama');
      }
    } catch (err: any) {
      console.error('Ollama check error:', err);
      
      const isConnectionRefused = err.message.includes('Network Error') || 
                                err.message.includes('Connection refused') ||
                                err.code === 'ECONNREFUSED';
      
      setStatus(isConnectionRefused ? 'not_running' : 'not_installed');
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    checkOllama();
    interval = setInterval(checkOllama, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckInstallation = async () => {
    setStatus('checking');
    await checkOllama();
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-500/20 rounded-lg">
          <Terminal className="w-6 h-6 text-primary-500" />
        </div>
        <h2 className="text-xl font-semibold text-white">
          {status === 'not_running' ? 'Start Ollama' : 'Install Ollama'}
        </h2>
      </div>

      {status === 'checking' ? (
        <div className="flex items-center gap-3 text-white/70">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Checking Ollama status...</span>
        </div>
      ) : status === 'not_running' ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-white/90">
            <AlertCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Ollama is installed but not running</p>
              <p className="text-sm text-white/70 mt-1">Follow these steps to start Ollama:</p>
            </div>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-4">
            <ol className="list-decimal list-inside space-y-3 text-white/80">
              <li>Open Terminal</li>
              <li>
                Run this command:
                <div className="mt-2 bg-black/50 p-2 rounded flex items-center gap-2">
                  <code className="text-primary-400 font-mono">ollama serve</code>
                  <button
                    onClick={() => navigator.clipboard.writeText('ollama serve')}
                    className="p-1 hover:bg-white/5 rounded"
                    title="Copy to clipboard"
                  >
                    <Terminal className="w-4 h-4 text-white/40" />
                  </button>
                </div>
              </li>
              <li>Keep the terminal window open</li>
            </ol>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleCheckInstallation}
              disabled={isChecking}
              className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Check Connection</span>
                </>
              )}
            </button>
            <span className="text-sm text-white/40">Auto-retrying every 5s</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-white/90">
            <Download className="w-5 h-5 text-primary-500 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Ollama needs to be installed</p>
              <p className="text-sm text-white/70 mt-1">Visit the official website to download and install Ollama:</p>
            </div>
          </div>
          
          <a
            href="https://ollama.ai/download"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-primary-500/20 text-primary-400 rounded-lg p-4 hover:bg-primary-500/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span>Download Ollama</span>
              <Download className="w-4 h-4" />
            </div>
          </a>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleCheckInstallation}
              disabled={isChecking}
              className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Check Installation</span>
                </>
              )}
            </button>
            <span className="text-sm text-white/40">Auto-retrying every 5s</span>
          </div>
        </div>
      )}
    </div>
  );
}
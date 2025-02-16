export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
}

export interface ModelConfig {
  type: 'ollama' | 'lmstudio' | 'custom';
  endpoint: string;
  modelName?: string;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}
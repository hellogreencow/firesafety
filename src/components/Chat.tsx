import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Upload, X, FileText, Image as ImageIcon, Database, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { ModelConfig } from '../types';
import { FIRE_INSPECTION_PROMPT } from '../types/prompts';
import { initializeDatabase, getRelevantTrainingData, logChatHistory, updateTrainingDataUsage, TrainingData } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

interface ChatProps {
  modelConfig: ModelConfig;
}

interface FileUpload {
  id: string;
  name: string;
  type: string;
  url: string;
  base64?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  timestamp: number;
  attachments?: FileUpload[];
}

const SYSTEM_PROMPT = `You are a Fire Safety AI Assistant, specializing in fire safety, prevention, and emergency procedures. Provide accurate, safety-focused advice based on established protocols. Always prioritize life safety over property protection. Be clear and direct, especially for emergency instructions. If information exists in the knowledge base, use it as your primary source.`;

export default function Chat({ modelConfig }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_FILE_SIZE = 500 * 1024 * 1024 * 1024; // 500GB in bytes

  const axiosInstance = axios.create({
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: 10000, // Longer timeout for chat responses
    withCredentials: false // This is important for CORS
  });

  useEffect(() => {
    initializeDatabase();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File size must be less than 500GB. ${file.name} is too large.`);
        return;
      }

      console.log('Processing file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            const upload: FileUpload = {
              id: uuidv4(),
              name: file.name,
              type: file.type,
              url: result, // Use the base64 data directly as the URL
              base64: result
            };
            console.log('Image loaded successfully:', {
              name: file.name,
              type: file.type,
              size: file.size,
              hasBase64: !!result
            });
            setUploads(prev => [...prev, upload]);
          }
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', error, file);
          alert(`Error reading file ${file.name}`);
        };
        reader.readAsDataURL(file);
      } else {
        // Handle non-image files
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            const upload: FileUpload = {
              id: uuidv4(),
              name: file.name,
              type: file.type,
              url: result
            };
            setUploads(prev => [...prev, upload]);
          }
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', error, file);
          alert(`Error reading file ${file.name}`);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeUpload = (id: string) => {
    setUploads(prev => {
      const uploadToRemove = prev.find(u => u.id === id);
      if (uploadToRemove && uploadToRemove.type.startsWith('image/')) {
        URL.revokeObjectURL(uploadToRemove.url);
      }
      return prev.filter(upload => upload.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && uploads.length === 0 || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: input.trim(),
      id: Date.now().toString(),
      timestamp: Date.now(),
      attachments: uploads.length > 0 ? [...uploads] : undefined
    };
    
    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get relevant training data
      const relevantData = (await getRelevantTrainingData(input.trim())) as TrainingData[];
      
      // Prepare file content with actual image data
      const fileContents = uploads.map(file => {
        if (file.type.startsWith('image/')) {
          // Use the stored base64 data for images
          const base64Data = file.base64?.split(',')[1] || '';
          return `[Image Analysis Request: ${file.name}]\nData: data:${file.type};base64,${base64Data}\n\nPlease analyze this image for fire safety concerns and provide detailed observations.`;
        } else if (file.type.startsWith('text/')) {
          return `[Text File: ${file.name}]\nContent: ${file.url}\n`;
        } else {
          return `[File: ${file.name} (${file.type})]\n`;
        }
      }).join('\n\n');

      // Construct the message with context from training data and files
      const contextMessage = [
        relevantData.length > 0 ? `Based on our knowledge base:\n${relevantData.map(data => 
          `Q: ${data.question}\nA: ${data.answer}\n`).join('\n')}` : '',
        fileContents ? `Analyzing the following files:\n${fileContents}` : '',
        input.trim() ? `Additional context or question from user: ${input.trim()}` : 'Please provide a detailed fire safety analysis of the uploaded files.'
      ].filter(Boolean).join('\n\n');

      // Always include system prompt in every message
      const messages = [{
        role: 'system',
        content: SYSTEM_PROMPT + "\n\nWhen analyzing images:\n1. Carefully examine the entire image\n2. Identify potential fire hazards\n3. Note safety equipment presence or absence\n4. Suggest specific improvements\n5. Provide actionable recommendations\n\n"
      }, {
        role: 'user',
        content: contextMessage
      }];

      const response = await axiosInstance.post(`${modelConfig.endpoint}/api/chat`, {
        model: modelConfig.modelName,
        messages: messages,
        stream: false,
        ...modelConfig.parameters,
      });

      // Log the chat history with file information
      await logChatHistory({
        sessionId,
        role: 'user',
        content: `${userMessage.content}${uploads.length > 0 ? '\n[Uploaded files: ' + uploads.map(f => f.name).join(', ') + ']' : ''}`,
        trainingDataId: relevantData[0]?.id
      });

      const assistantMessage = {
        role: 'assistant' as const,
        content: response.data.message.content,
        id: Date.now().toString(),
        timestamp: Date.now(),
        attachments: undefined // Ensure assistant messages never have attachments
      };

      setMessages(prev => prev.map(msg => ({
        ...msg,
        attachments: undefined // Clear attachments from all previous messages
      })).concat(assistantMessage));

      // Clear uploads after adding them to the message
      setUploads([]);

      // Log assistant's response
      await logChatHistory({
        sessionId,
        role: 'assistant',
        content: assistantMessage.content,
        trainingDataId: relevantData[0]?.id
      });

      // Update usage statistics for the training data
      if (relevantData[0]?.id) {
        await updateTrainingDataUsage(relevantData[0].id);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        id: Date.now().toString(),
        timestamp: Date.now(),
        attachments: undefined
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/70">
            <Bot className="w-16 h-16 mb-4" />
            <p className="text-xl font-medium">Welcome to Fire Safety AI Assistant</p>
            <p className="text-sm">Ask me anything about fire safety, prevention, or emergency procedures.</p>
            <p className="text-sm mt-4">You can also drag and drop files (up to 500GB) for analysis.</p>
            <div className="flex items-center gap-2 mt-4 text-sm text-primary-400">
              <Database className="w-4 h-4" />
              <span>Local knowledge base enabled</span>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-2xl px-4 py-2 
                ${message.role === 'user' 
                  ? 'bg-primary-500 text-white ml-4' 
                  : 'bg-white/10 text-white/90 mr-4'
                }
              `}
            >
              {message.attachments && message.attachments.length > 0 && (
                <div className="mb-2 space-y-2">
                  {message.attachments.map((file, fileIndex) => (
                    <div key={fileIndex} className="rounded-lg overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <div className="relative">
                          <img 
                            src={file.url} 
                            alt={file.name}
                            className="max-w-full h-auto rounded-lg"
                            onLoad={() => console.log('Image loaded:', file.name)}
                            onError={(e) => {
                              console.error('Error loading image:', file.name);
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                            }}
                          />
                          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                            {file.name}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                          <FileText className="w-4 h-4 text-primary-400" />
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-4 py-2 text-white/90 mr-4">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isDragging && (
        <div className="absolute inset-0 bg-primary-500/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border-2 border-dashed border-white/40">
            <Upload className="w-12 h-12 text-white mb-4 mx-auto" />
            <p className="text-white text-lg font-medium">Drop your files here</p>
            <p className="text-white/70 text-sm">Up to 500GB per file</p>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-white/10">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* File Upload Area */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              accept="image/*,application/pdf,text/*"
            />
            <div className="text-xs text-white/60">
              Supports files up to 500GB
            </div>
          </div>

          {/* Uploaded Files Display */}
          {uploads.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-lg">
              {uploads.map(upload => (
                <div
                  key={upload.id}
                  className="group relative flex items-center gap-2 px-2 py-1 bg-white/10 rounded-lg text-sm text-white/80"
                >
                  {upload.type.startsWith('image/') ? (
                    <div className="flex items-center gap-2">
                      <div className="relative w-12 h-12 rounded overflow-hidden">
                        <img 
                          src={upload.url} 
                          alt={upload.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="max-w-[150px] truncate">{upload.name}</span>
                    </div>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-primary-400" />
                      <span className="max-w-[150px] truncate">{upload.name}</span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeUpload(upload.id)}
                    className="absolute top-1 right-1 p-1 bg-black/40 hover:bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/10 transition-colors resize-none min-h-[52px] max-h-[200px] pr-12"
              style={{ height: '52px' }}
            />
            <button
              type="submit"
              disabled={(!input.trim() && uploads.length === 0) || isLoading}
              className={`
                absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg
                ${(input.trim() || uploads.length > 0) && !isLoading
                  ? 'text-primary-400 hover:text-primary-300 hover:bg-white/5'
                  : 'text-white/20'
                }
                transition-colors
              `}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
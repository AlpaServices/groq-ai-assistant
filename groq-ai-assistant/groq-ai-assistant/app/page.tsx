'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Upload, 
  FileText, 
  X, 
  Loader2,
  FolderOpen,
  Cloud,
  HardDrive
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fileName?: string;
}

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

export default function Home() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setInput(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, []);

  // Toggle voice recording
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      setError(null);
    }
  };

  // Text-to-speech
  const speakText = (text: string) => {
    if (!synthRef.current) return;

    // Stop any current speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadedFile({
          name: data.fileName,
          content: data.content,
          size: data.fileSize,
        });
      } else {
        setError(data.error || 'Failed to parse file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove uploaded file
  const removeFile = () => {
    setUploadedFile(null);
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() && !uploadedFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      fileName: uploadedFile?.name,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Build messages for API
      const apiMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      apiMessages.push({ role: 'user', content: userMessage.content });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          fileContent: uploadedFile?.content || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Auto-speak response if enabled
        if (autoSpeak) {
          speakText(data.message);
        }

        // Clear uploaded file after using it
        setUploadedFile(null);
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500">Powered by Llama 3 70B on Groq</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Auto-speak toggle */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`p-2 rounded-lg transition-colors ${
              autoSpeak ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}
            title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
          >
            {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Welcome to AI Assistant
            </h2>
            <p className="text-gray-500 mb-6">
              Chat with Llama 3 70B, upload documents, or use voice input
            </p>
            <div className="flex justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span>Upload files</span>
              </div>
              <div className="flex items-center gap-2">
                <Mic size={16} />
                <span>Voice input</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 size={16} />
                <span>Voice output</span>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              {message.fileName && (
                <div className={`text-xs mb-2 flex items-center gap-1 ${
                  message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  <FileText size={12} />
                  {message.fileName}
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.role === 'assistant' && (
                <button
                  onClick={() => speakText(message.content)}
                  className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <Volume2 size={12} />
                  Read aloud
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <Loader2 className="animate-spin text-gray-400" size={20} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Uploaded File Display */}
      {uploadedFile && (
        <div className="mx-6 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-600" size={20} />
            <span className="text-sm text-blue-800 font-medium">{uploadedFile.name}</span>
            <span className="text-xs text-blue-600">
              ({(uploadedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button onClick={removeFile} className="text-blue-600 hover:text-blue-800">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="mx-6 mb-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="text-green-600 animate-pulse" size={20} />
            <span className="text-sm text-green-800">Speaking...</span>
          </div>
          <button onClick={stopSpeaking} className="text-green-600 hover:text-green-800">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex items-end gap-2">
          {/* File Upload Buttons */}
          <div className="flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".txt,.md,.csv,.json,.docx,.xlsx,.xls,.pdf"
              className="hidden"
              id="file-upload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Upload from computer"
              disabled={isLoading}
            >
              <HardDrive size={20} />
            </button>
          </div>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or upload a file..."
              className="w-full p-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={isLoading}
            />
          </div>

          {/* Voice Input */}
          <button
            onClick={toggleRecording}
            className={`p-3 rounded-xl transition-colors ${
              isRecording
                ? 'bg-red-500 text-white recording-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
            disabled={isLoading}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && !uploadedFile)}
            className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-2 text-center">
          Supports: TXT, MD, CSV, JSON, DOCX, XLSX, PDF • Voice input/output enabled
        </p>
      </div>
    </div>
  );
}

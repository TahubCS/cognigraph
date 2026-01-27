'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, User, Bot, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMode } from './ModeContext';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    timestamp: Date;
};

type Source = {
    filename: string;
    similarity: string;
    preview: string;
};

export default function ChatInterface() {
    const { activeMode } = useMode();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: `Hello! I'm your ${activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} Assistant. Ask me anything about your uploaded documents.`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Fix hydration - only render timestamps after mount
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Listen for graph node clicks
    useEffect(() => {
        const handleGraphClick = (e: Event) => {
            const customEvent = e as CustomEvent;
            const nodeName = customEvent.detail;
            setInput(`Tell me about ${nodeName}`);
            inputRef.current?.focus();
        };

        window.addEventListener('graph-node-click', handleGraphClick);
        return () => window.removeEventListener('graph-node-click', handleGraphClick);
    }, []);

    // Reset greeting when mode changes
    useEffect(() => {
        setMessages([{
            id: '1',
            role: 'assistant',
            content: `Hello! I'm your ${activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} Assistant. Ask me anything about your uploaded documents.`,
            timestamp: new Date()
        }]);
    }, [activeMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);
        setStreamingContent('');

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const data = await response.json();
                    throw new Error(data.error || 'Rate limit exceeded. Please try again later.');
                }
                throw new Error(`Request failed with status ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response body');
            }

            let fullContent = '';
            let sources: Source[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                
                // Check if chunk contains sources marker
                if (chunk.includes('__SOURCES__:')) {
                    const parts = chunk.split('__SOURCES__:');
                    fullContent += parts[0];
                    setStreamingContent(fullContent);
                    
                    try {
                        sources = JSON.parse(parts[1]);
                    } catch (e) {
                        console.error('Failed to parse sources:', e);
                    }
                } else {
                    fullContent += chunk;
                    setStreamingContent(fullContent);
                }
            }

            // Add completed message
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: fullContent,
                sources: sources.length > 0 ? sources : undefined,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
            setStreamingContent('');

        } catch (err) {
            if (err instanceof Error) {
                if (err.name === 'AbortError') {
                    console.log('Request aborted');
                } else {
                    setError(err.message);
                    console.error('Chat error:', err);
                }
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                <AnimatePresence initial={false}>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {message.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                            )}
                            
                            <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : ''}`}>
                                <div className={`rounded-lg px-4 py-3 ${
                                    message.role === 'user' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-zinc-800 text-zinc-100'
                                }`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                </div>
                                
                                {/* Sources */}
                                {message.sources && message.sources.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            Sources ({message.sources.length})
                                        </p>
                                        {message.sources.map((source, idx) => (
                                            <div 
                                                key={idx} 
                                                className="bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1.5 text-xs"
                                            >
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className="text-zinc-300 font-medium truncate">{source.filename}</span>
                                                    <span className="text-green-400 text-[10px] shrink-0">{source.similarity}%</span>
                                                </div>
                                                <p className="text-zinc-500 text-[10px] line-clamp-1">{source.preview}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Timestamp - suppress hydration warning */}
                                {isMounted && (
                                    <p className="text-[10px] mt-1 opacity-50 text-zinc-500" suppressHydrationWarning>
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>

                            {message.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-zinc-300" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Streaming Message */}
                {isLoading && streamingContent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3 justify-start"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="max-w-[85%]">
                            <div className="bg-zinc-800 rounded-lg px-4 py-3">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-100">
                                    {streamingContent}
                                    <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Loading Indicator */}
                {isLoading && !streamingContent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3 justify-start"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white animate-pulse" />
                        </div>
                        <div className="bg-zinc-800 rounded-lg px-4 py-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                            <span className="text-sm text-zinc-400">Thinking...</span>
                        </div>
                    </motion.div>
                )}

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3 justify-start"
                    >
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 max-w-[85%]">
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    </motion.div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-zinc-800 p-4 bg-zinc-900/50">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your documents..."
                        disabled={isLoading}
                        rows={1}
                        className="flex-1 bg-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </form>
                <p className="text-[10px] text-zinc-600 mt-2 text-center">
                    Press Enter to send • Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
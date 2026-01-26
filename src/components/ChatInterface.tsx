'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, AlertCircle, Loader2, FileText, Trash2 } from 'lucide-react';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    id: string;
    sources?: Array<{
        filename: string;
        similarity: string;
        preview: string;
    }>;
};

export default function ChatInterface() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Focus input after loading completes
    useEffect(() => {
        if (!isLoading) {
            inputRef.current?.focus();
        }
    }, [isLoading]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setErrorMessage(null);

        // Create placeholder message immediately
        const messageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
            id: messageId,
            role: 'assistant',
            content: ''
        }]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            if (!response.body) throw new Error('No response body');

            // Handle streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let assistantMessage = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Check if we've received the sources marker
                if (buffer.includes('__SOURCES__:')) {
                    const parts = buffer.split('__SOURCES__:');
                    const textPart = parts[0];
                    const sourcesPart = parts[1];
                    
                    assistantMessage += textPart;

                    // Parse sources
                    try {
                        const sources = JSON.parse(sourcesPart);
                        // Update final message with sources
                        setMessages(prev => 
                            prev.map(m => 
                                m.id === messageId 
                                    ? { ...m, content: assistantMessage, sources }
                                    : m
                            )
                        );
                    } catch (e) {
                        console.error('Failed to parse sources:', e);
                        // Even if sources fail, show the text we got
                        setMessages(prev => 
                             prev.map(m => m.id === messageId ? { ...m, content: assistantMessage } : m)
                        );
                    }
                    break;
                }
                
                // If no marker yet, just update text.
                // Since our custom stream sends raw text chunks (not 0:"..."), we append directly.
                assistantMessage += chunk;
                
                setMessages(prev => 
                    prev.map(m => 
                        m.id === messageId 
                            ? { ...m, content: assistantMessage }
                            : m
                    )
                );
            }
            
        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg = error instanceof Error ? error.message : "Failed to get AI response. Please try again.";
            setErrorMessage(errorMsg);
            
            // Remove the empty assistant message if it stayed empty
            setMessages(prev => prev.map(m => 
                m.id === messageId && !m.content ? { ...m, content: "Error generating response." } : m
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGraphClick = useCallback((nodeName: string) => {
        setInput(`Details for "${nodeName}"`);
        // Auto-submit after setting input
        setTimeout(() => {
            const form = inputRef.current?.closest('form');
            if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }, 100);
    }, []);

    useEffect(() => {
        const handleGraphClickEvent = (e: Event) => {
            const customEvent = e as CustomEvent;
            const nodeName = customEvent.detail;
            handleGraphClick(nodeName);
        };

        window.addEventListener('graph-node-click', handleGraphClickEvent);
        return () => window.removeEventListener('graph-node-click', handleGraphClickEvent);
    }, [handleGraphClick]);

    const clearChat = () => {
        setMessages([]);
        setErrorMessage(null);
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-8 bg-gray-900 rounded-xl shadow-xl border border-gray-800 overflow-hidden flex flex-col h-150">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-400" />
                    <h2 className="font-semibold text-white">Ask your Documents</h2>
                    {isLoading && (
                        <span className="text-xs text-gray-400 animate-pulse">(Processing...)</span>
                    )}
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={clearChat}
                        disabled={isLoading}
                        className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" />
                        Clear
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950">
                {messages.length === 0 && !errorMessage && (
                    <div className="text-center text-gray-500 mt-20">
                        <Bot className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                        <p>Upload a document and ask questions</p>
                        <p className="text-xs mt-1">or <b className="text-gray-400">click a node in the graph</b></p>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-2">
                        <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-blue-950/50 flex items-center justify-center shrink-0">
                                    <Bot className="w-5 h-5 text-blue-400" />
                                </div>
                            )}
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
                            }`}>
                                {msg.content || (
                                    <div className="flex space-x-1 py-1">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Sources Card */}
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="ml-11 mr-auto max-w-[85%] w-full">
                                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                                    <div className="px-3 py-2 bg-gray-800/50 text-xs text-gray-400 font-medium flex items-center gap-2">
                                        <FileText className="w-3 h-3" />
                                        Sources Used ({msg.sources.length})
                                    </div>
                                    <div className="divide-y divide-gray-800/50">
                                        {msg.sources.map((source, idx) => (
                                            <div key={idx} className="p-2 hover:bg-gray-800 transition-colors cursor-default">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs text-blue-400 font-medium truncate max-w-50" title={source.filename}>
                                                        {source.filename}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">
                                                        {source.similarity}% match
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 line-clamp-1">
                                                    {source.preview}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {errorMessage && (
                    <div className="flex justify-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-950/50 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-red-900/30 text-red-200 border border-red-800 rounded-bl-none">
                            {errorMessage}
                        </div>
                    </div>
                )}
                
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-950/50 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="bg-gray-800 rounded-2xl px-4 py-2 rounded-bl-none flex items-center">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleFormSubmit} className="p-4 border-t border-gray-800 bg-gray-900">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isLoading ? "Please wait..." : "Type a question..."}
                        className="flex-1 px-4 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !input.trim()} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
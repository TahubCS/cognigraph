'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, AlertCircle, Loader2, Download } from 'lucide-react';
import { exportChatAsMarkdown, exportChatAsPDF } from '@/lib/export-utils';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    id: string;
    sources?: Array<{
        id: number;
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

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            
            if (!reader) {
                throw new Error('No response body');
            }

            let assistantMessage = '';
            let buffer = '';
            let sources: Message['sources'] = [];

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Check if we've received the sources marker
                if (buffer.includes('__SOURCES__:')) {
                    const [textPart, sourcesPart] = buffer.split('__SOURCES__:');
                    assistantMessage = textPart.trim();
                    
                    // Parse sources
                    try {
                        sources = JSON.parse(sourcesPart);
                    } catch (e) {
                        console.error('Failed to parse sources:', e);
                    }
                    
                    // Update final message with sources
                    setMessages(prev => 
                        prev.map(m => 
                            m.id === messageId 
                                ? { ...m, content: assistantMessage, sources }
                                : m
                        )
                    );
                    break;
                }
                
                // Split by newlines but keep processing incomplete lines
                const lines = buffer.split('\n');
                
                // If buffer doesn't end with newline, keep last line for next iteration
                if (!buffer.endsWith('\n')) {
                    buffer = lines.pop() || '';
                } else {
                    buffer = '';
                }
                
                for (const line of lines) {
                    if (!line.trim() || line.includes('__SOURCES__')) continue;
                    
                    let textChunk = '';
                    
                    // Try parsing different formats
                    if (line.startsWith('0:')) {
                        // Vercel AI SDK format: 0:"text"
                        const match = line.match(/0:"(.*)"/);
                        if (match) {
                            textChunk = match[1]
                                .replace(/\\n/g, '\n')
                                .replace(/\\"/g, '"')
                                .replace(/\\\\/g, '\\');
                        }
                    } else if (line.startsWith('data: ')) {
                        // SSE format
                        const data = line.substring(6).trim();
                        if (data === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(data);
                            textChunk = parsed.content || parsed.text || parsed.delta || '';
                        } catch {
                            textChunk = data;
                        }
                    } else {
                        // Try parsing as JSON first
                        try {
                            const parsed = JSON.parse(line);
                            textChunk = parsed.content || parsed.text || parsed.delta || '';
                        } catch {
                            // Plain text line
                            textChunk = line + '\n';
                        }
                    }
                    
                    if (textChunk) {
                        assistantMessage += textChunk;
                        
                        // Update UI immediately for each chunk
                        setMessages(prev => 
                            prev.map(m => 
                                m.id === messageId 
                                    ? { ...m, content: assistantMessage }
                                    : m
                            )
                        );
                    }
                }
            }
            
            // Process any remaining buffer (excluding sources marker)
            if (buffer.trim() && !buffer.includes('__SOURCES__')) {
                assistantMessage += buffer + '\n';
                setMessages(prev => 
                    prev.map(m => 
                        m.id === messageId 
                            ? { ...m, content: assistantMessage, sources }
                            : m
                    )
                );
            }
            
            // If no message was added, show error
            if (!assistantMessage) {
                throw new Error('No response received from AI');
            }

        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg = error instanceof Error ? error.message : "Failed to get AI response. Please try again.";
            setErrorMessage(errorMsg);
            
            // Remove the empty assistant message
            setMessages(prev => prev.filter(m => m.id !== messageId));
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
        const handleGraphClickEvent = (e: CustomEvent) => {
            const nodeName = e.detail;
            handleGraphClick(nodeName);
        };

        window.addEventListener('graph-node-click', handleGraphClickEvent as EventListener);
        return () => window.removeEventListener('graph-node-click', handleGraphClickEvent as EventListener);
    }, [handleGraphClick]);

    const clearChat = () => {
        setMessages([]);
        setErrorMessage(null);
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-8 bg-gray-900 rounded-xl shadow-xl border border-gray-800 overflow-hidden flex flex-col h-150">
            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-400" />
                    <h2 className="font-semibold text-white">Ask your Documents</h2>
                    {isLoading && (
                        <span className="text-xs text-gray-400">(Processing...)</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <>
                            <div className="relative group">
                                <button
                                    className="text-gray-400 hover:text-white transition-colors p-1"
                                    disabled={isLoading}
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-35">
                                    <button
                                        onClick={() => exportChatAsMarkdown(messages)}
                                        className="w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-700 rounded-t-lg transition-colors"
                                    >
                                        Export as Markdown
                                    </button>
                                    <button
                                        onClick={() => exportChatAsPDF(messages)}
                                        className="w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-700 rounded-b-lg transition-colors"
                                    >
                                        Export as PDF
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={clearChat}
                                disabled={isLoading}
                                className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear Chat
                            </button>
                        </>
                    )}
                </div>
            </div>

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
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                                msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-gray-800 text-gray-100 rounded-bl-none'
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
                        
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="ml-11 mr-auto max-w-[75%]">
                                <details className="bg-gray-800/50 rounded-lg border border-gray-700">
                                    <summary className="px-3 py-2 text-xs text-gray-400 cursor-pointer hover:text-gray-300 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''} used
                                    </summary>
                                    <div className="px-3 pb-3 pt-1 space-y-2">
                                        {msg.sources.map((source) => (
                                            <div key={`${msg.id}-source-${source.id}`} className="bg-gray-900/50 rounded p-2 text-xs">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-blue-400 font-medium">{source.filename}</span>
                                                    <span className="text-green-400">{source.similarity}% match</span>
                                                </div>
                                                <p className="text-gray-400 text-[10px] leading-relaxed">{source.preview}</p>
                                            </div>
                                        ))}
                                    </div>
                                </details>
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
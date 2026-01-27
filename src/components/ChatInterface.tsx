'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, AlertCircle, Loader2, Download } from 'lucide-react';
import { exportChatAsMarkdown, exportChatAsPDF } from '@/lib/export-utils';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    id: string;
    sources?: Array<{
        id?: number; // Made optional since it might be missing
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
    
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
                headers: { 'Content-Type': 'application/json' },
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

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            
            if (!reader) throw new Error('No response body');

            let assistantMessage = '';
            let buffer = '';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let sources: any[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                if (buffer.includes('__SOURCES__:')) {
                    const [textPart, sourcesPart] = buffer.split('__SOURCES__:');
                    assistantMessage = textPart.trim();
                    try {
                        sources = JSON.parse(sourcesPart);
                    } catch (e) {
                        console.error('Failed to parse sources:', e);
                    }
                    
                    setMessages(prev => 
                        prev.map(m => m.id === messageId ? { ...m, content: assistantMessage, sources } : m)
                    );
                    break;
                }
                
                const lines = buffer.split('\n');
                if (!buffer.endsWith('\n')) {
                    buffer = lines.pop() || '';
                } else {
                    buffer = '';
                }
                
                for (const line of lines) {
                    if (!line.trim() || line.includes('__SOURCES__')) continue;
                    let textChunk = '';
                    
                    if (line.startsWith('0:')) {
                        const match = line.match(/0:"(.*)"/);
                        if (match) {
                            textChunk = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                        }
                    } else if (line.startsWith('data: ')) {
                        const data = line.substring(6).trim();
                        if (data === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(data);
                            textChunk = parsed.content || parsed.text || parsed.delta || '';
                        } catch {
                            textChunk = data;
                        }
                    } else {
                        try {
                            const parsed = JSON.parse(line);
                            textChunk = parsed.content || parsed.text || parsed.delta || '';
                        } catch {
                            textChunk = line + '\n';
                        }
                    }
                    
                    if (textChunk) {
                        assistantMessage += textChunk;
                        setMessages(prev => 
                            prev.map(m => m.id === messageId ? { ...m, content: assistantMessage } : m)
                        );
                    }
                }
            }
            
            if (buffer.trim() && !buffer.includes('__SOURCES__')) {
                assistantMessage += buffer + '\n';
                setMessages(prev => 
                    prev.map(m => m.id === messageId ? { ...m, content: assistantMessage, sources } : m)
                );
            }
            
            if (!assistantMessage) throw new Error('No response received from AI');

        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg = error instanceof Error ? error.message : "Failed to get AI response.";
            setErrorMessage(errorMsg);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGraphClick = useCallback((nodeName: string) => {
        setInput(`Details for "${nodeName}"`);
        setTimeout(() => {
            const form = inputRef.current?.closest('form');
            if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }, 100);
    }, []);

    useEffect(() => {
        const handleGraphClickEvent = (e: CustomEvent) => {
            handleGraphClick(e.detail);
        };
        window.addEventListener('graph-node-click', handleGraphClickEvent as EventListener);
        return () => window.removeEventListener('graph-node-click', handleGraphClickEvent as EventListener);
    }, [handleGraphClick]);

    const clearChat = () => {
        setMessages([]);
        setErrorMessage(null);
    };

    const renderMessage = (index: number, msg: Message) => (
        <div className="px-4 py-2">
            <div className="flex flex-col gap-2">
                <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-blue-950/50 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-blue-400" />
                        </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap shadow-sm ${
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
                        <details className="bg-gray-800/50 rounded-lg border border-gray-700 group">
                            <summary className="px-3 py-2 text-xs text-gray-400 cursor-pointer hover:text-gray-300 flex items-center gap-2 select-none">
                                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''} used
                            </summary>
                            <div className="px-3 pb-3 pt-1 space-y-2">
                                {/* FIXED: Using 'idx' as key to guarantee uniqueness */}
                                {msg.sources.map((source, idx) => (
                                    <div key={`${msg.id}-source-${idx}`} className="bg-gray-900/50 rounded p-2 text-xs border border-gray-800">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-blue-400 font-medium truncate max-w-[70%]">{source.filename}</span>
                                            <span className="text-green-400 shrink-0">{source.similarity}%</span>
                                        </div>
                                        <p className="text-gray-400 text-[10px] leading-relaxed line-clamp-2">{source.preview}</p>
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-2xl mx-auto mt-8 bg-gray-900 rounded-xl shadow-xl border border-gray-800 overflow-hidden flex flex-col h-150">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-400" />
                    <h2 className="font-semibold text-white">Ask your Documents</h2>
                    {isLoading && (
                        <span className="text-xs text-gray-400 animate-pulse">(Processing...)</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <>
                            <div className="relative group">
                                <button className="text-gray-400 hover:text-white transition-colors p-1">
                                    <Download className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-36">
                                    <button onClick={() => exportChatAsMarkdown(messages)} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-700 rounded-t-lg">Export Markdown</button>
                                    <button onClick={() => exportChatAsPDF(messages)} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-700 rounded-b-lg">Export PDF</button>
                                </div>
                            </div>
                            <button onClick={clearChat} className="text-xs text-gray-400 hover:text-white transition-colors">Clear</button>
                        </>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-950 overflow-hidden"> 
                {messages.length === 0 && !errorMessage ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <Bot className="w-12 h-12 mb-3 text-gray-600" />
                        <p>Upload a document and ask questions</p>
                        <p className="text-xs mt-1">or <b className="text-gray-400">click a node in the graph</b></p>
                    </div>
                ) : (
                    <Virtuoso
                        ref={virtuosoRef}
                        data={messages}
                        itemContent={renderMessage}
                        followOutput="auto"
                        initialTopMostItemIndex={messages.length - 1}
                        className="scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent h-full"
                    />
                )}
            </div>

            {/* Error & Input Area */}
            <div className="bg-gray-900 border-t border-gray-800">
                {errorMessage && (
                    <div className="px-4 pt-4">
                        <div className="flex gap-3 bg-red-900/20 border border-red-800/50 p-3 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-sm text-red-200">{errorMessage}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleFormSubmit} className="p-4">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isLoading ? "AI is thinking..." : "Type a question..."}
                            className="flex-1 px-4 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 disabled:opacity-50"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()} 
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
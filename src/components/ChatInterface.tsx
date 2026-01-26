'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, AlertCircle, Loader2 } from 'lucide-react';
import { askAI } from '@/actions/chat';

type Message = {
    role: 'user' | 'ai' | 'error';
    content: string;
};

export default function ChatInterface() {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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

    const handleSend = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        try {
            const response = await askAI(userMessage.content);
            
            if (!response) {
                throw new Error("No response from AI");
            }
            
            const aiMessage: Message = { 
                role: 'ai', 
                content: response 
            };
            setMessages(prev => [...prev, aiMessage]);
        
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: Message = { 
                role: 'error', 
                content: error instanceof Error ? error.message : "Failed to get AI response. Please try again." 
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleGraphClick = (e: any) => {
            const nodeName = e.detail;
            handleSend(`Details for "${nodeName}"`); 
        };

        window.addEventListener('graph-node-click', handleGraphClick);
        return () => window.removeEventListener('graph-node-click', handleGraphClick);
    }, [handleSend]); // Add handleSend as dependency

    const clearChat = () => {
        setMessages([]);
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
                {messages.length > 0 && (
                    <button
                        onClick={clearChat}
                        disabled={isLoading}
                        className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Clear Chat
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                        <Bot className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                        <p>Upload a document and ask questions</p>
                        <p className="text-xs mt-1">or <b className="text-gray-400">click a node in the graph</b></p>
                    </div>
                )}
                
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                            <div className="w-8 h-8 rounded-full bg-blue-950/50 flex items-center justify-center shrink-0">
                                <Bot className="w-5 h-5 text-blue-400" />
                            </div>
                        )}
                        {msg.role === 'error' && (
                            <div className="w-8 h-8 rounded-full bg-red-950/50 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5 text-red-400" />
                            </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                            msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : msg.role === 'error'
                                ? 'bg-red-900/30 text-red-200 border border-red-800 rounded-bl-none'
                                : 'bg-gray-800 text-gray-100 rounded-bl-none'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
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

            <form onSubmit={(e) => { e.preventDefault(); handleSend(query); }} className="p-4 border-t border-gray-800 bg-gray-900">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={isLoading ? "Please wait..." : "Type a question..."}
                        className="flex-1 px-4 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !query.trim()} 
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
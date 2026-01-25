'use client';

import { useState, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import { askAI } from '@/actions/chat';

type Message = {
    role: 'user' | 'ai';
    content: string;
};

export default function ChatInterface() {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Reusable function to process a message
    async function handleSend(text: string) {
        if (!text.trim() || isLoading) return;

        // 1. Add User Message
        const userMessage: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        try {
        // 2. Call AI
            const response = await askAI(userMessage.content);
            
            // 3. Add AI Response
            const aiMessage: Message = { role: 'ai', content: response || "Error getting response." };
            setMessages(prev => [...prev, aiMessage]);
        
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', content: "Something went wrong." }]);
        } finally {
            setIsLoading(false);
        }
    }

    // EVENT LISTENER: Listen for Graph Clicks
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleGraphClick = (e: any) => {
            const nodeName = e.detail;
            
            // CHANGE: We mimic the "Alliance Corporate" success.
            // Instead of "Tell me about X...", we send "Details for X".
            // This keeps the vector focused on the keyword.
            handleSend(`Details for "${nodeName}"`); 
        };

        window.addEventListener('graph-node-click', handleGraphClick);
        return () => window.removeEventListener('graph-node-click', handleGraphClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto mt-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-150">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Ask your Documents</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-20">
                    <p>Upload a document, ask a question, or <b>click a node in the graph!</b></p>
                </div>
            )}
            
            {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-blue-600" />
                </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                {msg.content}
                </div>
            </div>
            ))}
            
            {isLoading && (
                <div className="flex justify-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl px-4 py-2 rounded-bl-none flex items-center">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    </div>
                </div>
            )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSend(query); }} className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a question..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !query.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Send className="w-5 h-5" />
            </button>
            </div>
        </form>
        </div>
    );
}
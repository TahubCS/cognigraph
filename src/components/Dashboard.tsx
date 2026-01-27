'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserButton } from '@clerk/nextjs';
import FileUpload from '@/components/FileUpload';
import ChatInterface from '@/components/ChatInterface';
import GraphVisualization from '@/components/GraphVisualization';
import DocumentList from '@/components/DocumentsList';
import ModeSelector from '@/components/ModeSelector';
import { ModeProvider, useMode } from '@/components/ModeContext';
import { Card } from '@/components/Card';
import { Settings2, X } from 'lucide-react';

interface DashboardProps {
    initialMode: string;
}

function HeaderModeDisplay({ onOpenSelector }: { onOpenSelector: () => void }) {
    const { activeMode } = useMode();
    return (
        <button 
            onClick={onOpenSelector}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:bg-zinc-800 transition-all group"
        >
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium group-hover:text-zinc-400">Workspace</span>
                <span className="text-xs font-semibold text-blue-400 capitalize leading-none">{activeMode}</span>
            </div>
            <Settings2 className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
        </button>
    );
}

export default function Dashboard({ initialMode }: DashboardProps) {
    const [showModeSelector, setShowModeSelector] = useState(false);

    return (
        <ModeProvider initialMode={initialMode}>
            {/* HEADER */}
            <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-400 mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            CogniGraph
                        </h1>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-medium text-zinc-400">
                            BETA
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <HeaderModeDisplay onOpenSelector={() => setShowModeSelector(true)} />
                        <UserButton 
                            appearance={{
                                elements: {
                                    avatarBox: "w-9 h-9 ring-2 ring-zinc-800 hover:ring-zinc-700 transition-all"
                                }
                            }}
                        />
                    </div>
                </div>
            </header>

            {/* MODE SELECTOR MODAL */}
            {showModeSelector && (
                <>
                    <div 
                        onClick={() => setShowModeSelector(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100"
                    />
                    <div className="fixed inset-0 z-101 flex items-center justify-center p-4 pointer-events-none">
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto p-6 relative"
                        >
                            <button 
                                onClick={() => setShowModeSelector(false)}
                                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <ModeSelector onSelect={() => setShowModeSelector(false)} />
                        </div>
                    </div>
                </>
            )}

            {/* MAIN DASHBOARD GRID */}
            <div className="max-w-400 mx-auto p-6 h-[calc(100vh-64px)]">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="grid grid-cols-12 gap-6 h-full"
                >
                    {/* LEFT COLUMN: Upload & List - FIXED SIZING */}
                    <motion.aside className="col-span-12 lg:col-span-3 flex flex-col gap-6 h-full">
                        {/* Upload Card - Fixed size, doesn't grow */}
                        <Card className="p-4 shrink-0">
                            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Data Source
                            </h2>
                            <FileUpload />
                        </Card>

                        {/* Documents Card - Takes remaining space, max height to prevent overflow */}
                        <Card className="flex flex-col p-0 flex-1 min-h-0 max-h-[calc(100%-280px)]">
                            <div className="p-4 border-b border-zinc-800/50 shrink-0">
                                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    Active Documents
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 min-h-0">
                                <DocumentList />
                            </div>
                        </Card>
                    </motion.aside>

                    {/* CENTER COLUMN: Graph */}
                    <motion.main className="col-span-12 lg:col-span-6 flex flex-col h-full overflow-hidden">
                        <Card className="flex-1 relative p-0 overflow-hidden border-zinc-800 bg-zinc-950 shadow-2xl">
                            <div className="absolute inset-0">
                                <GraphVisualization />
                            </div>
                        </Card>
                    </motion.main>

                    {/* RIGHT COLUMN: Chat */}
                    <motion.aside className="col-span-12 lg:col-span-3 flex flex-col h-full overflow-hidden">
                        <Card className="flex-1 flex flex-col p-0 overflow-hidden">
                            <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center shrink-0">
                                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Neural Assistant
                                </h2>
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <div className="absolute inset-0">
                                    <ChatInterface />
                                </div>
                            </div>
                        </Card>
                    </motion.aside>

                </motion.div>
            </div>
        </ModeProvider>
    );
}
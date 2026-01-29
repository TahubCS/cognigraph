'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton } from '@clerk/nextjs';
import { 
    Settings2, X, MessageSquare, 
    Database, UploadCloud, Activity 
} from 'lucide-react';

// Components
import FileUpload from '@/components/FileUpload';
import ChatInterface from '@/components/ChatInterface';
import GraphVisualization from '@/components/GraphVisualization';
import DocumentList from '@/components/DocumentsList';
import DocumentExport from '@/components/DocumentExport'; // ✅ Added Missing Import
import ModeSelector from '@/components/ModeSelector';
import { ModeProvider, useMode } from '@/components/ModeContext';
import { Card } from '@/components/Card';

interface DashboardProps {
    initialMode: string;
}

// Mini-component for the Header Badge
function HeaderModeBadge({ onOpen }: { onOpen: () => void }) {
    const { activeMode } = useMode();
    return (
        <button 
            onClick={onOpen}
            className="flex items-center gap-3 pl-4 pr-1.5 py-1.5 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-full transition-all group"
        >
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Workspace</span>
                <span className="text-xs font-semibold text-zinc-200 capitalize leading-none group-hover:text-indigo-400 transition-colors">
                    {activeMode}
                </span>
            </div>
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
            </div>
        </button>
    );
}

export default function Dashboard({ initialMode }: DashboardProps) {
    const [showModeSelector, setShowModeSelector] = useState(false);

    return (
        <ModeProvider initialMode={initialMode}>
            <div className="flex flex-col h-screen bg-black text-zinc-100 overflow-hidden selection:bg-indigo-500/30 font-sans">
                
                {/* --- 1. GLOBAL HEADER --- */}
                <header className="shrink-0 h-14 border-b border-white/10 bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 z-50">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                            <Activity className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h1 className="text-sm font-bold tracking-wide text-zinc-200">
                            COGNIGRAPH <span className="text-zinc-600 font-normal ml-1">v2.0</span>
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <HeaderModeBadge onOpen={() => setShowModeSelector(true)} />
                        <div className="h-6 w-px bg-zinc-800" />
                        <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 ring-2 ring-zinc-800/50" } }} />
                    </div>
                </header>

                {/* --- 2. MAIN LAYOUT GRID --- */}
                <main className="flex-1 p-4 lg:p-6 min-h-0 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 h-full">
                        
                        {/* LEFT: Data Sources (25%) */}
                        <motion.aside 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full min-h-0"
                        >
                            <Card title="Ingest Data" icon={UploadCloud} className="shrink-0">
                                <div className="p-4">
                                    <FileUpload />
                                </div>
                            </Card>

                            <Card 
                                title="Knowledge Base" 
                                icon={Database} 
                                className="flex-1 min-h-0"
                                action={<DocumentExport />} // ✅ Integrated Export Button
                            >
                                <div className="h-full overflow-y-auto custom-scrollbar p-2">
                                    <DocumentList />
                                </div>
                            </Card>
                        </motion.aside>

                        {/* CENTER: Graph Canvas (50%) */}
                        <motion.section 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="col-span-12 lg:col-span-6 h-full min-h-0 relative flex flex-col"
                        >
                            {/* We remove padding to let the canvas bleed to edges */}
                            <Card className="flex-1 border-0! bg-zinc-900/30! overflow-hidden relative">
                                <div className="absolute inset-0">
                                    {/* ⚠️ Ensure GraphVisualization uses h-full internally */}
                                    <GraphVisualization /> 
                                </div>
                            </Card>
                        </motion.section>

                        {/* RIGHT: Chat (25%) */}
                        <motion.aside 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="col-span-12 lg:col-span-3 h-full min-h-0"
                        >
                            <Card title="Neural Assistant" icon={MessageSquare} className="h-full border-l border-white/10">
                                <div className="absolute inset-0">
                                    <ChatInterface />
                                </div>
                            </Card>
                        </motion.aside>

                    </div>
                </main>

                {/* --- 3. MODAL OVERLAY --- */}
                <AnimatePresence>
                    {showModeSelector && (
                        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowModeSelector(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="relative bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-y-auto p-6"
                            >
                                <button 
                                    onClick={() => setShowModeSelector(false)}
                                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <ModeSelector onSelect={() => setShowModeSelector(false)} />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </ModeProvider>
    );
}
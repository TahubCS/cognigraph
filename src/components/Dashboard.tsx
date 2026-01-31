'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton } from '@clerk/nextjs';
import { 
    Settings2, X, MessageSquare, 
    Database, UploadCloud, Activity,
    PanelLeftClose, PanelLeftOpen,
    PanelRightClose, PanelRightOpen
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
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

    return (
        <ModeProvider initialMode={initialMode}>
            <div className="flex flex-col h-screen bg-black text-zinc-100 overflow-hidden selection:bg-indigo-500/30 font-sans">
                
                {/* --- 1. GLOBAL HEADER --- */}
                <header className="shrink-0 h-14 border-b border-white/10 bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 z-50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                                <Activity className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h1 className="text-sm font-bold tracking-wide text-zinc-200">
                                COGNIGRAPH <span className="text-zinc-600 font-normal ml-1">v2.0</span>
                            </h1>
                        </div>
                        
                        {/* Left Sidebar Toggle */}
                        <button 
                            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                            title={leftSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                        >
                            {leftSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {/* Right Sidebar Toggle */}
                        <button 
                            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                            title={rightSidebarOpen ? "Close Chat" : "Open Chat"}
                        >
                            {rightSidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                        </button>

                        <HeaderModeBadge onOpen={() => setShowModeSelector(true)} />
                        <div className="h-6 w-px bg-zinc-800" />
                        <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 ring-2 ring-zinc-800/50" } }} />
                    </div>
                </header>

                {/* --- 2. MAIN LAYOUT GRID --- */}
                <main className="flex-1 p-4 lg:p-6 min-h-0 overflow-hidden flex gap-4">
                    
                    {/* LEFT: Data Sources */}
                    <AnimatePresence mode="wait">
                        {leftSidebarOpen && (
                            <motion.aside 
                                initial={{ width: 0, opacity: 0, x: -20 }}
                                animate={{ width: 320, opacity: 1, x: 0 }}
                                exit={{ width: 0, opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="flex flex-col gap-4 h-full min-h-0 shrink-0"
                            >
                                <div className="w-80 flex flex-col gap-4 h-full">
                                    <Card title="Ingest Data" icon={UploadCloud} className="shrink-0">
                                        <div className="p-4">
                                            <FileUpload />
                                        </div>
                                    </Card>

                                    <Card 
                                        title="Knowledge Base" 
                                        icon={Database} 
                                        className="flex-1 min-h-0"
                                        action={<DocumentExport />} 
                                    >
                                        <div className="h-full overflow-y-auto custom-scrollbar p-2">
                                            <DocumentList />
                                        </div>
                                    </Card>
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>

                    {/* CENTER: Graph Canvas */}
                    <motion.section 
                        layout
                        className="flex-1 h-full min-h-0 relative flex flex-col min-w-0"
                    >
                        <Card className="flex-1 border-0! bg-zinc-900/30! overflow-hidden relative">
                            <div className="absolute inset-0">
                                <GraphVisualization /> 
                            </div>
                        </Card>
                    </motion.section>

                    {/* RIGHT: Chat */}
                    <AnimatePresence mode="wait">
                        {rightSidebarOpen && (
                            <motion.aside 
                                initial={{ width: 0, opacity: 0, x: 20 }}
                                animate={{ width: 380, opacity: 1, x: 0 }}
                                exit={{ width: 0, opacity: 0, x: 20 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="h-full min-h-0 shrink-0"
                            >
                                <div className="w-95 h-full">
                                    <Card title="Neural Assistant" icon={MessageSquare} className="h-full border-l border-white/10">
                                        <div className="absolute inset-0">
                                            <ChatInterface />
                                        </div>
                                    </Card>
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>

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

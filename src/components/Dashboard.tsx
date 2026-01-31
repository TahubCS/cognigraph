'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Database, UploadCloud
} from 'lucide-react';

// Components
import FileUpload from '@/components/FileUpload';
import ChatInterface from '@/components/ChatInterface';
import GraphVisualization from '@/components/GraphVisualization';
import DocumentList from '@/components/DocumentsList';
import DocumentExport from '@/components/DocumentExport';
import ModeSelector from '@/components/ModeSelector';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardBackground from '@/components/DashboardBackground';
import { ModeProvider } from '@/components/ModeContext';
import { Card } from '@/components/Card';

interface DashboardProps {
    initialMode: string;
}

export default function Dashboard({ initialMode }: DashboardProps) {
    const [showModeSelector, setShowModeSelector] = useState(false);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [activeView, setActiveView] = useState<'graph' | 'chat' | 'split'>('graph');

    // Listen for switch-to-chat events from NodeDetailsPanel
    useEffect(() => {
        const handleSwitchToChat = () => setActiveView('chat');
        window.addEventListener('switch-to-chat', handleSwitchToChat);
        return () => window.removeEventListener('switch-to-chat', handleSwitchToChat);
    }, []);

    // Keyboard shortcuts for view switching
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'g':
                    setActiveView('graph');
                    break;
                case 's':
                    setActiveView('split');
                    break;
                case 'c':
                    setActiveView('chat');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Calculate visibility for each view based on activeView
    const showGraph = activeView === 'graph' || activeView === 'split';
    const showChat = activeView === 'chat' || activeView === 'split';

    return (
        <ModeProvider initialMode={initialMode}>
            <div className="flex flex-col h-screen bg-black text-zinc-100 overflow-hidden selection:bg-indigo-500/30 font-sans">

                {/* --- 1. GLOBAL HEADER --- */}
                <DashboardNavbar
                    leftSidebarOpen={leftSidebarOpen}
                    onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
                    onOpenModeSelector={() => setShowModeSelector(true)}
                    activeView={activeView}
                    onViewChange={setActiveView}
                />

                {/* Animated Background - Matching HeroSection */}
                <DashboardBackground />

                {/* --- 2. MAIN LAYOUT GRID --- */}
                <main className="flex-1 p-4 lg:p-6 min-h-0 overflow-hidden flex gap-4 relative z-10">

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

                    {/* CENTER: View Container - Graph, Chat, or Split */}
                    <motion.section
                        layout
                        className="flex-1 h-full min-h-0 relative flex min-w-0 gap-4"
                    >
                        {/* Graph View */}
                        <motion.div
                            initial={false}
                            animate={{
                                opacity: showGraph ? 1 : 0,
                                flex: activeView === 'split' ? 1 : (activeView === 'graph' ? 1 : 0),
                            }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="h-full min-w-0 overflow-hidden"
                            style={{
                                pointerEvents: showGraph ? 'auto' : 'none',
                                display: showGraph ? 'block' : 'none'
                            }}
                        >
                            <Card className="h-full border-0! bg-zinc-900/30! overflow-hidden relative">
                                <div className="absolute inset-0">
                                    <GraphVisualization />
                                </div>
                            </Card>
                        </motion.div>

                        {/* Chat View */}
                        <motion.div
                            initial={false}
                            animate={{
                                opacity: showChat ? 1 : 0,
                                flex: activeView === 'split' ? 1 : (activeView === 'chat' ? 1 : 0),
                            }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="h-full min-w-0 overflow-hidden"
                            style={{
                                pointerEvents: showChat ? 'auto' : 'none',
                                display: showChat ? 'block' : 'none'
                            }}
                        >
                            <Card className="h-full border-0! bg-zinc-900/30! overflow-hidden relative">
                                <div className="absolute inset-0">
                                    <ChatInterface />
                                </div>
                            </Card>
                        </motion.div>
                    </motion.section>

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

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
import StackedView from '@/components/StackedView';
import { ModeProvider } from '@/components/ModeContext';
import { TransitionProvider, useTransition } from '@/components/TransitionContext';
import { Card } from '@/components/Card';

interface DashboardProps {
    initialMode: string;
}

function DashboardContent({ initialMode }: DashboardProps) {
    const { startTransition } = useTransition();
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
                    onToggleLeftSidebar={() => {
                        startTransition(300); // Pause observers during 250ms animation + buffer
                        setLeftSidebarOpen(!leftSidebarOpen);
                    }}
                    onOpenModeSelector={() => setShowModeSelector(true)}
                />

                {/* Animated Background - Matching HeroSection */}
                <DashboardBackground />

                {/* --- 2. MAIN LAYOUT GRID --- */}
                <main className="flex-1 p-4 lg:p-6 min-h-0 overflow-hidden flex gap-4 relative z-10">

                    {/* LEFT: Data Sources - Sliding Wipe Animation */}
                    <div
                        className="h-full shrink-0 overflow-hidden"
                        style={{
                            width: leftSidebarOpen ? 320 : 0,
                            transition: 'width 300ms cubic-bezier(0.25, 1, 0.5, 1)', // Smooth easeOutQuint-ish
                            contain: 'strict', // ISOLATE LAYOUT: Critical validation for perfs
                            willChange: 'width',
                        }}
                    >
                        <aside
                            className="flex flex-col gap-4 h-full min-h-0 w-80"
                            style={{
                                transform: leftSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                                transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)',
                                opacity: leftSidebarOpen ? 1 : 0.5, // Fade slightly
                                width: 320, // Explicit width
                            }}
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
                                action={<DocumentExport />}
                            >
                                <div className="h-full overflow-y-auto custom-scrollbar p-2">
                                    <DocumentList />
                                </div>
                            </Card>
                        </aside>
                    </div>

                    {/* CENTER: Stacked File Folder View */}
                    <div className="flex-1 min-w-0 h-full">
                        <StackedView
                            activeView={activeView}
                            onViewChange={setActiveView}
                        >
                            {{
                                chat: <ChatInterface />,
                                split: (
                                    <div className="h-full grid grid-cols-2 gap-2 p-2">
                                        <div className="h-full overflow-hidden rounded-lg">
                                            <GraphVisualization />
                                        </div>
                                        <div className="h-full overflow-hidden rounded-lg">
                                            <ChatInterface />
                                        </div>
                                    </div>
                                ),
                                graph: <GraphVisualization />,
                            }}
                        </StackedView>
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

// Wrapper component to provide TransitionContext
export default function Dashboard({ initialMode }: DashboardProps) {
    return (
        <TransitionProvider>
            <DashboardContent initialMode={initialMode} />
        </TransitionProvider>
    );
}

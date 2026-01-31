'use client';

import { motion } from 'framer-motion';
import { UserButton } from '@clerk/nextjs';
import {
    Settings2, Network, MessageSquare, Columns,
    PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { SiGrapheneos } from "react-icons/si";
import { useMode } from '@/components/ModeContext';

interface DashboardNavbarProps {
    leftSidebarOpen: boolean;
    onToggleLeftSidebar: () => void;
    onOpenModeSelector: () => void;
    activeView: 'graph' | 'chat' | 'split';
    onViewChange: (view: 'graph' | 'chat' | 'split') => void;
}

function WorkspaceBadge({ onOpen }: { onOpen: () => void }) {
    const { activeMode } = useMode();
    return (
        <button
            onClick={onOpen}
            className="flex items-center gap-3 pl-4 pr-1.5 py-1.5 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 rounded-full transition-all group"
        >
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Workspace</span>
                <span className="text-xs font-semibold text-zinc-200 capitalize leading-none group-hover:text-blue-400 transition-colors">
                    {activeMode}
                </span>
            </div>
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
            </div>
        </button>
    );
}

export default function DashboardNavbar({
    leftSidebarOpen,
    onToggleLeftSidebar,
    onOpenModeSelector,
    activeView,
    onViewChange
}: DashboardNavbarProps) {
    return (
        <motion.nav
            className="shrink-0 h-14 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-6 z-50"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            {/* Left Side: Logo + Sidebar Toggle */}
            <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="flex items-center gap-2.5 group cursor-pointer">
                    <div className="relative w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <SiGrapheneos className="w-5 h-5 text-blue-400" />
                        {/* Subtle glow effect */}
                        <div className="absolute inset-0 rounded-lg bg-blue-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                        CogniGraph
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">BETA</span>
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-zinc-800" />

                {/* Left Sidebar Toggle */}
                <button
                    onClick={onToggleLeftSidebar}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all active:scale-95"
                    title={leftSidebarOpen ? "Close Data Panel" : "Open Data Panel"}
                >
                    {leftSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
            </div>

            {/* Right Side: Controls */}
            <div className="flex items-center gap-3">
                {/* View Toggle - Segmented Control */}
                <div className="flex items-center gap-0.5 bg-zinc-900/50 rounded-lg p-1 border border-white/5">
                    <button
                        onClick={() => onViewChange('graph')}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${activeView === 'graph'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                            }`}
                        title="Graph View (G)"
                    >
                        <Network className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Graph</span>
                    </button>
                    <button
                        onClick={() => onViewChange('split')}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${activeView === 'split'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                            }`}
                        title="Split View (S)"
                    >
                        <Columns className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Split</span>
                    </button>
                    <button
                        onClick={() => onViewChange('chat')}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${activeView === 'chat'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                            }`}
                        title="Chat View (C)"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Chat</span>
                    </button>
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-zinc-800" />

                {/* Workspace Badge */}
                <WorkspaceBadge onOpen={onOpenModeSelector} />

                {/* User Button */}
                <UserButton
                    appearance={{
                        elements: {
                            avatarBox: "w-8 h-8 ring-2 ring-zinc-700/50 hover:ring-blue-500/50 transition-all"
                        }
                    }}
                />
            </div>
        </motion.nav>
    );
}

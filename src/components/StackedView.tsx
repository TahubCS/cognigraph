'use client';

import { useState, useEffect } from 'react';
import { Network, MessageSquare, Columns } from 'lucide-react';

interface StackedViewProps {
    activeView: 'graph' | 'chat' | 'split';
    onViewChange: (view: 'graph' | 'chat' | 'split') => void;
    children: {
        chat: React.ReactNode;
        split: React.ReactNode;
        graph: React.ReactNode;
    };
}

const panels = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare, position: 'left' },
    { id: 'split' as const, label: 'Split', icon: Columns, position: 'center' },
    { id: 'graph' as const, label: 'Graph', icon: Network, position: 'right' },
];

export default function StackedView({ activeView, onViewChange, children }: StackedViewProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate z-index based on active view
    const getZIndex = (panelId: string) => {
        if (panelId === activeView) return 30;
        // Order: chat=0, split=1, graph=2 when not active
        const order = panels.findIndex(p => p.id === panelId);
        return 10 + order;
    };

    // Calculate offset for stacking effect - layers peek out from ABOVE near tabs
    const getStyles = (panelId: string, index: number) => {
        const isActive = panelId === activeView;
        const activeIndex = panels.findIndex(p => p.id === activeView);
        const diff = index - activeIndex;

        if (isActive) {
            return {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                opacity: 1,
            };
        }

        // Inactive panels: use transform for GPU-accelerated animation
        const offset = Math.abs(diff) * 16; // 16px offset per layer
        return {
            transform: `translateY(-${offset}px)`,
            opacity: 0.7,
        };
    };

    // Show loading state until mounted to prevent hydration mismatch
    if (!mounted) {
        return (
            <div className="flex-1 h-full min-h-0 flex flex-col min-w-0 relative bg-zinc-900 rounded-lg" />
        );
    }

    return (
        <div className="flex-1 h-full min-h-0 flex flex-col min-w-0 relative">
            {/* Tab Bar - Tabs sticking out from panels */}
            <div className="relative h-14 flex items-end gap-1 z-40">
                {panels.map((panel, index) => {
                    const Icon = panel.icon;
                    const isActive = activeView === panel.id;
                    const activeIndex = panels.findIndex(p => p.id === activeView);
                    const diff = index - activeIndex;
                    const tabOffset = isActive ? 0 : -Math.abs(diff) * 16; // Matches panel offset

                    return (
                        <button
                            key={panel.id}
                            onClick={() => onViewChange(panel.id)}
                            className={`
                                relative flex items-center gap-2 px-4 py-2
                                rounded-t-lg border-t border-l border-r
                                text-sm font-medium
                                ${isActive
                                    ? 'bg-zinc-800 text-white border-zinc-600'
                                    : 'bg-zinc-900/60 text-zinc-500 border-zinc-700/50 hover:bg-zinc-800/80 hover:text-zinc-200'
                                }
                            `}
                            style={{
                                zIndex: getZIndex(panel.id),
                                transform: `translateY(${tabOffset}px)`,
                                opacity: isActive ? 1 : 0.6,
                                willChange: 'transform, opacity',
                                transition: 'transform 200ms ease-out, opacity 200ms ease-out',
                            }}
                            title={`${panel.label} View (${panel.id[0].toUpperCase()})`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{panel.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Stacked Panels */}
            <div className="flex-1 relative min-h-0 overflow-visible">
                {panels.map((panel, index) => {
                    const isActive = activeView === panel.id;
                    const styles = getStyles(panel.id, index);

                    return (
                        <div
                            key={panel.id}
                            className={`
                                absolute inset-0
                                bg-zinc-800 border border-zinc-700 rounded-lg
                                overflow-hidden
                                ${isActive ? 'shadow-2xl shadow-black/50' : 'shadow-lg shadow-black/30'}
                            `}
                            style={{
                                zIndex: getZIndex(panel.id),
                                transform: isActive ? 'translateY(0)' : styles.transform,
                                opacity: isActive ? 1 : styles.opacity,
                                pointerEvents: isActive ? 'auto' : 'none',
                                willChange: 'transform, opacity',
                                transition: 'transform 200ms ease-out, opacity 200ms ease-out',
                            }}
                        >
                            <div className="h-full w-full">
                                {children[panel.id]}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

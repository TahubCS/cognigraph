'use client';

import { Network, MessageSquare, Columns } from 'lucide-react';

interface ViewTabsProps {
    activeView: 'graph' | 'chat' | 'split';
    onViewChange: (view: 'graph' | 'chat' | 'split') => void;
}

const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'split' as const, label: 'Split', icon: Columns },
    { id: 'graph' as const, label: 'Graph', icon: Network },
];

export default function ViewTabs({ activeView, onViewChange }: ViewTabsProps) {
    return (
        <div className="flex items-end gap-2 px-2 pt-2">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeView === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onViewChange(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2.5
                            rounded-t-lg
                            text-sm font-medium
                            transition-all duration-150 ease-out
                            border-t border-l border-r
                            ${isActive
                                ? 'bg-zinc-900 text-white border-zinc-700 translate-y-px'
                                : 'bg-zinc-800/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                            }
                        `}
                        title={`${tab.label} View (${tab.id[0].toUpperCase()})`}
                    >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

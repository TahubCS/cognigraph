'use client';

import { useMode } from './ModeContext';
import { 
    Scale, TrendingUp, Stethoscope, Cpu, Headphones, 
    ShieldCheck, Feather, Users, Globe 
} from 'lucide-react';

interface ModeSelectorProps {
    onSelect?: () => void;
}

export default function ModeSelector({ onSelect }: ModeSelectorProps) {
    const { activeMode, setMode } = useMode();

    const modes = [
        // 1. NEW: General Mode (Added as the first option)
        { id: 'general', label: 'General Research', icon: Globe, description: 'Unified knowledge graph, broad synthesis, and cross-domain analysis.', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/50'},
        { id: 'legal', label: 'Legal Professional', icon: Scale, description: 'Contract review, case research, and due diligence.', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/50' },
        { id: 'financial', label: 'Financial Analyst', icon: TrendingUp, description: 'SEC filings, earnings reports, and market risk analysis.', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/50' },
        { id: 'medical', label: 'Clinical & Healthcare', icon: Stethoscope, description: 'Medical literature, patient data, and clinical guidelines.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/50' },
        { id: 'engineering', label: 'Engineering & R&D', icon: Cpu, description: 'Technical specs, patent analysis, and codebases.', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/50' },
        { id: 'sales', label: 'Sales & Support', icon: Headphones, description: 'RFP automation, product manuals, and customer tickets.', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/50' },
        { id: 'regulatory', label: 'Regulatory Affairs', icon: ShieldCheck, description: 'Compliance audits (FDA/EMA) and policy guidelines.', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50' },
        { id: 'journalism', label: 'Journalism & Content', icon: Feather, description: 'Fact-checking, deep research, and summarization.', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/50' },
        { id: 'hr', label: 'Human Resources', icon: Users, description: 'Employee handbooks, benefits, and onboarding.', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/50' }
    ];

    const handleSelect = (modeId: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMode(modeId as any);
        
        if (onSelect) {
            setTimeout(() => {
                onSelect();
            }, 150);
        }
    };

    return (
        <div className="w-full">
            <h2 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider text-center">
                Select Your Professional Workspace
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {modes.map((mode) => {
                    const Icon = mode.icon;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const isActive = activeMode === mode.id as any;

                    return (
                        <button
                            key={mode.id}
                            onClick={() => handleSelect(mode.id)}
                            className={`relative p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 ${
                                isActive 
                                    ? `${mode.bg} ${mode.border} ring-1 ring-white/20 shadow-lg` 
                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                                isActive ? 'bg-black/20' : 'bg-zinc-800'
                            }`}>
                                <Icon className={`w-6 h-6 ${mode.color}`} />
                            </div>
                            
                            <h3 className={`font-semibold text-sm mb-1 ${
                                isActive ? 'text-white' : 'text-zinc-300'
                            }`}>
                                {mode.label}
                            </h3>
                            
                            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                                {mode.description}
                            </p>

                            {isActive && (
                                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
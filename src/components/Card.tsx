'use client';

import React, { useRef, useState } from 'react';
import { useMode } from './ModeContext';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    icon?: React.ElementType;
    action?: React.ReactNode; // Extra slot for buttons (like Export)
}

export function Card({ children, className = "", title, icon: Icon, action }: CardProps) {
    const { activeMode } = useMode();
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;

        const div = divRef.current;
        const rect = div.getBoundingClientRect();

        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    // 🎨 Dynamic Glow based on Mode
    const getTheme = () => {
        switch(activeMode) {
            case 'legal': return 'border-red-500/20 group-hover:border-red-500/50 hover:shadow-red-900/20';
            case 'financial': return 'border-emerald-500/20 group-hover:border-emerald-500/50 hover:shadow-emerald-900/20';
            case 'medical': return 'border-cyan-500/20 group-hover:border-cyan-500/50 hover:shadow-cyan-900/20';
            case 'engineering': return 'border-blue-500/20 group-hover:border-blue-500/50 hover:shadow-blue-900/20';
            case 'sales': return 'border-orange-500/20 group-hover:border-orange-500/50 hover:shadow-orange-900/20';
            case 'regulatory': return 'border-yellow-500/20 group-hover:border-yellow-500/50 hover:shadow-yellow-900/20';
            case 'journalism': return 'border-pink-500/20 group-hover:border-pink-500/50 hover:shadow-pink-900/20';
            case 'hr': return 'border-purple-500/20 group-hover:border-purple-500/50 hover:shadow-purple-900/20';
            default: return 'border-indigo-500/20 group-hover:border-indigo-500/50 hover:shadow-indigo-900/20';
        }
    };

    // Get spotlight color based on mode
    const getSpotlightColor = () => {
        switch(activeMode) {
            case 'legal': return 'rgba(239, 68, 68, 0.15)';
            case 'financial': return 'rgba(16, 185, 129, 0.15)';
            case 'medical': return 'rgba(6, 182, 212, 0.15)';
            case 'engineering': return 'rgba(59, 130, 246, 0.15)';
            case 'sales': return 'rgba(249, 115, 22, 0.15)';
            case 'regulatory': return 'rgba(234, 179, 8, 0.15)';
            case 'journalism': return 'rgba(236, 72, 153, 0.15)';
            case 'hr': return 'rgba(168, 85, 247, 0.15)';
            default: return 'rgba(99, 102, 241, 0.15)';
        }
    };

    return (
        <div 
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`
                group relative flex flex-col
                bg-zinc-950/40 backdrop-blur-xl bg-noise /* Glass effect + Noise */
                border ${getTheme()}                 /* Dynamic Border */
                rounded-2xl                          /* Modern Curve */
                shadow-xl transition-all duration-300
                overflow-hidden
                ${className}
            `}
        >
            {/* Spotlight Effect */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${getSpotlightColor()}, transparent 40%)`,
                }}
            />

            {/* Header Section (Only renders if title/icon exists) */}
            {(title || Icon || action) && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2.5">
                        {Icon && (
                            <div className="p-1.5 rounded-md bg-white/5 text-zinc-400 group-hover:text-white transition-colors">
                                <Icon className="w-4 h-4" />
                            </div>
                        )}
                        {title && (
                            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">
                                {title}
                            </h3>
                        )}
                    </div>
                    {/* Action Slot (For Export buttons, etc.) */}
                    {action && <div>{action}</div>}
                </div>
            )}

            {/* Content Container */}
            <div className="flex-1 overflow-hidden relative min-h-0">
                {children}
            </div>
        </div>
    );
}

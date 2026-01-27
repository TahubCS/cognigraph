import React from 'react';

export function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`
        bg-zinc-900/80      /* Semi-transparent dark background - increased opacity */
        border border-zinc-800 /* Professional subtle */
        rounded-xl           /* Modern rounding */
        shadow-sm            /* Subtle depth */
        ${className}
        `}>
        {children}
        </div>
    );
}
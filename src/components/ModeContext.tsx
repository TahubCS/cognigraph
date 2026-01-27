'use client';

import { createContext, useContext, useState } from 'react';
import { updateUserMode } from '@/actions/user';
import toast from 'react-hot-toast';

type Mode = 'general' | 'engineering' | 'legal' | 'medical';

interface ModeContextType {
    activeMode: Mode;
    setMode: (mode: Mode) => Promise<void>;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ 
    children, 
    initialMode = 'general' 
}: { 
    children: React.ReactNode;
    initialMode?: string;
}) {
    // Initialize state immediately with the server-provided value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [activeMode, setActiveMode] = useState<Mode>(initialMode as any);

    const setMode = async (mode: Mode) => {
        // 1. Optimistic Update (Change UI instantly)
        const previousMode = activeMode;
        setActiveMode(mode);
        
        try {
            // 2. Persist to DB
            await updateUserMode(mode);
            toast.success(`Switched to ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`);
        } catch (error) {
            console.error(error);
            // 3. Revert on failure
            setActiveMode(previousMode);
            toast.error('Failed to save mode preference');
        }
    };

    return (
        <ModeContext.Provider value={{ activeMode, setMode }}>
            {children}
        </ModeContext.Provider>
    );
}

export function useMode() {
    const context = useContext(ModeContext);
    if (context === undefined) {
        throw new Error('useMode must be used within a ModeProvider');
    }
    return context;
}
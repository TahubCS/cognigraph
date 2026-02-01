'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TransitionContextType {
    isTransitioning: boolean;
    startTransition: (durationMs?: number) => void;
}

const TransitionContext = createContext<TransitionContextType>({
    isTransitioning: false,
    startTransition: () => { },
});

export function TransitionProvider({ children }: { children: ReactNode }) {
    const [isTransitioning, setIsTransitioning] = useState(false);

    const startTransition = useCallback((durationMs: number = 300) => {
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), durationMs);
    }, []);

    return (
        <TransitionContext.Provider value={{ isTransitioning, startTransition }}>
            {children}
        </TransitionContext.Provider>
    );
}

export function useTransition() {
    return useContext(TransitionContext);
}

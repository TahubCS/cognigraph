'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Sparkles, Search, ArrowRight, Brain, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- CONFIGURATION ---
const QUESTIONS = [
    "Summarize the liability clauses in this contract...",
    "Find the revenue growth in Q3 report...",
    "Check this code for security vulnerabilities...",
    "What are the side effects of this medication?"
];

// ⚠️ REPLACE THIS WITH YOUR ACTUAL GITHUB URL
const GITHUB_URL = "https://github.com/your-username/your-repo-name";

// --- SMOOTH ANIMATION VARIANTS ---
// Fix: Explicitly type this as a tuple of 4 numbers to satisfy Framer Motion types
const smoothEase: [number, number, number, number] = [0.6, 0.05, 0.01, 0.9];

// --- COMPONENTS ---

// 1. The "Neural Field" Background - SMOOTHER
function NeuralBackground() {
    const [nodes, setNodes] = useState<Array<{ id: number; x: number; y: number; duration: number; delay: number }>>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const newNodes = Array.from({ length: 20 }).map((_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                duration: 15 + Math.random() * 15, // Longer, smoother cycles
                delay: Math.random() * 5,
            }));
            setNodes(newNodes);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {nodes.map((node) => (
                <motion.div
                    key={node.id}
                    className="absolute w-1 h-1 bg-zinc-700/30 rounded-full"
                    style={{ willChange: 'transform, opacity' }}
                    initial={{ x: `${node.x}%`, y: `${node.y}%`, opacity: 0 }}
                    animate={{
                        y: [`${node.y}%`, `${node.y - 10}%`, `${node.y}%`],
                        opacity: [0, 0.6, 0],
                    }}
                    transition={{
                        duration: node.duration,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: node.delay,
                    }}
                />
            ))}
        </div>
    );
}

// 2. The "Ingestion Engine" Demo - BUTTERY SMOOTH
function IngestionDemo() {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'chunking' | 'indexing' | 'complete'>('idle');

    useEffect(() => {
        let mounted = true;
        const cycle = async () => {
            if (!mounted) return;
            setStatus('idle');
            await new Promise(r => setTimeout(r, 2000));
            if (!mounted) return;
            setStatus('uploading');
            await new Promise(r => setTimeout(r, 1200));
            if (!mounted) return;
            setStatus('chunking');
            await new Promise(r => setTimeout(r, 1800));
            if (!mounted) return;
            setStatus('indexing');
            await new Promise(r => setTimeout(r, 2000));
            if (!mounted) return;
            setStatus('complete');
            await new Promise(r => setTimeout(r, 3000));
            if (mounted) cycle();
        };
        cycle();
        return () => { mounted = false; };
    }, []);

    return (
        <div className="relative w-full max-w-md h-64 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8">
            
            {/* Central "Brain" / Database - SMOOTH PULSE */}
            <motion.div 
                className="absolute"
                animate={status === 'indexing' ? { 
                    scale: [1, 1.15, 1],
                    filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                } : {}}
                transition={{ 
                    repeat: Infinity, 
                    duration: 2,
                    ease: "easeInOut"
                }}
            >
                <motion.div 
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        status === 'complete' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                    animate={{
                        boxShadow: status === 'complete' 
                            ? ["0 0 0 0 rgba(34, 197, 94, 0)", "0 0 0 20px rgba(34, 197, 94, 0)"]
                            : "0 0 0 0 rgba(0, 0, 0, 0)"
                    }}
                    transition={{ 
                        duration: 1.5,
                        ease: "easeOut",
                        repeat: status === 'complete' ? Infinity : 0
                    }}
                >
                    {status === 'complete' ? <CheckCircle2 className="w-8 h-8" /> : <Brain className="w-8 h-8" />}
                </motion.div>
            </motion.div>

            {/* The File that transforms - SMOOTH ENTRANCE */}
            <AnimatePresence mode="wait">
                {status === 'uploading' && (
                    <motion.div
                        initial={{ y: 60, opacity: 0, scale: 0.3 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, scale: 0, opacity: 0 }}
                        transition={{ 
                            type: "spring",
                            damping: 20,
                            stiffness: 150,
                            opacity: { duration: 0.3 }
                        }}
                        className="absolute top-8 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400"
                    >
                        <FileText className="w-6 h-6" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* The "Chunks" (Particles) - FLUID MOTION */}
            {status === 'chunking' && (
                <div className="absolute top-8 flex gap-1">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ y: 0, opacity: 1, scale: 1 }}
                            animate={{ 
                                y: 60,
                                x: (i - 2) * 15,
                                scale: 0.5,
                                opacity: 0
                            }}
                            transition={{ 
                                duration: 1.2,
                                delay: i * 0.15,
                                ease: smoothEase
                            }}
                            className="w-2 h-8 bg-blue-500 rounded-full"
                            style={{ willChange: 'transform, opacity' }}
                        />
                    ))}
                </div>
            )}

            {/* Embedding Beams - SILKY SMOOTH - Updated Gradient Class */}
            {status === 'indexing' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {[1, 2, 3, 4].map((i) => (
                        <motion.div
                            key={i}
                            className="absolute w-full h-px bg-linear-to-r from-transparent via-blue-500 to-transparent"
                            style={{ 
                                rotate: i * 45,
                                willChange: 'transform, opacity'
                            }}
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ 
                                scaleX: [0, 1, 1, 0],
                                opacity: [0, 0.8, 0.8, 0]
                            }}
                            transition={{ 
                                duration: 2.5,
                                repeat: Infinity,
                                delay: i * 0.3,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>
            )}
            
            {/* Status Text Label - SMOOTH FADE */}
            <motion.div 
                key={status}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute bottom-6 font-mono text-xs text-zinc-500 uppercase tracking-widest"
            >
                {status === 'idle' && "Waiting for data..."}
                {status === 'uploading' && "Ingesting Document..."}
                {status === 'chunking' && "Chunking & Embedding..."}
                {status === 'indexing' && "Updating Knowledge Graph..."}
                {status === 'complete' && "Ready to Answer."}
            </motion.div>
        </div>
    );
}

// 3. Typewriter Search Input - SMOOTHER CURSOR
function TypewriterInput() {
    const [index, setIndex] = useState(0);
    const [displayText, setDisplayText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentQ = QUESTIONS[index];
        const typeSpeed = isDeleting ? 30 : 50; 

        const timeout = setTimeout(() => {
            if (!isDeleting && displayText !== currentQ) {
                setDisplayText(currentQ.slice(0, displayText.length + 1));
            } else if (isDeleting && displayText !== "") {
                setDisplayText(currentQ.slice(0, displayText.length - 1));
            } else if (!isDeleting && displayText === currentQ) {
                setTimeout(() => setIsDeleting(true), 2000);
            } else if (isDeleting && displayText === "") {
                setIsDeleting(false);
                setIndex((prev) => (prev + 1) % QUESTIONS.length);
            }
        }, typeSpeed);

        return () => clearTimeout(timeout);
    }, [displayText, isDeleting, index]);

    return (
        <motion.div 
            className="w-full max-w-xl mx-auto mt-8 relative group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: smoothEase }}
        >
            {/* Glow effect - Updated Gradient Class */}
            <motion.div 
                className="absolute -inset-1 bg-linear-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-0 group-hover:opacity-50"
                transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center shadow-xl">
                <Search className="w-5 h-5 text-zinc-500 mr-3" />
                <span className="text-zinc-300 font-medium text-lg">
                    {displayText}
                    <motion.span
                        className="inline-block w-0.5 h-5 bg-blue-500 ml-0.5"
                        animate={{ opacity: [1, 1, 0, 0] }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    />
                </span>
            </div>
        </motion.div>
    );
}

// --- MAIN HERO COMPONENT ---

export default function HeroSection() {
    const router = useRouter(); // Initialize router

    return (
        <section className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden bg-[#09090b] px-4 pt-20 pb-32">
        
            {/* 1. Background Animation */}
            <NeuralBackground />

            <div className="relative z-10 w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                
                {/* Left Column: Copy & Input - SMOOTHER ENTRANCE */}
                <div className="space-y-6 text-center lg:text-left">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                            duration: 0.8,
                            ease: smoothEase
                        }}
                    >
                        <motion.div 
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                                delay: 0.2,
                                duration: 0.5,
                                ease: smoothEase
                            }}
                        >
                            <Sparkles className="w-3 h-3" />
                            <span>Version 1.0 Live</span>
                        </motion.div>
                        
                        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-white mb-6">
                            Chat with your <br/>
                            {/* Updated Gradient Class */}
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-purple-500">
                                Institutional Knowledge
                            </span>
                        </h1>
                        
                        <p className="text-lg text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Stop searching through folders. CogniGraph ingests your PDFs, Code, and Legal docs, turning them into an intelligent neural network you can talk to.
                        </p>
                    </motion.div>

                    {/* Typewriter Input */}
                    <TypewriterInput />
                    
                    <motion.div 
                        className="flex flex-col sm:flex-row items-center gap-4 mt-8 justify-center lg:justify-start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5, ease: smoothEase }}
                    >
                        {/* GET STARTED BUTTON -> Redirects to /sign-up */}
                        <motion.button 
                            onClick={() => router.push('/sign-up')}
                            className="px-8 py-3 bg-white text-black font-semibold rounded-lg flex items-center gap-2 group overflow-hidden relative"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", damping: 15, stiffness: 300 }}
                        >
                            <span className="relative z-10">Get Started</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 relative z-10" />
                            <motion.div
                                className="absolute inset-0 bg-zinc-200"
                                initial={{ x: "-100%" }}
                                whileHover={{ x: 0 }}
                                transition={{ duration: 0.3 }}
                            />
                        </motion.button>
                        
                        {/* DOCUMENTATION BUTTON -> Opens GitHub in new tab */}
                        <motion.button 
                            onClick={() => window.open(GITHUB_URL, '_blank')}
                            className="px-8 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium rounded-lg"
                            whileHover={{ 
                                backgroundColor: "rgb(39, 39, 42)",
                                borderColor: "rgb(63, 63, 70)",
                                scale: 1.02
                            }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                            View Documentation
                        </motion.button>
                    </motion.div>
                </div>

                {/* Right Column: Visual Animation - SMOOTH ENTRANCE */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                        duration: 1,
                        delay: 0.3,
                        ease: smoothEase
                    }}
                    className="flex justify-center"
                >
                    <IngestionDemo />
                </motion.div>
            </div>
            
            {/* Bottom Fade - Updated Gradient Class */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-[#09090b] to-transparent pointer-events-none" />
        </section>
    );
}
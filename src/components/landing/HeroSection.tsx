'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, ArrowRight, Brain, Zap, Share2, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// --- CONFIGURATION ---
const QUESTIONS = [
    "Summarize the liability clauses in this contract...",
    "Find the revenue growth in Q3 report...",
    "Check this code for security vulnerabilities...",
    "What are the side effects of this medication?"
];

const GITHUB_URL = "https://github.com/TahubCS/CogniGraph";

// --- COMPONENTS ---

function BackgroundNodes() {
    const [nodes, setNodes] = useState<Array<{ id: number; x: number; y: number }>>([]);

    useEffect(() => {
        // Create a fixed set of nodes
        setNodes(Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
        })));
    }, []);

    const ImmersiveIngestionCycle = dynamic(
        () => import("./ImmersiveIngestionCycle"),
        { ssr: false }
    );

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Ambient Gradient Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />

            {/* Nodes & Connections */}
            <svg className="absolute inset-0 w-full h-full opacity-20">
                {nodes.map((node, i) => (
                    nodes.map((target, j) => {
                        if (i >= j) return null; // Avoid duplicates
                        const dist = Math.hypot(node.x - target.x, node.y - target.y);
                        if (dist > 30) return null; // Only connect close nodes
                        return (
                            <motion.line
                                key={`${i}-${j}`}
                                x1={`${node.x}%`}
                                y1={`${node.y}%`}
                                x2={`${target.x}%`}
                                y2={`${target.y}%`}
                                stroke="white"
                                strokeWidth="1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.1, 0.3, 0.1] }}
                                transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                            />
                        );
                    })
                ))}
            </svg>

            {nodes.map((node) => (
                <motion.div
                    key={node.id}
                    className="absolute w-1.5 h-1.5 bg-blue-400/50 rounded-full"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 3,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                    }}
                />
            ))}
        </div>
    );
}

function ImmersiveIngestionCycle() {
    const [step, setStep] = useState(0); // 0: Idle, 1: Upload, 2: Chunk, 3: Connect

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev + 1) % 4);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full hidden lg:flex items-center justify-center pointer-events-none z-10">
            <div className="relative w-[500px] h-[500px]">
                {/* Step 1: Document Floating */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                        opacity: step === 1 ? 1 : 0,
                        scale: step === 1 ? 1 : 0.8,
                        y: step === 1 ? 0 : 20
                    }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="w-24 h-32 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/10" />
                        <FileText className="w-10 h-10 text-zinc-400" />
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"
                            initial={{ width: "0%" }}
                            animate={{ width: step === 1 ? "100%" : "0%" }}
                            transition={{ duration: 2 }}
                        />
                    </div>
                    <div className="absolute mt-40 text-sm font-mono text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
                        Reading Document...
                    </div>
                </motion.div>

                {/* Step 2: Chunking / Splitting */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                        opacity: step === 2 ? 1 : 0,
                    }}
                    transition={{ duration: 0.5 }}
                >
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-12 h-4 bg-zinc-800 border border-zinc-700 rounded-sm"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={step === 2 ? {
                                x: (Math.random() - 0.5) * 200,
                                y: (Math.random() - 0.5) * 200,
                                scale: 1,
                                opacity: [0, 1, 0],
                                rotate: Math.random() * 45
                            } : {}}
                            transition={{ duration: 2, ease: "easeOut" }}
                        />
                    ))}
                    <div className="absolute mt-40 text-sm font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full">
                        extract_chunks(size=512)
                    </div>
                </motion.div>

                {/* Step 3: Graph Construction */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                        opacity: step === 3 ? 1 : 0,
                        scale: step === 3 ? 1 : 0.9
                    }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="relative">
                        <Brain className="w-24 h-24 text-zinc-700 absolute inset-0 m-auto opacity-20" />
                        <svg className="w-64 h-64 overflow-visible">
                            {[...Array(8)].map((_, i) => (
                                <motion.circle
                                    key={i}
                                    cx={(128 + Math.cos(i) * 80).toFixed(4)}
                                    cy={(128 + Math.sin(i) * 80).toFixed(4)}
                                    r="6"
                                    fill={i % 2 === 0 ? "#3b82f6" : "#a855f7"}
                                    initial={{ scale: 0 }}
                                    animate={step === 3 ? { scale: 1 } : { scale: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    suppressHydrationWarning={true}
                                />
                            ))}
                            {[...Array(8)].map((_, i) => (
                                <motion.line
                                    key={`l-${i}`}
                                    x1="128"
                                    y1="128"
                                    x2={(128 + Math.cos(i) * 80).toFixed(4)}
                                    y2={(128 + Math.sin(i) * 80).toFixed(4)}
                                    stroke="url(#grad)"
                                    strokeWidth="2"
                                    strokeOpacity="0.5"
                                    initial={{ pathLength: 0 }}
                                    animate={step === 3 ? { pathLength: 1 } : { pathLength: 0 }}
                                    transition={{ duration: 1, delay: i * 0.1 }}
                                    suppressHydrationWarning={true}
                                />
                            ))}
                            <defs>
                                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-8 text-sm font-mono text-green-400 bg-green-500/10 px-3 py-1 rounded-full whitespace-nowrap">
                            Knowledge Graph Ready
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

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
        <div className="w-full max-w-xl relative group">
            <div className="absolute -inset-0.5 bg-linear-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
            <div className="relative bg-[#0F0F12] border border-zinc-800 rounded-xl p-4 flex items-center shadow-2xl">
                <Search className="w-5 h-5 text-zinc-500 mr-4" />
                <span className="text-zinc-300 font-medium text-lg font-mono">
                    {displayText}
                    <motion.span
                        className="inline-block w-2 h-5 bg-blue-500 ml-1 align-middle"
                        animate={{ opacity: [1, 1, 0, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                </span>
            </div>
        </div>
    );
}

export default function HeroSection() {
    const router = useRouter();

    return (
        <section className="relative min-h-screen flex items-center overflow-hidden pt-20">

            {/* 1. Global Background Effects */}
            <BackgroundNodes />

            <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12">

                {/* Left Column: Hero Content */}
                <div className="max-w-3xl pt-10 lg:pt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 text-xs font-medium mb-8 backdrop-blur-sm">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span>AI-Powered Knowledge Retrieval</span>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-8 leading-[1.1]">
                            Talk to your <br />
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-purple-400 to-pink-400">
                                Collective Intelligence
                            </span>
                        </h1>

                        <p className="text-xl text-zinc-400 max-w-xl leading-relaxed mb-10">
                            Transform your scattered PDFs, Docs, and databases into a living Knowledge Graph. Stop searching, start understanding.
                        </p>
                    </motion.div>

                    <TypewriterInput />

                    <motion.div
                        className="flex flex-col sm:flex-row items-center gap-5 mt-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <button
                            onClick={() => router.push('/sign-up')}
                            className="px-8 py-4 bg-white text-black text-lg font-semibold rounded-full flex items-center gap-2 hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95"
                        >
                            Start for free
                            <ArrowRight className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => window.open(GITHUB_URL, '_blank')}
                            className="px-8 py-4 bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-lg font-medium rounded-full hover:bg-zinc-800 transition-all backdrop-blur-sm"
                        >
                            View the Code
                        </button>
                    </motion.div>

                    <div className="mt-16 flex items-center gap-8 text-zinc-500">
                        <div className="flex items-center gap-2">
                            <Share2 className="w-5 h-5" />
                            <span className="text-sm">Connect any data source</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5" />
                            <span className="text-sm">Auto-generated Graphs</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Immersive Animation Overlay */}
                <ImmersiveIngestionCycle />
            </div>

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-[#0F0F12] to-transparent pointer-events-none z-20" />
        </section>
    );
}

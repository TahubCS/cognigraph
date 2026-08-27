'use client';

import { motion } from 'framer-motion';

interface Node {
    id: number;
    x: number;
    y: number;
}

export default function DashboardBackground() {
    const nodes: Node[] = [
        { id: 0, x: 8, y: 18 }, { id: 1, x: 21, y: 43 },
        { id: 2, x: 37, y: 12 }, { id: 3, x: 48, y: 62 },
        { id: 4, x: 61, y: 31 }, { id: 5, x: 74, y: 75 },
        { id: 6, x: 91, y: 22 }, { id: 7, x: 14, y: 82 },
        { id: 8, x: 34, y: 89 }, { id: 9, x: 57, y: 9 },
        { id: 10, x: 79, y: 47 }, { id: 11, x: 94, y: 88 },
    ];

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Ambient Gradient Blobs - Matching HeroSection */}
            <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-blue-500/8 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-purple-500/8 rounded-full blur-[120px]" />
            <div className="absolute top-[40%] right-[20%] w-[25%] h-[25%] bg-indigo-500/5 rounded-full blur-[100px]" />

            {/* Animated Node Network */}
            <svg className="absolute inset-0 w-full h-full opacity-15">
                {nodes.map((node, i) => (
                    nodes.map((target, j) => {
                        if (i >= j) return null;
                        const dist = Math.hypot(node.x - target.x, node.y - target.y);
                        if (dist > 35) return null;
                        return (
                            <motion.line
                                key={`${i}-${j}`}
                                x1={`${node.x}%`}
                                y1={`${node.y}%`}
                                x2={`${target.x}%`}
                                y2={`${target.y}%`}
                                stroke="url(#dashboardGrad)"
                                strokeWidth="1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.1, 0.4, 0.1] }}
                                transition={{
                                    duration: 4 + ((i + j) % 4) * 0.6,
                                    repeat: Infinity,
                                    delay: ((i * 2 + j) % 5) * 0.3
                                }}
                            />
                        );
                    })
                ))}
                <defs>
                    <linearGradient id="dashboardGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Pulsing Nodes */}
            {nodes.map((node) => (
                <motion.div
                    key={node.id}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        background: node.id % 2 === 0
                            ? 'rgba(59, 130, 246, 0.5)'
                            : 'rgba(168, 85, 247, 0.5)'
                    }}
                    animate={{
                        scale: [1, 1.8, 1],
                        opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                        duration: 3 + (node.id % 4) * 0.5,
                        repeat: Infinity,
                        delay: (node.id % 3) * 0.4,
                    }}
                />
            ))}
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Node {
    id: number;
    x: number;
    y: number;
}

export default function DashboardBackground() {
    const [nodes, setNodes] = useState<Node[]>([]);

    useEffect(() => {
        // Create fewer nodes for performance (dashboard runs alongside graph viz)
        setNodes(Array.from({ length: 12 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
        })));
    }, []);

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
                                    duration: 4 + Math.random() * 3,
                                    repeat: Infinity,
                                    delay: Math.random() * 2
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
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                    }}
                />
            ))}
        </div>
    );
}

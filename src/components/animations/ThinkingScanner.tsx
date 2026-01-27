'use client';
import { motion } from 'framer-motion';

export default function ThinkingScanner() {
    return (
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden relative mb-4 opacity-70">
        {/* The "Scanner" Line */}
        <motion.div
            className="absolute top-0 bottom-0 w-1/3 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-50"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        {/* The "Data Dots" that light up */}
            <div className="absolute inset-0 flex justify-evenly items-center">
                {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                    key={i}
                    className="w-1 h-1 bg-blue-400 rounded-full"
                    animate={{ opacity: [0.1, 1, 0.1] }}
                    transition={{ duration: 0.5, delay: i * 0.1 + 0.5, repeat: Infinity }}
                />
                ))}
            </div>
        </div>
    );
}
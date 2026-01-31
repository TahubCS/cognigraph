'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SiGrapheneos } from "react-icons/si";
import dynamic from 'next/dynamic';

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { scrollY } = useScroll();
    const router = useRouter();

    useEffect(() => {
        return scrollY.onChange((latest) => {
            setIsScrolled(latest > 50);
        });
    }, [scrollY]);

    return (
        <motion.nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50 py-3' : 'bg-transparent py-5'
                }`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container mx-auto px-6 flex items-center justify-between">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <SiGrapheneos className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-zinc-400">
                        CogniGraph
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        Capabilities
                    </Link>
                    <Link href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        Pricing
                    </Link>
                    <Link href="https://github.com/your-username/your-repo-name" target="_blank" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        Documentation
                    </Link>
                </div>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/sign-in" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                        Sign In
                    </Link>

                    <button
                        onClick={() => router.push('/sign-up')}
                        className="group relative px-5 py-2 rounded-full bg-white text-zinc-950 text-sm font-semibold hover:bg-zinc-200 transition-colors overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-1">
                            Get Started
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-zinc-400 hover:text-white"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 bg-zinc-950 border-b border-zinc-800 p-6 md:hidden flex flex-col gap-4 shadow-2xl"
                >
                    <Link href="#features" className="text-zinc-400 hover:text-white py-2">Capabilities</Link>
                    <Link href="#pricing" className="text-zinc-400 hover:text-white py-2">Pricing</Link>
                    <Link href="/sign-in" className="text-zinc-400 hover:text-white py-2">Sign In</Link>
                    <button
                        onClick={() => router.push('/sign-up')}
                        className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium center"
                    >
                        Get Started
                    </button>
                </motion.div>
            )}
        </motion.nav>
    );
}

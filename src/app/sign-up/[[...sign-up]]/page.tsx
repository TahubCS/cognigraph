'use client';

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";

// --- COMPONENTS ---

function AuthNavbar() {
    return (
        <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
            {/* Logo / Home Link */}
            <Link 
                href="/" 
                className="flex items-center gap-2 group"
            >
                <div className="p-2 bg-blue-600/10 rounded-lg border border-blue-500/20 group-hover:bg-blue-600/20 transition-colors">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-lg font-bold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                    CogniGraph
                </span>
            </Link>

            {/* Back to Site (Optional explicit button) */}
            <Link 
                href="/"
                className="hidden sm:flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
            </Link>
        </nav>
    );
}

function GridBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Gradient Mesh */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />
            
            {/* Fade Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-[#09090b] via-transparent to-[#09090b]" />
        </div>
    );
}

// --- MAIN PAGE ---

export default function SignUpPage() {
    return (
        <main className="relative min-h-screen w-full bg-[#09090b] flex flex-col items-center justify-center p-4">
            
            {/* 1. Navigation & Background */}
            <AuthNavbar />
            <GridBackground />

            {/* 2. The Form Container */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
                    <p className="text-zinc-400 text-sm">
                        Join the workspace for intelligent document analysis.
                    </p>
                </div>

                {/* 3. Styled Clerk Component */}
                <div className="flex justify-center">
                    <SignUp 
                        appearance={{
                            // Layout config
                            layout: {
                                socialButtonsPlacement: 'bottom',
                                socialButtonsVariant: 'blockButton',
                            },
                            // Theme variables to match "Zinc" look
                            variables: {
                                colorPrimary: '#3b82f6', // blue-600
                                colorText: '#f4f4f5',    // zinc-100
                                colorTextSecondary: '#a1a1aa', // zinc-400
                                colorBackground: '#18181b', // zinc-900
                                colorInputBackground: '#27272a', // zinc-800
                                colorInputText: '#fff',
                                borderRadius: '0.75rem',
                            },
                            // Granular element styling with Tailwind classes
                            elements: {
                                card: "bg-zinc-950 border border-zinc-800 shadow-2xl",
                                headerTitle: "hidden", // We rendered our own title above
                                headerSubtitle: "hidden",
                                socialButtonsBlockButton: "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-all",
                                socialButtonsBlockButtonText: "font-medium",
                                dividerLine: "bg-zinc-800",
                                dividerText: "text-zinc-500",
                                formFieldLabel: "text-white font-medium",
                                formFieldInput: "bg-zinc-900 border-zinc-800 focus:border-blue-500 transition-colors shadow-inner",
                                formButtonPrimary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20",
                                footerActionLink: "text-blue-400 hover:text-blue-300 font-medium"
                            }
                        }}
                    />
                </div>
            </motion.div>
        </main>
    );
}
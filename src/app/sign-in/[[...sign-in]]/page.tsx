'use client';

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { dark } from "@clerk/themes";
import { motion } from "framer-motion";
import { ArrowLeft} from "lucide-react";
import { BiLogoGraphql } from "react-icons/bi";

// --- COMPONENTS (Shared Design) ---

function AuthNavbar() {
    return (
        <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
            {/* Logo / Home Link */}
            <Link 
                href="/" 
                className="flex items-center gap-2 group"
            >
                <div className="p-2 bg-blue-600/10 rounded-lg border border-blue-500/20 group-hover:bg-blue-600/20 transition-colors">
                    <BiLogoGraphql className="w-8 h-8 text-blue-500" />
                </div>
                <span className="text-lg font-bold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                    CogniGraph
                </span>
            </Link>

            {/* Back to Site */}
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
            {/* Gradient Mesh - Slightly different positions for variety if desired */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />
            
            {/* Fade Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-[#09090b] via-transparent to-[#09090b]" />
        </div>
    );
}

// --- MAIN PAGE ---

export default function SignInPage() {
    return (
        <main className="relative min-h-screen w-full bg-[#09090b] flex flex-col items-center justify-center p-4">
            
            {/* Navigation & Background */}
            <AuthNavbar />
            <GridBackground />

            {/* Form Container */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
                    <p className="text-zinc-400 text-sm">
                        Enter your credentials to access your workspace.
                    </p>
                </div>

                <div className="flex justify-center">
                    <SignIn 
                        appearance={{
                            // 2. Use the official Dark Theme as a base (Fixes GitHub Icon)
                            baseTheme: dark,
                            layout: {
                                socialButtonsPlacement: 'bottom',
                                socialButtonsVariant: 'blockButton',
                            },
                            variables: {
                                colorPrimary: '#3b82f6',
                                colorBackground: '#18181b',
                                colorInputBackground: '#27272a',
                                colorInputText: '#fff',
                                borderRadius: '0.75rem',
                            },
                            elements: {
                                // 3. Increased Padding (!p-8) to fit "Last used" badge
                                card: "bg-zinc-950 border border-zinc-800 shadow-2xl !p-8",
                                
                                headerTitle: "hidden", 
                                headerSubtitle: "hidden",
                                
                                // Social Buttons (Now using dark theme base, so we just tweak border)
                                socialButtonsBlockButton: "bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 transition-all py-2.5",
                                socialButtonsBlockButtonText: "font-medium",
                                
                                // Ensure icons are sized consistently
                                socialButtonsProviderIcon: "w-5 h-5",

                                dividerLine: "bg-zinc-800",
                                dividerText: "text-zinc-500",
                                formFieldLabel: "text-zinc-400 font-medium",
                                formFieldInput: "bg-zinc-900 border-zinc-800 focus:border-blue-500 transition-colors shadow-inner text-white",
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
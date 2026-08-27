'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll } from 'framer-motion';
import { ArrowRight, Github, Menu, X } from 'lucide-react';
import { SiGrapheneos } from 'react-icons/si';

const GITHUB_URL = 'https://github.com/TahubCS/cognigraph';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => scrollY.on('change', (latest) => setIsScrolled(latest > 24)), [scrollY]);

  return (
    <motion.header initial={{ y: -80 }} animate={{ y: 0 }} className={`fixed inset-x-0 top-0 z-50 border-b transition ${isScrolled || mobileMenuOpen ? 'border-white/10 bg-[#08090c]/90 backdrop-blur-xl' : 'border-transparent bg-transparent'}`}>
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12" aria-label="Primary navigation">
        <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg" aria-label="CogniGraph home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10"><SiGrapheneos className="h-5 w-5 text-blue-300" aria-hidden="true" /></span>
          <span className="text-lg font-semibold tracking-tight text-white">CogniGraph</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="focus-ring rounded text-sm text-zinc-400 transition hover:text-white">Capabilities</Link>
          <Link href="#workflow" className="focus-ring rounded text-sm text-zinc-400 transition hover:text-white">Workflow</Link>
          <Link href={GITHUB_URL} target="_blank" rel="noreferrer" className="focus-ring flex items-center gap-1.5 rounded text-sm text-zinc-400 transition hover:text-white"><Github className="h-4 w-4" aria-hidden="true" /> GitHub</Link>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <Link href="/sign-in" className="focus-ring rounded text-sm font-medium text-zinc-300 transition hover:text-white">Sign in</Link>
          <Link href="/sign-up" className="focus-ring inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-blue-50">Get started <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <button type="button" className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10 md:hidden" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}>
          {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </nav>
      {mobileMenuOpen && (
        <motion.div id="mobile-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border-t border-white/10 bg-[#08090c] px-5 pb-6 pt-3 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col">
            <Link onClick={() => setMobileMenuOpen(false)} href="#features" className="focus-ring rounded-lg px-3 py-3 text-zinc-300 hover:bg-white/5">Capabilities</Link>
            <Link onClick={() => setMobileMenuOpen(false)} href="#workflow" className="focus-ring rounded-lg px-3 py-3 text-zinc-300 hover:bg-white/5">Workflow</Link>
            <Link href={GITHUB_URL} target="_blank" rel="noreferrer" className="focus-ring rounded-lg px-3 py-3 text-zinc-300 hover:bg-white/5">GitHub</Link>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-5"><Link href="/sign-in" className="focus-ring rounded-full border border-white/15 px-4 py-3 text-center font-medium text-white">Sign in</Link><Link href="/sign-up" className="focus-ring rounded-full bg-white px-4 py-3 text-center font-semibold text-zinc-950">Get started</Link></div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}

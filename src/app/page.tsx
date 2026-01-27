import { SignedIn, SignedOut } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { Toaster } from 'react-hot-toast';
import { getUserSettings } from '@/actions/user';
import HeroSection from '@/components/landing/HeroSection';
import Dashboard from '@/components/Dashboard'; // We now use the new component

export default async function Home() {
  await auth(); 
  const settings = await getUserSettings();

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-blue-500/30">
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#18181b',
          color: '#f4f4f5',
          border: '1px solid #27272a',
        },
      }} />

      {/* 1. Signed Out View */}
      <SignedOut>
         <HeroSection />
      </SignedOut>

      {/* 2. Signed In View - Loads the Interactive Dashboard */}
      <SignedIn>
        <Dashboard initialMode={settings.activeMode || 'general'} />
      </SignedIn>
    </main>
  );
}
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#09090b',
          colorInputBackground: '#18181b',
          colorInputText: '#f4f4f5',
          colorText: '#f4f4f5',
          colorTextSecondary: '#a1a1aa',
        },
        elements: {
          card: 'bg-zinc-950 border border-zinc-800 shadow-2xl',
          userButtonPopoverCard: 'bg-zinc-950 border border-zinc-800',
          userButtonPopoverActionButton: 'text-zinc-300 hover:bg-zinc-800',
          userButtonPopoverActionButtonText: 'text-zinc-300',
          userButtonPopoverActionButtonIcon: 'text-zinc-400',
          userButtonPopoverFooter: 'hidden',
        }
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          {/* ❌ DO NOT ADD A HEADER HERE - Dashboard has its own */}
          {/* The old code probably had something like:
          <header>
            <h1>CogniGraph</h1>
            <UserButton />
          </header>
          */}

          {/* ✅ JUST RENDER CHILDREN - no wrapper headers */}
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}

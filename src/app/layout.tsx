import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'CogniGraph — Connected answers from your documents',
  description: 'Transform documents into an explorable knowledge graph and ask AI questions grounded in your own sources.',
  applicationName: 'CogniGraph',
  keywords: ['knowledge graph', 'RAG', 'document intelligence', 'AI search'],
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#08090c',
};

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
          className="antialiased"
          suppressHydrationWarning
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}

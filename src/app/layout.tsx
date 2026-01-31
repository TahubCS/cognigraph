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
    <ClerkProvider>
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

import { ClerkProvider } from '@clerk/nextjs'
// @ts-expect-error: allow css import without types
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
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
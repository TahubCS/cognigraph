import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
// @ts-expect-error: allow CSS side-effect import without declaration
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CogniGraph - AI Knowledge Graph",
  description: "Upload documents and chat with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
        appearance={{ baseTheme: dark }}
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
      <html lang="en" suppressHydrationWarning={true}>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950`}
          suppressHydrationWarning={true}
        >
          {/* Dark Header */}
          <header className="border-b border-gray-800 bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
              <h1 className="text-xl font-bold text-white">CogniGraph</h1>
              <div>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </div>
          </header>
          
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
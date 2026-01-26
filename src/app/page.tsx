import FileUpload from '@/components/FileUpload';
import ChatInterface from '@/components/ChatInterface';
import GraphVisualization from '@/components/GraphVisualization';
import DocumentList from '@/components/DocumentsList';
import { Toaster } from 'react-hot-toast';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center py-12 px-4">
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          border: '1px solid #374151',
        },
      }} />

      {userId && (
        <div className="fixed bottom-4 left-4 bg-green-900/50 text-white px-3 py-2 rounded text-xs border border-green-700">
          Signed in
        </div>
      )}

      <SignedOut>
        <div className="max-w-md w-full text-center space-y-6 mt-20">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Welcome to CogniGraph</h1>
            <p className="text-lg text-gray-400">
              Sign in to upload documents and chat with AI
            </p>
          </div>
          <SignInButton mode="modal" forceRedirectUrl="/">
            <button className="px-8 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 shadow-lg">
              Get Started
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-6xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">CogniGraph</h1>
            <p className="text-lg text-gray-400">
              Upload your documents to generate an AI Knowledge Graph.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              <FileUpload />
              <DocumentList />
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <GraphVisualization />
            </div>
          </div>

          {/* Full Width Chat */}
          <ChatInterface />
        </div>
      </SignedIn>
    </main>
  );
}
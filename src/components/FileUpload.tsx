'use client';

import { useState } from 'react';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { getPresignedUrl, triggerProcessing } from '@/actions/storage';
import toast from 'react-hot-toast';

export default function FileUpload() {
    const [isUploading, setIsUploading] = useState(false);

    async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File is too large. Max 5MB.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Initializing upload...");

        try {
            // 1. Get URL and create DB Record (Status: PENDING)
            const { success, url, fileKey, documentId, error } = await getPresignedUrl(file.name, file.type);

            if (!success || !url) {
                throw new Error(error || "Failed to get upload URL");
            }

            // 2. Upload to S3
            toast.loading("Uploading to cloud...", { id: toastId });
            
            const uploadResponse = await fetch(url, {
                method: "PUT",
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error("S3 Upload rejected the file");
            }

            // 3. Trigger Python Processing
            toast.loading("Starting AI processing...", { id: toastId });
            await triggerProcessing(fileKey, documentId);

            // --- KEY CHANGE: NOTIFY LIST TO REFRESH IMMEDIATELY ---
            window.dispatchEvent(new Event('refresh-doc-list'));

            toast.success("File uploaded! Processing started.", { id: toastId });
            console.log("File uploaded successfully:", fileKey);
            
        } catch (err) {
            console.error(err);
            toast.error("Upload failed. Check console.", { id: toastId });
        } finally {
            setIsUploading(false);
            // Reset file input
            event.target.value = '';
        }
    }

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-gray-900 rounded-xl shadow-xl border border-gray-800 transition-all hover:border-gray-700">
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className={`p-4 rounded-full transition-colors ${
                    isUploading ? 'bg-blue-900/30' : 'bg-blue-950/50'
                }`}>
                    {isUploading ? (
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    ) : (
                        <Upload className="w-8 h-8 text-blue-400" />
                    )}
                </div>
                
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-white">
                        {isUploading ? "Processing Document..." : "Upload Document"}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {isUploading ? "AI is reading & chunking content" : "PDF or TXT (Max 5MB)"}
                    </p>
                </div>

                <label className={`relative cursor-pointer group ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                    <span className="px-6 py-2.5 bg-blue-600 group-hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
                        {isUploading ? "Please Wait" : "Select File"}
                    </span>
                    <input 
                        type="file" 
                        className="hidden" 
                        accept="application/pdf,text/plain"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                    />
                </label>
            </div>
        </div>
    );
}
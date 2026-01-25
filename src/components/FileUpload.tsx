'use client';

import { useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getPresignedUrl, triggerProcessing } from '@/actions/storage';
import toast from 'react-hot-toast';

export default function FileUpload() {
    const [isUploading, setIsUploading] = useState(false);

    async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        // 1. Validation (Optional: Limit size to 5MB)
        if (file.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Max 5MB.");
        return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Initializing upload...");

        try {
        // 2. Server Action: Get the Presigned URL
        const { success, url, fileKey, documentId, error } = await getPresignedUrl(file.name, file.type);

        if (!success || !url) {
            throw new Error(error || "Failed to get upload URL");
        }

        // 3. Direct Upload to S3
        toast.loading("Uploading to S3...", { id: toastId });
        
        const uploadResponse = await fetch(url, {
            method: "PUT",
            body: file,
        });

        if (!uploadResponse.ok) {
            throw new Error("S3 Upload rejected the file");
        }

        // --- NEW CODE STARTS HERE ---
        // 4. Trigger Python Processing
        toast.loading("AI is processing...", { id: toastId });

        // We call our own Next.js API (Server Action) to proxy the request to Python
        // Or for now, we can cheat and call a new Server Action to hit Python.
        await triggerProcessing(fileKey, documentId);
        // --- NEW CODE ENDS HERE ---

        // 4. Success State
        toast.success("Upload complete!", { id: toastId });
        console.log("File uploaded successfully:", fileKey);
        
        } catch (err) {
        console.error(err);
        toast.error("Upload failed. Check console.", { id: toastId });
        } finally {
        setIsUploading(false);
        }
    }

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100">
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-blue-50 rounded-full">
                {isUploading ? (
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                ) : (
                    <Upload className="w-8 h-8 text-blue-500" />
                )}
            </div>
            
            <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
                <p className="text-sm text-gray-500">PDF or TXT (Max 5MB)</p>
            </div>

            <label className="relative cursor-pointer">
            <span className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow transition-colors">
                {isUploading ? "Uploading..." : "Select File"}
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
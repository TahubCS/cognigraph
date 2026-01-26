'use client';

import { useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getPresignedUrl, triggerProcessing } from '@/actions/storage';
import toast from 'react-hot-toast';
import ErrorMessage from './ErrorMessage';

export default function FileUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);

    async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        // Clear previous errors
        setUploadError(null);

        // Validation
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            const errorMsg = `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB.`;
            setUploadError(errorMsg);
            toast.error("File too large");
            return;
        }

        // Check file type
        const allowedTypes = ['application/pdf', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
            const errorMsg = `File type "${file.type}" is not supported. Please upload a PDF or TXT file.`;
            setUploadError(errorMsg);
            toast.error("Invalid file type");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Initializing upload...");

        try {
            // Step 1: Get presigned URL
            toast.loading("Getting upload URL...", { id: toastId });
            const { success, url, fileKey, documentId, error } = await getPresignedUrl(file.name, file.type);

            if (!success || !url) {
                throw new Error(error || "Failed to get upload URL from server");
            }

            // Step 2: Upload to S3
            toast.loading(`Uploading "${file.name}" to cloud storage...`, { id: toastId });
            
            const uploadResponse = await fetch(url, {
                method: "PUT",
                body: file,
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`S3 upload failed: ${uploadResponse.status} - ${errorText || 'Unknown error'}`);
            }

            // Step 3: Trigger AI processing
            toast.loading("Starting AI processing...", { id: toastId });
            const processingResult = await triggerProcessing(fileKey, documentId);
            
            if (!processingResult.success) {
                throw new Error("AI processing failed to start. The file was uploaded but won't be analyzed.");
            }

            // Success!
            toast.success(`"${file.name}" uploaded successfully!`, { id: toastId });
            setLastUploadedFile(file.name);
            console.log("✅ File uploaded successfully:", fileKey);
            
            // Trigger graph refresh
            window.dispatchEvent(new CustomEvent('file-uploaded'));
            
            // Clear the file input
            event.target.value = '';
            
        } catch (err) {
            console.error("Upload error:", err);
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
            setUploadError(errorMessage);
            toast.error("Upload failed", { id: toastId });
        } finally {
            setIsUploading(false);
        }
    }

    const retryUpload = () => {
        setUploadError(null);
        // Trigger file input click
        document.getElementById('file-input')?.click();
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4">
            <div className="p-6 bg-gray-900 rounded-xl shadow-xl border border-gray-800">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-blue-950/50 rounded-full">
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        ) : lastUploadedFile ? (
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        ) : (
                            <Upload className="w-8 h-8 text-blue-400" />
                        )}
                    </div>
                    
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-white">Upload Document</h3>
                        <p className="text-sm text-gray-400">PDF or TXT (Max 5MB)</p>
                        {lastUploadedFile && (
                            <p className="text-xs text-green-400 mt-1">Last: {lastUploadedFile}</p>
                        )}
                    </div>

                    <label className="relative cursor-pointer">
                        <span className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow transition-colors">
                            {isUploading ? "Uploading..." : "Select File"}
                        </span>
                        <input 
                            id="file-input"
                            type="file" 
                            className="hidden" 
                            accept="application/pdf,text/plain"
                            onChange={handleFileSelect}
                            disabled={isUploading}
                        />
                    </label>

                    {isUploading && (
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full animate-pulse w-full"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {uploadError && (
                <ErrorMessage
                    title="Upload Failed"
                    message={uploadError}
                    onRetry={retryUpload}
                    onDismiss={() => setUploadError(null)}
                />
            )}
        </div>
    );
}
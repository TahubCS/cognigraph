'use client';

import { useState } from 'react';
import { Upload, Loader2, CheckCircle, FileText, X } from 'lucide-react';
import { getPresignedUrl, triggerProcessing } from '@/actions/storage';
import { deleteDocument } from '@/actions/documents';
import toast from 'react-hot-toast';
import ErrorMessage from './ErrorMessage';

export default function FileUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return { valid: false, error: "File too large (max 5MB)" };
        }

        const allowedTypes = ['application/pdf', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: "Invalid file type. Only PDF and TXT files are allowed." };
        }

        return { valid: true };
    };

    const handleFileSelection = (file: File) => {
        setUploadError(null);
        
        const validation = validateFile(file);
        if (!validation.valid) {
            toast.error(validation.error!);
            return;
        }

        setSelectedFile(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    };

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileSelection(file);
        }
        event.target.value = ''; // Reset input
    };

    const uploadFile = async () => {
        if (!selectedFile || isUploading) return;

        setIsUploading(true);
        const toastId = toast.loading("Initializing upload...");

        let currentDocumentId: string | null = null;

        try {
            // Step 1: Get presigned URL
            toast.loading("Getting upload URL...", { id: toastId });
            const { success, url, fileKey, documentId, error, rateLimitError, resetAt } = await getPresignedUrl(selectedFile.name, selectedFile.type);

            if (!success || !url || !documentId) {
                if (rateLimitError && resetAt) {
                    const resetDate = new Date(resetAt);
                    throw new Error(`${error}\n\nReset at: ${resetDate.toLocaleTimeString()}`);
                }
                throw new Error(error || "Failed to get upload URL");
            }

            currentDocumentId = documentId;

            // Step 2: Upload to S3
            toast.loading(`Uploading "${selectedFile.name}"...`, { id: toastId });
            
            const uploadResponse = await fetch(url, {
                method: "PUT",
                body: selectedFile,
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            // Step 3: Trigger AI processing
            toast.loading("Starting AI processing...", { id: toastId });
            const processingResult = await triggerProcessing(fileKey, documentId);
            
            if (!processingResult.success) {
                throw new Error("AI processing failed to start");
            }

            // Success!
            toast.success(`"${selectedFile.name}" uploaded successfully!`, { id: toastId });
            setLastUploadedFile(selectedFile.name);
            setSelectedFile(null);
            console.log("✅ File uploaded successfully:", fileKey);
            
            window.dispatchEvent(new CustomEvent('file-uploaded'));
            
        } catch (err) {
            console.error("Upload error:", err);
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
            
            // Rollback: Delete the document record if it was created
            if (currentDocumentId) {
                console.log(`⚠️ Error occurred. Cleaning up document ${currentDocumentId}...`);
                await deleteDocument(currentDocumentId); 
            }

            setUploadError(errorMessage);
            toast.error(errorMessage, { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const cancelSelection = () => {
        setSelectedFile(null);
        setUploadError(null);
    };

    const retryUpload = () => {
        setUploadError(null);
        if (selectedFile) {
            uploadFile();
        } else {
            document.getElementById('file-input')?.click();
        }
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4">
            <div className="p-6 bg-gray-900 rounded-xl shadow-xl border border-gray-800">
                {/* Drag & Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
                        isDragging
                            ? 'border-blue-500 bg-blue-950/30 scale-105'
                            : selectedFile
                            ? 'border-green-500 bg-green-950/20'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                >
                    <div className="flex flex-col items-center justify-center space-y-4">
                        {/* Icon */}
                        <div className={`p-4 rounded-full transition-all ${
                            isUploading 
                                ? 'bg-blue-950/50' 
                                : selectedFile
                                ? 'bg-green-950/50'
                                : 'bg-blue-950/50'
                        }`}>
                            {isUploading ? (
                                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                            ) : selectedFile ? (
                                <FileText className="w-8 h-8 text-green-400" />
                            ) : lastUploadedFile ? (
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            ) : (
                                <Upload className="w-8 h-8 text-blue-400" />
                            )}
                        </div>

                        {/* Selected File Info */}
                        {selectedFile ? (
                            <div className="text-center w-full">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-white truncate max-w-50">
                                        {selectedFile.name}
                                    </p>
                                    {!isUploading && (
                                        <button
                                            onClick={cancelSelection}
                                            className="text-gray-400 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-white">
                                    {isDragging ? 'Drop file here' : 'Upload Document'}
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    {isDragging ? 'Release to upload' : 'Drag & drop or click to browse'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">PDF or TXT (Max 5MB)</p>
                            </div>
                        )}

                        {lastUploadedFile && !selectedFile && (
                            <p className="text-xs text-green-400">Last: {lastUploadedFile}</p>
                        )}

                        {/* Action Buttons */}
                        {selectedFile ? (
                            <button
                                onClick={uploadFile}
                                disabled={isUploading}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow transition-colors"
                            >
                                {isUploading ? "Uploading..." : "Upload File"}
                            </button>
                        ) : (
                            <label className="relative cursor-pointer">
                                <span className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow transition-colors inline-block">
                                    Select File
                                </span>
                                <input 
                                    id="file-input"
                                    type="file" 
                                    className="hidden" 
                                    accept="application/pdf,text/plain"
                                    onChange={handleFileInputChange}
                                    disabled={isUploading}
                                />
                            </label>
                        )}
                    </div>

                    {/* Upload Progress Bar */}
                    {isUploading && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden">
                            <div className="h-full bg-blue-600 animate-pulse w-full"></div>
                        </div>
                    )}
                </div>

                {/* File Type Legend */}
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>PDF</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>TXT</span>
                    </div>
                </div>
            </div>

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
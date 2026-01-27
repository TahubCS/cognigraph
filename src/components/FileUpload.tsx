'use client';

import { useState } from 'react';
import { Upload, Loader2, CheckCircle, FileText, X, Image as ImageIcon, Code } from 'lucide-react';
import { getPresignedUrl, triggerProcessing } from '@/actions/storage';
import { deleteDocument } from '@/actions/documents';
import toast from 'react-hot-toast';
import ErrorMessage from './ErrorMessage';
import { useMode } from './ModeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function FileUpload() {
    const { activeMode } = useMode();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return { valid: false, error: "File too large (max 10MB)" };
        }

        const allowedMimes = [
            'application/pdf', 'text/plain', 'image/jpeg', 'image/png', 
            'image/webp', 'application/json', 'text/markdown'
        ];

        const allowedExtensions = [
            '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.c', '.cpp', 
            '.h', '.cs', '.go', '.rs', '.rb', '.php', '.html', '.css', 
            '.sql', '.yaml', '.yml', '.json', '.md', '.txt'
        ];

        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        const isValidMime = allowedMimes.includes(file.type);
        const isValidExtension = allowedExtensions.includes(fileExtension);

        if (!isValidMime && !isValidExtension) {
            return { 
                valid: false, 
                error: "Invalid file type. Supported: PDF, Images, Text, and Code." 
            };
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
        event.target.value = ''; 
    };

    const uploadFile = async () => {
        if (!selectedFile || isUploading) return;

        setIsUploading(true);
        const toastId = toast.loading(`Uploading to ${activeMode.toUpperCase()} workspace...`);
        let currentDocumentId: string | null = null;

        try {
            const { success, url, fileKey, documentId, error, rateLimitError, resetAt } = await getPresignedUrl(
                selectedFile.name, 
                selectedFile.type || 'text/plain', 
                activeMode
            );

            if (!success || !url || !documentId) {
                if (rateLimitError && resetAt) {
                    const resetDate = new Date(resetAt);
                    throw new Error(`${error}\n\nReset at: ${resetDate.toLocaleTimeString()}`);
                }
                throw new Error(error || "Failed to get upload URL");
            }

            currentDocumentId = documentId;

            toast.loading(`Sending "${selectedFile.name}" to cloud...`, { id: toastId });
            
            const uploadResponse = await fetch(url, {
                method: "PUT",
                body: selectedFile,
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            toast.loading("Starting specialized analysis...", { id: toastId });
            const processingResult = await triggerProcessing(fileKey, documentId);
            
            if (!processingResult.success) {
                throw new Error("AI processing failed to start");
            }

            toast.success(`Upload complete!`, { id: toastId });
            setLastUploadedFile(selectedFile.name);
            setSelectedFile(null);
            
            window.dispatchEvent(new CustomEvent('file-uploaded'));
            
        } catch (err) {
            console.error("Upload error:", err);
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
            
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

    const getFileIcon = (file: File | null, fileName: string | null) => {
        const name = file ? file.name : fileName;
        if (!name) return <Upload className="w-5 h-5 text-blue-400" />;

        const ext = name.split('.').pop()?.toLowerCase();

        if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
            return <ImageIcon className="w-5 h-5 text-purple-400" />;
        }
        if (['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json'].includes(ext || '')) {
            return <Code className="w-5 h-5 text-yellow-400" />;
        }
        return <FileText className="w-5 h-5 text-green-400" />;
    };

    return (
        <div className="w-full space-y-2">
            {/* Ultra-Compact Drop Zone */}
            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 
                    ${isDragging 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : selectedFile
                            ? 'border-green-500/50 bg-green-500/5'
                            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }
                `}
            >
                <AnimatePresence>
                    {isUploading && (
                        <motion.div
                            initial={{ top: "-10%" }}
                            animate={{ top: "110%" }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-50 pointer-events-none z-0"
                        />
                    )}
                </AnimatePresence>

                <div className="p-4 flex flex-col items-center gap-2 text-center z-10 relative">
                    {/* Icon */}
                    <div className={`p-2 rounded-full ring-1 transition-all ${
                        isUploading 
                            ? 'bg-blue-950/50 ring-blue-900' 
                            : selectedFile
                                ? 'bg-green-950/50 ring-green-900'
                                : 'bg-zinc-950 ring-zinc-800'
                    }`}>
                        {isUploading ? (
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        ) : selectedFile ? (
                            getFileIcon(selectedFile, null)
                        ) : lastUploadedFile ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                            <Upload className={`w-5 h-5 text-blue-400 ${isDragging ? 'animate-bounce' : ''}`} />
                        )}
                    </div>

                    {/* Text */}
                    {selectedFile ? (
                        <div className="w-full space-y-1">
                            <div className="flex items-center justify-center gap-1.5">
                                <p className="text-xs font-medium text-zinc-100 truncate max-w-40">
                                    {selectedFile.name}
                                </p>
                                {!isUploading && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); cancelSelection(); }}
                                        className="text-zinc-500 hover:text-red-400 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-zinc-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-200">
                                {isDragging ? 'Drop here' : 'Upload Document'}
                            </h3>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                                Drag & drop or click
                            </p>
                        </div>
                    )}

                    {/* Mode Tag - More Compact */}
                    {!selectedFile && (
                        <span className="text-[9px] text-zinc-600 uppercase tracking-wider bg-zinc-900/70 px-1.5 py-0.5 rounded border border-zinc-800">
                            {activeMode}
                        </span>
                    )}

                    {/* Action Button */}
                    {selectedFile ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); uploadFile(); }}
                            disabled={isUploading}
                            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-medium rounded-lg transition-all"
                        >
                            {isUploading ? "Uploading..." : "Start Analysis"}
                        </button>
                    ) : (
                        <label className="w-full cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <span className="block w-full px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors text-center">
                                Browse Files
                            </span>
                            <input 
                                id="file-input"
                                type="file" 
                                className="hidden" 
                                accept=".pdf,.txt,.md,.json,.csv,.js,.jsx,.ts,.tsx,.py,.java,.go,.rb,.c,.cpp,.h,.css,.html,.sql,.yaml,.yml,.jpg,.jpeg,.png,.webp"
                                onChange={handleFileInputChange}
                                disabled={isUploading}
                            />
                        </label>
                    )}
                </div>
            </div>
            
            {/* Error Message */}
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
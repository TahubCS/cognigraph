'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Loader2, Trash2, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDocuments, deleteDocument } from '@/actions/documents';
import toast from 'react-hot-toast';

type Document = {
    id: string;
    filename: string;
    status: string;
    created_at: string;
};

export default function DocumentList() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PAGE_SIZE = 5;

    const loadDocuments = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        
        try {
            // Updated to use the new return structure
            const { documents: docs, totalPages: total } = await getDocuments(page, PAGE_SIZE);
            setDocuments(docs);
            setTotalPages(total);
        } catch (error) {
            console.error("Failed to load documents:", error);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    }, [page]); // Re-run when page changes

    // Initial Load & Event Listener
    useEffect(() => {
        let isMounted = true;
        const load = async () => { if (isMounted) await loadDocuments(); };
        load();

        const handleFileUploaded = () => {
            // If on page 1, refresh. If not, go to page 1 to see new file.
            if (page === 1) {
                loadDocuments(true);
            } else {
                setPage(1);
            }
        };

        window.addEventListener('file-uploaded', handleFileUploaded);
        return () => {
            isMounted = false;
            window.removeEventListener('file-uploaded', handleFileUploaded);
        };
    }, [loadDocuments, page]);

    // Polling Effect (Checks periodically if files are processing)
    useEffect(() => {
        const processingDocs = documents.some(doc => 
            doc.status === 'PENDING' || doc.status === 'PROCESSING'
        );

        if (processingDocs) {
            const intervalId = setInterval(() => {
                loadDocuments(true);
            }, 2000); 
            return () => clearInterval(intervalId);
        }
    }, [documents, loadDocuments]);

    // Auto-cleanup failed docs
    useEffect(() => {
        const failedDocs = documents.filter(doc => doc.status === 'FAILED');
        
        if (failedDocs.length > 0) {
            failedDocs.forEach(async (doc) => {
                console.log(`❌ Cleanup: Removing failed document ${doc.filename}`);
                toast.error(`Processing failed for "${doc.filename}". Removing file.`);
                await deleteDocument(doc.id);
                setDocuments(prev => prev.filter(d => d.id !== doc.id));
            });
        }
    }, [documents]);

    const handleDelete = async (id: string, filename: string) => {
        if (!confirm(`Delete "${filename}"?`)) return;
        
        setDeletingId(id);
        const result = await deleteDocument(id);
        
        if (result.success) {
            toast.success("Document deleted");
            // Reload to ensure pagination count updates correctly
            loadDocuments();
        } else {
            toast.error(`Failed to delete: ${result.error}`);
        }
        
        setDeletingId(null);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'PROCESSING': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
            case 'PENDING': return <Clock className="w-4 h-4 text-yellow-400" />;
            case 'FAILED': return <XCircle className="w-4 h-4 text-red-400" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-400';
            case 'PROCESSING': return 'text-blue-400';
            case 'PENDING': return 'text-yellow-400';
            case 'FAILED': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="w-full max-w-md mx-auto bg-gray-900 rounded-xl shadow-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Your Documents
                </h3>
                <button
                    onClick={() => loadDocuments(false)}
                    disabled={isLoading}
                    className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {isLoading && documents.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm">No documents uploaded yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {getStatusIcon(doc.status)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{doc.filename}</p>
                                    <p className={`text-xs ${getStatusColor(doc.status)}`}>
                                        {doc.status}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(doc.id, doc.filename)}
                                disabled={deletingId === doc.id}
                                className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                title="Delete document"
                            >
                                {deletingId === doc.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="text-xs text-gray-500 font-medium">
                        Page {page} of {totalPages}
                    </span>

                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || isLoading}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
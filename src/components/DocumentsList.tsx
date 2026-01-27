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
            const { documents: docs, totalPages: total } = await getDocuments(page, PAGE_SIZE);
            setDocuments(docs);
            setTotalPages(total);
        } catch (error) {
            console.error("Failed to load documents:", error);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    }, [page]);

    // Initial Load & Event Listener
    useEffect(() => {
        let isMounted = true;
        const load = async () => { if (isMounted) await loadDocuments(); };
        load();

        const handleFileUploaded = () => {
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
            default: return <Clock className="w-4 h-4 text-zinc-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-400';
            case 'PROCESSING': return 'text-blue-400';
            case 'PENDING': return 'text-yellow-400';
            case 'FAILED': return 'text-red-400';
            default: return 'text-zinc-400';
        }
    };

    return (
        <div className="w-full h-full flex flex-col min-h-0">
            {isLoading && documents.length === 0 ? (
                <div className="flex items-center justify-center flex-1">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
            ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-zinc-500">
                    <FileText className="w-10 h-10 mb-2 text-zinc-700" />
                    <p className="text-xs">No documents yet</p>
                </div>
            ) : (
                <>
                    {/* Documents Container - Fixed height for 5 items */}
                    <div className="space-y-2 shrink-0">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-2.5 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800/50"
                            >
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    {getStatusIcon(doc.status)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-zinc-100 truncate font-medium">{doc.filename}</p>
                                        <p className={`text-[10px] ${getStatusColor(doc.status)} uppercase font-medium tracking-wide`}>
                                            {doc.status}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(doc.id, doc.filename)}
                                    disabled={deletingId === doc.id}
                                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors disabled:opacity-50 shrink-0"
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

                    {/* Pagination Controls - Only show if needed */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800/50 shrink-0">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            <span className="text-[10px] text-zinc-500 font-medium">
                                {page} / {totalPages}
                            </span>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isLoading}
                                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(0); // 0 means "not calculated yet"

    const ROW_HEIGHT = 62; // Approx height of a file row including margin
    const HEADER_FOOTER_HEIGHT = 54; // Space for pagination controls + padding

    // 1. Measure Available Space
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const height = entry.contentRect.height;
                // Calculate how many items fit
                const availableHeight = height - HEADER_FOOTER_HEIGHT;
                const calculatedLimit = Math.floor(availableHeight / ROW_HEIGHT);
                const safeLimit = Math.max(3, calculatedLimit); // Minimum 3 items

                setPageSize(prev => {
                    if (prev !== safeLimit) {
                        setPage(1); // Reset to page 1 on resize (safest UX)
                        return safeLimit;
                    }
                    return prev;
                });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // 2. Load Documents (Depends on pageSize)
    const loadDocuments = useCallback(async (isBackground = false) => {
        if (pageSize === 0) return; // Wait for measurement

        if (!isBackground) setIsLoading(true);

        try {
            const { documents: docs, totalPages: total } = await getDocuments(page, pageSize);
            setDocuments(docs);
            setTotalPages(total);
        } catch (error) {
            console.error("Failed to load documents:", error);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    }, [page, pageSize]);

    // Initial Load & Polling (Only when pageSize is set)
    useEffect(() => {
        if (pageSize === 0) return;

        let isMounted = true;
        const load = async () => { if (isMounted) await loadDocuments(); };
        load();

        const handleFileUploaded = () => {
            // If on page 1, reload. If not, go to page 1 which triggers reload.
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
    }, [loadDocuments, page, pageSize]);

    // Polling Effect
    useEffect(() => {
        if (pageSize === 0) return;
        const processingDocs = documents.some(doc =>
            doc.status === 'PENDING' || doc.status === 'PROCESSING'
        );

        if (processingDocs) {
            const intervalId = setInterval(() => {
                loadDocuments(true);
            }, 2000);
            return () => clearInterval(intervalId);
        }
    }, [documents, loadDocuments, pageSize]);

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
            window.dispatchEvent(new Event('document-deleted'));
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
        <div ref={containerRef} className="w-full h-full flex flex-col min-h-0 relative">
            {/* Loading State (initial or when pageSize is waiting) */}
            {(isLoading || pageSize === 0) && documents.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 z-10">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
            )}

            {documents.length === 0 && !isLoading && pageSize > 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-zinc-500">
                    <FileText className="w-10 h-10 mb-2 text-zinc-700" />
                    <p className="text-xs">No documents yet</p>
                </div>
            ) : (
                <>
                    {/* Documents Container - Flexible */}
                    <div className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-2.5 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800/50"
                                style={{ height: '54px' }}
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

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800/50 shrink-0 h-[40px]">
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
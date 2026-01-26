'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trash2, FileText, Loader2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { getUserDocuments, deleteDocument } from '@/actions/documents';
import toast from 'react-hot-toast';

type Doc = {
    id: string;
    filename: string;
    created_at: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    file_key: string;
};

export default function DocumentList() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch docs function
    const loadDocs = useCallback(async () => {
        const documents = await getUserDocuments();
        setDocs(documents);
        setIsLoading(false);
        return documents; // Return for checking status
    }, []);

    // 1. Initial Load & Event Listener
    useEffect(() => {
        loadDocs();

        // Listen for new uploads to trigger immediate refresh
        const handleRefresh = () => {
            console.log("♻️ Refreshing document list...");
            setIsLoading(true); // Show loading briefly to indicate activity
            loadDocs();
        };

        window.addEventListener('refresh-doc-list', handleRefresh);
        return () => window.removeEventListener('refresh-doc-list', handleRefresh);
    }, [loadDocs]);

    // 2. POLLING: If any doc is processing, check again every 2 seconds
    useEffect(() => {
        // Check if we have any active jobs
        const hasActiveJobs = docs.some(d => d.status === 'PENDING' || d.status === 'PROCESSING');

        if (hasActiveJobs) {
            const interval = setInterval(() => {
                loadDocs();
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [docs, loadDocs]);

    async function handleDelete(doc: Doc) {
        if (!confirm(`Are you sure you want to delete "${doc.filename}"?`)) return;

        setDeletingId(doc.id);
        const toastId = toast.loading("Deleting document...");

        try {
            const result = await deleteDocument(doc.id, doc.file_key);
            if (result.success) {
                toast.success("Document deleted", { id: toastId });
                setDocs(prev => prev.filter(d => d.id !== doc.id));
                window.dispatchEvent(new Event('graph-node-click')); 
            } else {
                toast.error("Failed to delete", { id: toastId });
            }
        } catch (e) {
            console.error(e);
            toast.error("Error deleting document", { id: toastId });
        } finally {
            setDeletingId(null);
        }
    }

    if (isLoading && docs.length === 0) {
        return <div className="text-center p-4 text-gray-500 animate-pulse">Loading your documents...</div>;
    }

    if (!isLoading && docs.length === 0) return null;

    return (
        <div className="w-full max-w-4xl mx-auto bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Your Documents
                </h2>
            </div>
            
            <div className="divide-y divide-gray-800">
                {docs.map((doc) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                            {/* Status Icon */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                                doc.status === 'COMPLETED' ? 'bg-green-950/30 border-green-900 text-green-500' : 
                                doc.status === 'FAILED' ? 'bg-red-950/30 border-red-900 text-red-500' : 
                                'bg-blue-950/30 border-blue-900 text-blue-400'
                            }`}>
                                {doc.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> :
                                doc.status === 'FAILED' ? <AlertCircle className="w-5 h-5" /> :
                                <Loader2 className="w-5 h-5 animate-spin" />} 
                            </div>
                            
                            <div>
                                <h3 className="text-white font-medium truncate   sm:max-w-md">
                                    {doc.filename}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </span>
                                    
                                    {/* Status Badge */}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                        doc.status === 'COMPLETED' ? 'bg-green-900/20 border-green-800 text-green-400' : 
                                        doc.status === 'FAILED' ? 'bg-red-900/20 border-red-800 text-red-400' : 
                                        'bg-blue-900/20 border-blue-800 text-blue-400 animate-pulse'
                                    }`}>
                                        {doc.status === 'PENDING' ? 'QUEUED' : 
                                         doc.status === 'PROCESSING' ? 'CHUNKING & EMBEDDING...' : 
                                         doc.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleDelete(doc)}
                            disabled={deletingId === doc.id || doc.status === 'PROCESSING'}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete Document"
                        >
                            {deletingId === doc.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Trash2 className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
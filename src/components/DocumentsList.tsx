'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getDocuments, deleteDocument } from '@/actions/documents';

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

    const loadDocuments = async () => {
        setIsLoading(true);
        const docs = await getDocuments();
        setDocuments(docs);
        setIsLoading(false);
    };

    useEffect(() => {
        // Defer initial load to avoid calling setState synchronously inside the effect
        const initTimer = window.setTimeout(() => {
            loadDocuments();
        }, 0);

        // Listen for file upload events
        const handleFileUploaded = () => {
            console.log('📄 File uploaded, refreshing document list...');
            setTimeout(() => {
                loadDocuments();
            }, 1000);
        };

        window.addEventListener('file-uploaded', handleFileUploaded);
        
        return () => {
            window.clearTimeout(initTimer);
            window.removeEventListener('file-uploaded', handleFileUploaded);
        };
    }, []);

    const handleDelete = async (id: string, filename: string) => {
        if (!confirm(`Delete "${filename}"?`)) return;
        
        setDeletingId(id);
        const result = await deleteDocument(id);
        
        if (result.success) {
            setDocuments(prev => prev.filter(doc => doc.id !== id));
        } else {
            alert(`Failed to delete: ${result.error}`);
        }
        
        setDeletingId(null);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'PROCESSING':
                return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
            case 'PENDING':
                return <Clock className="w-4 h-4 text-yellow-400" />;
            case 'FAILED':
                return <XCircle className="w-4 h-4 text-red-400" />;
            default:
                return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'text-green-400';
            case 'PROCESSING':
                return 'text-blue-400';
            case 'PENDING':
                return 'text-yellow-400';
            case 'FAILED':
                return 'text-red-400';
            default:
                return 'text-gray-400';
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
                    onClick={loadDocuments}
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
        </div>
    );
}
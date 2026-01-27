'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ArrowRight, ArrowLeft, FileText, Network, MessageSquare } from 'lucide-react';
import { getNodeDetails } from '@/actions/node-details';

type NodeDetails = {
    id: string;
    label: string;
    type: string;
    document: string;
    outgoing: Array<{
        relationship: string;
        target_id: string;
        target_label: string;
        target_type: string;
    }>;
    incoming: Array<{
        relationship: string;
        source_id: string;
        source_label: string;
        source_type: string;
    }>;
    relatedContent: string[];
    stats: {
        totalConnections: number;
        outgoingCount: number;
        incomingCount: number;
    };
};

interface NodeDetailsPanelProps {
    nodeId: string | null;
    nodeName: string | null;
    onClose: () => void;
    onNodeClick: (nodeId: string, nodeName: string) => void;
}

export default function NodeDetailsPanel({ nodeId, onClose, onNodeClick }: NodeDetailsPanelProps) {
    const [details, setDetails] = useState<NodeDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!nodeId) {
            setDetails(null);
            return;
        }

        const loadDetails = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await getNodeDetails(nodeId);
                if (!data) {
                    setError('Failed to load node details');
                    return;
                }
                setDetails(data);
            } catch (err) {
                console.error('Error loading node details:', err);
                setError('An error occurred while loading details');
            } finally {
                setIsLoading(false);
            }
        };

        loadDetails();
    }, [nodeId]);

    if (!nodeId) return null;

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Person': return 'text-blue-400 bg-blue-950/50';
            case 'Skill': return 'text-green-400 bg-green-950/50';
            case 'Company': return 'text-orange-400 bg-orange-950/50';
            default: return 'text-red-400 bg-red-950/50';
        }
    };

    const handleAskAbout = () => {
        if (details) {
            const event = new CustomEvent('graph-node-click', { detail: details.label });
            window.dispatchEvent(event);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Network className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold text-white">Node Details</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    ) : details ? (
                        <>
                            {/* Node Info */}
                            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                                <div>
                                    <h3 className="text-xl font-bold text-white wrap-break-word">
                                        {details.label}
                                    </h3>
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${getTypeColor(details.type)}`}>
                                        {details.type}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <FileText className="w-4 h-4" />
                                    <span className="truncate">{details.document}</span>
                                </div>

                                <button
                                    onClick={handleAskAbout}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Ask AI about this
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-white">
                                        {details.stats.totalConnections}
                                    </div>
                                    <div className="text-xs text-gray-400">Total</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-400">
                                        {details.stats.outgoingCount}
                                    </div>
                                    <div className="text-xs text-gray-400">Outgoing</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-400">
                                        {details.stats.incomingCount}
                                    </div>
                                    <div className="text-xs text-gray-400">Incoming</div>
                                </div>
                            </div>

                            {/* Outgoing Connections */}
                            {details.outgoing.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                        <ArrowRight className="w-4 h-4 text-green-400" />
                                        Outgoing Connections ({details.stats.outgoingCount})
                                    </h4>
                                    <div className="space-y-2">
                                        {details.outgoing.map((conn, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => onNodeClick(conn.target_id, conn.target_label)}
                                                className="w-full bg-gray-800 hover:bg-gray-750 rounded-lg p-3 text-left transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs text-gray-400 mb-1">
                                                            {conn.relationship}
                                                        </div>
                                                        <div className="text-sm text-white font-medium truncate">
                                                            {conn.target_label}
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(conn.target_type)} shrink-0`}>
                                                        {conn.target_type}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Incoming Connections */}
                            {details.incoming.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                        <ArrowLeft className="w-4 h-4 text-blue-400" />
                                        Incoming Connections ({details.stats.incomingCount})
                                    </h4>
                                    <div className="space-y-2">
                                        {details.incoming.map((conn, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => onNodeClick(conn.source_id, conn.source_label)}
                                                className="w-full bg-gray-800 hover:bg-gray-750 rounded-lg p-3 text-left transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs text-gray-400 mb-1">
                                                            {conn.relationship}
                                                        </div>
                                                        <div className="text-sm text-white font-medium truncate">
                                                            {conn.source_label}
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(conn.source_type)} shrink-0`}>
                                                        {conn.source_type}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Related Content */}
                            {details.relatedContent.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-300">
                                        Related Content
                                    </h4>
                                    <div className="space-y-2">
                                        {details.relatedContent.map((content, idx) => (
                                            <div key={idx} className="bg-gray-800 rounded-lg p-3">
                                                <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                                                    {content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No Connections Message */}
                            {details.stats.totalConnections === 0 && (
                                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                                    <p className="text-sm text-gray-500">
                                        This node has no connections yet
                                    </p>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </>
    );
}
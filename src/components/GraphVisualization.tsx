'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getGraphData } from '@/actions/graph';
import { Loader2, RefreshCw, Filter, Download, Camera, X} from 'lucide-react'; // Added Camera, X, Check
import ErrorMessage from './ErrorMessage';
import NodeDetailsPanel from './NodeDetailsPanels';
import { exportGraphAsPNG, exportGraphAsSVG } from '@/lib/export-utils';
import toast from 'react-hot-toast';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
    )
});

type GraphNode = {
    id: string;
    name: string;
    group: string;
    document: string;
    val: number;
    x?: number;
    y?: number;
};

type GraphData = {
    nodes: GraphNode[];
    links: Array<{
        source: string;
        target: string;
        label: string;
    }>;
    documents: string[];
    types: string[];
};

export default function GraphVisualization() {
    const [data, setData] = useState<GraphData>({ nodes: [], links: [], documents: [], types: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [documentFilter, setDocumentFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    // 🆕 Capture Mode State
    const [isCaptureMode, setIsCaptureMode] = useState(false);

    // Refs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Enter Capture Mode (don't export yet)
    const startCaptureMode = () => {
        setIsCaptureMode(true);
        setShowExportMenu(false);
        setShowFilters(false);
        toast('Adjust the graph view, then click the Camera button to download.', {
            icon: '📸',
            duration: 4000,
        });
    };

    // 2. Actually Export
    const performCapture = async () => {
        try {
            await exportGraphAsPNG(containerRef);
            toast.success('Snapshot downloaded!');
            setIsCaptureMode(false); // Exit mode after success
        } catch (error) {
            toast.error('Failed to export graph');
            console.error(error);
        }
    };

    const handleExportSVG = () => {
        try {
            const nodesWithCoords = data.nodes.filter(n => n.x !== undefined && n.y !== undefined);
            
            if (nodesWithCoords.length === 0) {
                toast.error('Please wait for the graph to finish rendering');
                return;
            }

            toast.loading('Exporting SVG...');
            exportGraphAsSVG(data.nodes, data.links);
            toast.success('SVG exported!');
            setShowExportMenu(false);
        } catch (error) {
            toast.error('Failed to export graph');
            console.error(error);
        }
    };

    const loadGraph = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const graphData = await getGraphData(
                documentFilter === 'all' ? undefined : documentFilter,
                typeFilter === 'all' ? undefined : typeFilter
            );
            console.log('🎨 Graph Data Loaded:', graphData);
            setData(graphData as GraphData);
        } catch (err) {
            console.error('Graph loading error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load graph data');
        } finally {
            setIsLoading(false);
        }
    }, [documentFilter, typeFilter]);

    useEffect(() => {
        loadGraph();
    }, [loadGraph]);

    useEffect(() => {
        const handleFileUploaded = () => {
            console.log('📢 File uploaded, refreshing graph in 3 seconds...');
            setTimeout(() => {
                loadGraph();
            }, 3000);
        };

        window.addEventListener('file-uploaded', handleFileUploaded);
        return () => window.removeEventListener('file-uploaded', handleFileUploaded);
    }, [loadGraph]);

    return (
        <div className="w-full space-y-4">
            <div 
                ref={containerRef}
                className="w-full h-125 border border-gray-800 rounded-xl overflow-hidden bg-gray-950 shadow-xl relative"
            >
                {/* conditional rendering: 
                   If isCaptureMode is TRUE, show the "Capture Bar".
                   If FALSE, show the standard "Header Bar".
                */}
                
                {isCaptureMode ? (
                    // 📸 CAPTURE MODE TOOLBAR
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-gray-900/90 border border-blue-500/50 p-2 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
                        <span className="text-xs font-medium text-blue-200 pl-2">
                            Adjust view, then capture
                        </span>
                        
                        <div className="h-4 w-px bg-gray-700 mx-1" />
                        
                        <button
                            onClick={performCapture}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20"
                            title="Take Snapshot"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                        
                        <button
                            onClick={() => setIsCaptureMode(false)}
                            className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-2 rounded-full transition-colors"
                            title="Cancel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    // 🟢 STANDARD HEADER BAR
                    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
                        <div className="bg-black/70 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm pointer-events-none border border-white/5">
                            Knowledge Graph - {data.nodes.length} nodes, {data.links.length} edges
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Export Dropdown */}
                            <div className="relative">
                                <button 
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-gray-700"
                                >
                                    <Download className="w-3 h-3" />
                                    Export
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-32 overflow-hidden">
                                        <button
                                            onClick={startCaptureMode} // 👈 Starts Capture Mode
                                            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-700 border-b border-gray-700/50 flex items-center gap-2 transition-colors"
                                        >
                                            <Camera className="w-3 h-3 text-blue-400" />
                                            Export PNG
                                        </button>
                                        <button
                                            onClick={handleExportSVG}
                                            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                                        >
                                            <div className="w-3 h-3 flex items-center justify-center font-bold text-[8px] border border-green-500 text-green-500 rounded-sm">V</div>
                                            Export SVG
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-gray-700"
                            >
                                <Filter className="w-3 h-3" />
                                Filters
                            </button>
                            
                            <button 
                                onClick={loadGraph}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-900/20"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                                {isLoading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Filters Panel (Hide when in capture mode) */}
                {showFilters && !isCaptureMode && (
                    <div className="absolute top-16 right-4 z-10 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl backdrop-blur-sm w-72 animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-sm font-semibold text-white mb-3">Filter Nodes</h3>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Document</label>
                                <select
                                    value={documentFilter}
                                    onChange={(e) => setDocumentFilter(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Documents</option>
                                    {data.documents.map((doc) => (
                                        <option key={doc} value={doc}>{doc}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Node Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Types</option>
                                    {data.types.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {(documentFilter !== 'all' || typeFilter !== 'all') && (
                                <button
                                    onClick={() => {
                                        setDocumentFilter('all');
                                        setTypeFilter('all');
                                    }}
                                    className="w-full bg-gray-700 hover:bg-gray-600 text-white text-xs py-1.5 rounded transition-colors"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}
                
                {data.nodes.length > 0 && !error && (
                    <ForceGraph2D
                        ref={graphRef}
                        graphData={data}
                        nodeLabel="name"
                        nodeColor={node => {
                            switch(node.group) {
                                case 'Person': return '#3b82f6';
                                case 'Skill': return '#10b981';
                                case 'Company': return '#f59e0b';
                                default: return '#ef4444';
                            }
                        }}
                        linkColor={() => 'rgba(255,255,255,0.15)'}
                        nodeRelSize={6}
                        linkDirectionalArrowLength={3.5}
                        linkDirectionalArrowRelPos={1}
                        width={800}
                        height={500}
                        onNodeClick={node => {
                            // Only allow details click if NOT in capture mode
                            if (isCaptureMode) return;
                            
                            setSelectedNodeId(String(node.id));
                            setSelectedNodeName(String(node.name));
                            
                            graphRef.current?.centerAt(node.x, node.y, 1000);
                            graphRef.current?.zoom(3, 1000);
                        }}
                        backgroundColor="#030712"
                    />
                )}
                
                {data.nodes.length === 0 && !isLoading && !error && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                        <p className="text-lg">No graph data yet</p>
                        <p className="text-sm mt-2">Upload a document to generate your knowledge graph</p>
                    </div>
                )}

                {isLoading && data.nodes.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                )}
            </div>

            {error && (
                <ErrorMessage
                    title="Graph Loading Error"
                    message={error}
                    onRetry={loadGraph}
                    onDismiss={() => setError(null)}
                />
            )}

            {/* Node Details Panel */}
            <NodeDetailsPanel
                nodeId={selectedNodeId}
                nodeName={selectedNodeName}
                onClose={() => {
                    setSelectedNodeId(null);
                    setSelectedNodeName(null);
                }}
                onNodeClick={(nodeId: string, nodeName: string) => {
                    setSelectedNodeId(nodeId);
                    setSelectedNodeName(nodeName);
                    
                    const node = data.nodes.find((n: GraphNode) => n.id === nodeId);
                    if (node && node.x !== undefined && node.y !== undefined && graphRef.current) {
                        graphRef.current.centerAt(node.x, node.y, 1000);
                        graphRef.current.zoom(3, 1000);
                    }
                }}
            />
        </div>
    );
}
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getGraphData } from '@/actions/graph';
import { 
    Loader2, RefreshCw, Filter, Download, Camera, X, 
    ZoomIn, ZoomOut, Maximize, Share2, Info, Zap, ZapOff, Search 
} from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import NodeDetailsPanel from './NodeDetailsPanels';
import { exportGraphAsPNG, exportGraphAsSVG } from '@/lib/export-utils';
import toast from 'react-hot-toast';

// 1. Dynamic Import (No SSR)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-zinc-950">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    )
});

// --- UTILITY: DEBOUNCE HOOK ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

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
    links: Array<{ source: string; target: string; label: string }>;
    documents: string[];
    types: string[];
};

export default function GraphVisualization() {
    // --- STATE ---
    const [data, setData] = useState<GraphData>({ nodes: [], links: [], documents: [], types: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // UI State
    const [documentFilter, setDocumentFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>(''); 
    
    // ⚡ DEBOUNCE
    const debouncedSearch = useDebounce(searchQuery, 500);

    const [showFilters, setShowFilters] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isCaptureMode, setIsCaptureMode] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [isPerformanceMode, setIsPerformanceMode] = useState(false);

    // Selection
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
    const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);

    // Refs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- 1. RESIZE OBSERVER ---
    useEffect(() => {
        if (!containerRef.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            requestAnimationFrame(() => {
                for (const entry of entries) {
                    if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                        setDimensions({
                            width: entry.contentRect.width,
                            height: entry.contentRect.height
                        });
                    }
                }
            });
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // --- 2. DATA LOADING ---
    const loadGraph = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const graphData = await getGraphData(
                documentFilter === 'all' ? undefined : documentFilter,
                typeFilter === 'all' ? undefined : typeFilter,
                debouncedSearch
            );
            
            // Auto-enable Perf Mode if needed
            if (graphData.nodes.length > 100) {
                if (!isPerformanceMode) {
                    setIsPerformanceMode(true);
                    toast('Performance mode auto-enabled', { icon: '⚡', id: 'perf-auto' });
                }
            } else {
                if (isPerformanceMode) {
                    setIsPerformanceMode(false);
                }
            }

            setData(graphData as GraphData);
        } catch (err) {
            console.error('Graph loading error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load graph data');
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentFilter, typeFilter, debouncedSearch]); 

    useEffect(() => { loadGraph(); }, [loadGraph]);

    useEffect(() => {
        const handleFileUploaded = () => {
            console.log('📬 File uploaded, refreshing graph...');
            setTimeout(loadGraph, 2000);
        };
        window.addEventListener('file-uploaded', handleFileUploaded);
        return () => window.removeEventListener('file-uploaded', handleFileUploaded);
    }, [loadGraph]);

    // --- 3. ACTIONS ---
    const startCaptureMode = () => {
        setIsCaptureMode(true);
        setShowExportMenu(false);
        setShowFilters(false);
        toast('Adjust view, then click Camera to snap.', { icon: '📷', duration: 4000 });
    };

    const performCapture = async () => {
        try {
            await exportGraphAsPNG(containerRef);
            toast.success('Snapshot downloaded!');
            setIsCaptureMode(false);
        } catch (error) {
            toast.error('Failed to export graph');
            console.error(error);
        }
    };

    const handleExportSVG = () => {
        try {
            const nodesWithCoords = data.nodes.filter(n => n.x !== undefined && n.y !== undefined);
            if (nodesWithCoords.length === 0) {
                toast.error('Wait for graph to settle');
                return;
            }
            exportGraphAsSVG(data.nodes, data.links);
            toast.success('SVG exported!');
            setShowExportMenu(false);
        } catch (error) {
            toast.error('Failed to export');
            console.error(error);
        }
    };

    const handleZoom = (factor: number) => {
        if (!graphRef.current) return;
        const currentZoom = graphRef.current.zoom();
        graphRef.current.zoom(currentZoom * factor, 400);
    };

    const handleReset = () => {
        if (!graphRef.current) return;
        graphRef.current.zoomToFit(400, 50);
    };

    // --- FIX: FIXED DOUBLE TOAST ISSUE HERE ---
    const togglePerformanceMode = () => {
        const nextState = !isPerformanceMode;
        setIsPerformanceMode(nextState);
        
        // Moved toast OUTSIDE the setState callback
        // Added 'id' to guarantee no duplicates
        toast(nextState ? 'Performance Mode ON' : 'Performance Mode OFF', {
            icon: nextState ? '⚡' : '🐢',
            duration: 2000,
            id: 'perf-toggle' 
        });
    };

    // --- 4. COLORS ---
    const getNodeColor = (node: GraphNode) => {
        switch(node.group) {
            case 'Person': return '#3b82f6';      
            case 'Organization': return '#a855f7'; 
            case 'Location': return '#ef4444';     
            case 'Concept': return '#10b981';      
            case 'Event': return '#f59e0b';        
            default: return '#71717a';             
        }
    };

    return (
        <div className="w-full space-y-4">
            <div 
                ref={containerRef}
                className="relative w-full h-150 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl group"
            >
                {/* --- HEADER OVERLAYS --- */}
                {isCaptureMode ? (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-zinc-900/90 border border-blue-500/50 p-2 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
                        <span className="text-xs font-medium text-blue-200 pl-2">Adjust & Snap</span>
                        <div className="h-4 w-px bg-zinc-700 mx-1" />
                        <button onClick={performCapture} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-all hover:scale-105 shadow-lg shadow-blue-900/20">
                            <Camera className="w-4 h-4" />
                        </button>
                        <button onClick={() => setIsCaptureMode(false)} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white p-2 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-2">
                            <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-lg shadow-sm">
                                <Share2 className="w-4 h-4 text-zinc-400" />
                                <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Knowledge Graph</span>
                                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                    {data.nodes.length} Nodes
                                </span>
                            </div>
                            
                            {isPerformanceMode && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md animate-in fade-in slide-in-from-left-2">
                                    <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    <span className="text-[9px] font-bold text-yellow-500 uppercase">High Perf. Mode</span>
                                </div>
                            )}
                        </div>

                        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                            <button
                                onClick={togglePerformanceMode}
                                className={`p-2 rounded-lg border backdrop-blur-sm transition-colors ${isPerformanceMode ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' : 'bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                                title={isPerformanceMode ? "Disable Performance Mode" : "Enable Performance Mode"}
                            >
                                {isPerformanceMode ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                            </button>

                            <div className="h-6 w-px bg-zinc-800 mx-1" />

                            <div className="relative">
                                <button 
                                    onClick={() => { setShowExportMenu(!showExportMenu); setShowFilters(false); }}
                                    className={`p-2 rounded-lg border backdrop-blur-sm transition-colors ${showExportMenu ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 w-36 overflow-hidden">
                                        <button onClick={startCaptureMode} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white border-b border-zinc-800 flex items-center gap-2">
                                            <Camera className="w-3 h-3 text-blue-400" /> PNG Snapshot
                                        </button>
                                        <button onClick={handleExportSVG} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
                                            <div className="w-3 h-3 flex items-center justify-center font-bold text-[8px] border border-green-500 text-green-500 rounded-sm">V</div> SVG Vector
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button 
                                    onClick={() => { setShowFilters(!showFilters); setShowExportMenu(false); }}
                                    className={`p-2 rounded-lg border backdrop-blur-sm transition-colors ${showFilters ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                >
                                    <Filter className="w-4 h-4" />
                                </button>
                            </div>

                            <button 
                                onClick={loadGraph}
                                disabled={isLoading}
                                className="p-2 bg-blue-600/90 hover:bg-blue-600 border border-blue-500/50 text-white rounded-lg backdrop-blur-sm transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </>
                )}

                {/* --- FILTER PANEL --- */}
                {showFilters && !isCaptureMode && (
                    <div className="absolute top-16 right-4 z-10 bg-zinc-900/95 border border-zinc-700 rounded-xl p-4 shadow-2xl backdrop-blur-md w-72 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-white">Filter Nodes</h3>
                            <button onClick={() => setShowFilters(false)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Search Input */}
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Search Nodes</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Type to filter..."
                                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg pl-8 pr-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-600"
                                    />
                                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Document</label>
                                <select
                                    value={documentFilter}
                                    onChange={(e) => setDocumentFilter(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="all">All Documents</option>
                                    {data.documents.map((doc) => <option key={doc} value={doc}>{doc}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="all">All Types</option>
                                    {data.types.map((type) => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>

                            {(documentFilter !== 'all' || typeFilter !== 'all' || searchQuery !== '') && (
                                <button
                                    onClick={() => { 
                                        setDocumentFilter('all'); 
                                        setTypeFilter('all'); 
                                        setSearchQuery(''); 
                                    }}
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 rounded-lg transition-colors border border-zinc-700"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {!isCaptureMode && (
                    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                        <button onClick={() => handleZoom(1.5)} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg backdrop-blur-sm transition-colors shadow-lg">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleZoom(0.75)} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg backdrop-blur-sm transition-colors shadow-lg">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button onClick={handleReset} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg backdrop-blur-sm transition-colors shadow-lg">
                            <Maximize className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {hoverNode && !isCaptureMode && (
                    <div className="absolute top-16 left-4 z-10 w-64 animate-in fade-in slide-in-from-left-2 duration-200 pointer-events-none">
                        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700 p-3 rounded-xl shadow-2xl">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-zinc-800 rounded-lg shrink-0">
                                    <Info className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-white mb-1 leading-tight line-clamp-2">
                                        {hoverNode.name || hoverNode.id}
                                    </h4>
                                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider bg-zinc-800 px-1.5 py-0.5 rounded">
                                        {hoverNode.group}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {data.nodes.length > 0 && !error && !isLoading && (
                    <ForceGraph2D
                        ref={graphRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={data}

                        cooldownTicks={isPerformanceMode ? 200 : Infinity} 
                        d3VelocityDecay={isPerformanceMode ? 0.9 : 0.6}
                        d3AlphaDecay={isPerformanceMode ? 0.05 : 0.02}
                        
                        linkDirectionalParticles={isPerformanceMode || isCaptureMode ? 0 : 2}
                        linkDirectionalParticleSpeed={0.005}

                        enableZoomInteraction={false} 
                        enablePanInteraction={true}   
                        enableNodeDrag={true}         

                        onRenderFramePost={() => {
                            if (graphRef.current) {
                                const { x, y } = graphRef.current.zoom(); 
                                const LIMIT = 300; 
                                if (Math.abs(x) > LIMIT || Math.abs(y) > LIMIT) {
                                    const newX = Math.max(-LIMIT, Math.min(LIMIT, x));
                                    const newY = Math.max(-LIMIT, Math.min(LIMIT, y));
                                    graphRef.current.centerAt(newX, newY, 0); 
                                }
                            }
                        }}

                        minZoom={0.5}
                        maxZoom={4}
                        nodeLabel={() => ""} 
                        nodeColor={node => getNodeColor(node as GraphNode)}
                        backgroundColor="#09090b" 
                        linkColor={() => "#27272a"} 
                        
                        nodeRelSize={isPerformanceMode ? 4 : 6} 
                        linkWidth={isPerformanceMode ? 1 : 1.5} 

                        onNodeHover={(node) => {
                            if (containerRef.current) containerRef.current.style.cursor = node ? 'pointer' : 'default';
                            if (hoverNode?.id !== node?.id) {
                                setHoverNode(node as GraphNode || null);
                            }
                        }}
                        onNodeClick={node => {
                            if (isCaptureMode) return;
                            setSelectedNodeId(String(node.id));
                            setSelectedNodeName(String(node.name));
                            
                            graphRef.current?.centerAt(node.x, node.y, 1000);
                            graphRef.current?.zoom(2.5, 1000);
                            
                            const event = new CustomEvent('graph-node-click', { detail: node.name });
                            window.dispatchEvent(event);
                        }}
                    />
                )}
                
                {data.nodes.length === 0 && !isLoading && !error && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <div className="p-4 bg-zinc-900 rounded-full mb-3 border border-zinc-800">
                            <Share2 className="w-6 h-6 text-zinc-600" />
                        </div>
                        <p className="text-sm font-medium">No graph data generated yet</p>
                        <p className="text-xs text-zinc-600 mt-1">Upload documents to visualize connections</p>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-20">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                        <p className="text-xs text-zinc-500 animate-pulse">Generating neural map...</p>
                    </div>
                )}
            </div>

            {error && (
                <ErrorMessage
                    title="Graph Error"
                    message={error}
                    onRetry={loadGraph}
                    onDismiss={() => setError(null)}
                />
            )}

            <NodeDetailsPanel
                nodeId={selectedNodeId}
                nodeName={selectedNodeName}
                onClose={() => { setSelectedNodeId(null); setSelectedNodeName(null); }}
                onNodeClick={(nodeId, nodeName) => {
                    setSelectedNodeId(nodeId);
                    setSelectedNodeName(nodeName);
                }}
            />
        </div>
    );
}
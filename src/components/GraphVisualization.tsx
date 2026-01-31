'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getGraphData } from '@/actions/graph';
import {
    Loader2, RefreshCw, Filter, Download, Camera, X,
    ZoomIn, ZoomOut, Maximize, Share2, Info, Zap, ZapOff, Search, Layers
} from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import NodeDetailsPanel from './NodeDetailsPanels';
import { exportGraphAsPNG, exportGraphAsSVG } from '@/lib/export-utils';
import toast from 'react-hot-toast';
import { getNodeColor } from '@/lib/node-colors';

// 1. Dynamic Import (No SSR)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-zinc-950">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
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
    rateLimited?: boolean;
    error?: string;
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

            if (graphData.rateLimited) {
                toast.error("Rate limit exceeded. Please wait a moment.");
                setIsLoading(false);
                return;
            }

            // Show server-side errors if any
            if (graphData.error) {
                console.error("Server error:", graphData.error);
                toast.error(`Query failed: ${graphData.error}`);
            }

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

    // Stability Fix: handleRefresh
    const handleRefresh = useCallback(() => {
        console.log('♻️ Data changed, refreshing graph...');
        // Small delay to allow DB propagation
        setTimeout(loadGraph, 500);
    }, [loadGraph]);

    // Initial Load
    useEffect(() => { loadGraph(); }, [loadGraph]);

    // Event Listeners
    useEffect(() => {
        window.addEventListener('file-uploaded', handleRefresh);
        window.addEventListener('document-deleted', handleRefresh);
        return () => {
            window.removeEventListener('file-uploaded', handleRefresh);
            window.removeEventListener('document-deleted', handleRefresh);
        };
    }, [handleRefresh]);

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

    const togglePerformanceMode = () => {
        const nextState = !isPerformanceMode;
        setIsPerformanceMode(nextState);

        toast(nextState ? 'Performance Mode ON' : 'Performance Mode OFF', {
            icon: nextState ? '⚡' : '🐢',
            duration: 2000,
            id: 'perf-toggle'
        });
    };

    // Filter Badges
    const activeFilterCount =
        (documentFilter !== 'all' ? 1 : 0) +
        (typeFilter !== 'all' ? 1 : 0) +
        (searchQuery ? 1 : 0);

    return (
        <div className="w-full h-full flex flex-col space-y-4">
            <div
                ref={containerRef}
                className="relative w-full flex-1 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 overflow-hidden shadow-2xl shadow-black/40 group"
            >
                {/* --- HEADER OVERLAYS --- */}
                {isCaptureMode ? (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-zinc-900/90 border border-indigo-500/50 p-2 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
                        <span className="text-xs font-medium text-indigo-200 pl-2">Adjust & Snap</span>
                        <div className="h-4 w-px bg-zinc-700 mx-1" />
                        <button onClick={performCapture} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-full transition-all hover:scale-105 shadow-lg shadow-indigo-900/20">
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
                                <Share2 className="w-4 h-4 text-indigo-400" />
                                <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Neural Graph</span>
                                <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50">
                                    {data.nodes.length} Nodes
                                </span>
                            </div>

                            {isPerformanceMode && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md animate-in fade-in slide-in-from-left-2">
                                    <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    <span className="text-[9px] font-bold text-yellow-500 uppercase">High Perf. Mode</span>
                                </div>
                            )}

                            {activeFilterCount > 0 && (
                                <div className="flex flex-wrap gap-1 w-64">
                                    {documentFilter !== 'all' && (
                                        <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            Doc Filter <X className="w-3 h-3 cursor-pointer hover:text-white pointer-events-auto" onClick={() => setDocumentFilter('all')} />
                                        </span>
                                    )}
                                    {typeFilter !== 'all' && (
                                        <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            Type Filter <X className="w-3 h-3 cursor-pointer hover:text-white pointer-events-auto" onClick={() => setTypeFilter('all')} />
                                        </span>
                                    )}
                                    {searchQuery && (
                                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            "{searchQuery}" <X className="w-3 h-3 cursor-pointer hover:text-white pointer-events-auto" onClick={() => setSearchQuery('')} />
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                            <button
                                onClick={togglePerformanceMode}
                                className={`p-2 rounded-lg border backdrop-blur-sm transition-all shadow-sm ${isPerformanceMode ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400' : 'bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}`}
                                title={isPerformanceMode ? "Disable Performance Mode" : "Enable Performance Mode"}
                            >
                                {isPerformanceMode ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                            </button>

                            <div className="h-5 w-px bg-zinc-800/80 mx-1" />

                            <div className="relative">
                                <button
                                    onClick={() => { setShowExportMenu(!showExportMenu); setShowFilters(false); }}
                                    className={`p-2 rounded-lg border backdrop-blur-sm transition-all shadow-sm ${showExportMenu ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-xl z-50 w-36 overflow-hidden animate-in fade-in slide-in-from-top-1">
                                        <button onClick={startCaptureMode} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white border-b border-zinc-800 flex items-center gap-2 transition-colors">
                                            <Camera className="w-3 h-3 text-indigo-400" /> PNG Snapshot
                                        </button>
                                        <button onClick={handleExportSVG} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-colors">
                                            <div className="w-3 h-3 flex items-center justify-center font-bold text-[8px] border border-emerald-500 text-emerald-500 rounded-[2px]">V</div> SVG Vector
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => { setShowFilters(!showFilters); setShowExportMenu(false); }}
                                    className={`p-2 rounded-lg border backdrop-blur-sm transition-all shadow-sm ${showFilters || activeFilterCount > 0 ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                >
                                    <Filter className="w-4 h-4" />
                                    {activeFilterCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                                        </span>
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={loadGraph}
                                disabled={isLoading}
                                className="p-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 text-white rounded-lg backdrop-blur-sm transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 active:scale-95"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </>
                )}

                {/* --- FILTER PANEL --- */}
                {showFilters && !isCaptureMode && (
                    <div className="absolute top-16 right-4 z-10 bg-zinc-900/95 border border-zinc-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md w-72 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/50">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                                Filter Nodes
                            </h3>
                            <button onClick={() => setShowFilters(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>

                        <div className="space-y-4">
                            {/* Search Input */}
                            <div>
                                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                                    Search
                                    {searchQuery && <span className="text-[9px] text-indigo-400 cursor-pointer hover:underline" onClick={() => setSearchQuery('')}>Clear</span>}
                                </label>
                                <div className="relative group/input">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name..."
                                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg pl-8 pr-2 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 placeholder-zinc-600 transition-all"
                                    />
                                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-3 group-focus-within/input:text-indigo-400 transition-colors" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                                    Source Document
                                    {documentFilter !== 'all' && <span className="text-[9px] text-indigo-400 cursor-pointer hover:underline" onClick={() => setDocumentFilter('all')}>Reset</span>}
                                </label>
                                <div className="relative">
                                    <select
                                        value={documentFilter}
                                        onChange={(e) => setDocumentFilter(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-2.5 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 cursor-pointer hover:bg-zinc-900 transition-colors"
                                    >
                                        <option value="all">All Documents</option>
                                        {data.documents.map((doc) => <option key={doc} value={doc}>{doc}</option>)}
                                    </select>
                                    <div className="absolute right-2.5 top-3 pointer-events-none text-zinc-500">
                                        <Layers className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                                    Entity Type
                                    {typeFilter !== 'all' && <span className="text-[9px] text-indigo-400 cursor-pointer hover:underline" onClick={() => setTypeFilter('all')}>Reset</span>}
                                </label>
                                <div className="relative">
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-2.5 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 cursor-pointer hover:bg-zinc-900 transition-colors"
                                    >
                                        <option value="all">All Types</option>
                                        {data.types.map((type) => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                    <div className="absolute right-2.5 top-3 pointer-events-none text-zinc-500">
                                        <div className="w-3 h-3 rounded-full border border-zinc-500"></div>
                                    </div>
                                </div>
                            </div>

                            {activeFilterCount > 0 && (
                                <button
                                    onClick={() => {
                                        setDocumentFilter('all');
                                        setTypeFilter('all');
                                        setSearchQuery('');
                                    }}
                                    className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs py-2 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-3 h-3" /> Reset All Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {!isCaptureMode && (
                    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                        <button onClick={() => handleZoom(1.5)} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg backdrop-blur-sm transition-colors shadow-lg active:scale-95">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleZoom(0.75)} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg backdrop-blur-sm transition-colors shadow-lg active:scale-95">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button onClick={handleReset} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg backdrop-blur-sm transition-colors shadow-lg active:scale-95">
                            <Maximize className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {hoverNode && !isCaptureMode && (
                    <div className="absolute top-16 left-4 z-10 w-64 animate-in fade-in slide-in-from-left-2 duration-200 pointer-events-none">
                        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 p-3 rounded-xl shadow-2xl">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-zinc-800 rounded-lg shrink-0 border border-zinc-700/50">
                                    <Info className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-semibold text-white mb-1 leading-tight line-clamp-2 break-words">
                                        {hoverNode.name || hoverNode.id}
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        <span className="text-[9px] font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                                            {hoverNode.group}
                                        </span>
                                        {hoverNode.val > 5 && (
                                            <span className="text-[9px] font-medium text-blue-300 bg-blue-900/30 border border-blue-800 px-1.5 py-0.5 rounded">
                                                Important
                                            </span>
                                        )}
                                    </div>
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

                        linkDirectionalParticles={isPerformanceMode || isCaptureMode ? 0 : 4} // More particles for premium feel
                        linkDirectionalParticleSpeed={0.005}

                        enableZoomInteraction={true}
                        enablePanInteraction={true}
                        enableNodeDrag={true}

                        onRenderFramePost={() => {
                            if (graphRef.current) {
                                const { x, y } = graphRef.current.zoom();
                                const LIMIT = 1000; // Increased limit
                                if (Math.abs(x) > LIMIT || Math.abs(y) > LIMIT) {
                                    const newX = Math.max(-LIMIT, Math.min(LIMIT, x));
                                    const newY = Math.max(-LIMIT, Math.min(LIMIT, y));
                                    graphRef.current.centerAt(newX, newY, 0);
                                }
                            }
                        }}

                        minZoom={0.5}
                        maxZoom={8}
                        nodeLabel={() => ""}
                        nodeColor={node => getNodeColor((node as GraphNode).group)}
                        backgroundColor="#09090b"
                        linkColor={() => "#27272a"}

                        // Premium Visuals
                        nodeRelSize={isPerformanceMode ? 4 : 7}
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

                            // Smooth fly to node
                            graphRef.current?.centerAt(node.x, node.y, 1000);
                            graphRef.current?.zoom(4, 2000);

                            const event = new CustomEvent('graph-node-click', { detail: node.name });
                            window.dispatchEvent(event);
                        }}
                    />
                )}

                {data.nodes.length === 0 && !isLoading && !error && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 animate-in fade-in duration-500">
                        <div className="p-6 bg-zinc-900/50 rounded-full mb-4 border border-zinc-800 shadow-xl">
                            <Share2 className="w-10 h-10 text-zinc-700" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-400">No graph data found</p>
                        <p className="text-xs text-zinc-600 mt-1 max-w-xs text-center">
                            {activeFilterCount > 0
                                ? "Try adjusting your filters to see more results."
                                : "Upload documents to visualize connections here."}
                        </p>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={() => {
                                    setDocumentFilter('all');
                                    setTypeFilter('all');
                                    setSearchQuery('');
                                }}
                                className="mt-4 px-4 py-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 text-xs rounded-full border border-indigo-500/20 transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-20">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                        <p className="text-xs font-medium text-indigo-300 animate-pulse">Computing neural network...</p>
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
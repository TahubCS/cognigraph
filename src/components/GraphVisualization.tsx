'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getGraphData } from '@/actions/graph';
import { Loader2, RefreshCw } from 'lucide-react';
import ErrorMessage from './ErrorMessage';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
    )
});

export default function GraphVisualization() {
    const [data, setData] = useState({ nodes: [], links: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphRef = useRef<any>(null);

    const loadGraph = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const graphData = await getGraphData();
            console.log('🎨 Graph Data Loaded:', graphData);
            // @ts-expect-error: DB types mismatch is expected in demo
            setData(graphData);
        } catch (err) {
            console.error('Graph loading error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load graph data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadGraph();

        const handleFileUploaded = () => {
            console.log('📢 File uploaded, refreshing graph in 3 seconds...');
            setTimeout(() => {
                loadGraph();
            }, 3000);
        };

        window.addEventListener('file-uploaded', handleFileUploaded);
        
        return () => {
            window.removeEventListener('file-uploaded', handleFileUploaded);
        };
    }, []);

    return (
        <div className="w-full space-y-4">
            <div className="w-full h-125 border border-gray-800 rounded-xl overflow-hidden bg-gray-950 shadow-xl relative">
                <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm pointer-events-none">
                    Knowledge Graph - {data.nodes.length} nodes, {data.links.length} edges
                </div>
                
                <button 
                    onClick={loadGraph}
                    className="absolute top-4 right-4 z-10 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                    disabled={isLoading}
                >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Loading...' : 'Refresh'}
                </button>
                
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
                            const event = new CustomEvent('graph-node-click', { detail: node.name });
                            window.dispatchEvent(event);
                            
                            graphRef.current?.centerAt(node.x, node.y, 1000);
                            graphRef.current?.zoom(4, 1000);
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
        </div>
    );
}
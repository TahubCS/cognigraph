'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getGraphData } from '@/actions/graph';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
    ssr: false,
    loading: () => <div className="p-10 text-center text-gray-400">Loading Graph...</div>
});

export default function GraphVisualization() {
    const [data, setData] = useState({ nodes: [], links: [] });
    const [isLoading, setIsLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphRef = useRef<any>(null);

    const loadGraph = async () => {
        setIsLoading(true);
        const graphData = await getGraphData();
        console.log('🎨 Graph Data Loaded:', graphData);
        // @ts-expect-error: DB types mismatch is expected in demo
        setData(graphData);
        setIsLoading(false);
    };

    useEffect(() => {
        // Initial load
        loadGraph();

        // 🆕 Listen for file upload events
        const handleFileUploaded = () => {
            console.log('📢 File uploaded, refreshing graph in 3 seconds...');
            // Wait 3 seconds for Python to process
            setTimeout(() => {
                loadGraph();
            }, 3000);
        };

        window.addEventListener('file-uploaded', handleFileUploaded);
        
        return () => {
            window.removeEventListener('file-uploaded', handleFileUploaded);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="w-full h-125 border border-gray-800 rounded-xl overflow-hidden bg-gray-950 shadow-xl relative">
            <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm pointer-events-none">
                Interactive Knowledge Graph - {data.nodes.length} nodes {isLoading && '(Loading...)'}
            </div>
            
            {/* Refresh Button */}
            <button 
                onClick={loadGraph}
                className="absolute top-4 right-4 z-10 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-xs disabled:opacity-50"
                disabled={isLoading}
            >
                {isLoading ? 'Loading...' : 'Refresh Graph'}
            </button>
            
            {data.nodes.length > 0 && (
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
            
            {data.nodes.length === 0 && !isLoading && (
                <div className="flex items-center justify-center h-full text-gray-500">
                    No graph data yet. Upload a file!
                </div>
            )}
        </div>
    );
}
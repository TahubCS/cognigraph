'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getGraphData } from '@/actions/graph';

// Dynamic Import to disable SSR
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
    ssr: false,
    loading: () => <div className="p-10 text-center text-gray-500">Loading Graph...</div>
});

export default function GraphVisualization() {
    const [data, setData] = useState({ nodes: [], links: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphRef = useRef<any>(null);

    useEffect(() => {
        getGraphData().then(graphData => {
        // @ts-expect-error: DB types mismatch is expected in demo
        setData(graphData);
        });
    }, []);

    return (
        <div className="w-full h-125 border border-gray-200 rounded-xl overflow-hidden bg-gray-900 shadow-lg relative">
        <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm pointer-events-none">
            Interactive Knowledge Graph (Click a node!)
        </div>
        
        {data.nodes.length > 0 && (
            <ForceGraph2D
            ref={graphRef}
            graphData={data}
            nodeLabel="name"
            nodeColor={node => {
                // @ts-expect-error: dynamic types
                switch(node.group) {
                    case 'Person': return '#3b82f6';
                    case 'Skill': return '#10b981';
                    case 'Company': return '#f59e0b';
                    default: return '#ef4444';
                }
            }}
            linkColor={() => 'rgba(255,255,255,0.2)'}
            nodeRelSize={6}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            width={800}
            height={500}
            // --- NEW: CLICK INTERACTION ---
            onNodeClick={node => {
                // Broadcast the click event
                // @ts-expect-error: dynamic types
                const event = new CustomEvent('graph-node-click', { detail: node.name });
                window.dispatchEvent(event);
                
                // Optional: Center camera on node
                graphRef.current?.centerAt(node.x, node.y, 1000);
                graphRef.current?.zoom(4, 1000);
            }}
            onNodeDragEnd={node => {
                node.fx = node.x;
                node.fy = node.y;
            }}
            />
        )}
        
        {data.nodes.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
            No graph data yet. Upload a file!
            </div>
        )}
        </div>
    );
}
// Client-side export utilities

type Message = {
    role: 'user' | 'assistant';
    content: string;
    id: string;
};

type GraphNode = {
    id: string;
    name: string;
    group: string;
    x?: number;
    y?: number;
};

type GraphLink = {
    source: string;
    target: string;
    label?: string;
};

/**
 * Export chat conversation as Markdown
 */
export function exportChatAsMarkdown(messages: Message[]): void {
    const markdown = generateMarkdown(messages);
    downloadFile(markdown, `chat-export-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
}

/**
 * Export chat conversation as PDF (uses browser print)
 */
export function exportChatAsPDF(messages: Message[]): void {
    // Create a temporary container
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 210mm;
        padding: 20mm;
        background: white;
        color: black;
        font-family: 'Arial', sans-serif;
    `;
    
    // Generate HTML content
    const html = `
        <div style="max-width: 800px; margin: 0 auto;">
            <h1 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                CogniGraph Chat Export
            </h1>
            <p style="color: #666; margin-bottom: 30px;">
                Exported on ${new Date().toLocaleString()}
            </p>
            ${messages.map(msg => `
                <div style="margin-bottom: 25px; padding: 15px; background: ${msg.role === 'user' ? '#eff6ff' : '#f3f4f6'}; border-radius: 8px;">
                    <div style="font-weight: bold; color: ${msg.role === 'user' ? '#2563eb' : '#059669'}; margin-bottom: 8px; text-transform: uppercase; font-size: 12px;">
                        ${msg.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                    </div>
                    <div style="white-space: pre-wrap; line-height: 1.6;">
                        ${msg.content}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
    document.body.appendChild(container);
    
    // Trigger print dialog
    setTimeout(() => {
        window.print();
        document.body.removeChild(container);
    }, 250);
}

/**
 * Export graph as PNG
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportGraphAsPNG(containerRef: any): Promise<void> {
    if (!containerRef?.current) {
        throw new Error('Graph container not found');
    }
    
    try {
        // Get the container element
        const container = containerRef.current;
        
        // Find the canvas element within the graph container
        // Note: react-force-graph renders a canvas inside the container
        const canvas = container.querySelector('canvas');
        
        if (!canvas) {
            throw new Error('Canvas not found. Make sure the graph has finished rendering.');
        }
        
        // Convert canvas to blob
        canvas.toBlob((blob: Blob | null) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `knowledge-graph-${new Date().toISOString().split('T')[0]}.png`;
                document.body.appendChild(link); // Append to body to ensure click works in all browsers
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                throw new Error('Failed to create image blob');
            }
        }, 'image/png');
    } catch (error) {
        console.error('Error exporting graph as PNG:', error);
        throw error;
    }
}

/**
 * Export graph as SVG
 */
export function exportGraphAsSVG(nodes: GraphNode[], links: GraphLink[]): void {
    // Filter out nodes without coordinates
    const validNodes = nodes.filter((node): node is GraphNode & { x: number; y: number } => 
        node.x !== undefined && 
        node.y !== undefined && 
        !isNaN(node.x) && 
        !isNaN(node.y)
    );

    if (validNodes.length === 0) {
        throw new Error('No nodes with valid coordinates found');
    }

    // Calculate bounds
    const padding = 50;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    validNodes.forEach(node => {
        if (node.x < minX) minX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.x > maxX) maxX = node.x;
        if (node.y > maxY) maxY = node.y;
    });
    
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    
    const getNodeColor = (type: string) => {
        switch(type) {
            case 'Person': return '#3b82f6';
            case 'Skill': return '#10b981';
            case 'Company': return '#f59e0b';
            default: return '#ef4444';
        }
    };
    
    // Generate SVG
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">
    <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.3)" />
        </marker>
    </defs>
    
    <g id="links">
        ${links.map(link => {
            const source = validNodes.find(n => n.id === link.source);
            const target = validNodes.find(n => n.id === link.target);
            if (!source || !target) return '';
            return `<line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" 
                stroke="rgba(255,255,255,0.15)" stroke-width="1" marker-end="url(#arrowhead)" />`;
        }).join('\n        ')}
    </g>
    
    <g id="nodes">
        ${validNodes.map(node => `
        <g>
            <circle cx="${node.x}" cy="${node.y}" r="6" fill="${getNodeColor(node.group)}" />
            <text x="${node.x}" y="${node.y - 10}" font-family="Arial, sans-serif" font-size="10" 
                fill="white" text-anchor="middle">${node.name}</text>
        </g>
        `).join('\n        ')}
    </g>
</svg>`;
    
    downloadFile(svg, `knowledge-graph-${new Date().toISOString().split('T')[0]}.svg`, 'image/svg+xml');
}

/**
 * Generate Markdown from messages
 */
function generateMarkdown(messages: Message[]): string {
    const header = `# CogniGraph Chat Export\n\n**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;
    
    const content = messages.map(msg => {
        const role = msg.role === 'user' ? '👤 **You**' : '🤖 **AI Assistant**';
        return `${role}\n\n${msg.content}\n\n---\n`;
    }).join('\n');
    
    return header + content;
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
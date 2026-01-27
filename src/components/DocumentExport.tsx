'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getDocumentSummary, getAllDocumentsSummary } from '@/actions/export';
import toast from 'react-hot-toast';

type NodesByType = Record<string, Array<{ id: string; label: string; type: string }>>;
type Relationship = { source_label: string; relationship: string; target_label: string };

declare global {
    interface Window {
        exportSingleDocument?: (documentId: string) => Promise<void>;
    }
}

export default function DocumentExport() {
    const [isExporting, setIsExporting] = useState(false);

    const exportAllDocuments = async () => {
        setIsExporting(true);
        toast.loading('Generating summary...');

        try {
            const summaries = await getAllDocumentsSummary();

            if (summaries.length === 0) {
                toast.error('No documents to export');
                return;
            }

            // Generate Markdown summary
            let markdown = `# CogniGraph Documents Summary\n\n`;
            markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
            markdown += `**Total Documents:** ${summaries.length}\n\n`;
            markdown += `---\n\n`;

            for (const doc of summaries) {
                markdown += `## ${doc.filename}\n\n`;
                markdown += `- **Status:** ${doc.status}\n`;
                markdown += `- **Uploaded:** ${new Date(doc.createdAt).toLocaleString()}\n`;
                markdown += `- **Nodes:** ${doc.nodeCount}\n`;
                markdown += `- **Relationships:** ${doc.edgeCount}\n\n`;
                markdown += `---\n\n`;
            }

            // Download file
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `documents-summary-${new Date().toISOString().split('T')[0]}.md`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Summary exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export summary');
        } finally {
            setIsExporting(false);
        }
    };

    const exportSingleDocument = async (documentId: string) => {
        setIsExporting(true);
        toast.loading('Generating document summary...');

        try {
            const summary = await getDocumentSummary(documentId);

            if (!summary) {
                toast.error('Document not found');
                return;
            }

            // Generate detailed Markdown summary
            let markdown = `# ${summary.filename}\n\n`;
            markdown += `**Status:** ${summary.status}\n`;
            markdown += `**Uploaded:** ${new Date(summary.createdAt).toLocaleString()}\n\n`;
            markdown += `---\n\n`;

            markdown += `## Statistics\n\n`;
            markdown += `- **Total Nodes:** ${summary.stats.totalNodes}\n`;
            markdown += `- **Total Relationships:** ${summary.stats.totalEdges}\n`;
            markdown += `- **Node Types:** ${summary.stats.nodeTypes}\n\n`;

            markdown += `## Entities by Type\n\n`;
            for (const [type, nodes] of Object.entries(summary.nodesByType as NodesByType)) {
                markdown += `### ${type} (${nodes.length})\n\n`;
                nodes.forEach((node) => {
                    markdown += `- ${node.label}\n`;
                });
                markdown += `\n`;
            }

            markdown += `## Key Relationships\n\n`;
            (summary.relationships as Relationship[]).slice(0, 20).forEach((rel) => {
                markdown += `- **${rel.source_label}** → *${rel.relationship}* → **${rel.target_label}**\n`;
            });

            if (summary.sampleContent.length > 0) {
                markdown += `\n## Sample Content\n\n`;
                summary.sampleContent.forEach((content: string, idx: number) => {
                    markdown += `### Excerpt ${idx + 1}\n\n${content}\n\n`;
                });
            }

            // Download file
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${summary.filename.replace(/\.[^/.]+$/, '')}-summary.md`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Document summary exported!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export document');
        } finally {
            setIsExporting(false);
        }
    };

    window.exportSingleDocument = exportSingleDocument;

    // Expose exportSingleDocument for use in parent components
    // You can call this via ref or prop drilling if needed
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={exportAllDocuments}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-xs rounded-lg transition-colors disabled:cursor-not-allowed"
            >
                {isExporting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <Download className="w-3 h-3" />
                )}
                Export All
            </button>
        </div>
    );
}

// Export the function for use elsewhere if needed
export { type NodesByType, type Relationship };
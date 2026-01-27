'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';

type DocumentNode = {
    id: string;
    label: string;
    type: string;
};

export async function getDocumentSummary(documentId: string) {
    const { userId } = await auth();
    
    if (!userId) {
        return null;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Get document info
        const docResult = await client.query(`
            SELECT id, filename, status, created_at
            FROM documents
            WHERE id = $1 AND user_id = $2
        `, [documentId, userId]);

        if (docResult.rows.length === 0) {
            return null;
        }

        const doc = docResult.rows[0];

        // Get nodes from this document
        const nodesResult = await client.query(`
            SELECT id, label, type
            FROM nodes
            WHERE document_id = $1
            ORDER BY type, label
        `, [documentId]);

        // Get edges from this document
        const edgesResult = await client.query(`
            SELECT e.relationship, n1.label as source_label, n2.label as target_label
            FROM edges e
            JOIN nodes n1 ON e.source_node_id = n1.id
            JOIN nodes n2 ON e.target_node_id = n2.id
            WHERE e.document_id = $1
            ORDER BY e.relationship
        `, [documentId]);

        // Get sample content
        const contentResult = await client.query(`
            SELECT content
            FROM embeddings
            WHERE document_id = $1
            LIMIT 5
        `, [documentId]);

        // Group nodes by type
        const nodesByType: Record<string, DocumentNode[]> = {};
        nodesResult.rows.forEach((node: DocumentNode) => {
            if (!nodesByType[node.type]) {
                nodesByType[node.type] = [];
            }
            nodesByType[node.type].push(node);
        });

        return {
            filename: doc.filename,
            status: doc.status,
            createdAt: doc.created_at,
            stats: {
                totalNodes: nodesResult.rows.length,
                totalEdges: edgesResult.rows.length,
                nodeTypes: Object.keys(nodesByType).length
            },
            nodesByType,
            relationships: edgesResult.rows,
            sampleContent: contentResult.rows.map(r => r.content)
        };

    } catch (error) {
        console.error("Failed to get document summary:", error);
        return null;
    } finally {
        await client.end();
    }
}

export async function getAllDocumentsSummary() {
    const { userId } = await auth();
    
    if (!userId) {
        return [];
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Get all documents for user
        const docsResult = await client.query(`
            SELECT id, filename, status, created_at
            FROM documents
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);

        const summaries = [];

        for (const doc of docsResult.rows) {
            // Get node count
            const nodesCount = await client.query(`
                SELECT COUNT(*) as count
                FROM nodes
                WHERE document_id = $1
            `, [doc.id]);

            // Get edge count
            const edgesCount = await client.query(`
                SELECT COUNT(*) as count
                FROM edges
                WHERE document_id = $1
            `, [doc.id]);

            summaries.push({
                id: doc.id,
                filename: doc.filename,
                status: doc.status,
                createdAt: doc.created_at,
                nodeCount: parseInt(nodesCount.rows[0].count),
                edgeCount: parseInt(edgesCount.rows[0].count)
            });
        }

        return summaries;

    } catch (error) {
        console.error("Failed to get documents summary:", error);
        return [];
    } finally {
        await client.end();
    }
}
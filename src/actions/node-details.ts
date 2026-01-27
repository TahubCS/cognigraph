'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';

export async function getNodeDetails(nodeId: string) {
    const { userId } = await auth();
    
    if (!userId) {
        return null;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Get node basic info
        const nodeResult = await client.query(`
            SELECT n.id, n.label, n.type, d.filename, d.id as document_id
            FROM nodes n
            JOIN documents d ON n.document_id = d.id
            WHERE n.id = $1 AND d.user_id = $2
        `, [nodeId, userId]);

        if (nodeResult.rows.length === 0) {
            return null;
        }

        const node = nodeResult.rows[0];

        // Get outgoing connections (this node → others)
        const outgoingResult = await client.query(`
            SELECT 
                e.relationship,
                n.id as target_id,
                n.label as target_label,
                n.type as target_type
            FROM edges e
            JOIN nodes n ON e.target_node_id = n.id
            JOIN documents d ON e.document_id = d.id
            WHERE e.source_node_id = $1 AND d.user_id = $2
            ORDER BY e.relationship, n.label
        `, [nodeId, userId]);

        // Get incoming connections (others → this node)
        const incomingResult = await client.query(`
            SELECT 
                e.relationship,
                n.id as source_id,
                n.label as source_label,
                n.type as source_type
            FROM edges e
            JOIN nodes n ON e.source_node_id = n.id
            JOIN documents d ON e.document_id = d.id
            WHERE e.target_node_id = $1 AND d.user_id = $2
            ORDER BY e.relationship, n.label
        `, [nodeId, userId]);

        // Get related content chunks from embeddings
        const contentResult = await client.query(`
            SELECT DISTINCT e.content
            FROM embeddings e
            WHERE e.document_id = $1
            AND e.content ILIKE '%' || $2 || '%'
            LIMIT 3
        `, [node.document_id, node.label]);

        console.log(`📊 Node details for ${node.label}: ${outgoingResult.rows.length} outgoing, ${incomingResult.rows.length} incoming connections`);

        return {
            id: node.id,
            label: node.label,
            type: node.type,
            document: node.filename,
            outgoing: outgoingResult.rows,
            incoming: incomingResult.rows,
            relatedContent: contentResult.rows.map(r => r.content),
            stats: {
                totalConnections: outgoingResult.rows.length + incomingResult.rows.length,
                outgoingCount: outgoingResult.rows.length,
                incomingCount: incomingResult.rows.length
            }
        };

    } catch (error) {
        console.error("Failed to fetch node details:", error);
        return null;
    } finally {
        await client.end();
    }
}
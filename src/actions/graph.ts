'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { graphRateLimiter } from '@/lib/rate-limit';

// UPDATED: Added 'searchQuery' parameter
export async function getGraphData(documentFilter?: string, typeFilter?: string, searchQuery?: string) {
    const { userId } = await auth();
    
    if (!userId) {
        return { nodes: [], links: [], documents: [], types: [] };
    }

    const { success: rateLimitSuccess, limit, remaining } = await graphRateLimiter.limit(userId);
    
    if (!rateLimitSuccess) {
        console.log(`⏱️ Rate limit exceeded: ${remaining}/${limit}`);
        return { nodes: [], links: [], documents: [], types: [] };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        let nodeWhereClause = 'WHERE d.user_id = $1';
        let edgeWhereClause = 'WHERE d.user_id = $1';
        
        const params: unknown[] = [userId];
        let paramIndex = 2;

        // 1. Filter by Document
        if (documentFilter && documentFilter !== 'all') {
            nodeWhereClause += ` AND d.filename = $${paramIndex}`;
            edgeWhereClause += ` AND d.filename = $${paramIndex}`;
            params.push(documentFilter);
            paramIndex++;
        }

        // 2. Filter by Node Type
        if (typeFilter && typeFilter !== 'all') {
            nodeWhereClause += ` AND n.type = $${paramIndex}`;
            params.push(typeFilter);
            paramIndex++;
        }

        // 3. NEW: Filter by Search Query (Node Label)
        if (searchQuery && searchQuery.trim() !== '') {
            nodeWhereClause += ` AND n.label ILIKE '%' || $${paramIndex} || '%'`;
            params.push(searchQuery);
            paramIndex++;
        }

        // Fetch Nodes
        const nodesResult = await client.query(`
            SELECT DISTINCT n.id, n.label, n.type, d.filename
            FROM nodes n
            JOIN documents d ON n.document_id = d.id
            ${nodeWhereClause}
            LIMIT 500
        `, params);

        // Fetch Edges (Only if we have nodes)
        const nodeIds = nodesResult.rows.map(n => n.id);
        let edgesResult;
        
        if (nodeIds.length > 0) {
            // We only want edges where BOTH source and target are in our filtered node list
            edgesResult = await client.query(`
                SELECT DISTINCT e.source_node_id as source, e.target_node_id as target, e.relationship as label 
                FROM edges e
                JOIN documents d ON e.document_id = d.id
                ${edgeWhereClause}
                AND e.source_node_id = ANY($${paramIndex})
                AND e.target_node_id = ANY($${paramIndex})
            `, [...params, nodeIds]);
        } else {
            edgesResult = { rows: [] };
        }

        // Metadata for dropdowns (unfiltered list)
        const documentsResult = await client.query(`
            SELECT DISTINCT d.filename FROM documents d JOIN nodes n ON n.document_id = d.id WHERE d.user_id = $1 ORDER BY d.filename
        `, [userId]);

        const typesResult = await client.query(`
            SELECT DISTINCT n.type FROM nodes n JOIN documents d ON n.document_id = d.id WHERE d.user_id = $1 ORDER BY n.type
        `, [userId]);

        return {
            nodes: nodesResult.rows.map(n => ({
                id: n.id,
                name: n.label,
                group: n.type,
                document: n.filename,
                val: 5
            })),
            links: edgesResult.rows,
            documents: documentsResult.rows.map(d => d.filename),
            types: typesResult.rows.map(t => t.type)
        };

    } catch (error) {
        console.error("Graph Fetch Failed:", error);
        return { nodes: [], links: [], documents: [], types: [] };
    } finally {
        await client.end();
    }
}
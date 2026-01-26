'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { graphRateLimiter } from '@/lib/rate-limit';

export async function getGraphData(documentFilter?: string, typeFilter?: string) {
    const { userId } = await auth();
    
    if (!userId) {
        return { nodes: [], links: [], documents: [], types: [] };
    }

    // Rate Limiting Check
    const { success: rateLimitSuccess, limit, remaining } = await graphRateLimiter.limit(userId);
    
    if (!rateLimitSuccess) {
        console.log(`⏱️ Rate limit exceeded for graph data: ${remaining}/${limit}`);
        return { nodes: [], links: [], documents: [], types: [] };
    }

    console.log(`⏱️ Rate limit: ${remaining}/${limit} graph requests remaining for user ${userId}`);

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Build dynamic WHERE clause for filtering
        let nodeWhereClause = 'WHERE d.user_id = $1';
        let edgeWhereClause = 'WHERE d.user_id = $1';
        const params: unknown[] = [userId];
        let paramIndex = 2;

        if (documentFilter && documentFilter !== 'all') {
            nodeWhereClause += ` AND d.filename = $${paramIndex}`;
            edgeWhereClause += ` AND d.filename = $${paramIndex}`;
            params.push(documentFilter);
            paramIndex++;
        }

        if (typeFilter && typeFilter !== 'all') {
            nodeWhereClause += ` AND n.type = $${paramIndex}`;
            params.push(typeFilter);
        }

        // Get filtered nodes
        const nodesResult = await client.query(`
            SELECT DISTINCT n.id, n.label, n.type, d.filename
            FROM nodes n
            JOIN documents d ON n.document_id = d.id
            ${nodeWhereClause}
        `, params);

        // Get edges (only between visible nodes)
        const nodeIds = nodesResult.rows.map(n => n.id);
        let edgesResult;
        
        if (nodeIds.length > 0) {
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

        // Get all available documents for filter dropdown
        const documentsResult = await client.query(`
            SELECT DISTINCT d.filename
            FROM documents d
            JOIN nodes n ON n.document_id = d.id
            WHERE d.user_id = $1
            ORDER BY d.filename
        `, [userId]);

        // Get all available node types for filter dropdown
        const typesResult = await client.query(`
            SELECT DISTINCT n.type
            FROM nodes n
            JOIN documents d ON n.document_id = d.id
            WHERE d.user_id = $1
            ORDER BY n.type
        `, [userId]);

        console.log(`📊 Graph for user ${userId}: ${nodesResult.rows.length} nodes, ${edgesResult.rows.length} edges (filtered: doc=${documentFilter}, type=${typeFilter})`);

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
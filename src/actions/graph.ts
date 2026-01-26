'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { graphRateLimiter } from '@/lib/rate-limit';

export async function getGraphData() {
    const { userId } = await auth();
    
    if (!userId) {
        return { nodes: [], links: [] };
    }

    // 🆕 Rate Limiting Check
    const { success: rateLimitSuccess, limit, remaining } = await graphRateLimiter.limit(userId);
    
    if (!rateLimitSuccess) {
        console.log(`⏱️ Rate limit exceeded for graph data: ${remaining}/${limit}`);
        // For graph, we'll just log and return empty instead of throwing
        return { nodes: [], links: [] };
    }

    console.log(`⏱️ Rate limit: ${remaining}/${limit} graph requests remaining for user ${userId}`);

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        const nodesResult = await client.query(`
            SELECT DISTINCT n.id, n.label, n.type 
            FROM nodes n
            JOIN documents d ON n.document_id = d.id
            WHERE d.user_id = $1
        `, [userId]);

        const edgesResult = await client.query(`
            SELECT DISTINCT e.source_node_id as source, e.target_node_id as target, e.relationship as label 
            FROM edges e
            JOIN documents d ON e.document_id = d.id
            WHERE d.user_id = $1
        `, [userId]);

        console.log(`📊 Graph for user ${userId}: ${nodesResult.rows.length} nodes, ${edgesResult.rows.length} edges`);

        return {
            nodes: nodesResult.rows.map(n => ({
                id: n.id,
                name: n.label,
                group: n.type,
                val: 5
            })),
            links: edgesResult.rows
        };

    } catch (error) {
        console.error("Graph Fetch Failed:", error);
        return { nodes: [], links: [] };
    } finally {
        await client.end();
    }
}
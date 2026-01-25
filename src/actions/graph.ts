'use server';

import { Client } from 'pg';

export async function getGraphData() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // 1. Fetch All Nodes
        const nodesResult = await client.query(`
        SELECT id, label, type 
        FROM nodes
        `);

        // 2. Fetch All Edges
        // We rename columns to 'source' and 'target' because the library expects those specific names
        const edgesResult = await client.query(`
        SELECT source_node_id as source, target_node_id as target, relationship as label 
        FROM edges
        `);

        // 3. Return formatted JSON
        return {
        nodes: nodesResult.rows.map(n => ({
            id: n.id,
            name: n.label,
            group: n.type, // We can color-code by type (Person, Skill, etc.)
            val: 5         // Size of the node
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
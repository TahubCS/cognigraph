'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { graphRateLimiter } from '@/lib/rate-limit';

export async function getGraphData(documentFilter?: string, typeFilter?: string, searchQuery?: string) {
    const { userId } = await auth();

    if (!userId) {
        return { nodes: [], links: [], documents: [], types: [], rateLimited: false, error: undefined };
    }

    const { success: rateLimitSuccess, limit, remaining } = await graphRateLimiter.limit(userId);

    if (!rateLimitSuccess) {
        console.log(`⏱️ Rate limit exceeded: ${remaining}/${limit}`);
        return { nodes: [], links: [], documents: [], types: [], rateLimited: true, error: undefined };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    // Initialize results
    let documents: string[] = [];
    let types: string[] = [];
    let graphNodes: { id: string; name: string; group: string; document: string; val: number }[] = [];
    let graphLinks: { source: string; target: string; label: string }[] = [];
    let executionError: string | undefined = undefined;

    try {
        await client.connect();

        // ========================================
        // STEP 1: ALWAYS FETCH METADATA FIRST
        // This ensures dropdowns never break
        // ========================================
        try {
            const documentsResult = await client.query(`
                SELECT DISTINCT d.filename 
                FROM documents d 
                JOIN nodes n ON n.document_id = d.id 
                WHERE d.user_id = $1 
                ORDER BY d.filename
            `, [userId]);
            documents = documentsResult.rows.map(d => d.filename);

            const typesResult = await client.query(`
                SELECT DISTINCT n.type 
                FROM nodes n 
                JOIN documents d ON n.document_id = d.id 
                WHERE d.user_id = $1 
                ORDER BY n.type
            `, [userId]);
            types = typesResult.rows.map(t => t.type);

            console.log(`📋 Metadata loaded: ${documents.length} docs, ${types.length} types`);
        } catch (metaErr) {
            console.error("Metadata query failed:", metaErr);
            // Non-critical, continue with empty arrays
        }

        // ========================================
        // STEP 2: FETCH FILTERED GRAPH DATA
        // ========================================
        try {
            const params: unknown[] = [userId];
            const conditions: string[] = ['d.user_id = $1'];
            let hasNodeFilter = false;

            if (documentFilter && documentFilter !== 'all') {
                params.push(documentFilter);
                conditions.push(`d.filename = $${params.length}`);
            }

            if (typeFilter && typeFilter !== 'all') {
                params.push(typeFilter);
                conditions.push(`n.type = $${params.length}`);
                hasNodeFilter = true;
            }

            if (searchQuery && searchQuery.trim() !== '') {
                params.push(searchQuery);
                conditions.push(`n.label ILIKE '%' || $${params.length} || '%'`);
                hasNodeFilter = true;
            }

            const whereClause = 'WHERE ' + conditions.join(' AND ');

            console.log("🔍 Graph Query:", { whereClause, params });

            // Fetch base nodes
            const baseNodesResult = await client.query(`
                SELECT DISTINCT n.id, n.label, n.type, d.filename
                FROM nodes n
                JOIN documents d ON n.document_id = d.id
                ${whereClause}
                LIMIT 500
            `, params);

            let finalNodes = baseNodesResult.rows;
            const finalNodeIds = new Set<string>(finalNodes.map(n => n.id));

            console.log(`✅ Base nodes found: ${finalNodes.length}`);

            // Neighbor expansion (only if we have a filter and some results)
            if (hasNodeFilter && finalNodes.length > 0 && finalNodes.length < 100) {
                try {
                    const baseIds = Array.from(finalNodeIds);

                    // Simpler neighbor query without the problematic != ALL syntax
                    const neighborsResult = await client.query(`
                        SELECT DISTINCT n.id, n.label, n.type, d.filename
                        FROM nodes n
                        JOIN documents d ON n.document_id = d.id
                        WHERE d.user_id = $1
                        AND n.id IN (
                            SELECT CASE WHEN e.source_node_id = ANY($2) THEN e.target_node_id ELSE e.source_node_id END
                            FROM edges e
                            WHERE e.source_node_id = ANY($2) OR e.target_node_id = ANY($2)
                        )
                        AND NOT (n.id = ANY($2))
                        LIMIT 200
                    `, [userId, baseIds]);

                    if (neighborsResult.rows.length > 0) {
                        console.log(`🧠 Found ${neighborsResult.rows.length} neighbor nodes`);
                        finalNodes = [...finalNodes, ...neighborsResult.rows];
                        neighborsResult.rows.forEach(n => finalNodeIds.add(n.id));
                    }
                } catch (neighborErr) {
                    console.error("Neighbor expansion failed (non-critical):", neighborErr);
                    // Continue without neighbors
                }
            }

            // Fetch edges
            if (finalNodes.length > 0) {
                const allNodeIds = Array.from(finalNodeIds);

                const edgesResult = await client.query(`
                    SELECT DISTINCT e.source_node_id as source, e.target_node_id as target, e.relationship as label 
                    FROM edges e
                    JOIN documents d ON e.document_id = d.id
                    WHERE d.user_id = $1
                    AND e.source_node_id = ANY($2)
                    AND e.target_node_id = ANY($2)
                `, [userId, allNodeIds]);

                graphLinks = edgesResult.rows;
                console.log(`✅ Edges found: ${graphLinks.length}`);
            }

            // Map nodes to output format
            graphNodes = finalNodes.map(n => ({
                id: n.id,
                name: n.label,
                group: n.type,
                document: n.filename,
                val: 5
            }));

        } catch (graphErr) {
            console.error("Graph query failed:", graphErr);
            executionError = graphErr instanceof Error ? graphErr.message : "Graph query error";
            // Graph fails but metadata is preserved
        }

    } catch (connectionErr) {
        console.error("Database connection failed:", connectionErr);
        executionError = "Database connection failed";
    } finally {
        try {
            await client.end();
        } catch {
            // Ignore close errors
        }
    }

    return {
        nodes: graphNodes,
        links: graphLinks,
        documents: documents,
        types: types,
        rateLimited: false,
        error: executionError
    };
}
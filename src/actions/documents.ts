'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';

export async function getDocuments() {
    const { userId } = await auth();
    
    if (!userId) {
        return [];
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        const result = await client.query(`
            SELECT id, filename, status, created_at
            FROM documents
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);

        return result.rows;

    } catch (error) {
        console.error("Failed to fetch documents:", error);
        return [];
    } finally {
        await client.end();
    }
}

export async function deleteDocument(documentId: string) {
    const { userId } = await auth();
    
    if (!userId) {
        return { success: false, error: "Not authenticated" };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Verify ownership before deleting
        const result = await client.query(`
            DELETE FROM documents
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [documentId, userId]);

        if (result.rowCount === 0) {
            return { success: false, error: "Document not found or access denied" };
        }

        console.log(`🗑️ Deleted document ${documentId} for user ${userId}`);
        return { success: true };

    } catch (error) {
        console.error("Failed to delete document:", error);
        return { success: false, error: "Failed to delete document" };
    } finally {
        await client.end();
    }
}
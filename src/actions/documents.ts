'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 Client (Same config as storage.ts)
const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

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

        // 1. Get the file_key BEFORE deleting the record
        const fileResult = await client.query(`
            SELECT file_key, filename 
            FROM documents 
            WHERE id = $1 AND user_id = $2
        `, [documentId, userId]);

        if (fileResult.rowCount === 0) {
            return { success: false, error: "Document not found or access denied" };
        }

        const fileKey = fileResult.rows[0].file_key;
        const filename = fileResult.rows[0].filename;

        // 2. Delete from S3
        if (fileKey) {
            try {
                const command = new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: fileKey,
                });
                await s3Client.send(command);
                console.log(`🗑️ S3: Deleted object ${fileKey}`);
            } catch (s3Error) {
                console.error(`⚠️ S3 Delete Warning: Could not delete ${fileKey}`, s3Error);
                // We continue to delete the DB record so the UI doesn't get stuck, 
                // but we log this for admin review.
            }
        }

        // 3. Delete from Database
        await client.query(`
            DELETE FROM documents
            WHERE id = $1 AND user_id = $2
        `, [documentId, userId]);

        console.log(`🗑️ DB: Deleted document record ${documentId} (${filename})`);
        
        // 4. (Optional) Cleanup Embeddings/Nodes?
        // Depending on your DB schema 'ON DELETE CASCADE', this might happen automatically.
        // If not, you might need to manually delete from 'embeddings' and 'nodes' tables here too.
        
        return { success: true };

    } catch (error) {
        console.error("Failed to delete document:", error);
        return { success: false, error: "Failed to delete document" };
    } finally {
        await client.end();
    }
}
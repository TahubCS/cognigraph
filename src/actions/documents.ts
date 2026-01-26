'use server';

import { Client } from 'pg';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function getUserDocuments() {
    const { userId } = await auth();
    if (!userId) return [];

    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();
        
        // Fetch docs sorted by newest first
        const result = await client.query(`
            SELECT id, filename, created_at, status, file_key
            FROM documents 
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);

        return result.rows;
    } catch (error) {
        console.error("Fetch docs failed:", error);
        return [];
    } finally {
        await client.end();
    }
}

export async function deleteDocument(documentId: string, fileKey: string) {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();

        // 1. Delete from S3
        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
        }));

        // 2. Delete from Postgres
        // Note: Because we used ON DELETE CASCADE in setup-db.ts, 
        // this will automatically wipe the Nodes, Edges, and Embeddings too!
        await client.query(`
            DELETE FROM documents 
            WHERE id = $1 AND user_id = $2
        `, [documentId, userId]);

        revalidatePath('/'); // Refresh the UI
        return { success: true };

    } catch (error) {
        console.error("Delete failed:", error);
        return { success: false, error: "Failed to delete document" };
    } finally {
        await client.end();
    }
}
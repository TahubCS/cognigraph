'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function getDocuments(page: number = 1, limit: number = 5) {
    const { userId } = await auth();
    
    if (!userId) {
        return { documents: [], totalPages: 0 };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        
        const offset = (page - 1) * limit;

        // 1. Get Total Count
        const countResult = await client.query(`
            SELECT COUNT(*) as count 
            FROM documents 
            WHERE user_id = $1
        `, [userId]);
        
        const totalDocs = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalDocs / limit);

        // 2. Get Paginated Documents
        const result = await client.query(`
            SELECT id, filename, status, created_at
            FROM documents
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        return { 
            documents: result.rows, 
            totalPages: totalPages > 0 ? totalPages : 1 
        };

    } catch (error) {
        console.error("Failed to fetch documents:", error);
        return { documents: [], totalPages: 0 };
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

        // 1. Get the file info BEFORE deleting
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
            }
        }

        // 3. Delete from Database (Clean Children First)
        // We removed the premature 'DELETE FROM documents' that was here
        
        // A. Delete Graph Data (Nodes & Edges)
        await client.query('DELETE FROM edges WHERE document_id = $1', [documentId]);
        await client.query('DELETE FROM nodes WHERE document_id = $1', [documentId]);
        
        // B. Delete Vector Data (Embeddings)
        await client.query('DELETE FROM embeddings WHERE document_id = $1', [documentId]);

        // 4. Finally Delete the Parent Document
        await client.query(`
            DELETE FROM documents
            WHERE id = $1 AND user_id = $2
        `, [documentId, userId]);

        // ✅ FIX: Now using the filename variable
        console.log(`🗑️ DB: Clean cleanup complete for ${documentId} (${filename})`);
        
        return { success: true };

    } catch (error) {
        console.error("Failed to delete document:", error);
        return { success: false, error: "Failed to delete document" };
    } finally {
        await client.end();
    }
}
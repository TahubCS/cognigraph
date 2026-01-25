'use server';

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Client } from 'pg';

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    // Disable request checksums
    requestChecksumCalculation: 'WHEN_REQUIRED',
});

export async function getPresignedUrl(filename: string, contentType: string) {
    const dbClient = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log("🔍 Connecting to database...");
        await dbClient.connect();
        console.log("✅ Database connected");

        const userId = "user_123"; 
        const fileKey = `${userId}/${Date.now()}-${filename}`;

        console.log("💾 Inserting document record...");
        const result = await dbClient.query(
            `INSERT INTO documents (user_id, file_key, filename, status) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id`,
            [userId, fileKey, filename, 'PENDING']
        );
        
        const documentId = result.rows[0].id;
        console.log("✅ Document record created:", documentId);

        console.log("🔐 Generating presigned URL...");
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { 
            expiresIn: 60,
        });
        console.log("✅ Presigned URL generated");

        return { success: true, url: signedUrl, documentId, fileKey };

    } catch (error) {
        console.error("❌ Error in getPresignedUrl:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Failed to generate upload URL: ${errorMessage}` };
    } finally {
        await dbClient.end();
    }
}

export async function triggerProcessing(fileKey: string, documentId: string) {
    try {
        // Call the Python Service (localhost:8000)
        const response = await fetch("http://127.0.0.1:8000/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_key: fileKey, document_id: documentId }),
        });
        
        if (!response.ok) {
            console.error("Python Service Failed:", await response.text());
            return { success: false };
        }
        
        return { success: true };
    } catch (error) {
        console.error("Failed to trigger python:", error);
        return { success: false };
    }
}
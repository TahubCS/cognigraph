'use server';

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Client } from 'pg';

/* ===========================
   Startup Guards (FAIL FAST)
=========================== */

if (!process.env.DATABASE_URL) {
    throw new Error(
        '❌ DATABASE_URL is not set. Is your Docker/Postgres container running?'
    );
}

if (
    !process.env.AWS_REGION ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.AWS_BUCKET_NAME
    ) {
    throw new Error('❌ Missing required AWS environment variables');
}

/* ===========================
   AWS S3 Client
=========================== */

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
});

/* ===========================
   Server Actions
=========================== */

export async function getPresignedUrl(
    filename: string,
    contentType: string
    ) {
    const dbClient = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log("🔍 Connecting to database...");
        await dbClient.connect();
        console.log("✅ Database connected");

        const userId = "user_123"; // TODO: replace with Clerk userId
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

        return {
        success: true,
        url: signedUrl,
        documentId,
        fileKey,
        };

    } catch (error) {
        console.error("❌ getPresignedUrl failed:", error);

        const message =
        error instanceof Error
            ? error.message.includes('ECONNREFUSED')
            ? 'Database unavailable. Is Docker running?'
            : error.message
            : 'Unknown error';

        return {
        success: false,
        error: message,
        };
    } finally {
        // Only attempt to close if connected
        try {
        await dbClient.end();
        } catch {
        /* ignore */
        }
    }
}

export async function triggerProcessing(
    fileKey: string,
    documentId: string
    ) {
    try {
        const response = await fetch("http://127.0.0.1:8000/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            file_key: fileKey,
            document_id: documentId,
        }),
        });

        if (!response.ok) {
        console.error("❌ Python service error:", await response.text());
        return { success: false };
        }

        return { success: true };

    } catch (error) {
        console.error(
        "❌ Failed to reach Python service. Is it running?",
        error
        );
        return { success: false };
    }
}

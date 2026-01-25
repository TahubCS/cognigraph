'use server';

import { OpenAI } from 'openai';
import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function searchContext(query: string) {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
        return "";
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // 1. Generate Query Vector
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
        });
        const vector = JSON.stringify(embeddingResponse.data[0].embedding);

        // 2. Search Database - ONLY for this user's documents
        const result = await client.query(`
            SELECT 
                e.content, 
                1 - (e.embedding <=> $1) as similarity
            FROM embeddings e
            JOIN documents d ON e.document_id = d.id
            WHERE d.user_id = $2 
            AND 1 - (e.embedding <=> $1) > 0.01
            ORDER BY e.embedding <=> $1
            LIMIT 5;
        `, [vector, userId]);

        console.log(`🔍 Found ${result.rows.length} relevant chunks for user ${userId}`);

        return result.rows.map(row => row.content).join('\n\n');

    } catch (error) {
        console.error("Search failed:", error);
        return "";
    } finally {
        await client.end();
    }
}

export async function askAI(userQuestion: string) {
    const context = await searchContext(userQuestion);

    if (!context) {
        console.log("⚠️ No context found for this user.");
        return "I couldn't find any relevant information in your uploaded documents.";
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
            {
                role: "system",
                content: `You are a helpful AI assistant. You must answer the user's question strictly based on the provided Context below.
                
                CONTEXT:
                ${context}`
            },
            { role: "user", content: userQuestion }
        ]
    });

    return response.choices[0].message.content;
}
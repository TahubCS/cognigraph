'use server';

import { OpenAI } from 'openai';
import { Client } from 'pg';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function searchContext(query: string) {
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

        // 2. Search Database
        // We selected 'content' (CRITICAL FIX) and use 0.35 threshold based on your 0.48 score
        // ... inside searchContext ...
        const result = await client.query(`
            SELECT 
                content, 
                1 - (embedding <=> $1) as similarity
            FROM embeddings
            WHERE 1 - (embedding <=> $1) > 0.01  -- <--- THE FIX: Set to 0.01
            ORDER BY embedding <=> $1
            LIMIT 5;
        `, [vector]);

        console.log(`🔍 Found ${result.rows.length} relevant chunks for query: "${query}"`);

        // 3. Return the text chunks
        return result.rows.map(row => row.content).join('\n\n');

    } catch (error) {
        console.error("Search failed:", error);
        return "";
    } finally {
        await client.end();
    }
}

export async function askAI(userQuestion: string) {
    // 1. Get the Context
    const context = await searchContext(userQuestion);

    // If context is empty, give a clear fallback
    if (!context) {
        console.log("⚠️ No context found. Threshold 0.25 might be too high or doc is empty.");
        return "I couldn't find any relevant information in your uploaded documents.";
    }

    // 2. Send Context + Question to GPT-4
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
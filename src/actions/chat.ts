'use server';

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai'; // 1. Remove 'CoreMessage' from here
import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { chatRateLimiter } from '@/lib/rate-limit';

// 2. Define the type manually to bypass the error
type Message = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export async function searchContext(query: string) {
    const { userId } = await auth();
    if (!userId) return [];

    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();

        // Generate embedding
        const OpenAI = (await import('openai')).default;
        const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const embeddingResponse = await openaiClient.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
        });
        const vector = JSON.stringify(embeddingResponse.data[0].embedding);

        // Fetch Content + Filenames
        const result = await client.query(`
            SELECT 
                d.filename,
                e.content, 
                1 - (e.embedding <=> $1) as similarity
            FROM embeddings e
            JOIN documents d ON e.document_id = d.id
            WHERE d.user_id = $2 
              AND 1 - (e.embedding <=> $1) > 0.1
            ORDER BY e.embedding <=> $1
            LIMIT 7;
        `, [vector, userId]);

        return result.rows;

    } catch (error) {
        console.error("Search failed:", error);
        return [];
    } finally {
        await client.end();
    }
}

// 3. Use the local 'Message' type
export async function askAI(messages: Message[]) {
    const { userId } = await auth();
    if (!userId) throw new Error("Not authenticated");

    // Rate Limit Check
    const { success, reset } = await chatRateLimiter.limit(userId);
    
    if (!success) {
        const waitSeconds = Math.ceil((reset - Date.now()) / 1000);
        throw new Error(`Rate limit exceeded. Try again in ${waitSeconds}s.`);
    }

    const lastMessage = messages[messages.length - 1];
    
    const userQuestion = typeof lastMessage.content === 'string' 
        ? lastMessage.content 
        : "User query";

    // Get Context
    const contextRows = await searchContext(userQuestion);

    // Format Context
    const contextBlock = contextRows.length > 0 
        ? contextRows.map(r => `SOURCE: ${r.filename}\nCONTENT: ${r.content}`).join('\n\n---\n\n')
        : "No relevant documents found.";

    // Prepare Source Metadata
    const uniqueSources = Array.from(new Set(contextRows.map(r => r.filename)))
        .map(filename => {
            const row = contextRows.find(r => r.filename === filename);
            return {
                filename,
                similarity: row ? Math.round(row.similarity * 100) : 0,
                preview: row ? row.content.substring(0, 60) + "..." : ""
            };
        });

    // Stream Response
    const result = streamText({
        model: openai('gpt-4-turbo'),
        system: `You are an expert Research Analyst. 
        - Answer comprehensively using the provided Context.
        - Synthesize information from multiple sources.
        - Explain the 'why' and 'how' if possible.
        
        CONTEXT:
        ${contextBlock}`,
        messages: messages as unknown as Message[], // Cast via unknown to avoid using `any` and match local Message type
    });

    const stream = result.textStream;

    const responseStream = new ReadableStream({
        async start(controller) {
            const reader = stream.getReader();
            const encoder = new TextEncoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    controller.enqueue(encoder.encode(value));
                }
                
                // Append Sources Data
                if (uniqueSources.length > 0) {
                    const dataString = `\n__SOURCES__:${JSON.stringify(uniqueSources)}`;
                    controller.enqueue(encoder.encode(dataString));
                }
            } finally {
                controller.close();
            }
        }
    });

    return new Response(responseStream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}
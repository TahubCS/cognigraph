import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { chatRateLimiter } from '@/lib/rate-limit';

export const maxDuration = 30;

async function searchContext(query: string, userId: string) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        const OpenAI = (await import('openai')).default;
        const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const embeddingResponse = await openaiClient.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
        });
        const vector = JSON.stringify(embeddingResponse.data[0].embedding);

        // Increased LIMIT to 7 to give the AI more context for a "Complete" summary
        const result = await client.query(`
            SELECT 
                e.content,
                d.filename,
                1 - (e.embedding <=> $1) as similarity
            FROM embeddings e
            JOIN documents d ON e.document_id = d.id
            WHERE d.user_id = $2 
              AND 1 - (e.embedding <=> $1) > 0.1
            ORDER BY e.embedding <=> $1
            LIMIT 7; 
        `, [vector, userId]);

        const context = result.rows.map(row => `SOURCE: ${row.filename}\n${row.content}`).join('\n\n---\n\n');
        
        // Remove duplicates for the UI list
        const uniqueSourcesMap = new Map();
        result.rows.forEach((row) => {
            if (!uniqueSourcesMap.has(row.filename)) {
                uniqueSourcesMap.set(row.filename, {
                    filename: row.filename,
                    similarity: (row.similarity * 100).toFixed(1),
                    preview: row.content.substring(0, 100).replace(/\n/g, ' ') + '...'
                });
            }
        });
        const sources = Array.from(uniqueSourcesMap.values());

        return { context, sources };

    } catch (error) {
        console.error("Search failed:", error);
        return { context: '', sources: [] };
    } finally {
        await client.end();
    }
}

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const { userId } = await auth();
        
        if (!userId) return new Response('Unauthorized', { status: 401 });

        // Rate Limiting
const { success: rateLimitSuccess, limit, reset } = await chatRateLimiter.limit(userId);
if (!rateLimitSuccess) {
    const waitSeconds = Math.ceil((reset - Date.now()) / 1000);
    return new Response(JSON.stringify({ 
        error: `Rate limit exceeded. You've used all ${limit} requests. Try again in ${waitSeconds}s.`,
        limit,
        remaining: 0,
        reset
    }), { 
        status: 429,
        headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString()
        }
    });
}

        const lastMessage = messages[messages.length - 1];
        const { context, sources } = await searchContext(lastMessage.content, userId);

        if (!context) {
            return new Response(JSON.stringify({ 
                content: "I couldn't find any relevant information in your uploaded documents.",
                sources: []
            }));
        }

        // 🧠 UPDATED SYSTEM PROMPT FOR DETAILED SUMMARIES
        const result = await streamText({
            model: openai('gpt-4-turbo'),
            system: `You are an expert Research Analyst and AI Assistant. 
            
            Your goal is to provide a COMPREHENSIVE and DETAILED answer based on the context provided.
            
            GUIDELINES:
            1. **Be Verbose:** Do not give short summaries. Explain the "who, what, when, where, and how".
            2. **Analyze Data:** If the context contains data rows (e.g., financial transactions, logs), do not just summarize them. List specific examples, calculate totals if possible, and identify patterns.
            3. **Synthesize:** If multiple documents are provided, combine the information into a cohesive narrative.
            4. **Structure:** Use bullet points, bold text, and clear paragraphs to organize the information.
            
            CONTEXT:
            ${context}`,
            messages: messages,
        });

        const stream = result.textStream;
        const encoder = new TextEncoder();
        
        const customStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        controller.enqueue(encoder.encode(chunk));
                    }
                    const sourcesMarker = `\n\n__SOURCES__:${JSON.stringify(sources)}`;
                    controller.enqueue(encoder.encode(sourcesMarker));
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            }
        });

        return new Response(customStream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
        
    } catch (error) {
        console.error('Chat API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
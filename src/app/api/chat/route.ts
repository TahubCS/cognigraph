import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { chatRateLimiter } from '@/lib/rate-limit';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

async function searchContext(query: string, userId: string) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Create embedding using OpenAI directly for vector search
        const OpenAI = (await import('openai')).default;
        const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const embeddingResponse = await openaiClient.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
        });
        const vector = JSON.stringify(embeddingResponse.data[0].embedding);

        const result = await client.query(`
            SELECT 
                e.content,
                d.filename,
                1 - (e.embedding <=> $1) as similarity
            FROM embeddings e
            JOIN documents d ON e.document_id = d.id
            WHERE d.user_id = $2 
              AND 1 - (e.embedding <=> $1) > 0.01
            ORDER BY e.embedding <=> $1
            LIMIT 5;
        `, [vector, userId]);

        console.log(`🔍 Found ${result.rows.length} relevant chunks for user ${userId}`);

        // Return both context and sources
        const context = result.rows.map(row => row.content).join('\n\n');
        const sources = result.rows.map((row, idx) => ({
            id: idx + 1,
            filename: row.filename,
            similarity: (row.similarity * 100).toFixed(1),
            preview: row.content.substring(0, 150) + '...'
        }));

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
        
        if (!userId) {
            return new Response('Unauthorized', { status: 401 });
        }

        // Rate Limiting Check
        const { success: rateLimitSuccess, limit, reset, remaining } = await chatRateLimiter.limit(userId);
        
        if (!rateLimitSuccess) {
            const waitSeconds = Math.ceil((reset - Date.now()) / 1000);
            return new Response(
                JSON.stringify({ 
                    error: `Rate limit exceeded. You can send ${remaining}/${limit} more messages. Try again in ${waitSeconds} seconds.` 
                }), 
                { 
                    status: 429,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        console.log(`⏱️ Rate limit: ${remaining}/${limit} messages remaining for user ${userId}`);

        // Get the last user message
        const lastMessage = messages[messages.length - 1];
        const userQuestion = lastMessage.content;

        // Search for relevant context
        const { context, sources } = await searchContext(userQuestion, userId);

        if (!context) {
            console.log("⚠️ No context found for this user.");
            return new Response(
                JSON.stringify({ 
                    content: "I couldn't find any relevant information in your uploaded documents.",
                    sources: []
                }),
                { 
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Stream the AI response
        const result = await streamText({
            model: openai('gpt-4-turbo'),
            system: `You are a helpful AI assistant. You must answer the user's question strictly based on the provided Context below.
            
            CONTEXT:
            ${context}
            
            When referencing information, mention which document it came from when relevant.`,
            messages: messages,
        });

        // Get the text stream
        const stream = result.textStream;
        
        // Create a custom stream that appends sources at the end
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            async start(controller) {
                try {
                    // Stream all the AI response text
                    for await (const chunk of stream) {
                        controller.enqueue(encoder.encode(chunk));
                    }
                    
                    // Append sources metadata at the end as a special marker
                    const sourcesMarker = `\n\n__SOURCES__:${JSON.stringify(sources)}`;
                    controller.enqueue(encoder.encode(sourcesMarker));
                    
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            }
        });

        return new Response(customStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            }
        });
        
    } catch (error) {
        console.error('Chat API error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
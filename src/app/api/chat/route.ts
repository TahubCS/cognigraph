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
        const context = await searchContext(userQuestion, userId);

        if (!context) {
            console.log("⚠️ No context found for this user.");
            return new Response(
                JSON.stringify({ 
                    content: "I couldn't find any relevant information in your uploaded documents." 
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
            ${context}`,
            messages: messages,
        });

        return result.toTextStreamResponse();
        
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
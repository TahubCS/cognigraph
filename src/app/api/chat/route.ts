import { openai } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai'; 
import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';
import { chatRateLimiter } from '@/lib/rate-limit';
import { getUserSettings } from '@/actions/user';

export const maxDuration = 30;

// ... (Keep EXPERT_PERSONAS object exactly as it is) ...
const EXPERT_PERSONAS: Record<string, string> = {
    legal: `You are a Senior Legal Counsel. 
            - Focus on liability, compliance, clauses, and effective dates. 
            - Cite specific sections of the text.
            - Use professional legal terminology.`,
    
    financial: `You are a Wall Street Financial Analyst. 
            - Focus on margins, EBITDA, risks, and year-over-year growth.
            - Be concise and data-driven.
            - Highlight any missing financial data points.`,
    
    medical: `You are a Chief Medical Officer. 
            - Focus on clinical accuracy, contraindications, and dosages.
            - Do not hallucinate medical advice; strictly use the provided context.`,
    
    engineering: `You are a Senior Staff Software Engineer. 
            - Focus on architecture, scalability, edge cases, and security.
            - When discussing code, look for bugs, race conditions, or optimization opportunities.
            - Explain *why* a solution is better.`,
    
    sales: `You are a Sales Operations Manager.
            - Focus on customer pain points, value propositions, and competitor analysis.
            - Draft responses that are persuasive and action-oriented.`,
    
    regulatory: `You are a Compliance Officer.
            - Focus on violations, standards (FDA, ISO, GDPR), and audit trails.
            - Flag non-compliant language immediately.`,
    
    journalism: `You are an Investigative Journalist.
            - Focus on the 'Who, What, Where, When'. 
            - Fact-check every claim against the context.
            - Maintain a neutral, objective tone.`,
            
    hr: `You are a Human Resources Director.
            - Focus on policy alignment, employee benefits, and culture.
            - Ensure answers are empathetic but policy-compliant.`,

    general: `You are an expert Research Analyst.
            - Provide comprehensive and detailed answers.
            - Synthesize information from multiple sources.`
};

async function searchContext(query: string, userId: string) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // 1. Vector Search (Finds RELEVANT content)
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
              AND 1 - (e.embedding <=> $1) > 0.1
            ORDER BY e.embedding <=> $1
            LIMIT 10;
        `, [vector, userId]);

        // 2. Metadata Search (Finds ALL filenames) - NEW! 🚀
        const filesResult = await client.query(`
            SELECT filename, status 
            FROM documents 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [userId]);

        const allFiles = filesResult.rows.map(f => f.filename);

        const context = result.rows.map(row => `SOURCE: ${row.filename}\n${row.content}`).join('\n\n---\n\n');
        
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

        return { context, sources, allFiles };

    } catch (error) {
        console.error("Search failed:", error);
        return { context: '', sources: [], allFiles: [] };
    } finally {
        await client.end();
    }
}

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const { userId } = await auth();
        
        if (!userId) return new Response('Unauthorized', { status: 401 });

        // Rate Limit Check
        const { success: rateLimitSuccess, limit, reset } = await chatRateLimiter.limit(userId);
        if (!rateLimitSuccess) {
            const waitSeconds = Math.ceil((reset - Date.now()) / 1000);
            return new Response(JSON.stringify({ 
                error: `Rate limit of ${limit} requests exceeded. Try again in ${waitSeconds}s.` 
            }), { status: 429 });
        }

        const settings = await getUserSettings();
        const activeMode = settings.activeMode || 'general';
        const systemPersona = EXPERT_PERSONAS[activeMode] || EXPERT_PERSONAS['general'];

        const lastMessage = messages[messages.length - 1];
        let searchQuery = lastMessage.content;

        // --- 🧠 CHAT MEMORY: Query Synthesis ---
        if (messages.length > 1) {
            try {
                const { text: synthesizedQuery } = await generateText({
                    model: openai('gpt-4o-mini'), 
                    system: `You are a search query optimizer.
                    1. Rewrite the LAST user message into a standalone search query by resolving pronouns (e.g. "it", "that file") using the history.
                    2. If the user's message is purely conversational (e.g. "thanks", "hello"), return it as is.
                    3. DO NOT answer the question. ONLY return the query string.`,
                    messages: messages,
                });
                
                console.log(`🔍 Original: "${lastMessage.content}" -> Synthesized: "${synthesizedQuery}"`);
                searchQuery = synthesizedQuery;
            } catch (err) {
                console.warn("Query synthesis failed, falling back to original query", err);
            }
        }

        // --- FETCH CONTEXT + ALL FILES ---
        const { context, sources, allFiles } = await searchContext(searchQuery, userId);

        const result = await streamText({
            model: openai('gpt-4-turbo'),
            system: `${systemPersona}
            
            CORE RESPONSIBILITIES:
            1. Answer primarily based on the provided CONTEXT.
            2. Cite source filenames in your answer (e.g. [Filename.pdf]).
            3. If the user asks about the chat history, use the Conversation History.
            
            📂 AVAILABLE DOCUMENTS (User's Workspace):
            ${allFiles.map(f => `- ${f}`).join('\n')}
            
            INSTRUCTION:
            - If the user asks "What files do I have?", list the "AVAILABLE DOCUMENTS" above.
            - If the user asks about a specific file from that list but it is NOT in the CONTEXT below, explain that you see the file exists but no relevant content chunks were retrieved for this specific query.
            
            STYLE GUIDELINES:
            - CHECK THE CONVERSATION HISTORY for user preferences (e.g. "be concise").
            
            CONTEXT:
            ${context || "No specific content chunks found matching this query."}`,
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
                    if (sources.length > 0) {
                        const sourcesMarker = `\n\n__SOURCES__:${JSON.stringify(sources)}`;
                        controller.enqueue(encoder.encode(sourcesMarker));
                    }
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
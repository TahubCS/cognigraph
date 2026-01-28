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

        // 1. Vector Search (Content)
        const OpenAI = (await import('openai')).default;
        const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const embeddingResponse = await openaiClient.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
        });
        const vector = JSON.stringify(embeddingResponse.data[0].embedding);

        const contentResult = await client.query(`
            SELECT 
                e.content,
                d.filename,
                1 - (e.embedding <=> $1) as similarity
            FROM embeddings e
            JOIN documents d ON e.document_id = d.id
            WHERE d.user_id = $2 
              AND 1 - (e.embedding <=> $1) > 0.1
            ORDER BY e.embedding <=> $1
            LIMIT 8;
        `, [vector, userId]);

        // 2. Metadata Search (Files + Time) - 🚀 UPDATED
        // Now fetching 'created_at' so the AI knows WHEN files were added
        const filesResult = await client.query(`
            SELECT filename, status, created_at 
            FROM documents 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [userId]);
        
        const allFiles = filesResult.rows.map(f => 
            `${f.filename} (Uploaded: ${new Date(f.created_at).toLocaleDateString()})`
        );

        // 3. Graph Search (Specific Relationships)
        const graphResult = await client.query(`
            SELECT 
                n.label as source, 
                n.type as source_type,
                e.relationship,
                n2.label as target,
                n2.type as target_type
            FROM nodes n
            JOIN edges e ON e.source_node_id = n.id
            JOIN nodes n2 ON e.target_node_id = n2.id
            JOIN documents d ON n.document_id = d.id
            WHERE d.user_id = $2
            AND (
                n.label ILIKE '%' || $1 || '%' 
                OR n2.label ILIKE '%' || $1 || '%'
            )
            LIMIT 10;
        `, [query, userId]);

        const graphContext = graphResult.rows.map(row => 
            `RELATIONSHIP: "${row.source}" (${row.source_type}) -> [${row.relationship}] -> "${row.target}" (${row.target_type})`
        ).join('\n');

        // 4. "Main Characters" Search (Global Context) - 🚀 NEW!
        // Finds the most connected nodes in the entire workspace to give the AI "Common Sense" about the project
        const topEntitiesResult = await client.query(`
            SELECT n.label, n.type, COUNT(e.id) as connection_count
            FROM nodes n
            JOIN documents d ON n.document_id = d.id
            LEFT JOIN edges e ON e.source_node_id = n.id OR e.target_node_id = n.id
            WHERE d.user_id = $1
            GROUP BY n.label, n.type
            ORDER BY connection_count DESC
            LIMIT 8;
        `, [userId]);
        
        const keyEntities = topEntitiesResult.rows.map(r => 
            `${r.label} (${r.type}) - ${r.connection_count} connections`
        ).join(', ');

        // Format Text Context
        const context = contentResult.rows.map(row => `SOURCE: ${row.filename}\n${row.content}`).join('\n\n---\n\n');
        
        // Sources for citation
        const uniqueSourcesMap = new Map();
        contentResult.rows.forEach((row) => {
            if (!uniqueSourcesMap.has(row.filename)) {
                uniqueSourcesMap.set(row.filename, {
                    filename: row.filename,
                    similarity: (row.similarity * 100).toFixed(1),
                    preview: row.content.substring(0, 100).replace(/\n/g, ' ') + '...'
                });
            }
        });
        const sources = Array.from(uniqueSourcesMap.values());

        return { context, sources, allFiles, graphContext, keyEntities };

    } catch (error) {
        console.error("Search failed:", error);
        return { context: '', sources: [], allFiles: [], graphContext: '', keyEntities: '' };
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
        const recentMessages = messages.slice(-10);

        const lastMessage = messages[messages.length - 1];
        let searchQuery = lastMessage.content;

        // --- 🧠 CHAT MEMORY: Query Synthesis ---
        if (messages.length > 1) {
            try {
                const { text: synthesizedQuery } = await generateText({
                    model: openai('gpt-4o-mini'), 
                    system: `You are a search query optimizer.
                    1. Rewrite the LAST user message into a standalone search query by resolving pronouns (e.g. "it", "that file") using the history.
                    2. If the user's message is purely conversational, return it as is.
                    3. DO NOT answer the question. ONLY return the query string.`,
                    messages: recentMessages,
                });
                
                console.log(`🔍 Original: "${lastMessage.content}" -> Synthesized: "${synthesizedQuery}"`);
                searchQuery = synthesizedQuery;
            } catch (err) {
                console.warn("Query synthesis failed, falling back to original query", err);
            }
        }

        // --- FETCH FULL CONTEXT ---
        const { context, sources, allFiles, graphContext, keyEntities } = await searchContext(searchQuery, userId);

        const result = await streamText({
            model: openai('gpt-4-turbo'),
            system: `${systemPersona}
            
            CORE RESPONSIBILITIES:
            1. Answer primarily based on the provided CONTEXT (Text & Graph).
            2. Cite source filenames in your answer (e.g. [Filename.pdf]).
            3. Use the KNOWLEDGE GRAPH section to explain relationships.
            
            📂 AVAILABLE DOCUMENTS (User's Workspace):
            ${allFiles.length > 0 ? allFiles.map(f => `- ${f}`).join('\n') : "No documents uploaded yet."}

            🏆 KEY CONCEPTS (Most Connected Entities):
            ${keyEntities || "No global graph data available."}

            🔗 SPECIFIC CONNECTIONS (Query-Related):
            ${graphContext || "No direct entity relationships found for this query."}
            
            TEXT CONTEXT:
            ${context || "No specific content chunks found matching this query."}
            
            STYLE GUIDELINES:
            - If the user asks "What is this workspace about?", use the "KEY CONCEPTS" section.
            - If the user asks "What did I upload?", use the "AVAILABLE DOCUMENTS" section (note the dates).
            - CHECK THE CONVERSATION HISTORY for user preferences (e.g. "be concise").`,
            messages: recentMessages,
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
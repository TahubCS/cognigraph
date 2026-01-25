import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Ensure this matches your .env.local (Port 5433)
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await client.connect();
    console.log("🔌 Connected to AI Database...");

    // 1. Enable UUIDs
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // 2. Enable Vector Extension (The AI Magic)
    // This allows the DB to understand semantic similarity
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');

    // 3. Documents Table (Metadata)
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) NOT NULL,
        file_key VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Embeddings Table (The "Knowledge")
    // This is where we store the broken-down chunks of your PDF
    await client.query(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding vector(1536)  -- 1536 dimensions (Standard for OpenAI)
      );
    `);

    // 5. Index for Speed (HNSW)
    // Makes searching 1 million vectors take milliseconds
    await client.query(`
      CREATE INDEX IF NOT EXISTS embedding_hnsw_idx 
      ON embeddings USING hnsw (embedding vector_cosine_ops);
    `);

    // 5. Nodes Table (The dots)
    await client.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'ENTITY',
        UNIQUE(document_id, label)  -- Prevent duplicate nodes per doc
      );
    `);

    // 6. Edges Table (The lines)
    await client.query(`
      CREATE TABLE IF NOT EXISTS edges (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        source_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
        target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
        relationship VARCHAR(255) NOT NULL
      );
    `);

    console.log("✅ Graph Tables initialized successfully");
    console.log("✅ AI Database initialized successfully");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  } finally {
    await client.end();
  }
}

main();
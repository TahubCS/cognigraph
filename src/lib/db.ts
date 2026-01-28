import { Pool } from 'pg';

// Use a global variable to prevent multiple pools in development hot-reloading
const globalForDb = global as unknown as { db: Pool };

export const db = globalForDb.db || new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Limit max connections per container
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;
'use server';

import { Client } from 'pg';
import { auth } from '@clerk/nextjs/server';

export async function getUserSettings() {
    const { userId } = await auth();
    if (!userId) return { activeMode: 'general' };

    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();
        
        // Try to get existing settings
        const result = await client.query(
            'SELECT active_mode FROM user_settings WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length > 0) {
            return { activeMode: result.rows[0].active_mode };
        }
        
        // Default to 'general' if they've never chosen one
        return { activeMode: 'general' };

    } catch (error) {
        console.error('Error fetching user settings:', error);
        return { activeMode: 'general' };
    } finally {
        await client.end();
    }
}

export async function updateUserMode(mode: string) {
    const { userId } = await auth();
    if (!userId) return { success: false };

    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();
        
        await client.query(`
            INSERT INTO user_settings (user_id, active_mode) 
            VALUES ($1, $2)
            ON CONFLICT (user_id) 
            DO UPDATE SET active_mode = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, mode]);

        return { success: true };

    } catch (error) {
        console.error('Error updating user mode:', error);
        return { success: false };
    } finally {
        await client.end();
    }
}
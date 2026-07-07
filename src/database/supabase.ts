import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any, 'public', any> | null = null;

export function getSupabase(): SupabaseClient<any, 'public', any> {
  if (!client) {
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. See .env.example');
    }
    client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'deelo' },
    });
  }
  return client;
}

export async function testConnection(): Promise<void> {
  const { error } = await getSupabase().from('guilds').select('id').limit(1);
  if (error) throw new Error(`Supabase connection failed: ${error.message}`);
}

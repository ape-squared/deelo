import fs from 'node:fs';
import path from 'node:path';

const DEDUP_DIR = path.join(__dirname, '..', '.cmd-dedup');
const TTL_MS = 60_000;
const CLEANUP_EVERY = 200;
let claimCount = 0;

let supabaseDedupEnabled: boolean | null = null;

async function tryClaimMessageSupabase(messageId: string): Promise<boolean | null> {
  try {
    const { getSupabase } = await import('../database/supabase');
    const db = getSupabase();

    const { error } = await db.from('bot_message_dedup').insert({ message_id: messageId });
    if (!error) {
      claimCount++;
      if (claimCount % CLEANUP_EVERY === 0) {
        const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
        void db.from('bot_message_dedup').delete().lt('claimed_at', cutoff).then(() => {});
      }
      return true;
    }

    if (error.code === '23505') return false;

    const missing =
      error.message.includes('does not exist') ||
      error.message.includes('bot_message_dedup') ||
      error.message.includes('schema cache');
    if (missing) {
      supabaseDedupEnabled = false;
      return null;
    }

    console.warn('[dedup] Supabase claim failed:', error.message);
    return null;
  } catch (err) {
    console.warn('[dedup] Supabase unavailable:', err instanceof Error ? err.message : err);
    return null;
  }
}

function tryClaimMessageFile(messageId: string): boolean {
  try {
    fs.mkdirSync(DEDUP_DIR, { recursive: true });
    const file = path.join(DEDUP_DIR, messageId);
    const fd = fs.openSync(file, 'wx');
    fs.closeSync(fd);
    setTimeout(() => {
      fs.unlink(file, () => {});
    }, TTL_MS);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw err;
  }
}

/** Claim a message so only one bot instance handles it (works across Docker replicas / deploys). */
export async function tryClaimMessage(messageId: string): Promise<boolean> {
  if (supabaseDedupEnabled !== false) {
    const remote = await tryClaimMessageSupabase(messageId);
    if (remote !== null) {
      supabaseDedupEnabled = true;
      return remote;
    }
  }

  return tryClaimMessageFile(messageId);
}

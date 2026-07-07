import fs from 'node:fs';
import path from 'node:path';

const DEDUP_DIR = path.join(__dirname, '..', '.cmd-dedup');
const TTL_MS = 60_000;
const CLEANUP_EVERY = 100;

/** In-process guard — blocks concurrent handleMessage for the same id before any await. */
const inProcessClaims = new Set<string>();

let claimCount = 0;
let siteSettingsDedupEnabled: boolean | null = null;

function releaseInProcess(messageId: string): void {
  setTimeout(() => inProcessClaims.delete(messageId), TTL_MS);
}

async function tryClaimMessageSiteSettings(messageId: string): Promise<boolean | null> {
  try {
    const { getSupabase } = await import('../database/supabase');
    const db = getSupabase();
    const key = `cmd_dedup:${messageId}`;

    const { error } = await db.from('site_settings').insert({
      key,
      value: { claimed_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });

    if (!error) {
      claimCount++;
      if (claimCount % CLEANUP_EVERY === 0) {
        const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
        void db
          .from('site_settings')
          .delete()
          .like('key', 'cmd_dedup:%')
          .lt('updated_at', cutoff)
          .then(() => {});
      }
      return true;
    }

    if (error.code === '23505') return false;

    const missing =
      error.message.includes('does not exist') ||
      error.message.includes('site_settings') ||
      error.message.includes('schema cache');
    if (missing) {
      siteSettingsDedupEnabled = false;
      return null;
    }

    console.warn('[dedup] site_settings claim failed:', error.message);
    return null;
  } catch (err) {
    console.warn('[dedup] site_settings unavailable:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function tryClaimMessageDedicatedTable(messageId: string): Promise<boolean | null> {
  try {
    const { getSupabase } = await import('../database/supabase');
    const { error } = await getSupabase().from('bot_message_dedup').insert({ message_id: messageId });
    if (!error) return true;
    if (error.code === '23505') return false;
    if (error.message.includes('does not exist') || error.message.includes('bot_message_dedup')) return null;
    return null;
  } catch {
    return null;
  }
}

function tryClaimMessageFile(messageId: string): boolean {
  try {
    fs.mkdirSync(DEDUP_DIR, { recursive: true });
    const file = path.join(DEDUP_DIR, messageId);
    const fd = fs.openSync(file, 'wx');
    fs.closeSync(fd);
    setTimeout(() => fs.unlink(file, () => {}), TTL_MS);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw err;
  }
}

/**
 * Claim a message so only one bot instance handles it.
 * Uses site_settings (no migration) → bot_message_dedup → local file fallback.
 */
export async function tryClaimMessage(messageId: string): Promise<boolean> {
  if (inProcessClaims.has(messageId)) {
    console.warn('[dedup] blocked in-process duplicate:', messageId);
    return false;
  }
  inProcessClaims.add(messageId);

  try {
    if (siteSettingsDedupEnabled !== false) {
      const site = await tryClaimMessageSiteSettings(messageId);
      if (site !== null) {
        siteSettingsDedupEnabled = true;
        if (!site) console.warn('[dedup] blocked cross-instance duplicate (site_settings):', messageId);
        return site;
      }
    }

    const dedicated = await tryClaimMessageDedicatedTable(messageId);
    if (dedicated !== null) {
      if (!dedicated) console.warn('[dedup] blocked cross-instance duplicate (bot_message_dedup):', messageId);
      return dedicated;
    }

    const file = tryClaimMessageFile(messageId);
    if (!file) console.warn('[dedup] blocked file duplicate:', messageId);
    return file;
  } catch (err) {
    inProcessClaims.delete(messageId);
    throw err;
  } finally {
    releaseInProcess(messageId);
  }
}

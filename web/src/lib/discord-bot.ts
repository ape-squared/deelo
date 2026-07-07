import { DISCORD_API } from '@/lib/session';

let cache: { ids: Set<string>; expires: number } | null = null;
const CACHE_MS = 60_000;

/** Guild IDs where the Deelo bot is actually a member (not just DB row). */
export async function getBotGuildIds(): Promise<Set<string>> {
  if (cache && Date.now() < cache.expires) return cache.ids;

  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  if (!token) return new Set();

  const ids = new Set<string>();
  let after: string | undefined;

  try {
    for (let page = 0; page < 10; page++) {
      const url = new URL(`${DISCORD_API}/users/@me/guilds`);
      url.searchParams.set('limit', '200');
      if (after) url.searchParams.set('after', after);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bot ${token}` },
        next: { revalidate: 60 },
      });

      if (!res.ok) break;

      const batch = (await res.json()) as Array<{ id: string }>;
      if (!batch.length) break;

      for (const g of batch) ids.add(g.id);
      after = batch[batch.length - 1].id;
      if (batch.length < 200) break;
    }
  } catch (err) {
    console.error('getBotGuildIds:', err);
  }

  cache = { ids, expires: Date.now() + CACHE_MS };
  return ids;
}

export async function isBotInGuild(guildId: string): Promise<boolean> {
  const ids = await getBotGuildIds();
  return ids.has(guildId);
}

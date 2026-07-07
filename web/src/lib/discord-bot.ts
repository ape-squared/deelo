import { DISCORD_API } from '@/lib/discord-api';

let cache: { ids: Set<string>; expires: number } | null = null;
const CACHE_MS = 60_000;

export function getDiscordBotToken(): string | undefined {
  const bot = process.env.DISCORD_BOT_TOKEN?.trim();
  const legacy = process.env.DISCORD_TOKEN?.trim();
  return bot || legacy || undefined;
}

/** Guild IDs where the Deelo bot is a member (Discord API). */
export async function getBotGuildIds(): Promise<Set<string>> {
  if (cache && Date.now() < cache.expires) return cache.ids;

  const token = getDiscordBotToken();
  if (!token) {
    console.warn('[discord-bot] No DISCORD_BOT_TOKEN or DISCORD_TOKEN — cannot check bot guild membership');
    return new Set();
  }

  const ids = new Set<string>();
  let after: string | undefined;
  let ok = true;

  try {
    for (let page = 0; page < 10; page++) {
      const url = new URL(`${DISCORD_API}/users/@me/guilds`);
      url.searchParams.set('limit', '200');
      if (after) url.searchParams.set('after', after);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bot ${token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        ok = false;
        console.error('[discord-bot] GET /users/@me/guilds failed:', res.status, await res.text().catch(() => ''));
        break;
      }

      const batch = (await res.json()) as Array<{ id: string }>;
      if (!batch.length) break;

      for (const g of batch) ids.add(g.id);
      after = batch[batch.length - 1].id;
      if (batch.length < 200) break;
    }
  } catch (err) {
    ok = false;
    console.error('[discord-bot] getBotGuildIds:', err);
  }

  if (ok && ids.size > 0) {
    cache = { ids, expires: Date.now() + CACHE_MS };
  }

  return ids;
}

/** Direct probe — works when guild list is stale or paginated oddly. */
export async function probeBotInGuild(guildId: string): Promise<boolean> {
  const token = getDiscordBotToken();
  if (!token) return false;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resolve bot presence for dashboard guilds: list API + per-guild probe for misses.
 */
export async function resolveBotPresenceForGuilds(guildIds: string[]): Promise<Set<string>> {
  const present = await getBotGuildIds();

  const token = getDiscordBotToken();
  if (!token || guildIds.length === 0) return present;

  const toProbe = guildIds.filter((id) => !present.has(id));
  if (toProbe.length === 0) return present;

  const cap = 40;
  const batch = toProbe.slice(0, cap);
  const probes = await Promise.all(
    batch.map(async (id) => ({ id, ok: await probeBotInGuild(id) })),
  );

  for (const { id, ok } of probes) {
    if (ok) present.add(id);
  }

  return present;
}

export async function isBotInGuild(guildId: string): Promise<boolean> {
  const ids = await getBotGuildIds();
  if (ids.has(guildId)) return true;
  return probeBotInGuild(guildId);
}

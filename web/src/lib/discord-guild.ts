import { DISCORD_API } from '@/lib/discord-api';
import type { GuildChannel } from '@/lib/discord-channels';

export type { ChannelKind, GuildChannel } from '@/lib/discord-channels';
export { CHANNEL_TYPES, channelOptions, filterChannelsByKind } from '@/lib/discord-channels';

const cache = new Map<string, { channels: GuildChannel[]; expires: number }>();
const CACHE_MS = 60_000;

/** Server-only: fetch guild channels with the bot token. */
export async function fetchGuildChannels(guildId: string): Promise<GuildChannel[]> {
  const cached = cache.get(guildId);
  if (cached && Date.now() < cached.expires) return cached.channels;

  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  if (!token) throw new Error('Bot token is not configured');

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Discord returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }

  const raw = (await res.json()) as Array<{
    id: string;
    name: string;
    type: number;
    parent_id?: string | null;
    position?: number;
  }>;

  const channels: GuildChannel[] = raw.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    parent_id: c.parent_id ?? null,
    position: c.position ?? 0,
  }));

  cache.set(guildId, { channels, expires: Date.now() + CACHE_MS });
  return channels;
}

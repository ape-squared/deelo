import { DISCORD_API } from '@/lib/discord-api';
import type { GuildChannel } from '@/lib/discord-channels';
import type { GuildRole } from '@/lib/discord-roles';

export type { ChannelKind, GuildChannel } from '@/lib/discord-channels';
export type { GuildRole } from '@/lib/discord-roles';
export {
  CHANNEL_TYPES,
  MESSAGE_CHANNEL_TYPES,
  channelOptions,
  filterChannelsByKind,
  findGuildChannelByName,
  normalizeChannelSlug,
} from '@/lib/discord-channels';

const cache = new Map<string, { channels: GuildChannel[]; expires: number }>();
const rolesCache = new Map<string, { roles: GuildRole[]; expires: number }>();
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
    type: Number(c.type),
    parent_id: c.parent_id ?? null,
    position: c.position ?? 0,
  }));

  cache.set(guildId, { channels, expires: Date.now() + CACHE_MS });
  return channels;
}

/** Server-only: fetch guild roles with the bot token. */
export async function fetchGuildRoles(guildId: string): Promise<GuildRole[]> {
  const cached = rolesCache.get(guildId);
  if (cached && Date.now() < cached.expires) return cached.roles;

  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  if (!token) throw new Error('Bot token is not configured');

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
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
    color: number;
    position: number;
    managed: boolean;
  }>;

  const roles: GuildRole[] = raw
    .filter((r) => r.id !== guildId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      position: r.position,
      managed: r.managed,
    }));

  rolesCache.set(guildId, { roles, expires: Date.now() + CACHE_MS });
  return roles;
}

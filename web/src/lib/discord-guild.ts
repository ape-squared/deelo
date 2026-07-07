import { DISCORD_API } from '@/lib/session';

/** Discord API channel types we care about */
export const CHANNEL_TYPES = {
  text: [0, 5, 15] as const,
  voice: [2, 13] as const,
  category: [4] as const,
} as const;

export type ChannelKind = keyof typeof CHANNEL_TYPES;

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
  position: number;
}

const cache = new Map<string, { channels: GuildChannel[]; expires: number }>();
const CACHE_MS = 60_000;

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

export function filterChannelsByKind(channels: GuildChannel[], kinds: ChannelKind[]): GuildChannel[] {
  const allowed = new Set<number>(kinds.flatMap((k) => [...CHANNEL_TYPES[k]]));
  return channels.filter((c) => allowed.has(c.type));
}

export function channelOptions(
  channels: GuildChannel[],
  kinds: ChannelKind[],
): { value: string; label: string }[] {
  const categories = new Map(
    channels.filter((c) => c.type === 4).map((c) => [c.id, c.name]),
  );

  const filtered = filterChannelsByKind(channels, kinds).sort((a, b) => {
    const catA = a.parent_id ? categories.get(a.parent_id) ?? '' : '\uffff';
    const catB = b.parent_id ? categories.get(b.parent_id) ?? '' : '\uffff';
    if (catA !== catB) return catA.localeCompare(catB);
    if (a.position !== b.position) return a.position - b.position;
    return a.name.localeCompare(b.name);
  });

  return filtered.map((c) => {
    const prefix = channelKindPrefix(c.type);
    const parent = c.parent_id ? categories.get(c.parent_id) : null;
    const label = parent ? `${parent} / ${prefix}${c.name}` : `${prefix}${c.name}`;
    return { value: c.id, label };
  });
}

function channelKindPrefix(type: number): string {
  if (type === 2 || type === 13) return '🔊 ';
  if (type === 4) return '📁 ';
  if (type === 15) return '💬 ';
  return '#';
}

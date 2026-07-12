/** Client-safe Discord channel types and formatting (no server-only imports). */

/** Channels where bots can post messages (embeds, panels, etc.). */
export const MESSAGE_CHANNEL_TYPES = [0, 5] as const;

export const CHANNEL_TYPES = {
  /** Text + announcement channels (postable). Forum excluded — requires thread creation. */
  text: [...MESSAGE_CHANNEL_TYPES] as const,
  voice: [2, 13] as const,
  category: [4] as const,
  /** Forum channels — pick only when explicitly needed (e.g. ticket category). */
  forum: [15] as const,
} as const;

export type ChannelKind = keyof typeof CHANNEL_TYPES;

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
  position: number;
}

export function normalizeChannelSlug(name: string): string {
  return name
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
}

export function filterChannelsByKind(channels: GuildChannel[], kinds: ChannelKind[]): GuildChannel[] {
  const allowed = new Set<number>(kinds.flatMap((k) => [...CHANNEL_TYPES[k]]));
  return channels.filter((c) => allowed.has(Number(c.type)));
}

export function findGuildChannelByName(
  channels: GuildChannel[],
  name: string,
  types: readonly number[] = MESSAGE_CHANNEL_TYPES,
): GuildChannel | undefined {
  const slug = normalizeChannelSlug(name);
  if (!slug) return undefined;
  const allowed = new Set(types);
  return channels.find((c) => allowed.has(Number(c.type)) && normalizeChannelSlug(c.name) === slug);
}

export function channelOptions(
  channels: GuildChannel[],
  kinds: ChannelKind[],
): { value: string; label: string }[] {
  const categories = new Map(
    channels.filter((c) => Number(c.type) === 4).map((c) => [c.id, c.name]),
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
  const t = Number(type);
  if (t === 2 || t === 13) return '🔊 ';
  if (t === 4) return '📁 ';
  if (t === 5) return '📢 ';
  if (t === 15) return '💬 ';
  return '#';
}

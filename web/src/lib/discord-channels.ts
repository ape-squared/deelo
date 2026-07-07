/** Client-safe Discord channel types and formatting (no server-only imports). */

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

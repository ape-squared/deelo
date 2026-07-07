import type { Client, Guild, GuildChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import { getSupabase } from '../database/supabase';

interface CounterRow {
  id: number;
  guild_id: string;
  channel_id: string;
  type: string;
  format: string;
}

let counterTimer: ReturnType<typeof setInterval> | null = null;
let syncing = false;

export function computeCounterValue(guild: Guild, type: string): number {
  switch (type) {
    case 'bots':
      return guild.members.cache.filter((m) => m.user.bot).size;
    case 'channels':
      return guild.channels.cache.filter(
        (c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice,
      ).size;
    case 'members':
    default:
      return guild.memberCount ?? guild.members.cache.size;
  }
}

export function formatCounterName(format: string, count: number): string {
  const name = (format || '{count}').replace(/\{count\}/gi, count.toLocaleString());
  return name.slice(0, 100);
}

export async function updateGuildCounters(guild: Guild): Promise<void> {
  const { data: rows } = await getSupabase()
    .from('counters')
    .select('*')
    .eq('guild_id', guild.id);

  if (!rows?.length) return;

  for (const row of rows as CounterRow[]) {
    await applyCounter(guild, row);
  }
}

async function applyCounter(guild: Guild, row: CounterRow): Promise<void> {
  const channel = guild.channels.cache.get(row.channel_id) as GuildChannel | undefined;
  if (!channel || !('setName' in channel) || typeof channel.setName !== 'function') return;

  const count = computeCounterValue(guild, row.type);
  const nextName = formatCounterName(row.format, count);
  if (channel.name === nextName) return;

  try {
    await channel.setName(nextName, 'Deelo stat counter update');
  } catch (err) {
    console.warn(`[counters] rename failed guild=${guild.id} channel=${row.channel_id}:`, err);
  }
}

export async function syncCounterById(guild: Guild, counterId: number): Promise<void> {
  const { data: row } = await getSupabase()
    .from('counters')
    .select('*')
    .eq('id', counterId)
    .eq('guild_id', guild.id)
    .maybeSingle();

  if (row) await applyCounter(guild, row as CounterRow);
}

export function startCounterSyncLoop(client: Client): void {
  if (counterTimer) return;

  const tick = async () => {
    if (syncing) return;
    syncing = true;
    try {
      for (const [, guild] of client.guilds.cache) {
        await updateGuildCounters(guild).catch(() => {});
      }
    } finally {
      syncing = false;
    }
  };

  void tick();
  counterTimer = setInterval(() => void tick(), 5 * 60_000);
  console.log('[counters] Sync loop started (every 5m + on member/channel events)');
}

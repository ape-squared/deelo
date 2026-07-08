import type { Client, TextChannel } from 'discord.js';
import { getSupabase } from '../database/supabase';

const POLL_MS = 30_000;
const MAX_TIMERS_PER_GUILD = 50;

let timer: ReturnType<typeof setInterval> | null = null;
let processing = false;

export interface GuildTimerRow {
  id: number;
  guild_id: string;
  channel_id: string;
  creator_id: string;
  message: string;
  fires_at: string;
  repeat_ms: number | null;
  sent: boolean;
  created_at: string;
}

export function startTimerLoop(client: Client): void {
  if (timer) return;
  void processDueTimers(client);
  timer = setInterval(() => void processDueTimers(client), POLL_MS);
  console.log('[timers] Started (checks every 30s)');
}

export async function createGuildTimer(input: {
  guildId: string;
  channelId: string;
  creatorId: string;
  message: string;
  durationMs: number;
  repeatMs?: number | null;
}): Promise<GuildTimerRow> {
  const { count, error: countError } = await getSupabase()
    .from('guild_timers')
    .select('*', { count: 'exact', head: true })
    .eq('guild_id', input.guildId)
    .eq('sent', false);

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) >= MAX_TIMERS_PER_GUILD) {
    throw new Error(`This server already has ${MAX_TIMERS_PER_GUILD} active timers. Remove one first.`);
  }

  const firesAt = new Date(Date.now() + input.durationMs).toISOString();
  const { data, error } = await getSupabase()
    .from('guild_timers')
    .insert({
      guild_id: input.guildId,
      channel_id: input.channelId,
      creator_id: input.creatorId,
      message: input.message,
      fires_at: firesAt,
      repeat_ms: input.repeatMs ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as GuildTimerRow;
}

export async function listGuildTimers(guildId: string): Promise<GuildTimerRow[]> {
  const { data, error } = await getSupabase()
    .from('guild_timers')
    .select('*')
    .eq('guild_id', guildId)
    .eq('sent', false)
    .order('fires_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as GuildTimerRow[];
}

export async function getGuildTimer(guildId: string, id: number): Promise<GuildTimerRow | null> {
  const { data, error } = await getSupabase()
    .from('guild_timers')
    .select('*')
    .eq('guild_id', guildId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GuildTimerRow | null) ?? null;
}

export async function removeGuildTimer(guildId: string, id: number): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('guild_timers')
    .delete()
    .eq('guild_id', guildId)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

async function processDueTimers(client: Client): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    const now = new Date().toISOString();
    const { data, error } = await getSupabase()
      .from('guild_timers')
      .select('*')
      .eq('sent', false)
      .lte('fires_at', now)
      .order('fires_at')
      .limit(40);

    if (error || !data?.length) return;

    for (const row of data as GuildTimerRow[]) {
      try {
        await fireTimer(client, row);
      } catch (err) {
        console.warn(`[timers] id ${row.id} failed:`, err);
      }
    }
  } finally {
    processing = false;
  }
}

async function fireTimer(client: Client, row: GuildTimerRow): Promise<void> {
  const channel = await client.channels.fetch(row.channel_id).catch(() => null);
  if (channel?.isTextBased()) {
    await (channel as TextChannel).send(`⏰ ${row.message}`).catch(() => {});
  }

  if (row.repeat_ms && row.repeat_ms > 0) {
    const nextFire = new Date(Date.now() + row.repeat_ms).toISOString();
    await getSupabase()
      .from('guild_timers')
      .update({ fires_at: nextFire })
      .eq('id', row.id);
    return;
  }

  await getSupabase().from('guild_timers').update({ sent: true }).eq('id', row.id);
}

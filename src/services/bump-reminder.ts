import type { Client, Message, TextChannel } from 'discord.js';
import { getSupabase } from '../database/supabase';
import { getConfigValue, setExtraConfig } from '../extended/lib/guild-config';

/** DISBOARD bot — posts bump confirmations. */
export const DISBOARD_BOT_ID = '302050872383242240';

const CHECK_MS = 5 * 60_000;
const DEFAULT_INTERVAL_MS = 7_200_000;

let timer: ReturnType<typeof setInterval> | null = null;
let checking = false;

export function startBumpReminderLoop(client: Client): void {
  if (timer) return;
  void runBumpChecks(client);
  timer = setInterval(() => void runBumpChecks(client), CHECK_MS);
  console.log('[bump-reminder] Started (checks every 5m)');
}

export async function handleDisboardBumpMessage(message: Message): Promise<void> {
  if (!message.guild || message.author.id !== DISBOARD_BOT_ID) return;

  const text = [
    message.content,
    ...message.embeds.flatMap((e) => [e.title, e.description, e.footer?.text].filter(Boolean)),
  ].join(' ').toLowerCase();

  if (!text.includes('bump')) return;

  const guildId = message.guild.id;
  const now = Date.now();
  await setExtraConfig(guildId, 'bumpreminder.last_bump_at', now);
  await setExtraConfig(guildId, 'bumpreminder.last_reminder_at', 0);

  const thankyou = await getConfigValue<string | undefined>(guildId, 'bumpreminder.thankyou');
  if (thankyou && message.channel.isTextBased()) {
    await (message.channel as TextChannel).send({ content: thankyou }).catch(() => {});
  }
}

async function runBumpChecks(client: Client): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    const { data: guilds, error } = await getSupabase()
      .from('guilds')
      .select('id, bump_channel, bump_interval')
      .not('bump_channel', 'is', null);

    if (error || !guilds?.length) return;

    const now = Date.now();
    for (const guild of guilds) {
      try {
        await maybeSendReminder(client, guild.id, guild.bump_channel!, guild.bump_interval ?? DEFAULT_INTERVAL_MS, now);
      } catch (err) {
        console.warn(`[bump-reminder] guild ${guild.id} failed:`, err);
      }
    }
  } catch (err) {
    console.warn('[bump-reminder] cycle failed:', err);
  } finally {
    checking = false;
  }
}

async function maybeSendReminder(
  client: Client,
  guildId: string,
  channelId: string,
  intervalMs: number,
  now: number,
): Promise<void> {
  const lastBump = Number(await getConfigValue(guildId, 'bumpreminder.last_bump_at', 0)) || 0;
  const lastReminder = Number(await getConfigValue(guildId, 'bumpreminder.last_reminder_at', 0)) || 0;

  if (lastBump) {
    if (now - lastBump < intervalMs) return;
  } else {
    const enabledAt = Number(await getConfigValue(guildId, 'bumpreminder.enabled_at', 0)) || 0;
    if (!enabledAt || now - enabledAt < intervalMs) return;
  }

  if (lastReminder && now - lastReminder < intervalMs) return;

  const template = String(
    await getConfigValue(
      guildId,
      'bumpreminder.message',
      '⏰ Time to **/bump** the server on DISBOARD!',
    ),
  );

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  await (channel as TextChannel).send({ content: template }).catch(() => {});
  await setExtraConfig(guildId, 'bumpreminder.last_reminder_at', now);
}

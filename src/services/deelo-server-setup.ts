import { ChannelType, type Guild, type TextChannel } from 'discord.js';
import { getSupabase } from '../database/supabase';
import {
  DEFAULT_OFFICIAL_GUILD_ID,
  mergeOfficialDiscordEmbeds,
  officialEmbedsKey,
  type OfficialDiscordEmbedsSettings,
} from '../lib/official-server-embeds';
import { buildEmbedFromTemplate } from '../utils/embed-template';

export async function loadOfficialDiscordEmbeds(): Promise<OfficialDiscordEmbedsSettings> {
  const { data, error } = await getSupabase()
    .from('site_settings')
    .select('value')
    .eq('key', officialEmbedsKey())
    .maybeSingle();
  if (error) {
    console.warn('[deelo-setup] load embeds failed:', error.message);
    return mergeOfficialDiscordEmbeds(null);
  }
  return mergeOfficialDiscordEmbeds(data?.value);
}

export async function saveOfficialDiscordEmbeds(settings: OfficialDiscordEmbedsSettings): Promise<void> {
  const { error } = await getSupabase().from('site_settings').upsert({
    key: officialEmbedsKey(),
    value: settings,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export interface EmbedSyncLine {
  id: string;
  channel: string;
  ok: boolean;
  error?: string;
}

export async function syncOfficialEmbedsToGuild(guild: Guild): Promise<EmbedSyncLine[]> {
  const settings = await loadOfficialDiscordEmbeds();
  if (guild.id !== settings.guild_id && guild.id !== DEFAULT_OFFICIAL_GUILD_ID) {
    settings.guild_id = guild.id;
  }

  const lines: EmbedSyncLine[] = [];
  let changed = false;

  for (const entry of settings.channels) {
    const channel = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && c.name === entry.channel,
    ) as TextChannel | undefined;

    if (!channel) {
      lines.push({ id: entry.id, channel: entry.channel, ok: false, error: 'channel not found' });
      continue;
    }

    try {
      const embed = buildEmbedFromTemplate(entry.embed);
      const payload = {
        content: entry.content?.trim() || undefined,
        embeds: [embed],
      };

      let message = null;
      if (entry.message_id) {
        message = await channel.messages.fetch(entry.message_id).catch(() => null);
        if (message) {
          await message.edit(payload);
        }
      }

      if (!message) {
        message = await channel.send(payload);
        entry.message_id = message.id;
        changed = true;
      }

      lines.push({ id: entry.id, channel: entry.channel, ok: true });
    } catch (err) {
      lines.push({
        id: entry.id,
        channel: entry.channel,
        ok: false,
        error: err instanceof Error ? err.message : 'sync failed',
      });
    }
  }

  if (changed) {
    await saveOfficialDiscordEmbeds(settings).catch((err) => {
      console.warn('[deelo-setup] save message ids failed:', err);
    });
  }

  return lines;
}

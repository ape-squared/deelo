import { DISCORD_API } from '@/lib/discord-api';
import { requireDiscordBotToken } from '@/lib/discord-bot';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import type { EmbedTemplate } from '@/lib/embed-template';
import { templateToDiscordApi } from '@/lib/embed-template';
import { fetchGuildChannels } from '@/lib/discord-guild';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  mergeOfficialDiscordEmbeds,
  officialEmbedsKey,
  type OfficialChannelEmbed,
  type OfficialDiscordEmbedsSettings,
} from '@/lib/official-server-embeds';

function botHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  };
}

async function discordErrorDetail(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const json = JSON.parse(text) as { message?: string; code?: number };
    if (json.message) {
      return json.code ? `${json.message} (${json.code})` : json.message;
    }
  } catch {
    /* plain text */
  }
  return text.slice(0, 200);
}

export async function loadOfficialDiscordEmbeds(): Promise<OfficialDiscordEmbedsSettings> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('site_settings')
    .select('value')
    .eq('key', officialEmbedsKey())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return mergeOfficialDiscordEmbeds(data?.value);
}

export async function saveOfficialDiscordEmbeds(
  settings: OfficialDiscordEmbedsSettings,
  updatedBy?: string,
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from('site_settings').upsert({
    key: officialEmbedsKey(),
    value: settings,
    updated_at: new Date().toISOString(),
    ...(updatedBy ? { updated_by: updatedBy } : {}),
  });
  if (error) throw new Error(error.message);
}

export async function postOrUpdateChannelEmbed(
  channelId: string,
  entry: Pick<OfficialChannelEmbed, 'content' | 'embed' | 'message_id'>,
): Promise<string> {
  const token = requireDiscordBotToken();
  const body = {
    content: entry.content?.trim() || undefined,
    embeds: [templateToDiscordApi(entry.embed, 0x0047ff)],
  };

  if (entry.message_id) {
    const patchRes = await fetchWithTimeout(
      `${DISCORD_API}/channels/${channelId}/messages/${entry.message_id}`,
      {
        method: 'PATCH',
        headers: botHeaders(token),
        timeoutMs: 12_000,
        body: JSON.stringify(body),
      },
    );
    if (patchRes.ok) return entry.message_id;
    if (patchRes.status !== 404) {
      const detail = await discordErrorDetail(patchRes);
      throw new Error(`Failed to edit message (${patchRes.status})${detail ? `: ${detail}` : ''}`);
    }
  }

  const postRes = await fetchWithTimeout(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: botHeaders(token),
    timeoutMs: 12_000,
    body: JSON.stringify(body),
  });
  if (!postRes.ok) {
    const detail = await discordErrorDetail(postRes);
    throw new Error(`Failed to post message (${postRes.status})${detail ? `: ${detail}` : ''}`);
  }
  const data = (await postRes.json()) as { id: string };
  return data.id;
}

export interface OfficialEmbedSyncResult {
  id: string;
  channel: string;
  ok: boolean;
  message_id?: string;
  error?: string;
}

export async function syncOfficialDiscordEmbeds(
  settings: OfficialDiscordEmbedsSettings,
): Promise<{ settings: OfficialDiscordEmbedsSettings; results: OfficialEmbedSyncResult[] }> {
  const guildChannels = await fetchGuildChannels(settings.guild_id);
  const textByName = new Map(
    guildChannels.filter((c) => c.type === 0).map((c) => [c.name.toLowerCase(), c.id]),
  );

  const next = structuredClone(settings);
  const results: OfficialEmbedSyncResult[] = [];

  for (const entry of next.channels) {
    const channelId = textByName.get(entry.channel.toLowerCase());
    if (!channelId) {
      results.push({
        id: entry.id,
        channel: entry.channel,
        ok: false,
        error: `Channel #${entry.channel} not found`,
      });
      continue;
    }

    try {
      const messageId = await postOrUpdateChannelEmbed(channelId, entry);
      entry.message_id = messageId;
      results.push({ id: entry.id, channel: entry.channel, ok: true, message_id: messageId });
    } catch (err) {
      results.push({
        id: entry.id,
        channel: entry.channel,
        ok: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  }

  return { settings: next, results };
}

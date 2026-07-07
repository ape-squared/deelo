import { DISCORD_API } from '@/lib/discord-api';
import { getDiscordBotToken } from '@/lib/discord-bot';
import {
  BOT_APPEARANCE_KEYS,
  getBotAppearanceSnapshot,
  type BotAppearanceSnapshot,
} from '@/lib/bot-appearance';
import { templateToDiscordApi } from '@/lib/embed-template';
import type { PlanTier } from '@/lib/guild-settings';

export interface BotCustomizationSyncResult {
  nickname: { ok: boolean; error?: string };
  preview?: { ok: boolean; channelId?: string; error?: string };
}

function botHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  };
}

export function appearanceConfigTouched(body: Record<string, unknown>): boolean {
  const patch = body.extra_config;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return false;
  return BOT_APPEARANCE_KEYS.some((key) => key in (patch as Record<string, unknown>));
}

async function applyBotNickname(
  guildId: string,
  token: string,
  appearance: BotAppearanceSnapshot,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/@me`, {
    method: 'PATCH',
    headers: botHeaders(token),
    body: JSON.stringify({ nick: appearance.nickname }),
  });

  if (res.ok || res.status === 204) return { ok: true };

  const detail = await res.text().catch(() => '');
  let message = `Discord returned ${res.status}`;
  try {
    const parsed = JSON.parse(detail) as { message?: string };
    if (parsed.message) message = parsed.message;
  } catch {
    if (detail) message = detail.slice(0, 200);
  }

  if (res.status === 403) {
    message += ' — move Deelo\'s role above other roles and grant Change Nickname.';
  }

  return { ok: false, error: message };
}

async function sendAppearancePreview(
  channelId: string,
  token: string,
  appearance: BotAppearanceSnapshot,
): Promise<{ ok: boolean; error?: string }> {
  const embedPayload = templateToDiscordApi(
    {
      title: 'Bot appearance updated',
      description:
        'This preview uses your saved embed color and footer. Nickname changes apply in the member list.',
      color: appearance.embedColor ?? 0x5865f2,
      footer: appearance.embedFooter ? { text: appearance.embedFooter } : undefined,
      timestamp: true,
    },
    appearance.embedColor ?? 0x5865f2,
  );

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: botHeaders(token),
    body: JSON.stringify({ embeds: [embedPayload] }),
  });

  if (res.ok) return { ok: true };
  const detail = await res.text().catch(() => '');
  return { ok: false, error: `Preview failed (${res.status})${detail ? `: ${detail.slice(0, 120)}` : ''}` };
}

/** Push bot appearance (nickname + optional preview embed) to Discord right after dashboard save. */
export async function syncBotCustomizationToDiscord(
  guildId: string,
  guild: {
    extra_config?: Record<string, unknown> | null;
    plan: PlanTier;
    mod_log_channel?: string | null;
  },
  options: { sendPreview?: boolean } = {},
): Promise<BotCustomizationSyncResult> {
  const token = getDiscordBotToken();
  if (!token) {
    return {
      nickname: { ok: false, error: 'Bot token is not configured on the web service.' },
    };
  }

  const appearance = getBotAppearanceSnapshot(guild.extra_config, guild.plan);
  const nickname = await applyBotNickname(guildId, token, appearance);

  const result: BotCustomizationSyncResult = { nickname };

  const previewChannel = guild.mod_log_channel;
  const shouldPreview =
    options.sendPreview &&
    previewChannel &&
    (appearance.embedColor != null || appearance.embedFooter != null);

  if (shouldPreview) {
    const preview = await sendAppearancePreview(previewChannel, token, appearance);
    result.preview = { ...preview, channelId: previewChannel };
  }

  return result;
}

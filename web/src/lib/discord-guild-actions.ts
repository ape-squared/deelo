import { DISCORD_API } from '@/lib/discord-api';
import { requireDiscordBotToken } from '@/lib/discord-bot';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

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

function encodeEmoji(emoji: string): string {
  const trimmed = emoji.trim();
  const custom = trimmed.match(/^<a?:([^:]+):(\d+)>$/);
  if (custom) return encodeURIComponent(`${custom[1]}:${custom[2]}`);
  return encodeURIComponent(trimmed);
}

export async function addMessageReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
  const token = requireDiscordBotToken();
  const res = await fetchWithTimeout(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encodeEmoji(emoji)}/@me`,
    { method: 'PUT', headers: { Authorization: `Bot ${token}` }, timeoutMs: 8_000 },
  );
  if (!res.ok && res.status !== 204) {
    const detail = await discordErrorDetail(res);
    throw new Error(`Failed to add reaction (${res.status})${detail ? `: ${detail}` : ''}`);
  }
}

export async function createButtonRolePanel(
  channelId: string,
  label: string,
  roleId: string,
  options?: { title?: string; description?: string; style?: 'primary' | 'secondary' | 'success' | 'danger' },
): Promise<string> {
  const token = requireDiscordBotToken();
  const styleMap = { primary: 1, secondary: 2, success: 3, danger: 4 } as const;
  const res = await fetchWithTimeout(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: botHeaders(token),
    timeoutMs: 12_000,
    body: JSON.stringify({
      embeds: [
        {
          title: options?.title ?? 'Role Menu',
          description: options?.description ?? `Click **${label}** to get your role.`,
          color: 0x0047ff,
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: styleMap[options?.style ?? 'primary'],
              label: label.slice(0, 80),
              custom_id: `role_${roleId}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await discordErrorDetail(res);
    throw new Error(`Failed to create button panel (${res.status})${detail ? `: ${detail}` : ''}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function deleteDiscordChannel(channelId: string): Promise<void> {
  const token = requireDiscordBotToken();
  const res = await fetch(`${DISCORD_API}/channels/${channelId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Failed to delete channel (${res.status})${detail ? `: ${detail.slice(0, 120)}` : ''}`);
  }
}

export async function deleteDiscordMessage(channelId: string, messageId: string): Promise<void> {
  const token = requireDiscordBotToken();
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Failed to delete message (${res.status})${detail ? `: ${detail.slice(0, 120)}` : ''}`);
  }
}

export async function createTicketPanel(
  channelId: string,
  panelId: number,
  name: string,
  options?: { description?: string },
): Promise<string> {
  const token = requireDiscordBotToken();
  const res = await fetchWithTimeout(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: botHeaders(token),
    timeoutMs: 12_000,
    body: JSON.stringify({
      embeds: [
        {
          title: '🎫 Support',
          description: options?.description ?? `Click below to open a **${name}** ticket.`,
          color: 0x0047ff,
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: 'Open Ticket',
              custom_id: `ticket_open_${panelId}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await discordErrorDetail(res);
    throw new Error(`Failed to create ticket panel (${res.status})${detail ? `: ${detail}` : ''}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function fetchGuildCounterStats(guildId: string): Promise<{ members: number; bots: number; channels: number }> {
  const token = requireDiscordBotToken();
  const [guildRes, channelsRes] = await Promise.all([
    fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=true`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    }),
    fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    }),
  ]);

  const guild = guildRes.ok ? ((await guildRes.json()) as { approximate_member_count?: number; member_count?: number }) : {};
  const channels = channelsRes.ok
    ? ((await channelsRes.json()) as Array<{ type: number }>)
    : [];

  const textVoice = channels.filter((c) => c.type === 0 || c.type === 2).length;

  return {
    members: guild.approximate_member_count ?? guild.member_count ?? 0,
    bots: 0,
    channels: textVoice,
  };
}

export function formatCounterChannelName(format: string, count: number): string {
  return (format || '{count}').replace(/\{count\}/gi, count.toLocaleString()).slice(0, 100);
}

export async function renameDiscordChannel(channelId: string, name: string): Promise<void> {
  const token = requireDiscordBotToken();
  const res = await fetch(`${DISCORD_API}/channels/${channelId}`, {
    method: 'PATCH',
    headers: botHeaders(token),
    body: JSON.stringify({ name: name.slice(0, 100) }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Failed to rename channel (${res.status})${detail ? `: ${detail.slice(0, 120)}` : ''}`);
  }
}

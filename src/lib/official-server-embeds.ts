/** Bot copy — keep in sync with web/src/lib/official-server-embeds.ts */
import type { EmbedTemplateJson } from '../utils/embed-template';

export interface OfficialChannelEmbed {
  id: string;
  label: string;
  channel: string;
  content?: string;
  embed: EmbedTemplateJson;
  message_id?: string | null;
}

export interface OfficialDiscordEmbedsSettings {
  guild_id: string;
  channels: OfficialChannelEmbed[];
}

export const DEFAULT_OFFICIAL_GUILD_ID = '1523831534799425576';

export const DEFAULT_OFFICIAL_DISCORD_EMBEDS: OfficialDiscordEmbedsSettings = {
  guild_id: DEFAULT_OFFICIAL_GUILD_ID,
  channels: [
    {
      id: 'rules',
      label: 'Rules',
      channel: 'rules',
      embed: {
        title: 'Server Rules',
        description: 'Please read and follow these rules. Staff may act at their discretion.',
        color: 0x0047ff,
        fields: [
          { name: '1. Be respectful', value: 'No harassment, hate speech, or personal attacks.' },
          { name: '2. No spam', value: 'Keep messages on-topic and avoid flooding channels.' },
          { name: '3. Follow Discord ToS', value: 'You must comply with Discord\'s Terms of Service and Community Guidelines.' },
          { name: '4. Listen to staff', value: 'Moderator decisions are final in the moment. Appeal in DMs if needed.' },
        ],
      },
    },
    {
      id: 'announcements',
      label: 'Announcements',
      channel: 'announcements',
      embed: {
        title: 'Announcements',
        description: 'Official Deelo news and server updates are posted here.\n\nCheck **#changelog** for release notes.',
        color: 0x0047ff,
      },
    },
    {
      id: 'bot-help',
      label: 'Bot help',
      channel: 'bot-help',
      embed: {
        title: 'Deelo Help',
        description: '**Prefix:** `,` — try `,help` for the full command list.\n\n**Dashboard:** manage your server at deelo.bot/dashboard',
        color: 0x0047ff,
      },
    },
    {
      id: 'commands',
      label: 'Commands',
      channel: 'commands',
      embed: {
        title: 'Deelo Commands',
        description: 'Browse every command at deelo.bot/commands.\n\n**Quick start:** `,help` · `,ping` · `,userinfo`',
        color: 0x0047ff,
      },
    },
    {
      id: 'suggestions',
      label: 'Suggestions',
      channel: 'suggestions',
      embed: {
        title: 'Feature suggestions',
        description: 'Vote on ideas at deelo.bot/suggestions — sign in with Discord to submit and upvote.',
        color: 0x0047ff,
      },
    },
    {
      id: 'general',
      label: 'General welcome',
      channel: 'general',
      content: '👋 Welcome to the official Deelo community!',
      embed: {
        title: 'Welcome',
        description: 'Read **#rules**, grab roles in **#role-select**, and say hi!',
        color: 0x0047ff,
      },
    },
  ],
};

export function mergeOfficialDiscordEmbeds(raw: unknown): OfficialDiscordEmbedsSettings {
  const base = JSON.parse(JSON.stringify(DEFAULT_OFFICIAL_DISCORD_EMBEDS)) as OfficialDiscordEmbedsSettings;
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Record<string, unknown>;
  if (typeof src.guild_id === 'string' && src.guild_id.trim()) base.guild_id = src.guild_id.trim();
  if (!Array.isArray(src.channels)) return base;
  const byId = new Map(base.channels.map((c) => [c.id, c]));
  for (const entry of src.channels) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = String(e.id ?? '').trim().toLowerCase();
    const channel = String(e.channel ?? '').trim().toLowerCase();
    if (!id || !channel) continue;
    const existing = byId.get(id);
    const embed = (e.embed && typeof e.embed === 'object' ? e.embed : {}) as EmbedTemplateJson;
    const next: OfficialChannelEmbed = {
      id,
      label: String(e.label ?? id).slice(0, 80),
      channel,
      content: typeof e.content === 'string' ? e.content.slice(0, 2000) : undefined,
      embed: existing ? { ...existing.embed, ...embed } : embed,
      message_id: typeof e.message_id === 'string' ? e.message_id : null,
    };
    byId.set(id, next);
  }
  base.channels = Array.from(byId.values());
  return base;
}

export function officialEmbedsKey(): string {
  return 'official_discord_embeds';
}

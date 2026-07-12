import type { EmbedTemplate } from '@/lib/embed-template';
import { sanitizeEmbedTemplate } from '@/lib/embed-template';
import { normalizeChannelSlug } from '@/lib/discord-channels';

export interface OfficialChannelEmbed {
  /** Stable key, e.g. rules, bot-help */
  id: string;
  /** Admin label */
  label: string;
  /** Discord channel name (without #) */
  channel: string;
  /** Optional plain text sent above the embed */
  content?: string;
  embed: EmbedTemplate;
  /** Last synced Discord message id */
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
          { name: '1. Be respectful', value: 'No harassment, hate speech, or personal attacks.', inline: false },
          { name: '2. No spam', value: 'Keep messages on-topic and avoid flooding channels.', inline: false },
          { name: '3. Follow Discord ToS', value: 'You must comply with Discord\'s Terms of Service and Community Guidelines.', inline: false },
          { name: '4. Listen to staff', value: 'Moderator decisions are final in the moment. Appeal in DMs if needed.', inline: false },
        ],
      },
    },
    {
      id: 'announcements',
      label: 'Announcements',
      channel: 'announcements',
      embed: {
        title: 'Announcements',
        description: 'Official Deelo news and server updates are posted here.\n\nCheck **#changelog** for release notes and the [website](https://deelo.bot/changelog) for the full history.',
        color: 0x0047ff,
      },
    },
    {
      id: 'bot-help',
      label: 'Bot help',
      channel: 'bot-help',
      embed: {
        title: 'Deelo Help',
        description:
          '**Prefix:** `,` — try `,help` for the full command list.\n\n' +
          '**Dashboard:** [deelo.bot/dashboard](https://deelo.bot/dashboard) — manage modules, tickets, embeds, and more.\n\n' +
          '**Docs:** [deelo.bot/docs](https://deelo.bot/docs)\n\n' +
          'Ask questions in **#general** or open a support ticket if your server has them enabled.',
        color: 0x0047ff,
      },
    },
    {
      id: 'commands',
      label: 'Commands',
      channel: 'commands',
      embed: {
        title: 'Deelo Commands',
        description:
          'Browse every command at [deelo.bot/commands](https://deelo.bot/commands).\n\n' +
          '**Quick start:** `,help` · `,ping` · `,userinfo`\n' +
          '**Moderation:** `,ban` · `,kick` · `,warn` · `,purge`\n' +
          '**Community:** `,level` · `,daily` · `,ticket`',
        color: 0x0047ff,
      },
    },
    {
      id: 'suggestions',
      label: 'Suggestions',
      channel: 'suggestions',
      embed: {
        title: 'Feature suggestions',
        description:
          'Vote on ideas at [deelo.bot/suggestions](https://deelo.bot/suggestions) — sign in with Discord to submit and upvote.\n\n' +
          'Please search before posting duplicates. Constructive feedback helps us prioritize.',
        color: 0x0047ff,
      },
    },
    {
      id: 'role-select',
      label: 'Role select',
      channel: 'role-select',
      embed: {
        title: '🎭 Notification Roles',
        description: 'Click a button to toggle a role.',
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
        description:
          'This is the home for Deelo bot news, support, and community chat.\n\n' +
          'Read **#rules**, grab roles in **#role-select**, and say hi!',
        color: 0x0047ff,
      },
    },
  ],
};

function sanitizeChannel(raw: unknown): OfficialChannelEmbed | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const id = String(src.id ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const channel = normalizeChannelSlug(String(src.channel ?? ''));
  if (!id || !channel) return null;
  const embed = sanitizeEmbedTemplate(src.embed, true);
  return {
    id,
    label: String(src.label ?? id).slice(0, 80),
    channel,
    content: typeof src.content === 'string' ? src.content.slice(0, 2000) : undefined,
    embed,
    message_id: typeof src.message_id === 'string' ? src.message_id : null,
  };
}

export function mergeOfficialDiscordEmbeds(raw: unknown): OfficialDiscordEmbedsSettings {
  const base = structuredClone(DEFAULT_OFFICIAL_DISCORD_EMBEDS);
  if (!raw || typeof raw !== 'object') return base;

  const src = raw as Record<string, unknown>;
  if (typeof src.guild_id === 'string' && src.guild_id.trim()) {
    base.guild_id = src.guild_id.trim();
  }

  if (!Array.isArray(src.channels)) return base;

  const byId = new Map(base.channels.map((c) => [c.id, c]));
  for (const entry of src.channels) {
    const parsed = sanitizeChannel(entry);
    if (!parsed) continue;
    const existing = byId.get(parsed.id);
    if (existing) {
      byId.set(parsed.id, {
        ...existing,
        ...parsed,
        embed: { ...existing.embed, ...parsed.embed, fields: parsed.embed.fields ?? existing.embed.fields },
      });
    } else {
      byId.set(parsed.id, parsed);
    }
  }

  base.channels = Array.from(byId.values());
  return base;
}

export function officialEmbedsKey(): string {
  return 'official_discord_embeds';
}

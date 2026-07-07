/** Premium bot appearance keys stored in guilds.extra_config */
export const BOT_APPEARANCE_FIELDS = [
  {
    key: 'bot.nickname',
    label: 'Bot nickname',
    description: 'How Deelo appears in the member list for this server (max 32 characters).',
    type: 'text' as const,
    placeholder: 'Deelo',
    maxLength: 32,
  },
  {
    key: 'bot.embed_color',
    label: 'Embed color',
    description: 'Accent color for Deelo embeds in this server.',
    type: 'color' as const,
    placeholder: '5865F2',
  },
  {
    key: 'bot.embed_footer',
    label: 'Embed footer',
    description: 'Footer text shown on Deelo embeds (max 80 characters).',
    type: 'text' as const,
    placeholder: 'Deelo',
    maxLength: 80,
  },
] as const;

export const BOT_APPEARANCE_KEYS = BOT_APPEARANCE_FIELDS.map((f) => f.key);

export function sanitizeBotNickname(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, 32);
}

export function sanitizeBotEmbedColor(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).replace(/^#/, '').trim().toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(s)) return null;
  return s;
}

export function sanitizeBotEmbedFooter(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, 80);
}

export function sanitizeBotAppearancePath(path: string, value: unknown): unknown {
  switch (path) {
    case 'bot.nickname':
      return sanitizeBotNickname(value);
    case 'bot.embed_color':
      return sanitizeBotEmbedColor(value);
    case 'bot.embed_footer':
      return sanitizeBotEmbedFooter(value);
    default:
      return value;
  }
}

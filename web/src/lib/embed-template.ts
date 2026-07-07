export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedTemplate {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  timestamp?: boolean;
  author?: { name?: string; icon_url?: string; url?: string };
  footer?: { text?: string; icon_url?: string };
  image?: string;
  thumbnail?: string;
  fields?: EmbedField[];
}

export const EMPTY_EMBED: EmbedTemplate = {
  description: '',
  timestamp: false,
  fields: [],
  color: parseEmbedColor('#5865F2'),
};

export function parseEmbedColor(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) return input & 0xffffff;
  if (typeof input === 'string') {
    const hex = input.replace(/^#/, '').trim();
    if (/^[0-9a-fA-F]{6}$/.test(hex)) return parseInt(hex, 16);
  }
  return undefined;
}

export function colorToHex(color?: number): string {
  if (color == null) return '#5865F2';
  return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
}

function sanitizeUrl(value: unknown, max = 512): string | undefined {
  if (typeof value !== 'string') return undefined;
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) return undefined;
  return url.slice(0, max);
}

function sanitizeText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  return s ? s.slice(0, max) : undefined;
}

export function embedSlug(name: string): string | null {
  const slug = name.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  return slug || null;
}

export function sanitizeEmbedTemplate(raw: unknown, premium: boolean): EmbedTemplate {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: EmbedTemplate = {};

  out.title = sanitizeText(src.title, 256);
  out.description = sanitizeText(src.description, 4096);
  const color = parseEmbedColor(src.color);
  if (color !== undefined) out.color = color;
  out.url = sanitizeUrl(src.url);
  out.timestamp = src.timestamp === true;

  if (premium) {
    const author = src.author;
    if (author && typeof author === 'object') {
      const a = author as Record<string, unknown>;
      const name = sanitizeText(a.name, 256);
      const icon_url = sanitizeUrl(a.icon_url);
      const url = sanitizeUrl(a.url);
      if (name || icon_url || url) out.author = { name, icon_url, url };
    }

    const footer = src.footer;
    if (footer && typeof footer === 'object') {
      const f = footer as Record<string, unknown>;
      const text = sanitizeText(f.text, 2048);
      const icon_url = sanitizeUrl(f.icon_url);
      if (text || icon_url) out.footer = { text, icon_url };
    }

    out.image = sanitizeUrl(src.image);
    out.thumbnail = sanitizeUrl(src.thumbnail);

    if (Array.isArray(src.fields)) {
      const fields: EmbedField[] = [];
      for (const field of src.fields.slice(0, 25)) {
        if (!field || typeof field !== 'object') continue;
        const f = field as Record<string, unknown>;
        const fname = sanitizeText(f.name, 256);
        const fvalue = sanitizeText(f.value, 1024);
        if (!fname || !fvalue) continue;
        fields.push({ name: fname, value: fvalue, inline: f.inline === true });
      }
      if (fields.length) out.fields = fields;
    }
  }

  if (!out.title && !out.description && !(out.fields?.length)) {
    out.description = '';
  }

  return out;
}

export function templateToDiscordApi(template: EmbedTemplate, defaultColor?: number): Record<string, unknown> {
  const embed: Record<string, unknown> = {};
  if (template.title) embed.title = template.title;
  if (template.description) embed.description = template.description;
  const color = parseEmbedColor(template.color) ?? defaultColor;
  if (color != null) embed.color = color;
  if (template.url) embed.url = template.url;
  if (template.timestamp) embed.timestamp = new Date().toISOString();
  if (template.author) embed.author = template.author;
  if (template.footer) embed.footer = template.footer;
  if (template.image) embed.image = { url: template.image };
  if (template.thumbnail) embed.thumbnail = { url: template.thumbnail };
  if (template.fields?.length) embed.fields = template.fields;
  return embed;
}

export function embedSummary(template: EmbedTemplate): string {
  const parts: string[] = [];
  if (template.title) parts.push(template.title);
  if (template.description) parts.push(template.description.slice(0, 60));
  return parts.join(' — ') || 'Empty embed';
}

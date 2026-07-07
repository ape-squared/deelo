import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import type { GuildEmbedContext } from './embeds';
import { getBotAppearance } from '../services/guild-identity';
import { config } from '../config';

export interface EmbedFieldJson {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedTemplateJson {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  timestamp?: boolean;
  author?: { name?: string; icon_url?: string; url?: string };
  footer?: { text?: string; icon_url?: string };
  image?: string;
  thumbnail?: string;
  fields?: EmbedFieldJson[];
}

function resolveDefaultColor(guild?: GuildEmbedContext): number {
  if (guild && (guild.plan === 'premium' || guild.plan === 'premium_plus')) {
    const appearance = getBotAppearance(guild.extra_config ?? null);
    if (appearance.embedColor !== null) return appearance.embedColor;
  }
  return config.botColor as number;
}

export function buildEmbedFromTemplate(json: EmbedTemplateJson, guild?: GuildEmbedContext): EmbedBuilder {
  const embed = new EmbedBuilder();
  if (json.title) embed.setTitle(json.title);
  if (json.description) embed.setDescription(json.description);
  embed.setColor((json.color ?? resolveDefaultColor(guild)) as ColorResolvable);
  if (json.url) embed.setURL(json.url);
  if (json.timestamp) embed.setTimestamp();
  if (json.author?.name) {
    embed.setAuthor({
      name: json.author.name,
      iconURL: json.author.icon_url,
      url: json.author.url,
    });
  }
  if (json.footer?.text) {
    embed.setFooter({ text: json.footer.text, iconURL: json.footer.icon_url });
  }
  if (json.image) embed.setImage(json.image);
  if (json.thumbnail) embed.setThumbnail(json.thumbnail);
  if (json.fields?.length) {
    embed.addFields(
      json.fields.map((f) => ({
        name: f.name,
        value: f.value,
        inline: f.inline ?? false,
      })),
    );
  }
  return embed;
}

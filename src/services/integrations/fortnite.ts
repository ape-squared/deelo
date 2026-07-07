import { EmbedBuilder } from 'discord.js';
import { fetchJson } from './fetch';

const SHOP_URL = 'https://fortnite-api.com/v2/shop';
const COSMETIC_URL = 'https://fortnite-api.com/v2/cosmetics/br/search';

export interface FortniteShopItem {
  name: string;
  price: number;
  image?: string;
}

export interface FortniteShopData {
  hash: string;
  date: string;
  items: FortniteShopItem[];
}

export interface FortniteCosmetic {
  name: string;
  description: string;
  type: string;
  rarity: string;
  image?: string;
}

export async function getFortniteShop(): Promise<FortniteShopData | null> {
  try {
    const res = await fetchJson<{
      status: number;
      data?: {
        hash: string;
        date: string;
        entries?: Array<{
          finalPrice: number;
          brItems?: Array<{ name: string; images?: { icon?: string; smallIcon?: string } }>;
          items?: Array<{ name: string; images?: { icon?: string; smallIcon?: string } }>;
        }>;
      };
    }>(SHOP_URL);

    const entries = res.data?.entries ?? [];
    const items: FortniteShopItem[] = [];

    for (const entry of entries) {
      const brItems = entry.brItems ?? entry.items ?? [];
      for (const item of brItems) {
        items.push({
          name: item.name,
          price: entry.finalPrice,
          image: item.images?.icon ?? item.images?.smallIcon,
        });
      }
    }

    return {
      hash: res.data?.hash ?? '',
      date: res.data?.date ?? new Date().toISOString(),
      items: items.slice(0, 40),
    };
  } catch (err) {
    console.warn('[fortnite] shop fetch failed:', err);
    return null;
  }
}

export async function searchFortniteItem(query: string): Promise<FortniteCosmetic | null> {
  try {
    const res = await fetchJson<{
      status: number;
      data?: {
        name: string;
        description: string;
        type?: { displayValue?: string };
        rarity?: { displayValue?: string };
        images?: { icon?: string; smallIcon?: string };
      };
    }>(`${COSMETIC_URL}?name=${encodeURIComponent(query)}`);

    const item = res.data;
    if (!item?.name) return null;

    return {
      name: item.name,
      description: item.description?.replace(/\r\n/g, '\n') ?? '',
      type: item.type?.displayValue ?? 'Cosmetic',
      rarity: item.rarity?.displayValue ?? 'Unknown',
      image: item.images?.icon ?? item.images?.smallIcon,
    };
  } catch {
    return null;
  }
}

export function buildShopEmbed(shop: FortniteShopData): EmbedBuilder {
  const lines = shop.items.slice(0, 18).map((i) => `• **${i.name}** — ${i.price.toLocaleString()} V-Bucks`);
  const embed = new EmbedBuilder()
    .setColor(0x0047ff)
    .setTitle("Today's Fortnite Item Shop")
    .setDescription(lines.join('\n') || 'Shop data unavailable right now.')
    .setFooter({ text: `Shop rotates daily · ${shop.items.length} items` })
    .setTimestamp(new Date(shop.date));

  const thumb = shop.items.find((i) => i.image)?.image;
  if (thumb) embed.setThumbnail(thumb);

  return embed;
}

export function buildCosmeticEmbed(item: FortniteCosmetic): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x0047ff)
    .setTitle(item.name)
    .setDescription(item.description.slice(0, 400) || 'No description.')
    .addFields(
      { name: 'Type', value: item.type, inline: true },
      { name: 'Rarity', value: item.rarity, inline: true },
    );
  if (item.image) embed.setThumbnail(item.image);
  return embed;
}

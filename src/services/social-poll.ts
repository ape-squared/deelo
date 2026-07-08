import type { Client, TextChannel } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { getSupabase } from '../database/supabase';
import { getConfigValue, setExtraConfig } from '../extended/lib/guild-config';
import { checkSocialFeed, resolveYoutubeChannelId } from './integrations/social-sources';
import { getFortniteShop } from './integrations/fortnite';

const POLL_MS = 3 * 60_000;
const FORTNITE_POLL_MS = 30 * 60_000;

interface SocialFeedRow {
  id: number;
  guild_id: string;
  platform: string;
  channel_id: string;
  username: string;
  last_post_id: string | null;
}

let socialTimer: ReturnType<typeof setInterval> | null = null;
let fortniteTimer: ReturnType<typeof setInterval> | null = null;
let polling = false;
let fortnitePolling = false;

export function startSocialPollLoop(client: Client): void {
  if (socialTimer) return;

  void pollSocialFeeds(client);
  socialTimer = setInterval(() => void pollSocialFeeds(client), POLL_MS);

  void pollFortniteShops(client);
  fortniteTimer = setInterval(() => void pollFortniteShops(client), FORTNITE_POLL_MS);

  console.log('[social-poll] Started (feeds every 3m, fortnite shop every 30m)');
}

async function pollSocialFeeds(client: Client): Promise<void> {
  if (polling) return;
  polling = true;
  try {
    const { data: feeds, error } = await getSupabase()
      .from('social_feeds')
      .select('*')
      .order('id');

    if (error || !feeds?.length) return;

    for (const feed of feeds as SocialFeedRow[]) {
      try {
        await processFeed(client, feed);
      } catch (err) {
        console.warn(`[social-poll] feed ${feed.id} failed:`, err);
      }
      await sleep(400);
    }
  } catch (err) {
    console.warn('[social-poll] cycle failed:', err);
  } finally {
    polling = false;
  }
}

async function processFeed(client: Client, feed: SocialFeedRow): Promise<void> {
  const { post, stateId } = await checkSocialFeed(feed.platform, feed.username, feed.last_post_id);

  if (!feed.last_post_id && stateId) {
    await getSupabase().from('social_feeds').update({ last_post_id: stateId }).eq('id', feed.id);
    return;
  }

  if (stateId && stateId !== feed.last_post_id && !post) {
    await getSupabase().from('social_feeds').update({ last_post_id: stateId }).eq('id', feed.id);
    return;
  }

  if (!post) return;

  const channel = await client.channels.fetch(feed.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const template = String(
    await getConfigValue(feed.guild_id, `${feed.platform}.message`, defaultMessage(feed.platform, post.kind)),
  );

  const body = template
    .replace(/\{username\}/gi, feed.username)
    .replace(/\{title\}/gi, post.title)
    .replace(/\{url\}/gi, post.url)
    .replace(/\{platform\}/gi, feed.platform);

  const embed = new EmbedBuilder()
    .setColor(platformColor(feed.platform))
    .setTitle(post.title.slice(0, 240))
    .setURL(post.url)
    .setDescription(body.slice(0, 2000))
    .setFooter({ text: `${capitalize(feed.platform)} · @${feed.username}` })
    .setTimestamp();

  await (channel as TextChannel).send({ embeds: [embed] }).catch(() => {});

  await getSupabase()
    .from('social_feeds')
    .update({ last_post_id: stateId ?? post.id })
    .eq('id', feed.id);
}

async function pollFortniteShops(client: Client): Promise<void> {
  if (fortnitePolling) return;
  fortnitePolling = true;
  try {
    const shop = await getFortniteShop();
    if (!shop?.hash) return;

    const { data: guilds } = await getSupabase().from('guilds').select('id');
    if (!guilds?.length) return;

    for (const guild of guilds) {
      const channelId = await getConfigValue<string | undefined>(guild.id, 'fortnite.shop_channel');
      const lastHash = await getConfigValue<string | undefined>(guild.id, 'fortnite.shop_hash');
      const pingRole = await getConfigValue<string | undefined>(guild.id, 'fortnite.shop_ping_role');

      if (!channelId || lastHash === shop.hash) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) continue;

      const { buildShopEmbed } = await import('./integrations/fortnite');
      const embed = buildShopEmbed(shop);
      const content = pingRole ? `<@&${pingRole}> **Fortnite shop rotated!**` : undefined;

      await (channel as TextChannel).send({ content, embeds: [embed] }).catch(() => {});
      await setExtraConfig(guild.id, 'fortnite.shop_hash', shop.hash);
    }
  } catch (err) {
    console.warn('[fortnite-poll] failed:', err);
  } finally {
    fortnitePolling = false;
  }
}

function defaultMessage(platform: string, kind?: string): string {
  if (kind === 'live') return `🔴 **{username}** is now live!\n{title}\n{url}`;
  return `New ${platform} post from **{username}**\n{title}\n{url}`;
}

function platformColor(platform: string): number {
  const colors: Record<string, number> = {
    youtube: 0xff0000,
    twitch: 0x9146ff,
    twitter: 0x1da1f2,
    tiktok: 0x010101,
    instagram: 0xe1306c,
    reddit: 0xff4500,
    kick: 0x53fc18,
    soundcloud: 0xff5500,
    pinterest: 0xbd081c,
  };
  return colors[platform] ?? 0x0047ff;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function seedSocialFeed(feedId: number, platform: string, username: string): Promise<void> {
  let user = username;
  if (platform === 'youtube') {
    const channelId = await resolveYoutubeChannelId(username);
    if (channelId && channelId !== username) {
      user = channelId;
      await getSupabase().from('social_feeds').update({ username: channelId }).eq('id', feedId);
    }
  }
  const { stateId } = await checkSocialFeed(platform, user, null);
  if (stateId) {
    await getSupabase().from('social_feeds').update({ last_post_id: stateId }).eq('id', feedId);
  }
}

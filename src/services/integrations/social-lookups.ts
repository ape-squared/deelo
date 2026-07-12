import { EmbedBuilder } from 'discord.js';
import {
  checkSocialFeed,
  getInstagramLatest,
  getKickLive,
  getPinterestLatest,
  getRedditLatest,
  getSoundcloudLatest,
  getTiktokLatest,
  getTwitchLive,
  getTwitterLatest,
  getYoutubeLatest,
  resolveYoutubeChannelId,
  type SocialPost,
} from './social-sources';

const PLATFORM_COLOR: Record<string, number> = {
  instagram: 0xe4405f,
  twitter: 0x1da1f2,
  tiktok: 0x010101,
  youtube: 0xff0000,
  twitch: 0x9146ff,
  kick: 0x53fc18,
  reddit: 0xff4500,
  soundcloud: 0xff5500,
  pinterest: 0xbd081c,
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  twitter: 'X / Twitter',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitch: 'Twitch',
  kick: 'Kick',
  reddit: 'Reddit',
  soundcloud: 'SoundCloud',
  pinterest: 'Pinterest',
};

async function latestPost(platform: string, username: string): Promise<SocialPost | null> {
  const user = username.replace(/^@/, '').replace(/^r\//i, '');
  switch (platform) {
    case 'youtube': {
      const channelId = await resolveYoutubeChannelId(user);
      return channelId ? getYoutubeLatest(channelId) : null;
    }
    case 'twitch':
      return getTwitchLive(user);
    case 'tiktok':
      return getTiktokLatest(user);
    case 'twitter':
      return getTwitterLatest(user);
    case 'instagram':
      return getInstagramLatest(user);
    case 'reddit':
      return getRedditLatest(user);
    case 'kick':
      return getKickLive(user);
    case 'soundcloud':
      return getSoundcloudLatest(user);
    case 'pinterest':
      return getPinterestLatest(user);
    default:
      return null;
  }
}

export async function buildSocialPreviewEmbed(platform: string, username: string): Promise<EmbedBuilder> {
  const user = username.replace(/^@/, '').replace(/^r\//i, '').trim();
  if (!user) {
    throw new Error('Provide a username to look up.');
  }

  const label = PLATFORM_LABEL[platform] ?? platform;
  const color = PLATFORM_COLOR[platform] ?? 0x5865f2;

  if (platform === 'twitch' || platform === 'kick') {
    const live = await latestPost(platform, user);
    if (live?.kind === 'live') {
      return new EmbedBuilder()
        .setColor(color)
        .setTitle(`🔴 ${user} is live on ${label}`)
        .setDescription(live.title)
        .setURL(live.url)
        .setFooter({ text: `Deelo · ${label} live check` });
    }
    return new EmbedBuilder()
      .setColor(color)
      .setTitle(`${label} — @${user}`)
      .setDescription(`**${user}** is offline right now.\n[Open channel](https://${platform === 'kick' ? 'kick.com' : 'twitch.tv'}/${encodeURIComponent(user)})`)
      .setFooter({ text: `Deelo · ${label}` });
  }

  const post = await latestPost(platform, user);
  if (post) {
    const kind = post.kind === 'live' ? 'Live' : 'Latest';
    return new EmbedBuilder()
      .setColor(color)
      .setTitle(`${kind} on ${label}`)
      .setDescription(`**@${user}**\n${post.title}\n\n[Open post](${post.url})`)
      .setURL(post.url)
      .setFooter({ text: `Deelo · ${label}` });
  }

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${label} — @${user}`)
    .setDescription(`Could not fetch a recent post for **@${user}**. The account may be private, or the platform may be rate-limiting.\n\nTrack updates with \`,${platform === 'reddit' ? 'subreddit' : platform} add #channel ${user}\`.`)
    .setFooter({ text: `Deelo · ${label}` });
}

export async function buildPinterestSearchEmbed(query: string): Promise<EmbedBuilder> {
  const q = query.trim();
  const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`;
  return new EmbedBuilder()
    .setColor(PLATFORM_COLOR.pinterest)
    .setTitle('Pinterest Search')
    .setDescription(`Results for **${q}**\n\n[Browse pins on Pinterest](${url})`)
    .setURL(url)
    .setFooter({ text: 'Deelo · Pinterest' });
}

export async function buildSoundcloudSearchEmbed(query: string): Promise<EmbedBuilder> {
  const q = query.trim();
  try {
    const play = await import('play-dl');
    const results = await play.search(q, { limit: 3, source: { soundcloud: 'tracks' } });
    const tracks = results.filter((r) => r.type === 'track').slice(0, 3);
    if (tracks.length) {
      const lines = tracks.map((t, i) => {
        const title = 'title' in t ? t.title : 'Track';
        const url = 'url' in t ? t.url : '';
        return `**${i + 1}.** [${title}](${url})`;
      });
      return new EmbedBuilder()
        .setColor(PLATFORM_COLOR.soundcloud)
        .setTitle('SoundCloud Search')
        .setDescription([`Query: **${q}**`, '', ...lines, '', `Use \`,play ${tracks[0] && 'url' in tracks[0] ? tracks[0].url : q}\` to play.`].join('\n'))
        .setFooter({ text: 'Deelo · SoundCloud' });
    }
  } catch {
    /* fall through */
  }
  const url = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(q)}`;
  return new EmbedBuilder()
    .setColor(PLATFORM_COLOR.soundcloud)
    .setTitle('SoundCloud Search')
    .setDescription(`[Search SoundCloud for "${q}"](${url})`)
    .setURL(url)
    .setFooter({ text: 'Deelo · SoundCloud' });
}

/** Seed a feed row without posting (used after add). */
export async function peekFeedState(platform: string, username: string): Promise<string | null> {
  const { stateId } = await checkSocialFeed(platform, username, null);
  return stateId;
}

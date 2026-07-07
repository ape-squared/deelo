import { fetchJson, fetchText } from './fetch';

export interface SocialPost {
  id: string;
  title: string;
  url: string;
  author?: string;
  kind?: 'post' | 'live' | 'shop';
}

/** Resolve YouTube @handle to channel ID (cached in username if already UC...). */
export async function resolveYoutubeChannelId(username: string): Promise<string | null> {
  const clean = username.replace(/^@/, '');
  if (/^UC[\w-]{20,}$/.test(clean)) return clean;

  try {
    const html = await fetchText(`https://www.youtube.com/@${encodeURIComponent(clean)}`, {
      headers: { Accept: 'text/html' },
    });
    const match = html.match(/"channelId":"(UC[^"]+)"/) ?? html.match(/channel_id=([^&"']+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function getYoutubeLatest(channelId: string): Promise<SocialPost | null> {
  try {
    const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    const id = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = xml.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/)?.[1];
    if (!id) return null;
    return {
      id,
      title: decodeXml(title ?? 'New video'),
      url: `https://www.youtube.com/watch?v=${id}`,
      kind: 'post',
    };
  } catch {
    return null;
  }
}

export async function getTwitchLive(username: string): Promise<SocialPost | null> {
  try {
    const status = await fetchText(`https://decapi.me/twitch/status/${encodeURIComponent(username)}`);
    const lower = status.toLowerCase();
    if (lower.includes('offline') || lower.includes('not live')) return null;

    const title = status.replace(/🛳️/g, ' ').trim().slice(0, 200);
    return {
      id: `live:${username}:${title.slice(0, 80)}`,
      title: title || `${username} is live on Twitch`,
      url: `https://twitch.tv/${username}`,
      author: username,
      kind: 'live',
    };
  } catch {
    return null;
  }
}

export async function getTiktokLatest(username: string): Promise<SocialPost | null> {
  try {
    const res = await fetchJson<{
      code: number;
      data?: { videos?: Array<{ video_id: string; title?: string }> };
    }>(`https://www.tikwm.com/api/user/posts?unique_id=${encodeURIComponent(username.replace(/^@/, ''))}&count=1`);

    const video = res.data?.videos?.[0];
    if (!video?.video_id) return null;

    return {
      id: video.video_id,
      title: video.title?.trim() || `New TikTok from @${username}`,
      url: `https://www.tiktok.com/@${username}/video/${video.video_id}`,
      author: username,
      kind: 'post',
    };
  } catch {
    return null;
  }
}

const TWITTER_RSS_HOSTS = [
  'https://rss.xcancel.com',
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
];

export async function getTwitterLatest(username: string): Promise<SocialPost | null> {
  const user = username.replace(/^@/, '');
  for (const host of TWITTER_RSS_HOSTS) {
    try {
      const xml = await fetchText(`${host}/${encodeURIComponent(user)}/rss`, {}, 8_000);
      const item = xml.match(/<item>[\s\S]*?<\/item>/)?.[0];
      if (!item) continue;
      const link = item.match(/<link>([^<]+)<\/link>/)?.[1];
      const title = item.match(/<title>([^<]+)<\/title>/)?.[1];
      const guid = item.match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1] ?? link;
      if (!guid || !link) continue;
      return {
        id: guid,
        title: decodeXml(title ?? 'New post'),
        url: link,
        author: user,
        kind: 'post',
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function getInstagramLatest(username: string): Promise<SocialPost | null> {
  const user = username.replace(/^@/, '');
  const hosts = [
    `https://www.picuki.com/profile/${encodeURIComponent(user)}`,
    `https://gramhir.com/profile/${encodeURIComponent(user)}`,
  ];

  for (const url of hosts) {
    try {
      const html = await fetchText(url, {}, 10_000);
      const postMatch = html.match(/href="(\/media\/[^"]+)"/) ?? html.match(/href="(https:\/\/www\.instagram\.com\/p\/[^"]+)"/);
      if (!postMatch?.[1]) continue;
      const postUrl = postMatch[1].startsWith('http') ? postMatch[1] : `https://www.picuki.com${postMatch[1]}`;
      const id = postUrl.match(/\/p\/([^/]+)/)?.[1] ?? postUrl;
      return {
        id,
        title: `New post from @${user}`,
        url: postUrl.includes('instagram.com') ? postUrl : `https://www.instagram.com/${user}/`,
        author: user,
        kind: 'post',
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function getRedditLatest(subreddit: string): Promise<SocialPost | null> {
  const sub = subreddit.replace(/^r\//i, '').replace(/^@/, '');
  try {
    const res = await fetchJson<{
      data?: { children?: Array<{ data?: { id: string; title: string; permalink: string; author: string } }> };
    }>(`https://www.reddit.com/r/${encodeURIComponent(sub)}/new.json?limit=1`, {
      headers: { 'User-Agent': 'DeeloBot/1.0 (social notifications)' },
    });

    const post = res.data?.children?.[0]?.data;
    if (!post) return null;

    return {
      id: post.id,
      title: post.title,
      url: `https://reddit.com${post.permalink}`,
      author: post.author,
      kind: 'post',
    };
  } catch {
    return null;
  }
}

export async function getKickLive(username: string): Promise<SocialPost | null> {
  try {
    const res = await fetchJson<{
      livestream?: { id: number; session_title?: string; is_live?: boolean };
    }>(`https://kick.com/api/v2/channels/${encodeURIComponent(username)}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const stream = res.livestream;
    if (!stream?.is_live && !stream?.id) return null;

    return {
      id: `live:${stream.id}`,
      title: stream.session_title?.trim() || `${username} is live on Kick`,
      url: `https://kick.com/${username}`,
      author: username,
      kind: 'live',
    };
  } catch {
    return null;
  }
}

export async function getSoundcloudLatest(username: string): Promise<SocialPost | null> {
  try {
    const html = await fetchText(`https://soundcloud.com/${encodeURIComponent(username.replace(/^@/, ''))}`);
    const trackMatch = html.match(/soundcloud:\/\/api\.soundcloud\.com\/tracks\/(\d+)/)
      ?? html.match(/"permalink_url":"(https:[^"]+)"/);
    const titleMatch = html.match(/"title":"([^"]+)"/);

    if (trackMatch) {
      const trackId = trackMatch[1];
      const url = trackMatch[0].startsWith('http')
        ? trackMatch[1].replace(/\\\//g, '/')
        : `https://soundcloud.com/${username}`;
      return {
        id: String(trackId),
        title: titleMatch?.[1]?.replace(/\\u0026/g, '&') ?? `New track from ${username}`,
        url,
        author: username,
        kind: 'post',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function checkSocialFeed(
  platform: string,
  username: string,
  lastPostId: string | null,
): Promise<{ post: SocialPost | null; stateId: string | null }> {
  const user = username.trim();

  switch (platform) {
    case 'youtube': {
      const channelId = await resolveYoutubeChannelId(user);
      if (!channelId) return { post: null, stateId: null };
      const post = await getYoutubeLatest(channelId);
      if (!post) return { post: null, stateId: channelId };
      if (post.id === lastPostId) return { post: null, stateId: channelId };
      return { post, stateId: post.id };
    }
    case 'twitch': {
      const live = await getTwitchLive(user);
      if (!live) return { post: null, stateId: 'offline' };
      if (lastPostId === live.id || (lastPostId?.startsWith('live:') && lastPostId !== 'offline')) {
        return { post: null, stateId: lastPostId?.startsWith('live:') ? lastPostId : live.id };
      }
      if (lastPostId === 'offline') return { post: live, stateId: live.id };
      return { post: null, stateId: live.id };
    }
    case 'tiktok': {
      const post = await getTiktokLatest(user);
      if (!post || post.id === lastPostId) return { post: null, stateId: post?.id ?? lastPostId };
      return { post, stateId: post.id };
    }
    case 'twitter': {
      const post = await getTwitterLatest(user);
      if (!post || post.id === lastPostId) return { post: null, stateId: post?.id ?? lastPostId };
      return { post, stateId: post.id };
    }
    case 'instagram': {
      const post = await getInstagramLatest(user);
      if (!post || post.id === lastPostId) return { post: null, stateId: post?.id ?? lastPostId };
      return { post, stateId: post.id };
    }
    case 'reddit': {
      const post = await getRedditLatest(user);
      if (!post || post.id === lastPostId) return { post: null, stateId: post?.id ?? lastPostId };
      return { post, stateId: post.id };
    }
    case 'kick': {
      const live = await getKickLive(user);
      if (!live) return { post: null, stateId: 'offline' };
      if (lastPostId === live.id || (lastPostId?.startsWith('live:') && lastPostId !== 'offline')) {
        return { post: null, stateId: lastPostId?.startsWith('live:') ? lastPostId : live.id };
      }
      if (lastPostId === 'offline') return { post: live, stateId: live.id };
      return { post: null, stateId: live.id };
    }
    case 'soundcloud': {
      const post = await getSoundcloudLatest(user);
      if (!post || post.id === lastPostId) return { post: null, stateId: post?.id ?? lastPostId };
      return { post, stateId: post.id };
    }
    default:
      return { post: null, stateId: lastPostId };
  }
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

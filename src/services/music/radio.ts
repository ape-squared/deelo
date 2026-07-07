import type { Track } from './types';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; DeeloBot/1.0; +https://deelo.nikkithewikki.top)',
  Accept: '*/*',
};

const BLOCKED_HOSTS = [
  'youtube.com',
  'youtu.be',
  'spotify.com',
  'soundcloud.com',
  'music.apple.com',
  'deezer.com',
];

export function isStreamableRadioUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.some((blocked) => host.includes(blocked))) return false;
    return true;
  } catch {
    return false;
  }
}

function titleFromUrl(url: string, customTitle?: string): string {
  if (customTitle?.trim()) return customTitle.trim().slice(0, 120);
  try {
    const { hostname, pathname } = new URL(url);
    const path = pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop();
    if (path && path !== 'stream' && path !== 'listen') {
      return decodeURIComponent(path).replace(/[-_+]/g, ' ');
    }
    return hostname.replace(/^www\./, '');
  } catch {
    return 'Radio Stream';
  }
}

function parsePlaylistContent(content: string): string | null {
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^https?:\/\//i.test(line)) return line;
    const pls = line.match(/^File\d+=(.+)$/i);
    if (pls?.[1]?.startsWith('http')) return pls[1].trim();
  }
  return null;
}

/** Resolve .pls / .m3u playlist URLs to the actual stream endpoint. */
export async function resolveStreamUrl(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!isStreamableRadioUrl(trimmed)) {
    throw new Error('Invalid stream URL. Use a direct http(s) link or .pls / .m3u playlist.');
  }

  if (!/\.(pls|m3u|m3u8)(\?|$)/i.test(trimmed)) {
    return trimmed;
  }

  const res = await fetch(trimmed, { headers: FETCH_HEADERS, redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Could not fetch playlist (HTTP ${res.status}).`);
  }

  const streamUrl = parsePlaylistContent(await res.text());
  if (!streamUrl || !isStreamableRadioUrl(streamUrl)) {
    throw new Error('Playlist did not contain a valid stream URL.');
  }

  return streamUrl;
}

export async function resolveRadioStream(
  input: string,
  requestedBy: string,
  customTitle?: string,
): Promise<Track> {
  const streamUrl = await resolveStreamUrl(input);
  return {
    title: titleFromUrl(streamUrl, customTitle),
    url: streamUrl,
    duration: 0,
    source: 'radio',
    live: true,
    requestedBy,
  };
}

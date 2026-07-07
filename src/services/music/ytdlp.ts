import fs from 'node:fs';
import path from 'node:path';
import YTDlpWrap from 'yt-dlp-wrap';

const BIN_PATH = path.join(process.cwd(), 'yt-dlp-bin');
const FALLBACK_PATHS = [
  path.join(process.cwd(), 'yt-dlp-latest'),
  path.join(process.cwd(), 'bin'),
];

let ytdlp: YTDlpWrap | null = null;

function findExistingBinary(): string | null {
  if (fs.existsSync(BIN_PATH)) return BIN_PATH;
  for (const p of FALLBACK_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function initYtDlp(): Promise<void> {
  const existing = findExistingBinary();
  if (existing && existing !== BIN_PATH) {
    ytdlp = new YTDlpWrap(existing);
    console.log(`[music] Using yt-dlp at ${existing}`);
    return;
  }

  if (!fs.existsSync(BIN_PATH)) {
    console.log('[music] Downloading yt-dlp binary (first run, ~30s)...');
    await YTDlpWrap.downloadFromGithub(BIN_PATH);
    console.log('[music] yt-dlp ready');
  }
  ytdlp = new YTDlpWrap(BIN_PATH);
}

export function getYtDlp(): YTDlpWrap {
  if (!ytdlp) throw new Error('yt-dlp not initialized');
  return ytdlp;
}

/** Resolve a direct HTTPS audio URL via yt-dlp (works for YouTube, SoundCloud, etc.). */
export async function getDirectAudioUrl(url: string): Promise<string> {
  const out = await getYtDlp().execPromise([
    url,
    '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
    '-g',
    '--no-playlist',
    '--no-warnings',
  ]);
  const direct = out.trim().split('\n')[0]?.trim();
  if (!direct?.startsWith('http')) {
    throw new Error('Could not resolve a playable audio URL.');
  }
  return direct;
}

export async function getYoutubeTitle(url: string): Promise<string | null> {
  try {
    const info = await getYtDlp().getVideoInfo(url) as { title?: string };
    return info.title ?? null;
  } catch {
    return null;
  }
}

export interface YoutubeSearchResult {
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
}

/** Search YouTube via yt-dlp (more reliable than play-dl search). */
export async function searchYouTube(query: string): Promise<YoutubeSearchResult> {
  const out = await getYtDlp().execPromise([
    `ytsearch1:${query}`,
    '--dump-single-json',
    '--no-playlist',
    '--no-warnings',
    '--ignore-config',
  ]);

  const parsed = JSON.parse(out.trim()) as {
    _type?: string;
    entries?: Array<{
      id?: string;
      title?: string;
      webpage_url?: string;
      duration?: number;
      thumbnail?: string;
    }>;
    id?: string;
    title?: string;
    webpage_url?: string;
    duration?: number;
    thumbnail?: string;
  };

  const entry =
    parsed._type === 'playlist' && parsed.entries?.length
      ? parsed.entries[0]
      : parsed;

  const url =
    entry.webpage_url ??
    (entry.id && !entry.id.includes(' ') ? `https://www.youtube.com/watch?v=${entry.id}` : undefined);

  if (!url?.startsWith('http')) {
    throw new Error(`No YouTube results for "${query}".`);
  }

  return {
    title: entry.title ?? query,
    url,
    duration: Math.floor(entry.duration ?? 0),
    thumbnail: entry.thumbnail,
  };
}

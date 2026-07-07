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

/** Pipe audio from YouTube to stdout as webm/opus when possible. */
export function streamYoutube(url: string) {
  return getYtDlp().execStream([
    url,
    '-f', 'bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio/best',
    '--no-playlist',
    '--no-part',
    '--no-warnings',
    '-o', '-',
  ]);
}

export async function getYoutubeTitle(url: string): Promise<string | null> {
  try {
    const info = await getYtDlp().getVideoInfo(url) as { title?: string };
    return info.title ?? null;
  } catch {
    return null;
  }
}

import { StreamType } from '@discordjs/voice';
import type { Readable } from 'node:stream';
import { Readable as NodeReadable } from 'node:stream';
import prism from 'prism-media';
import type { Track } from './types';
import { getDirectAudioUrl } from './ytdlp';
import { getPresetFilter } from './presets';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.youtube.com/',
};

function attachErrorLogging(stream: Readable, track: Track, label: string): Readable {
  stream.on('error', (err) => {
    console.error(`[music] ${label} error for ${track.title}:`, err.message);
  });
  return stream;
}

function createFfmpegStream(input: Readable, afilter: string): Readable {
  const ffmpeg = new prism.FFmpeg({
    args: [
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-i', 'pipe:0',
      '-af', afilter,
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
    ],
  });
  input.pipe(ffmpeg);
  ffmpeg.on('error', (err) => {
    console.error('[music] ffmpeg filter error:', err.message);
  });
  return ffmpeg;
}

export async function createTrackStream(
  track: Track,
  presetId = 'off',
): Promise<{
  stream: Readable;
  inputType: StreamType;
  inlineVolume: boolean;
}> {
  const directUrl = await getDirectAudioUrl(track.url);
  const res = await fetch(directUrl, { headers: FETCH_HEADERS });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch audio stream (HTTP ${res.status}).`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isWebm = contentType.includes('webm') || /\.webm/i.test(directUrl);
  const input = attachErrorLogging(
    NodeReadable.fromWeb(res.body as import('stream/web').ReadableStream),
    track,
    'stream',
  );

  const filter = getPresetFilter(presetId);
  if (filter) {
    const filtered = attachErrorLogging(createFfmpegStream(input, filter), track, 'ffmpeg');
    return { stream: filtered, inputType: StreamType.Raw, inlineVolume: true };
  }

  if (isWebm) {
    return { stream: input, inputType: StreamType.WebmOpus, inlineVolume: false };
  }

  return { stream: input, inputType: StreamType.Arbitrary, inlineVolume: true };
}

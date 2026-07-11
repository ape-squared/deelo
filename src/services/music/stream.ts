import { demuxProbe, StreamType } from '@discordjs/voice';
import type { Readable } from 'node:stream';
import { Readable as NodeReadable } from 'node:stream';
import prism from 'prism-media';
import type { Track } from './types';
import { openTrackStream } from './soundcloud-audio';
import { getPresetFilter } from './presets';

const RADIO_FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; DeeloBot/1.0; +https://deelo.nikkithewikki.top)',
  Accept: '*/*',
  'Icy-MetaData': '1',
};

function attachErrorLogging(stream: Readable, track: Track, label: string): Readable {
  stream.on('error', (err) => {
    console.error(`[music] ${label} error for ${track.title}:`, err.message);
  });
  return stream;
}

function attachFfmpegStderr(ffmpeg: InstanceType<typeof prism.FFmpeg>, track: Track): void {
  ffmpeg.process?.stderr?.on('data', (chunk: Buffer) => {
    const lines = chunk.toString().split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/^frame=|^size=/i.test(line)) continue;
      console.warn(`[music] radio ffmpeg [${track.title}]: ${line}`);
    }
  });
}

function createFfmpegStream(input: Readable, afilter: string): Readable {
  const ffmpeg = new prism.FFmpeg({
    args: [
      '-analyzeduration', '0',
      '-loglevel', 'error',
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

/** FFmpeg pulls the URL directly — fallback when fetch/demuxProbe fails. */
function createRadioStreamFfmpeg(url: string, presetId: string, track: Track): Readable {
  const filter = getPresetFilter(presetId);
  const isHls = /\.m3u8(\?|$)/i.test(url);
  const args = [
    '-nostdin',
    '-loglevel', 'error',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-reconnect_at_eof', '1',
    '-user_agent', RADIO_FETCH_HEADERS['User-Agent'],
    ...(isHls
      ? ['-protocol_whitelist', 'file,http,https,tcp,tls,crypto']
      : ['-analyzeduration', '5000000', '-probesize', '5000000']),
    '-i', url,
    '-vn',
    '-sn',
  ];

  if (filter) {
    args.push('-af', filter);
  }

  args.push('-f', 's16le', '-ar', '48000', '-ac', '2');

  const ffmpeg = new prism.FFmpeg({ args });
  attachFfmpegStderr(ffmpeg, track);
  ffmpeg.on('error', (err) => {
    console.error(`[music] radio ffmpeg error for ${track.title}:`, err.message);
  });
  ffmpeg.on('close', (code: number | null) => {
    if (code !== 0 && code !== null) {
      console.warn(`[music] radio ffmpeg exited (${code}) for ${track.title}`);
    }
  });
  return attachErrorLogging(ffmpeg, track, 'radio-ffmpeg');
}

async function createRadioStream(
  url: string,
  presetId: string,
  track: Track,
): Promise<{ stream: Readable; inputType: StreamType; inlineVolume: boolean }> {
  const filter = getPresetFilter(presetId);

  const res = await fetch(url, { headers: RADIO_FETCH_HEADERS, redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Radio stream HTTP ${res.status}. Check the URL is a direct stream link.`);
  }

  const input = attachErrorLogging(
    NodeReadable.fromWeb(res.body as import('stream/web').ReadableStream),
    track,
    'radio-fetch',
  );

  if (filter) {
    const ffmpeg = new prism.FFmpeg({
      args: [
        '-analyzeduration', '0',
        '-loglevel', 'error',
        '-i', 'pipe:0',
        '-af', filter,
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
      ],
    });
    input.pipe(ffmpeg);
    attachFfmpegStderr(ffmpeg, track);
    ffmpeg.on('error', (err) => {
      console.error(`[music] radio ffmpeg error for ${track.title}:`, err.message);
    });
    return { stream: attachErrorLogging(ffmpeg, track, 'radio-filter'), inputType: StreamType.Raw, inlineVolume: true };
  }

  try {
    const probed = await demuxProbe(input);
    attachErrorLogging(probed.stream, track, 'radio-probe');
    return {
      stream: probed.stream,
      inputType: probed.type,
      inlineVolume: probed.type !== StreamType.WebmOpus,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[music] demuxProbe failed for ${track.title}, using ffmpeg URL input: ${msg}`);
    const stream = createRadioStreamFfmpeg(url, presetId, track);
    return { stream, inputType: StreamType.Raw, inlineVolume: true };
  }
}

export async function createTrackStream(
  track: Track,
  presetId = 'off',
): Promise<{
  stream: Readable;
  inputType: StreamType;
  inlineVolume: boolean;
}> {
  if (track.live || track.source === 'radio') {
    return createRadioStream(track.url, presetId, track);
  }

  const { stream: input, inputType, inlineVolume } = await openTrackStream(track);
  attachErrorLogging(input, track, 'stream');

  const filter = getPresetFilter(presetId);
  if (filter) {
    const filtered = attachErrorLogging(createFfmpegStream(input, filter), track, 'ffmpeg');
    return { stream: filtered, inputType: StreamType.Raw, inlineVolume: true };
  }

  return { stream: input, inputType, inlineVolume };
}

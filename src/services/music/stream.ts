import { StreamType } from '@discordjs/voice';
import type { Readable } from 'node:stream';
import type { Track } from './types';
import { streamYoutube } from './ytdlp';

export async function createTrackStream(track: Track): Promise<{
  stream: Readable;
  inputType: StreamType;
}> {
  // yt-dlp pipes webm/opus (itag 251) — use WebmOpus so Discord plays it directly without FFmpeg transcoding.
  const stream = streamYoutube(track.url);

  stream.on('error', (err) => {
    console.error(`[music] stream error for ${track.title}:`, err.message);
  });

  return { stream, inputType: StreamType.WebmOpus };
}

import play from 'play-dl';
import type { SoundCloudTrack } from 'play-dl';
import { StreamType } from '@discordjs/voice';
import type { Readable } from 'node:stream';

export interface SoundCloudMatch {
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
}

function isSoundCloudUrl(url: string): boolean {
  return /soundcloud\.com/i.test(url) || /api\.soundcloud\.com/i.test(url);
}

function toMatch(track: SoundCloudTrack): SoundCloudMatch {
  return {
    title: track.name ?? 'Unknown',
    url: track.permalink || track.url,
    duration: track.durationInSec ?? 0,
    thumbnail: track.thumbnail,
  };
}

function mapStreamType(type: string): StreamType {
  switch (type) {
    case 'webm/opus':
      return StreamType.WebmOpus;
    case 'ogg/opus':
      return StreamType.OggOpus;
    case 'opus':
      return StreamType.Opus;
    case 'raw':
      return StreamType.Raw;
    default:
      return StreamType.Arbitrary;
  }
}

/** Find the first SoundCloud track that can actually be streamed for a query. */
export async function findSoundCloudTrack(query: string, limit = 5): Promise<SoundCloudMatch> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Provide a song name to search.');
  }

  const results = await play.search(trimmed, { limit, source: { soundcloud: 'tracks' } });
  if (!results.length) {
    throw new Error(`No SoundCloud results for **${trimmed}**.`);
  }

  for (const candidate of results) {
    try {
      const stream = await play.stream_from_info(candidate);
      stream.stream.destroy();
      return toMatch(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Could not find a playable track for **${trimmed}**.`);
}

async function loadSoundCloudTrack(urlOrPermalink: string): Promise<SoundCloudTrack> {
  const data = await play.soundcloud(urlOrPermalink);
  if (data.type !== 'track') {
    throw new Error('Expected a SoundCloud track URL.');
  }
  return data as SoundCloudTrack;
}

/** Open a play-dl audio stream for a SoundCloud permalink or API URL. */
export async function openSoundCloudStream(
  urlOrPermalink: string,
): Promise<{ stream: Readable; inputType: StreamType; inlineVolume: boolean }> {
  const track = await loadSoundCloudTrack(urlOrPermalink);
  const result = await play.stream_from_info(track);
  const inputType = mapStreamType(result.type);
  return {
    stream: result.stream,
    inputType,
    inlineVolume: inputType !== StreamType.WebmOpus,
  };
}

/** Resolve any track to a SoundCloud stream (searching by title/artist when needed). */
export async function openTrackStream(
  track: { title: string; url: string; artist?: string },
): Promise<{ stream: Readable; inputType: StreamType; inlineVolume: boolean }> {
  if (isSoundCloudUrl(track.url)) {
    try {
      return await openSoundCloudStream(track.url);
    } catch {
      // stale SoundCloud link — fall through to search
    }
  }

  const query = track.artist ? `${track.artist} ${track.title}` : track.title;
  const match = await findSoundCloudTrack(query);
  return openSoundCloudStream(match.url);
}

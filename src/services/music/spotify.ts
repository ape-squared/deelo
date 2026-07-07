import play from 'play-dl';
import type { SpotifyTrack } from 'play-dl';
import { config } from '../../config';
import type { Track } from './types';

export function spotifyConfigured(): boolean {
  return Boolean(config.spotifyClientId && config.spotifyClientSecret);
}

export function formatSpotifyTitle(track: SpotifyTrack): string {
  const artist = track.artists?.[0]?.name ?? '';
  return artist ? `${track.name} — ${artist}` : track.name;
}

export async function searchSpotifyTracks(query: string, limit = 1): Promise<SpotifyTrack[]> {
  return play.search(query, { limit, source: { spotify: 'track' } });
}

/** Resolve Spotify metadata to a playable track (audio via YouTube/yt-dlp). */
export async function resolveSpotifyTrack(spTrack: SpotifyTrack, requestedBy: string): Promise<Track> {
  const title = formatSpotifyTitle(spTrack);
  const artist = spTrack.artists?.[0]?.name ?? '';
  const searchQuery = artist ? `${artist} ${spTrack.name}` : spTrack.name;

  const results = await play.search(searchQuery, { limit: 3, source: { youtube: 'video' } });
  if (!results.length) {
    throw new Error(`Could not find audio for **${spTrack.name}** on Spotify.`);
  }

  const video = results[0];
  return {
    title,
    url: video.url,
    spotifyUrl: spTrack.url,
    artist: artist || undefined,
    duration: spTrack.durationInSec || video.durationInSec,
    thumbnail: spTrack.thumbnail?.url ?? video.thumbnails[0]?.url,
    source: 'spotify',
    requestedBy,
  };
}

export function trackDisplayUrl(track: Track): string {
  return track.spotifyUrl ?? track.url;
}

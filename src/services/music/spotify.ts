import { config } from '../../config';
import type { Track } from './types';
import { findSoundCloudTrack } from './soundcloud-audio';

interface SpotifyApiArtist {
  name: string;
}

interface SpotifyApiTrack {
  id: string;
  name: string;
  duration_ms: number;
  external_urls: { spotify: string };
  album?: { images?: Array<{ url: string }> };
  artists?: SpotifyApiArtist[];
}

interface SpotifyTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

let tokenCache: { access_token: string; expires_at: number } | null = null;
let spotifySearchDisabled = false;

export function isSpotifySearchAvailable(): boolean {
  return spotifyConfigured() && !spotifySearchDisabled;
}

export function markSpotifySearchUnavailable(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (!/premium subscription/i.test(msg)) return;
  if (!spotifySearchDisabled) {
    spotifySearchDisabled = true;
    console.warn('[music] Spotify search disabled for this session (premium required on app owner account). Using SoundCloud search.');
  }
}

export function spotifyConfigured(): boolean {
  return Boolean(config.spotifyClientId && config.spotifyClientSecret);
}

export async function ensureSpotifyAccessToken(): Promise<string> {
  if (!spotifyConfigured()) {
    throw new Error('Spotify is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env');
  }

  if (tokenCache && Date.now() < tokenCache.expires_at - 60_000) {
    return tokenCache.access_token;
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const raw = await res.text();
  let data: SpotifyTokenResponse;
  try {
    data = JSON.parse(raw) as SpotifyTokenResponse;
  } catch {
    throw new Error(`Spotify auth returned invalid JSON (${res.status}): ${raw.slice(0, 120)}`);
  }
  if (!res.ok || !data.access_token) {
    throw new Error(`Spotify auth failed: ${data.error_description ?? data.error ?? raw.slice(0, 120)}`);
  }

  tokenCache = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return tokenCache.access_token;
}

async function spotifyApi<T>(path: string): Promise<T> {
  const token = await ensureSpotifyAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const raw = await res.text();
  if (!res.ok) {
    const err = new Error(
      `Spotify API error (${res.status}): ${raw.slice(0, 160)}`,
    );
    markSpotifySearchUnavailable(err);
    throw err;
  }

  let data: T & { error?: { message?: string } };
  try {
    data = JSON.parse(raw) as T & { error?: { message?: string } };
  } catch {
    const err = new Error(`Spotify API returned invalid JSON (${res.status}): ${raw.slice(0, 120)}`);
    markSpotifySearchUnavailable(err);
    throw err;
  }
  if (data.error?.message) {
    const err = new Error(data.error.message);
    markSpotifySearchUnavailable(err);
    throw err;
  }
  return data;
}

export function parseSpotifyUrl(url: string): { type: 'track' | 'album' | 'playlist'; id: string } | null {
  const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return { type: match[1] as 'track' | 'album' | 'playlist', id: match[2] };
}

export function formatSpotifyTitle(track: SpotifyApiTrack): string {
  const artist = track.artists?.[0]?.name ?? '';
  return artist ? `${track.name} — ${artist}` : track.name;
}

export async function searchSpotifyTracks(query: string, limit = 1): Promise<SpotifyApiTrack[]> {
  const data = await spotifyApi<{ tracks: { items: SpotifyApiTrack[] } }>(
    `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=US`,
  );
  return data.tracks?.items ?? [];
}

export async function fetchSpotifyTrack(id: string): Promise<SpotifyApiTrack> {
  return spotifyApi<SpotifyApiTrack>(`/tracks/${id}?market=US`);
}

export async function fetchSpotifyAlbumTracks(id: string, max = 50): Promise<SpotifyApiTrack[]> {
  const data = await spotifyApi<{ items: Array<{ track: SpotifyApiTrack | null }> }>(
    `/albums/${id}/tracks?limit=${Math.min(max, 50)}&market=US`,
  );
  return (data.items ?? []).map((item) => item.track).filter((t): t is SpotifyApiTrack => Boolean(t));
}

export async function fetchSpotifyPlaylistTracks(id: string, max = 50): Promise<SpotifyApiTrack[]> {
  type PlaylistPage = {
    items: Array<{ track: SpotifyApiTrack | null }>;
    next: string | null;
  };

  const tracks: SpotifyApiTrack[] = [];
  let nextPath: string | null = `/playlists/${id}/tracks?limit=50&market=US`;

  while (nextPath && tracks.length < max) {
    const page: PlaylistPage = await spotifyApi<PlaylistPage>(nextPath);

    for (const item of page.items ?? []) {
      if (item.track) tracks.push(item.track);
      if (tracks.length >= max) break;
    }

    nextPath = page.next ? page.next.replace('https://api.spotify.com/v1', '') : null;
  }

  return tracks;
}

/** Resolve Spotify metadata to a playable SoundCloud track. */
export async function resolveSpotifyTrack(spTrack: SpotifyApiTrack, requestedBy: string): Promise<Track> {
  const title = formatSpotifyTitle(spTrack);
  const artist = spTrack.artists?.[0]?.name ?? '';
  const searchQuery = artist ? `${artist} ${spTrack.name}` : spTrack.name;
  const match = await findSoundCloudTrack(searchQuery);

  return {
    title,
    url: match.url,
    spotifyUrl: spTrack.external_urls.spotify,
    artist: artist || undefined,
    duration: Math.round((spTrack.duration_ms ?? 0) / 1000) || match.duration,
    thumbnail: spTrack.album?.images?.[0]?.url ?? match.thumbnail,
    source: 'spotify',
    requestedBy,
  };
}

export function trackDisplayUrl(track: Track): string {
  return track.spotifyUrl ?? track.url;
}

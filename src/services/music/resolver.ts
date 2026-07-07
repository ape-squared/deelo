import play from 'play-dl';
import type { SoundCloudPlaylist, SoundCloudTrack } from 'play-dl';
import type { Track, TrackSource } from './types';
import { searchYouTube } from './ytdlp';
import {
  fetchSpotifyAlbumTracks,
  fetchSpotifyPlaylistTracks,
  fetchSpotifyTrack,
  parseSpotifyUrl,
  resolveSpotifyTrack,
  searchSpotifyTracks,
  spotifyConfigured,
  isSpotifySearchAvailable,
  markSpotifySearchUnavailable,
} from './spotify';

const MAX_PLAYLIST_TRACKS = 50;

export async function resolveQuery(query: string, requestedBy: string): Promise<Track[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (/^https?:\/\//i.test(trimmed)) {
    const spotify = parseSpotifyUrl(trimmed);
    if (spotify) return resolveSpotifyLink(spotify.type, spotify.id, requestedBy);

    if (trimmed.includes('music.apple.com') || trimmed.includes('itunes.apple.com')) {
      return resolveAppleMusic(trimmed, requestedBy);
    }

    const kind = await play.validate(trimmed);
    if (kind === 'so_track') return [await soundcloudUrlToTrack(trimmed, requestedBy)];
    if (kind === 'so_playlist') return resolveSoundCloudPlaylist(trimmed, requestedBy);
    if (kind === 'yt_video') return [await youtubeUrlToTrack(trimmed, requestedBy)];
    if (kind === 'yt_playlist') return resolveYouTubePlaylist(trimmed, requestedBy);
    if (kind === 'dz_track') return resolveDeezerViaSpotify(trimmed, requestedBy);
    if (kind === 'dz_album' || kind === 'dz_playlist') return resolveDeezerCollection(trimmed, requestedBy);
  }

  return resolveTextSearch(trimmed, requestedBy);
}

async function resolveTextSearch(query: string, requestedBy: string): Promise<Track[]> {
  if (isSpotifySearchAvailable()) {
    return resolveSpotifySearch(query, requestedBy);
  }
  return resolveYouTubeSearch(query, requestedBy);
}

async function resolveSpotifyLink(
  type: 'track' | 'album' | 'playlist',
  id: string,
  requestedBy: string,
): Promise<Track[]> {
  requireSpotify();

  if (type === 'track') {
    return [await resolveSpotifyTrack(await fetchSpotifyTrack(id), requestedBy)];
  }

  const tracks =
    type === 'album'
      ? await fetchSpotifyAlbumTracks(id, MAX_PLAYLIST_TRACKS)
      : await fetchSpotifyPlaylistTracks(id, MAX_PLAYLIST_TRACKS);

  return resolveSpotifyCollection(tracks, requestedBy);
}

function requireSpotify(): void {
  if (!spotifyConfigured()) {
    throw new Error('Spotify is not configured. Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`.');
  }
}

async function resolveSpotifySearch(query: string, requestedBy: string): Promise<Track[]> {
  if (!isSpotifySearchAvailable()) {
    return resolveYouTubeSearch(query, requestedBy);
  }

  try {
    const results = await searchSpotifyTracks(query, 1);
    if (results.length) {
      return [await resolveSpotifyTrack(results[0], requestedBy)];
    }
  } catch (err) {
    markSpotifySearchUnavailable(err);
    console.warn('[music] Spotify search unavailable — using YouTube');
  }

  return resolveYouTubeSearch(query, requestedBy);
}

async function resolveSpotifyCollection(
  tracks: Awaited<ReturnType<typeof searchSpotifyTracks>>,
  requestedBy: string,
): Promise<Track[]> {
  const resolved: Track[] = [];

  for (const track of tracks) {
    try {
      resolved.push(await resolveSpotifyTrack(track, requestedBy));
    } catch {
      // skip unresolvable tracks
    }
  }

  if (!resolved.length) {
    throw new Error('Could not resolve any tracks from that Spotify link.');
  }
  return resolved;
}

async function youtubeUrlToTrack(url: string, requestedBy: string): Promise<Track> {
  const info = await play.video_info(url);
  const video = info.video_details;
  return {
    title: video.title ?? 'Unknown',
    url: video.url,
    duration: video.durationInSec,
    thumbnail: video.thumbnails[0]?.url,
    source: 'youtube',
    requestedBy,
  };
}

async function resolveYouTubePlaylist(url: string, requestedBy: string): Promise<Track[]> {
  const playlist = await play.playlist_info(url, { incomplete: true });
  const videos = await playlist.all_videos();
  return videos.slice(0, MAX_PLAYLIST_TRACKS).map((v) => ({
    title: v.title ?? 'Unknown',
    url: v.url,
    duration: v.durationInSec,
    thumbnail: v.thumbnails[0]?.url,
    source: 'youtube' as TrackSource,
    requestedBy,
  }));
}

async function soundcloudUrlToTrack(url: string, requestedBy: string): Promise<Track> {
  const data = await play.soundcloud(url);
  if (data.type !== 'track') throw new Error('Expected a SoundCloud track URL.');
  const track = data as SoundCloudTrack;
  return {
    title: track.name ?? 'Unknown',
    url: track.url,
    duration: track.durationInSec,
    thumbnail: track.thumbnail,
    source: 'soundcloud',
    requestedBy,
  };
}

async function resolveSoundCloudPlaylist(url: string, requestedBy: string): Promise<Track[]> {
  const data = await play.soundcloud(url);
  if (data.type !== 'playlist') throw new Error('Expected a SoundCloud playlist URL.');
  const playlist = data as SoundCloudPlaylist;
  const tracks = await playlist.all_tracks();
  return tracks.slice(0, MAX_PLAYLIST_TRACKS).map((t) => ({
    title: t.name ?? 'Unknown',
    url: t.url,
    duration: t.durationInSec,
    thumbnail: t.thumbnail,
    source: 'soundcloud' as TrackSource,
    requestedBy,
  }));
}

async function resolveDeezerViaSpotify(url: string, requestedBy: string): Promise<Track[]> {
  const data = await play.deezer(url);
  if (data.type !== 'track') throw new Error('Expected a Deezer track URL.');
  const track = data as import('play-dl').DeezerTrack;
  const searchQuery = `${track.artist?.name ?? ''} ${track.title}`.trim();
  return resolveExternalSearch(searchQuery, requestedBy, 'deezer');
}

async function resolveDeezerCollection(url: string, requestedBy: string): Promise<Track[]> {
  const data = await play.deezer(url);
  if (data.type === 'track') return resolveDeezerViaSpotify(url, requestedBy);

  const collection = data as import('play-dl').DeezerAlbum | import('play-dl').DeezerPlaylist;
  const tracks = await collection.all_tracks();
  const resolved: Track[] = [];

  for (const track of tracks.slice(0, MAX_PLAYLIST_TRACKS)) {
    try {
      const searchQuery = `${track.artist?.name ?? ''} ${track.title}`.trim();
      const found = await resolveExternalSearch(searchQuery, requestedBy, 'deezer');
      resolved.push(...found);
    } catch {
      // skip
    }
  }

  if (!resolved.length) throw new Error('Could not resolve any tracks from that Deezer link.');
  return resolved;
}

async function resolveAppleMusic(url: string, requestedBy: string): Promise<Track[]> {
  const meta = await lookupAppleMusic(url);
  const searchQuery = meta.artist ? `${meta.artist} ${meta.title}` : meta.title;
  return resolveExternalSearch(searchQuery, requestedBy, 'apple');
}

async function resolveExternalSearch(
  searchQuery: string,
  requestedBy: string,
  source: TrackSource,
): Promise<Track[]> {
  if (spotifyConfigured()) {
    try {
      const results = await searchSpotifyTracks(searchQuery, 1);
      if (results.length) {
        const track = await resolveSpotifyTrack(results[0], requestedBy);
        return [{ ...track, source }];
      }
    } catch {
      // fall through
    }
  }
  const yt = await resolveYouTubeSearch(searchQuery, requestedBy);
  return yt.map((t) => ({ ...t, source }));
}

async function lookupAppleMusic(url: string): Promise<{ title: string; artist: string }> {
  const songId = url.match(/[?&]i=(\d+)/)?.[1];
  const albumId = url.match(/\/id(\d+)/)?.[1];
  const lookupId = songId ?? albumId;

  if (lookupId) {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${lookupId}`);
    const data = (await res.json()) as { results?: Array<{ trackName?: string; collectionName?: string; artistName?: string }> };
    const item = data.results?.[0];
    if (item) {
      return {
        title: item.trackName ?? item.collectionName ?? 'Unknown',
        artist: item.artistName ?? '',
      };
    }
  }

  const slug = url.split('/').find((p) => p && !p.includes('.') && p !== 'album' && p !== 'song' && p.length > 2);
  const title = slug?.replace(/-/g, ' ') ?? url;
  return { title, artist: '' };
}

async function resolveYouTubeSearch(query: string, requestedBy: string): Promise<Track[]> {
  console.log(`[music] searching YouTube: ${query}`);

  try {
    const video = await searchYouTube(query);
    return [{
      title: video.title,
      url: video.url,
      duration: video.duration,
      thumbnail: video.thumbnail,
      source: 'youtube',
      requestedBy,
    }];
  } catch (ytdlpErr) {
    console.warn('[music] yt-dlp search failed, trying play-dl:', ytdlpErr);
  }

  const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
  if (!results.length) throw new Error(`No results found for **${query}**.`);

  const video = results[0];
  return [{
    title: video.title ?? query,
    url: video.url,
    duration: video.durationInSec,
    thumbnail: video.thumbnails[0]?.url,
    source: 'youtube',
    requestedBy,
  }];
}

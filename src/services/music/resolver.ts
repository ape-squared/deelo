import play from 'play-dl';
import type { SpotifyTrack, SoundCloudTrack, SoundCloudPlaylist, SpotifyPlaylist, SpotifyAlbum, DeezerAlbum, DeezerPlaylist } from 'play-dl';
import type { Track, TrackSource } from './types';

const MAX_PLAYLIST_TRACKS = 50;

export async function resolveQuery(query: string, requestedBy: string): Promise<Track[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.includes('music.apple.com') || trimmed.includes('itunes.apple.com')) {
      return resolveAppleMusic(trimmed, requestedBy);
    }

    const kind = await play.validate(trimmed);
    if (kind === 'yt_video') return [await youtubeUrlToTrack(trimmed, requestedBy)];
    if (kind === 'yt_playlist') return resolveYouTubePlaylist(trimmed, requestedBy);
    if (kind === 'so_track') return [await soundcloudUrlToTrack(trimmed, requestedBy)];
    if (kind === 'so_playlist') return resolveSoundCloudPlaylist(trimmed, requestedBy);
    if (kind === 'sp_track') return [await spotifyUrlToTrack(trimmed, requestedBy)];
    if (kind === 'sp_album' || kind === 'sp_playlist') return resolveSpotifyCollection(trimmed, requestedBy);
    if (kind === 'dz_track') return [await deezerUrlToTrack(trimmed, requestedBy)];
    if (kind === 'dz_album' || kind === 'dz_playlist') return resolveDeezerCollection(trimmed, requestedBy);
  }

  return resolveYouTubeSearch(trimmed, requestedBy);
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

async function spotifyUrlToTrack(url: string, requestedBy: string): Promise<Track> {
  const data = await play.spotify(url);
  if (data.type !== 'track') throw new Error('Expected a Spotify track URL.');
  return spotifyTrackToYouTube(data as SpotifyTrack, requestedBy);
}

async function resolveSpotifyCollection(url: string, requestedBy: string): Promise<Track[]> {
  const data = await play.spotify(url);
  if (data.type === 'track') return [await spotifyTrackToYouTube(data as SpotifyTrack, requestedBy)];

  const collection = data as SpotifyPlaylist | SpotifyAlbum;
  await collection.fetch();
  const tracks = await collection.all_tracks();
  const resolved: Track[] = [];
  for (const track of tracks.slice(0, MAX_PLAYLIST_TRACKS)) {
    try {
      resolved.push(await spotifyTrackToYouTube(track, requestedBy));
    } catch {
      // skip unresolvable tracks
    }
  }
  if (!resolved.length) {
    throw new Error('Could not resolve Spotify tracks. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env for playlists/albums.');
  }
  return resolved;
}

async function spotifyTrackToYouTube(spTrack: SpotifyTrack, requestedBy: string): Promise<Track> {
  const artist = spTrack.artists?.[0]?.name ?? '';
  const searchQuery = `${artist} ${spTrack.name}`.trim();
  const results = await play.search(searchQuery, { limit: 1, source: { youtube: 'video' } });
  if (!results.length) throw new Error(`Could not find **${spTrack.name}** on YouTube.`);

  const video = results[0];
  return {
    title: `${spTrack.name}${artist ? ` — ${artist}` : ''}`,
    url: video.url,
    duration: video.durationInSec,
    thumbnail: spTrack.thumbnail?.url ?? video.thumbnails[0]?.url,
    source: 'spotify',
    requestedBy,
  };
}

async function deezerUrlToTrack(url: string, requestedBy: string): Promise<Track> {
  const data = await play.deezer(url);
  if (data.type !== 'track') throw new Error('Expected a Deezer track URL.');
  const track = data as import('play-dl').DeezerTrack;
  const searchQuery = `${track.artist?.name ?? ''} ${track.title}`.trim();
  const results = await play.search(searchQuery, { limit: 1, source: { youtube: 'video' } });
  if (!results.length) throw new Error(`Could not find **${track.title}** on YouTube.`);
  const video = results[0];
  return {
    title: track.title,
    url: video.url,
    duration: video.durationInSec,
    thumbnail: track.album?.cover?.medium ?? video.thumbnails[0]?.url,
    source: 'deezer',
    requestedBy,
  };
}

async function resolveDeezerCollection(url: string, requestedBy: string): Promise<Track[]> {
  const data = await play.deezer(url);
  if (data.type === 'track') return [await deezerUrlToTrack(url, requestedBy)];

  const collection = data as DeezerAlbum | DeezerPlaylist;
  const tracks = await collection.all_tracks();
  const resolved: Track[] = [];
  for (const track of tracks.slice(0, MAX_PLAYLIST_TRACKS)) {
    try {
      const searchQuery = `${track.artist?.name ?? ''} ${track.title}`.trim();
      const results = await play.search(searchQuery, { limit: 1, source: { youtube: 'video' } });
      if (!results.length) continue;
      resolved.push({
        title: track.title,
        url: results[0].url,
        duration: results[0].durationInSec,
        thumbnail: track.album?.cover?.medium,
        source: 'deezer',
        requestedBy,
      });
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
  const results = await play.search(searchQuery, { limit: 1, source: { youtube: 'video' } });
  if (!results.length) throw new Error(`Could not find **${meta.title}** on YouTube.`);

  const video = results[0];
  return [{
    title: meta.artist ? `${meta.title} — ${meta.artist}` : meta.title,
    url: video.url,
    duration: video.durationInSec,
    thumbnail: video.thumbnails[0]?.url,
    source: 'apple',
    requestedBy,
  }];
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
  const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
  if (!results.length) throw new Error(`No results found for **${query}**.`);

  const video = results[0];
  return [{
    title: video.title ?? query,
    url: video.url,
    duration: video.durationInSec,
    thumbnail: video.thumbnails[0]?.url,
    source: 'search',
    requestedBy,
  }];
}

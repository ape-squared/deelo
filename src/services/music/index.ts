import play from 'play-dl';
import { config } from '../../config';
import { initYtDlp } from './ytdlp';
import { spotifyConfigured } from './spotify';

let initialized = false;

export async function initMusicService(): Promise<void> {
  if (initialized) return;

  try {
    const scId = await play.getFreeClientID();
    const tokenOpts: Parameters<typeof play.setToken>[0] = {
      soundcloud: { client_id: scId },
    };

    if (spotifyConfigured()) {
      tokenOpts.spotify = {
        client_id: config.spotifyClientId,
        client_secret: config.spotifyClientSecret,
        refresh_token: '',
        market: 'US',
      };
    }

    if (config.youtubeCookies) {
      tokenOpts.youtube = { cookie: config.youtubeCookies };
    }

    await play.setToken(tokenOpts);
    await initYtDlp();

    initialized = true;
    if (spotifyConfigured()) {
      console.log('Music service ready — Spotify primary (search, playlists, albums) + yt-dlp playback');
    } else {
      console.warn('Music service ready — Spotify credentials missing; search falls back to YouTube');
    }
  } catch (err) {
    console.warn('Music service init warning:', err);
    initialized = true;
  }
}

export { spotifyConfigured, trackDisplayUrl } from './spotify';
export { resolveQuery } from './resolver';
export {
  getMusicQueue,
  getOrCreateQueue,
  deleteQueue,
  enqueueTracks,
  skipTrack,
  pausePlayback,
  resumePlayback,
  setVolume,
  shuffleQueue,
  buildAddedEmbed,
  buildNowPlayingEmbed,
} from './player';
export type { Track, MusicQueue, TrackSource } from './types';
export { formatDuration, sourceLabel } from './types';

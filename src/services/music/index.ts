import play from 'play-dl';
import { config } from '../../config';
import { initYtDlp } from './ytdlp';

let initialized = false;

export async function initMusicService(): Promise<void> {
  if (initialized) return;

  try {
    await initYtDlp();

    const scId = await play.getFreeClientID();
    const tokenOpts: Parameters<typeof play.setToken>[0] = {
      soundcloud: { client_id: scId },
    };

    if (config.spotifyClientId && config.spotifyClientSecret) {
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
    initialized = true;
    console.log('Music service ready (yt-dlp + SoundCloud + Spotify/Apple search)');
  } catch (err) {
    console.warn('Music service init warning:', err);
    initialized = true;
  }
}

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

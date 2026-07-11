import play from 'play-dl';
import { config } from '../../config';
import { initVoiceDependencies } from './voice-deps';
import { ensureSpotifyAccessToken, spotifyConfigured } from './spotify';

let initialized = false;

export async function initMusicService(): Promise<void> {
  if (initialized) return;

  try {
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
    await initVoiceDependencies();
    if (spotifyConfigured()) {
      await ensureSpotifyAccessToken();
    }
    initialized = true;
    if (spotifyConfigured()) {
      console.log('Music service ready — Spotify search, SoundCloud playback');
    } else {
      console.warn('Music service ready — Spotify credentials missing; SoundCloud search fallback');
    }
  } catch (err) {
    console.warn('Music service init warning:', err);
    initialized = true;
  }
}

export { spotifyConfigured, trackDisplayUrl } from './spotify';
export { resolveQuery } from './resolver';
export { resolveRadioStream, isStreamableRadioUrl } from './radio';
export {
  getLiveQueueTracks,
  isRadioActive,
  clearLiveQueue,
  removeLiveQueueTrack,
  parseStreamUrlInput,
  buildRadioHelpEmbed,
  buildRadioQueueEmbed,
  buildRadioSwitchedEmbed,
} from './radio-session';
export {
  getMusicQueue,
  getOrCreateQueue,
  deleteQueue,
  enqueueTracks,
  playRadioNow,
  playRadioQueueIndex,
  skipTrack,
  pausePlayback,
  resumePlayback,
  setVolume,
  shuffleQueue,
  isMusicActive,
  isPlayingAudio,
  canControlPlayback,
  recallTrack,
  applyPreset,
  getActivePreset,
  buildPresetListEmbed,
  buildAddedEmbed,
  buildNowPlayingEmbed,
  recoverVoiceSessions,
} from './manager';
export type { Track, MusicQueue, TrackSource } from './types';
export { formatDuration, sourceLabel } from './types';

export type TrackSource = 'youtube' | 'spotify' | 'soundcloud' | 'apple' | 'deezer' | 'search' | 'radio';

export interface Track {
  title: string;
  /** Stream URL (YouTube, SoundCloud, or direct radio) */
  url: string;
  /** Spotify page when resolved via Spotify */
  spotifyUrl?: string;
  artist?: string;
  duration: number;
  thumbnail?: string;
  source: TrackSource;
  requestedBy: string;
  /** Live internet radio — streamed via FFmpeg, not yt-dlp */
  live?: boolean;
}

export interface MusicQueue {
  tracks: Track[];
  current: Track | null;
  playing: boolean;
  paused: boolean;
  voiceChannel: string;
  textChannel: string;
  volume: number;
  repeat: boolean;
  shuffle: boolean;
  preset: string;
}

export function formatDuration(seconds: number, live = false): string {
  if (live || seconds === 0) return 'LIVE';
  if (!seconds || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function sourceLabel(source: TrackSource): string {
  const labels: Record<TrackSource, string> = {
    youtube: 'YouTube',
    spotify: 'Spotify',
    soundcloud: 'SoundCloud',
    apple: 'Apple Music',
    deezer: 'Deezer',
    search: 'Spotify',
    radio: 'Radio',
  };
  return labels[source];
}

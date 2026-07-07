export type TrackSource = 'youtube' | 'spotify' | 'soundcloud' | 'apple' | 'deezer' | 'search';

export interface Track {
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
  source: TrackSource;
  requestedBy: string;
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
}

export function formatDuration(seconds: number): string {
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
    search: 'Search',
  };
  return labels[source];
}

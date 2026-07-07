export interface LyricsResult {
  title: string;
  artist: string;
  lyrics: string;
}

function splitArtistTitle(query: string): { artist: string; title: string } | null {
  const parts = query.split(/\s[-–|]\s/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return null;
}

export async function fetchLyrics(query: string): Promise<LyricsResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const split = splitArtistTitle(trimmed);

  try {
    if (split?.artist && split.title) {
      const res = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(split.artist)}/${encodeURIComponent(split.title)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { lyrics?: string };
        if (data.lyrics?.trim()) {
          return { artist: split.artist, title: split.title, lyrics: data.lyrics.trim() };
        }
      }
    }
  } catch {
    // fall through to lrclib
  }

  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      trackName?: string;
      artistName?: string;
      plainLyrics?: string;
      syncedLyrics?: string;
    }>;
    const hit = data[0];
    const lyrics = hit?.plainLyrics?.trim() || hit?.syncedLyrics?.trim();
    if (!lyrics) return null;
    return {
      artist: hit.artistName ?? split?.artist ?? 'Unknown artist',
      title: hit.trackName ?? split?.title ?? trimmed,
      lyrics,
    };
  } catch {
    return null;
  }
}

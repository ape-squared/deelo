export function searchLink(title: string, query: string, url: string): { title: string; body: string } {
  return {
    title,
    body: `[Search "${query}"](${url})`,
  };
}

export async function lookupBook(query: string): Promise<string> {
  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`);
    const data = (await res.json()) as { docs?: Array<{ title?: string; author_name?: string[]; first_publish_year?: number }> };
    const hit = data.docs?.[0];
    if (!hit?.title) throw new Error('not found');
    const author = hit.author_name?.[0] ?? 'Unknown author';
    const year = hit.first_publish_year ? ` (${hit.first_publish_year})` : '';
    return `**${hit.title}**${year}\nby ${author}\n[View on Open Library](https://openlibrary.org/search?q=${encodeURIComponent(query)})`;
  } catch {
    return `[Search books](https://openlibrary.org/search?q=${encodeURIComponent(query)})`;
  }
}

export async function lookupAnime(query: string, type: 'anime' | 'manga' = 'anime'): Promise<string> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/${type}?q=${encodeURIComponent(query)}&limit=1`);
    const data = (await res.json()) as { data?: Array<{ title: string; score?: number; url: string; synopsis?: string }> };
    const hit = data.data?.[0];
    if (!hit) throw new Error('not found');
    const synopsis = hit.synopsis ? `\n${hit.synopsis.slice(0, 300)}${hit.synopsis.length > 300 ? '…' : ''}` : '';
    return `**${hit.title}**${hit.score ? ` · ⭐ ${hit.score}` : ''}${synopsis}\n[MyAnimeList](${hit.url})`;
  } catch {
    const path = type === 'manga' ? 'manga' : 'anime';
    return `[Search on MyAnimeList](https://myanimelist.net/${path}.php?q=${encodeURIComponent(query)})`;
  }
}

export async function lookupMovie(query: string): Promise<string> {
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=trilogy`);
    const data = (await res.json()) as { Response?: string; Title?: string; Year?: string; imdbRating?: string; Plot?: string; imdbID?: string };
    if (data.Response === 'False' || !data.Title) throw new Error('not found');
    const plot = data.Plot && data.Plot !== 'N/A' ? `\n${data.Plot.slice(0, 280)}${data.Plot.length > 280 ? '…' : ''}` : '';
    const rating = data.imdbRating && data.imdbRating !== 'N/A' ? ` · ⭐ ${data.imdbRating}` : '';
    const imdb = data.imdbID ? `https://www.imdb.com/title/${data.imdbID}/` : `https://www.imdb.com/find?q=${encodeURIComponent(query)}`;
    return `**${data.Title}** (${data.Year ?? '?'})${rating}${plot}\n[IMDb](${imdb})`;
  } catch {
    return `[Search on IMDb](https://www.imdb.com/find?q=${encodeURIComponent(query)})`;
  }
}

export async function lookupTvShow(query: string): Promise<string> {
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&type=series&apikey=trilogy`);
    const data = (await res.json()) as { Response?: string; Title?: string; Year?: string; imdbRating?: string; Plot?: string; imdbID?: string };
    if (data.Response === 'False' || !data.Title) throw new Error('not found');
    const plot = data.Plot && data.Plot !== 'N/A' ? `\n${data.Plot.slice(0, 280)}…` : '';
    const imdb = data.imdbID ? `https://www.imdb.com/title/${data.imdbID}/` : `https://www.imdb.com/find?q=${encodeURIComponent(query)}`;
    return `**${data.Title}** (${data.Year ?? '?'})${plot}\n[IMDb](${imdb})`;
  } catch {
    return `[Search TV shows](https://www.imdb.com/find?q=${encodeURIComponent(query)})`;
  }
}

export async function lookupCharacter(query: string): Promise<string> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(query)}&limit=1`);
    const data = (await res.json()) as { data?: Array<{ name: string; url: string; about?: string }> };
    const hit = data.data?.[0];
    if (!hit) throw new Error('not found');
    const about = hit.about ? `\n${hit.about.slice(0, 300)}…` : '';
    return `**${hit.name}**${about}\n[MyAnimeList](${hit.url})`;
  } catch {
    return `[Search characters](https://myanimelist.net/character.php?q=${encodeURIComponent(query)})`;
  }
}

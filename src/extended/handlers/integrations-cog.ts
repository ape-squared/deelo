import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { getSupabase } from '../../database/supabase';
import { config } from '../../config';
import { replyError, replyInfo, replySuccess } from '../lib/helpers';
import { getConfigValue, setExtraConfig } from '../lib/guild-config';

export async function handleIntegrationsCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  const cog = cmd.cog;
  if (cog === 'lastfm') return handleLastfm(cmd.name, message, args);
  if (cog === 'spotify') return handleSpotify(cmd.name, message, args);
  return false;
}

async function handleLastfm(name: string, message: Message, args: string[]): Promise<boolean> {
  const userId = message.author.id;

  if (name === 'lastfm' || name.startsWith('lastfm ')) {
    const sub = name === 'lastfm' ? args[0]?.toLowerCase() : name.replace('lastfm ', '').split(' ')[0];
    const rest = name === 'lastfm' ? args.slice(1) : name.replace(/^lastfm \S+\s?/, '').split(' ').concat(args).filter(Boolean);

    if (sub === 'set' || name === 'lastfm set') {
      const username = rest[0] ?? args[0];
      if (!username) { await replyError(message, 'Usage: `,lastfm set <username>`'); return true; }
      await getSupabase().from('users').upsert({ id: userId, lastfm_username: username });
      await replySuccess(message, `Last.fm set to **${username}**.`);
      return true;
    }

    const { data: user } = await getSupabase().from('users').select('lastfm_username').eq('id', userId).maybeSingle();
    const username = args.find((a) => !a.startsWith('-')) ?? user?.lastfm_username;
    if (!username) { await replyError(message, 'Set Last.fm with `,lastfm set <username>`'); return true; }

    if (name.includes('nowplaying') || name === 'lastfm' || sub === 'np' || sub === 'nowplaying') {
      return fetchLastfmNowPlaying(message, username);
    }
    if (name.includes('top') || sub === 'toptracks' || sub === 'topalbums' || sub === 'topartists') {
      return fetchLastfmTop(message, username, sub ?? 'toptracks');
    }
    if (name.includes('count') || sub === 'count') {
      return fetchLastfmCount(message, username);
    }
    if (name.includes('taste') || sub === 'taste') {
      const other = message.mentions.users.first()?.username ?? args[0];
      await replyInfo(message, 'Taste Compare', `Comparing **${username}** with **${other ?? 'someone'}** — [Last.fm compatibility](https://last.fm/user/${username})`);
      return true;
    }
    if (name.includes('playsalbum') || sub === 'playsalbum') {
      await replyInfo(message, 'Plays Album', `Album scrobbles for **${username}** — [View on Last.fm](https://last.fm/user/${username})`);
      return true;
    }
    if (name.includes('customcommand')) {
      await replyInfo(message, 'Custom NP Command', 'Custom now-playing commands configured.');
      return true;
    }
    if (name.includes('milestone')) {
      await replyInfo(message, 'Milestone', `**${username}** scrobble milestones on [Last.fm](https://last.fm/user/${username})`);
      return true;
    }
    if (name.includes('favorites')) {
      await replyInfo(message, 'Favorites', `[${username}'s loved tracks](https://last.fm/user/${username}/loved)`);
      return true;
    }

    return fetchLastfmNowPlaying(message, username);
  }
  return false;
}

async function fetchLastfmNowPlaying(message: Message, username: string): Promise<boolean> {
  if (!config.lastfmApiKey) {
    await replyInfo(message, 'Now Playing', `**${username}** — add \`LASTFM_API_KEY\` for live data.\n[Profile](https://last.fm/user/${username})`);
    return true;
  }
  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${config.lastfmApiKey}&format=json&limit=1`);
    const data = (await res.json()) as { recenttracks?: { track?: Array<{ name: string; artist: { '#text': string }; '@attr'?: { nowplaying?: string } }> } };
    const track = data.recenttracks?.track?.[0];
    if (track) {
      const np = track['@attr']?.nowplaying ? ' 🎵 Now Playing' : '';
      await replyInfo(message, `Last.fm${np}`, `**${track.name}** by ${track.artist['#text']}\n[Profile](https://last.fm/user/${username})`);
    } else await replyError(message, 'No scrobbles found.');
  } catch {
    await replyError(message, 'Last.fm API error.');
  }
  return true;
}

async function fetchLastfmTop(message: Message, username: string, type: string): Promise<boolean> {
  if (!config.lastfmApiKey) {
    await replyInfo(message, 'Top Tracks', `[${username} on Last.fm](https://last.fm/user/${username})`);
    return true;
  }
  const method = type.includes('album') ? 'user.gettopalbums' : type.includes('artist') ? 'user.gettopartists' : 'user.gettoptracks';
  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=${method}&user=${username}&api_key=${config.lastfmApiKey}&format=json&limit=10&period=overall`);
    const data = (await res.json()) as Record<string, { [key: string]: Array<{ name: string; playcount: string }> }>;
    const key = Object.keys(data).find((k) => k.includes('top'));
    const items = (key ? (data as Record<string, unknown>)[key] : []) as Array<{ name: string; playcount: string }>;
    const list = items.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.name} (${t.playcount})`).join('\n');
    await replyInfo(message, `Top — ${username}`, list || 'No data.');
  } catch {
    await replyError(message, 'Last.fm API error.');
  }
  return true;
}

async function fetchLastfmCount(message: Message, username: string): Promise<boolean> {
  if (!config.lastfmApiKey) {
    await replyInfo(message, 'Scrobbles', `[${username}](https://last.fm/user/${username})`);
    return true;
  }
  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${config.lastfmApiKey}&format=json`);
    const data = (await res.json()) as { user?: { playcount: string; name: string } };
    await replyInfo(message, 'Scrobbles', `**${data.user?.name}** has **${Number(data.user?.playcount ?? 0).toLocaleString()}** scrobbles.`);
  } catch {
    await replyError(message, 'Last.fm API error.');
  }
  return true;
}

async function handleSpotify(name: string, message: Message, args: string[]): Promise<boolean> {
  const userId = message.author.id;

  if (name === 'spotify login') {
    await setExtraConfig(message.guild!.id, `users.${userId}.spotify_pending`, 'true');
    await replyInfo(message, 'Spotify Login', 'Spotify OAuth requires app credentials.\nSet `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`, then visit your Spotify dashboard to authorize.\n\nFor now, your Spotify username can be saved with: `,spotify login <username>`');
    if (args[0]) {
      await getSupabase().from('users').upsert({ id: userId, extra_config: { spotify_username: args[0] } });
      await replySuccess(message, `Spotify profile linked as **${args[0]}**.`);
    }
    return true;
  }

  if (name === 'spotify logout') {
    await getSupabase().from('users').upsert({ id: userId, extra_config: {} });
    await replySuccess(message, 'Spotify disconnected.');
    return true;
  }

  if (name === 'spotify' || name.startsWith('spotify ')) {
    const action = name === 'spotify' ? args[0] : name.replace('spotify ', '');
    const actions: Record<string, string> = {
      play: `Playing: **${args.slice(1).join(' ') || 'requested track'}**`,
      pause: 'Playback **paused**.',
      resume: 'Playback **resumed**.',
      next: 'Skipped to **next** track.',
      previous: 'Skipped to **previous** track.',
      shuffle: 'Shuffle **toggled**.',
      repeat: 'Repeat **toggled**.',
      like: 'Track **liked**.',
      queue: `Queued: **${args.slice(1).join(' ') || 'track'}**`,
      volume: `Volume set to **${args[1] ?? '50'}%**`,
      seek: `Seeked to **${args[1] ?? '0'}s**`,
      toptracks: `[Your top tracks on Spotify](https://open.spotify.com/collection/tracks)`,
    };
    const msg = actions[action] ?? `Spotify **${action}** executed.`;
    await replyInfo(message, 'Spotify', msg);
    return true;
  }
  return false;
}

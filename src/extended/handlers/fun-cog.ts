import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { replyError, replyInfo, deeloEmbed } from '../lib/helpers';
import { fetchLyrics } from '../../lib/lyrics';
import { getConfigValue, setExtraConfig } from '../lib/guild-config';
import {
  lookupAnime,
  lookupBook,
  lookupCharacter,
  lookupMovie,
  lookupTvShow,
  searchLink,
} from '../lib/fun-lookups';
import { replyWithMediaEffect, resolveImageUrl } from '../../lib/reply-media';
import { requirePremium } from '../../premium/check';

type TagEntry = { id: string; authorId: string; authorTag: string; text: string; createdAt: string };

const TAGS_PATH = 'fun.tags';

async function loadTags(guildId: string): Promise<TagEntry[]> {
  const raw = await getConfigValue<TagEntry[]>(guildId, TAGS_PATH);
  return Array.isArray(raw) ? raw : [];
}

async function saveTags(guildId: string, tags: TagEntry[]): Promise<void> {
  await setExtraConfig(guildId, TAGS_PATH, tags);
}

export async function handleFunCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'fun') return false;
  const name = cmd.name;
  const guildId = message.guild!.id;
  const query = args.join(' ').trim();

  if (name === 'google' || name === 'g') {
    if (!query) { await replyError(message, 'Usage: `,google <query>`'); return true; }
    await replyInfo(message, 'Google', `[Search "${query}"](https://www.google.com/search?q=${encodeURIComponent(query)})`);
    return true;
  }
  if (name === 'duckduckgo' || name === 'ddg') {
    if (!query) { await replyError(message, 'Usage: `,duckduckgo <query>`'); return true; }
    await replyInfo(message, 'DuckDuckGo', `[Search](https://duckduckgo.com/?q=${encodeURIComponent(query)})`);
    return true;
  }
  if (name === 'youtube' || name === 'yt') {
    if (!query) { await replyError(message, 'Usage: `,youtube <query>`'); return true; }
    await replyInfo(message, 'YouTube', `[Search](https://www.youtube.com/results?search_query=${encodeURIComponent(query)})`);
    return true;
  }
  if (name === 'giphy') {
    const q = query || 'funny';
    try {
      const res = await fetch(`https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&limit=1`);
      const data = (await res.json()) as { results?: Array<{ media: Array<{ gif: { url: string } }> }> };
      const url = data.results?.[0]?.media?.[0]?.gif?.url;
      if (url) await message.reply({ embeds: [deeloEmbed('GIF', q).setImage(url)] });
      else await replyInfo(message, 'GIF', `[Search GIFs](https://giphy.com/search/${encodeURIComponent(q)})`);
    } catch {
      await replyInfo(message, 'GIF', `[Search](https://giphy.com/search/${encodeURIComponent(q)})`);
    }
    return true;
  }
  if (name === 'tenor') {
    const q = query || 'funny';
    await replyInfo(message, 'Tenor', `[Search GIFs](https://tenor.com/search/${encodeURIComponent(q)}-gifs)`);
    return true;
  }
  if (name === 'image' || name === 'duckduckgoimage') {
    if (!query) { await replyError(message, 'Usage: `,image <query>`'); return true; }
    await replyInfo(message, 'Image Search', `[Google Images](https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)})`);
    return true;
  }
  if (name === 'reverseimage') {
    const url = args[0] ?? message.attachments.first()?.url;
    if (!url) { await replyError(message, 'Provide an image URL or attachment.'); return true; }
    await replyInfo(message, 'Reverse Image', `[Search](https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)})`);
    return true;
  }
  if (name === 'quote') {
    const ref = message.reference?.messageId;
    if (!ref) { await replyError(message, 'Reply to a message.'); return true; }
    const quoted = await message.channel.messages.fetch(ref).catch(() => null);
    if (!quoted) { await replyError(message, 'Could not fetch message.'); return true; }
    await message.reply({
      embeds: [deeloEmbed('Quote', quoted.content || '[attachment]').setAuthor({ name: quoted.author.tag, iconURL: quoted.author.displayAvatarURL() })],
    });
    return true;
  }
  if (name === 'lyrics') {
    if (!query) { await replyError(message, 'Usage: `,lyrics <song>` or `,lyrics Artist - Song`'); return true; }
    const result = await fetchLyrics(query);
    if (!result) {
      await replyInfo(message, 'Lyrics', `No lyrics found. [Search on Genius](https://genius.com/search?q=${encodeURIComponent(query)})`);
      return true;
    }
    const header = `**${result.artist}** — ${result.title}`;
    const body = result.lyrics.length > 1900 ? `${result.lyrics.slice(0, 1900)}…` : result.lyrics;
    await message.reply({ embeds: [deeloEmbed('Lyrics', `${header}\n\n${body}`)] });
    return true;
  }
  if (name === 'choose') {
    const choices = query.split(/,|\|/).map((s) => s.trim()).filter(Boolean);
    if (choices.length < 2) { await replyError(message, 'Provide 2+ choices separated by commas.'); return true; }
    await replyInfo(message, 'I choose...', `**${choices[Math.floor(Math.random() * choices.length)]}**`);
    return true;
  }
  if (name === 'rps') {
    const opts = ['rock', 'paper', 'scissors'];
    const user = args[0]?.toLowerCase();
    if (!user || !opts.includes(user)) { await replyError(message, 'Usage: `,rps rock|paper|scissors`'); return true; }
    const bot = opts[Math.floor(Math.random() * 3)];
    const win = (user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper');
    await replyInfo(message, 'RPS', `You: **${user}** | Bot: **${bot}**\n${user === bot ? 'Tie!' : win ? 'You win!' : 'You lose!'}`);
    return true;
  }
  if (name === 'wouldyourather' || name === 'wyr') {
    try {
      const res = await fetch('https://would-you-rather-api.abaanshanidhar.repl.co/');
      const data = (await res.json()) as { data?: Array<{ question: string }> };
      const q = data.data?.[0]?.question;
      if (q) await replyInfo(message, 'Would You Rather', q);
      else throw new Error('no data');
    } catch {
      await replyInfo(message, 'Would You Rather', '**A:** Have unlimited pizza\n**B:** Have unlimited coffee');
    }
    return true;
  }

  if (name === '8ball' || name === 'tictactoe' || name.startsWith('tictactoe') || name === 'blacktea' || name.startsWith('blacktea') || name === 'juul' || name.startsWith('juul') || name === 'game' || name === 'move') {
    return false;
  }

  if (name === 'steal') {
    const guild = message.guild!;
    const emojiMatch = message.content.match(/<a?:\w+:(\d+)>/);
    const emojiId = emojiMatch?.[1] ?? args[0]?.match(/(\d{15,})/)?.[1];
    const sourceEmoji = emojiId ? guild.emojis.cache.get(emojiId) : null;
    const external = message.content.match(/<a?:(\w+):(\d+)>/);
    if (!external && !sourceEmoji) {
      await replyError(message, 'Usage: `,steal :emoji:` or include a custom emoji in the message.');
      return true;
    }
    const ext = external ?? (sourceEmoji ? [null, sourceEmoji.name, sourceEmoji.id] : null);
    if (!ext) { await replyError(message, 'Could not parse that emoji.'); return true; }
    const [, ename, eid] = ext;
    const animated = message.content.includes(`<a:${ename}:`);
    const url = `https://cdn.discordapp.com/emojis/${eid}.${animated ? 'gif' : 'png'}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const buf = Buffer.from(await res.arrayBuffer());
      const created = await guild.emojis.create({ attachment: buf, name: ename ?? 'stolen' });
      await replyInfo(message, 'Steal', `Added ${created} to this server.`);
    } catch {
      await replyError(message, 'Could not steal that emoji. Check **Manage Emojis** permission.');
    }
    return true;
  }

  if (name === 'meme') {
    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = (await res.json()) as { title: string; url: string; postLink: string };
      await message.reply({ embeds: [deeloEmbed(data.title, `[Source](${data.postLink})`).setImage(data.url)] });
    } catch {
      await replyError(message, 'Failed to fetch meme.');
    }
    return true;
  }
  if (name === 'fact') {
    try {
      const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
      const data = (await res.json()) as { text: string };
      await replyInfo(message, 'Random Fact', data.text);
    } catch {
      await replyInfo(message, 'Fact', 'Honey never spoils.');
    }
    return true;
  }
  if (name === 'joke') {
    try {
      const res = await fetch('https://official-joke-api.appspot.com/random_joke');
      const data = (await res.json()) as { setup: string; punchline: string };
      await replyInfo(message, 'Joke', `${data.setup}\n\n*${data.punchline}*`);
    } catch {
      await replyInfo(message, 'Joke', 'Why do programmers prefer dark mode? Because light attracts bugs.');
    }
    return true;
  }
  if (name === 'compliment') {
    const compliments = ['You\'re awesome!', 'You brighten the server!', 'You\'re a great person!', 'Keep being you!'];
    const target = message.mentions.users.first() ?? message.author;
    await replyInfo(message, 'Compliment', `${target}, ${compliments[Math.floor(Math.random() * compliments.length)]}`);
    return true;
  }
  if (name === 'roast') {
    const target = message.mentions.users.first();
    if (!target) { await replyError(message, 'Mention someone to roast.'); return true; }
    const roasts = ['is the reason the gene pool needs a lifeguard.', 'has an IQ lower than their ping.', 'is proof that evolution can go in reverse.'];
    await replyInfo(message, 'Roast', `${target.username} ${roasts[Math.floor(Math.random() * roasts.length)]}`);
    return true;
  }

  if (name === 'book') {
    if (!query) { await replyError(message, 'Usage: `,book <title>`'); return true; }
    await replyInfo(message, 'Book', await lookupBook(query));
    return true;
  }
  if (name === 'manga') {
    if (!query) { await replyError(message, 'Usage: `,manga <title>`'); return true; }
    await replyInfo(message, 'Manga', await lookupAnime(query, 'manga'));
    return true;
  }
  if (name === 'anime') {
    if (!query) { await replyError(message, 'Usage: `,anime <title>`'); return true; }
    await replyInfo(message, 'Anime', await lookupAnime(query, 'anime'));
    return true;
  }
  if (name === 'character') {
    if (!query) { await replyError(message, 'Usage: `,character <name>`'); return true; }
    await replyInfo(message, 'Character', await lookupCharacter(query));
    return true;
  }
  if (name === 'movie' || name === 'movie expand') {
    if (!query) { await replyError(message, 'Usage: `,movie <title>`'); return true; }
    await replyInfo(message, 'Movie', await lookupMovie(query));
    return true;
  }
  if (name === 'tvshow') {
    if (!query) { await replyError(message, 'Usage: `,tvshow <title>`'); return true; }
    await replyInfo(message, 'TV Show', await lookupTvShow(query));
    return true;
  }
  if (name === 'lego') {
    if (!query) { await replyError(message, 'Usage: `,lego <set name>`'); return true; }
    const link = searchLink('LEGO', query, `https://www.bricklink.com/v2/search.page?q=${encodeURIComponent(query)}`);
    await replyInfo(message, link.title, link.body);
    return true;
  }
  if (name === 'wolfram') {
    if (!query) { await replyError(message, 'Usage: `,wolfram <query>`'); return true; }
    const link = searchLink('Wolfram Alpha', query, `https://www.wolframalpha.com/input?i=${encodeURIComponent(query)}`);
    await replyInfo(message, link.title, link.body);
    return true;
  }
  if (name === 'tone') {
    if (!query) { await replyError(message, 'Usage: `,tone <text>`'); return true; }
    const positive = /\b(love|great|awesome|happy|good|thanks|amazing)\b/i.test(query);
    const negative = /\b(hate|bad|angry|sad|terrible|awful|stupid)\b/i.test(query);
    const tone = positive ? 'Positive 🙂' : negative ? 'Negative 😠' : 'Neutral 😐';
    await replyInfo(message, 'Tone', `${tone}\n\n*"${query.slice(0, 500)}"*`);
    return true;
  }
  if (name === 'ocr' || name === 'ocrtr') {
    const url = args[0] ?? message.attachments.first()?.url;
    if (!url) { await replyError(message, 'Attach an image or provide a URL.'); return true; }
    await replyInfo(message, 'OCR', `[Extract text with Google Lens](https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)})`);
    return true;
  }
  if (name === 'translate') {
    return false;
  }
  if (name === 'tts' || name === 'tts channel') {
    if (!(await requirePremium(message, 'tts'))) return true;
    await replyInfo(message, 'TTS', 'Premium text-to-speech is not wired to voice yet. Join VC and use dashboard settings when available.');
    return true;
  }
  if (name === 'makegif') {
    if (!(await requirePremium(message, 'makegif'))) return true;
    const imageUrl = resolveImageUrl(message, args);
    if (!imageUrl) { await replyError(message, 'Attach an image or pass a URL.'); return true; }
    return replyWithMediaEffect(message, 'gifmagik', imageUrl);
  }
  if (name === 'transparent') {
    if (!(await requirePremium(message, 'backgroundRemoval'))) return true;
    const imageUrl = resolveImageUrl(message, args);
    if (!imageUrl) { await replyError(message, 'Attach an image or pass a URL.'); return true; }
    return replyWithMediaEffect(message, 'magik', imageUrl);
  }

  if (name.startsWith('tags')) {
    const tags = await loadTags(guildId);
    if (name === 'tags' && !query) {
      await replyInfo(message, 'Tags', 'Use `,tags add <text>`, `,tags list`, `,tags random`, or `,tags remove <id>`.');
      return true;
    }
    if (name === 'tags add' || (name === 'tags' && args[0]?.toLowerCase() === 'add')) {
      const text = name === 'tags add' ? query : args.slice(1).join(' ').trim();
      if (!text) { await replyError(message, 'Usage: `,tags add <text>`'); return true; }
      const entry: TagEntry = {
        id: String(Date.now()),
        authorId: message.author.id,
        authorTag: message.author.tag,
        text: text.slice(0, 500),
        createdAt: new Date().toISOString(),
      };
      tags.push(entry);
      await saveTags(guildId, tags.slice(-200));
      await replyInfo(message, 'Tags', `Tag **#${entry.id}** saved.`);
      return true;
    }
    if (name === 'tags list' || (name === 'tags' && args[0]?.toLowerCase() === 'list')) {
      const mine = tags.filter((t) => t.authorId === message.author.id);
      const list = (mine.length ? mine : tags).slice(-10).map((t) => `**#${t.id}** ${t.text.slice(0, 80)}`).join('\n');
      await replyInfo(message, 'Tags', list || 'No tags yet.');
      return true;
    }
    if (name === 'tags random' || (name === 'tags' && args[0]?.toLowerCase() === 'random')) {
      if (!tags.length) { await replyError(message, 'No tags in this server yet.'); return true; }
      const pick = tags[Math.floor(Math.random() * tags.length)];
      await replyInfo(message, 'Random Tag', `**${pick.authorTag}:** ${pick.text}`);
      return true;
    }
    if (name === 'tags remove' || (name === 'tags' && args[0]?.toLowerCase() === 'remove')) {
      const id = name === 'tags remove' ? args[0] : args[1];
      if (!id) { await replyError(message, 'Usage: `,tags remove <id>`'); return true; }
      const next = tags.filter((t) => !(t.id === id && (t.authorId === message.author.id || message.member!.permissions.has('ManageMessages'))));
      if (next.length === tags.length) { await replyError(message, 'Tag not found or you cannot remove it.'); return true; }
      await saveTags(guildId, next);
      await replyInfo(message, 'Tags', `Removed tag **#${id}**.`);
      return true;
    }
    if (name === 'tags search' && query) {
      const hits = tags.filter((t) => t.text.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
      await replyInfo(message, 'Tag Search', hits.map((t) => `**#${t.id}** ${t.text.slice(0, 80)}`).join('\n') || 'No matches.');
      return true;
    }
    await replyInfo(message, 'Tags', 'Supported: `add`, `list`, `random`, `remove`, `search`.');
    return true;
  }

  if (query) {
    await replyError(message, `**${name}** isn't fully supported yet. Try \`,help ${name}\`.`);
    return true;
  }

  return false;
}

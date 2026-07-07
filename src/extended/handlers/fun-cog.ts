import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { replyError, replyInfo, replySuccess, deeloEmbed } from '../lib/helpers';

export async function handleFunCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'fun') return false;
  const name = cmd.name;

  if (name === 'google' || name === 'g') {
    const q = args.join(' ');
    if (!q) { await replyError(message, 'Usage: `,google <query>`'); return true; }
    await replyInfo(message, 'Google', `[Search "${q}"](https://www.google.com/search?q=${encodeURIComponent(q)})`);
    return true;
  }
  if (name === 'duckduckgo' || name === 'ddg') {
    const q = args.join(' ');
    if (!q) { await replyError(message, 'Usage: `,duckduckgo <query>`'); return true; }
    await replyInfo(message, 'DuckDuckGo', `[Search](https://duckduckgo.com/?q=${encodeURIComponent(q)})`);
    return true;
  }
  if (name === 'youtube' || name === 'yt') {
    const q = args.join(' ');
    if (!q) { await replyError(message, 'Usage: `,youtube <query>`'); return true; }
    await replyInfo(message, 'YouTube', `[Search](https://www.youtube.com/results?search_query=${encodeURIComponent(q)})`);
    return true;
  }
  if (name === 'giphy') {
    const q = args.join(' ') || 'funny';
    try {
      const res = await fetch(`https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&limit=1`);
      const data = (await res.json()) as { results?: Array<{ media: Array<{ gif: { url: string } }> }> };
      const url = data.results?.[0]?.media?.[0]?.gif?.url;
      if (url) await message.reply({ embeds: [deeloEmbed('Giphy', q).setImage(url)] });
      else await replyInfo(message, 'Giphy', `[Search GIFs](https://giphy.com/search/${encodeURIComponent(q)})`);
    } catch {
      await replyInfo(message, 'Giphy', `[Search](https://giphy.com/search/${encodeURIComponent(q)})`);
    }
    return true;
  }
  if (name === 'tenor') {
    const q = args.join(' ') || 'funny';
    await replyInfo(message, 'Tenor', `[Search GIFs](https://tenor.com/search/${encodeURIComponent(q)}-gifs)`);
    return true;
  }
  if (name === 'image' || name === 'duckduckgoimage') {
    const q = args.join(' ');
    if (!q) { await replyError(message, 'Usage: `,image <query>`'); return true; }
    await replyInfo(message, 'Image Search', `[Google Images](https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)})`);
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
    await message.reply({ embeds: [deeloEmbed('Quote', quoted.content || '[attachment]').setAuthor({ name: quoted.author.tag, iconURL: quoted.author.displayAvatarURL() })] });
    return true;
  }
  if (name === 'lyrics') {
    const song = args.join(' ');
    if (!song) { await replyError(message, 'Usage: `,lyrics <song>`'); return true; }
    try {
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(args[0] ?? '')}/${encodeURIComponent(args.slice(1).join(' '))}`);
      const data = (await res.json()) as { lyrics?: string };
      await replyInfo(message, song, data.lyrics?.slice(0, 2000) ?? 'Lyrics not found.');
    } catch {
      await replyInfo(message, 'Lyrics', `[Search on Genius](https://genius.com/search?q=${encodeURIComponent(song)})`);
    }
    return true;
  }
  if (name === 'choose') {
    const choices = args.join(' ').split(/,|\|/).map((s) => s.trim()).filter(Boolean);
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
  if (name === 'wouldyourather') {
    await replyInfo(message, 'Would You Rather', `**A:** ${args[0] ?? 'Option A'}\n**B:** ${args[1] ?? 'Option B'}`);
    return true;
  }
  if (name === '8ball') return false;
  if (name === 'tictactoe' || name.startsWith('tictactoe')) return false;
  if (name === 'blacktea' || name.startsWith('blacktea')) return false;
  if (name === 'juul' || name.startsWith('juul')) return false;
  if (name === 'game') return false;
  if (name === 'move') return false;
  if (name === 'steal') {
    const emote = message.guild!.emojis.cache.random();
    await replyInfo(message, 'Steal', emote ? `Recent emoji: ${emote}` : 'No emojis found.');
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
    await replySuccess(message, `${target}, ${compliments[Math.floor(Math.random() * compliments.length)]}`);
    return true;
  }
  if (name === 'roast') {
    const target = message.mentions.users.first();
    if (!target) { await replyError(message, 'Mention someone to roast.'); return true; }
    const roasts = ['is the reason the gene pool needs a lifeguard.', 'has an IQ lower than their ping.', 'is proof that evolution can go in reverse.'];
    await replyInfo(message, 'Roast', `${target.username} ${roasts[Math.floor(Math.random() * roasts.length)]}`);
    return true;
  }

  return false;
}

import { EmbedBuilder, type Message } from 'discord.js';
import type { CommandDef } from '../types';
import { getSupabase } from '../../database/supabase';
import { config } from '../../config';
import { replyError, replyInfo, replySuccess, deeloEmbed } from '../lib/helpers';

export async function handleMiscCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'misc') return false;
  const name = cmd.name;
  const guildId = message.guild!.id;

  if (name.startsWith('embed')) return handleEmbed(name, message, args);
  if (name === 'chatgpt' || name === 'gpt' || name === 'ai') return false;
  if (name === 'uwu') {
    const text = args.join(' ');
    if (!text) { await replyError(message, 'Usage: `,uwu <text>`'); return true; }
    const uwu = text.replace(/[rl]/gi, (m) => (m === m.toUpperCase() ? 'W' : 'w')).replace(/n([aeiou])/gi, 'ny$1') + ' uwu';
    await replyInfo(message, 'UwU', uwu);
    return true;
  }
  if (name === 'freaky') {
    const text = args.join(' ');
    if (!text) { await replyError(message, 'Usage: `,freaky <text>`'); return true; }
    await replyInfo(message, 'Freaky', text.split('').join('.') + ' 💀');
    return true;
  }
  if (name.startsWith('discog')) {
    await replyInfo(message, 'Discogs', 'Connect with `,discog login` — stores your Discogs username in profile.\nSearch: `,discog search <album>`');
    if (name === 'discog search' && args.length) {
      await replyInfo(message, 'Discogs', `[Search "${args.join(' ')}"](https://www.discogs.com/search/?q=${encodeURIComponent(args.join(' '))}&type=all)`);
    }
    return true;
  }
  if (name === 'createembed' || name === 'ce') {
    const text = args.join(' ');
    const [title, desc] = text.split('|').map((s) => s.trim());
    await message.reply({ embeds: [deeloEmbed(title || 'Embed', desc || '')] });
    return true;
  }
  if (name === 'poll' || name === 'quickpoll') return false;

  if (name === 'rps') {
    const opts = ['rock', 'paper', 'scissors'];
    const user = args[0]?.toLowerCase();
    if (!user || !opts.includes(user)) { await replyError(message, 'Usage: `,rps rock|paper|scissors`'); return true; }
    const bot = opts[Math.floor(Math.random() * 3)];
    const win = (user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper');
    await replyInfo(message, 'RPS', `You: **${user}** | Bot: **${bot}**\n${user === bot ? 'Tie!' : win ? 'You win!' : 'You lose!'}`);
    return true;
  }
  if (name === 'choose') {
    const choices = args.join(' ').split(/,|\|/).map((s) => s.trim()).filter(Boolean);
    if (choices.length < 2) { await replyError(message, 'Provide 2+ choices separated by commas.'); return true; }
    await replyInfo(message, 'I choose...', `**${choices[Math.floor(Math.random() * choices.length)]}**`);
    return true;
  }
  if (name === 'wouldyourather') {
    const a = args[0] ?? 'Option A';
    const b = args[1] ?? 'Option B';
    await replyInfo(message, 'Would You Rather', `**A:** ${a}\n**B:** ${b}\n\nI'd pick **${Math.random() < 0.5 ? a : b}**`);
    return true;
  }
  if (name === 'randomhex') {
    const hex = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
    await replyInfo(message, 'Random Color', hex);
    return true;
  }
  if (name === 'charinfo') {
    const ch = args[0]?.[0];
    if (!ch) { await replyError(message, 'Usage: `,charinfo <character>`'); return true; }
    await replyInfo(message, 'Character Info', `\`${ch}\` — Unicode: U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`);
    return true;
  }

  return false;
}

async function handleEmbed(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (!message.member!.permissions.has('ManageMessages')) {
    await replyError(message, 'Need **Manage Messages**.');
    return true;
  }

  if (name === 'embed list') {
    const { data } = await getSupabase().from('saved_embeds').select('name').eq('guild_id', guildId);
    await replyInfo(message, 'Saved Embeds', data?.map((e) => `\`${e.name}\``).join(', ') || 'None.');
    return true;
  }

  if (name === 'embed create' || name === 'embed') {
    const embedName = args[0];
    const content = args.slice(1).join(' ');
    if (!embedName) { await replyError(message, 'Usage: `,embed create <name> <title> | <description>`'); return true; }
    const [title, desc] = content.split('|').map((s) => s.trim());
    const json = { title: title || embedName, description: desc || '', color: config.botColor };
    await getSupabase().from('saved_embeds').upsert({ guild_id: guildId, name: embedName.toLowerCase(), embed_json: json, created_by: message.author.id }, { onConflict: 'guild_id,name' });
    await replySuccess(message, `Embed **${embedName}** saved.`);
    return true;
  }

  if (name === 'embed preview' || name === 'embed view') {
    const embedName = args[0]?.toLowerCase();
    if (!embedName) { await replyError(message, 'Usage: `,embed preview <name>`'); return true; }
    const { data } = await getSupabase().from('saved_embeds').select('embed_json').eq('guild_id', guildId).eq('name', embedName).maybeSingle();
    if (!data) { await replyError(message, 'Embed not found.'); return true; }
    const j = data.embed_json as { title: string; description: string; color?: number };
    await message.reply({ embeds: [new EmbedBuilder().setTitle(j.title).setDescription(j.description).setColor(j.color ?? config.botColor)] });
    return true;
  }

  if (name === 'embed delete' || name === 'embed del') {
    const embedName = args[0]?.toLowerCase();
    if (!embedName) { await replyError(message, 'Usage: `,embed delete <name>`'); return true; }
    await getSupabase().from('saved_embeds').delete().eq('guild_id', guildId).eq('name', embedName);
    await replySuccess(message, `Deleted embed **${embedName}**.`);
    return true;
  }

  if (name === 'embed copy') {
    const link = args[0];
    if (!link) { await replyError(message, 'Provide a message link.'); return true; }
    const parts = link.split('/');
    const msgId = parts[parts.length - 1];
    const chId = parts[parts.length - 2];
    const ch = message.guild!.channels.cache.get(chId);
    if (!ch?.isTextBased()) { await replyError(message, 'Invalid link.'); return true; }
    const msg = await ch.messages.fetch(msgId).catch(() => null);
    if (!msg?.embeds[0]) { await replyError(message, 'No embed in that message.'); return true; }
    await message.reply({ embeds: [EmbedBuilder.from(msg.embeds[0].data)] });
    return true;
  }

  await replyInfo(message, 'Embeds', 'Commands: `create`, `preview`, `list`, `delete`, `copy`');
  return true;
}

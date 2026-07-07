import { type Message, type TextChannel } from 'discord.js';
import type { CommandDef } from '../types';
import { getSupabase } from '../../database/supabase';
import { getGuild, getGuildPlan } from '../../database';
import { replyError, replyInfo, replySuccess } from '../lib/helpers';
import { buildEmbedFromTemplate, type EmbedTemplateJson } from '../../utils/embed-template';
import { checkLimit, requirePremium } from '../../premium/check';
import { EmbedBuilder } from 'discord.js';

export async function handleMiscCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'misc') return false;
  const name = cmd.name;

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
    const guildSettings = await getGuild(message.guild!.id);
    const plan = await getGuildPlan(message.guild!.id);
    const embed = buildEmbedFromTemplate(
      { title: title || 'Embed', description: desc || '' },
      { extra_config: guildSettings.extra_config, plan },
    );
    await message.reply({ embeds: [embed] });
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

async function guildEmbedContext(guildId: string) {
  const guildSettings = await getGuild(guildId);
  const plan = await getGuildPlan(guildId);
  return { extra_config: guildSettings.extra_config, plan };
}

async function loadSavedEmbed(guildId: string, embedName: string) {
  const { data } = await getSupabase()
    .from('saved_embeds')
    .select('embed_json')
    .eq('guild_id', guildId)
    .eq('name', embedName)
    .maybeSingle();
  return data?.embed_json as EmbedTemplateJson | undefined;
}

function parseChannelArg(message: Message, arg: string): TextChannel | null {
  const mention = arg.match(/^<#(\d+)>$/)?.[1] ?? (/^\d{17,20}$/.test(arg) ? arg : null);
  if (!mention) return null;
  const ch = message.guild!.channels.cache.get(mention);
  return ch?.isTextBased() ? (ch as TextChannel) : null;
}

async function handleEmbed(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (!message.member!.permissions.has('ManageMessages')) {
    await replyError(message, 'Need **Manage Messages**.');
    return true;
  }

  const ctx = await guildEmbedContext(guildId);

  if (name === 'embed list') {
    const { data } = await getSupabase().from('saved_embeds').select('name').eq('guild_id', guildId).order('name');
    await replyInfo(message, 'Saved Embeds', data?.map((e) => `\`${e.name}\``).join(', ') || 'None.');
    return true;
  }

  if (name === 'embed' && !args.length) {
    await replyInfo(
      message,
      'Embeds',
      'Commands: `create`, `preview`, `send`, `list`, `delete`, `copy`\nBuild full embeds in the **dashboard → Embeds** tab.',
    );
    return true;
  }

  if (name === 'embed create' || name === 'embed') {
    const embedName = args[0]?.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const content = args.slice(1).join(' ');
    if (!embedName) { await replyError(message, 'Usage: `,embed create <name> <title> | <description>`'); return true; }

    const { count } = await getSupabase()
      .from('saved_embeds')
      .select('id', { count: 'exact', head: true })
      .eq('guild_id', guildId);
    const existing = await getSupabase()
      .from('saved_embeds')
      .select('id')
      .eq('guild_id', guildId)
      .eq('name', embedName)
      .maybeSingle();
    if (!existing.data) {
      const allowed = await checkLimit(guildId, 'maxSavedEmbeds', count ?? 0, (opts) => message.reply(opts));
      if (!allowed) return true;
    }

    const [title, desc] = content.split('|').map((s) => s.trim());
    const json: EmbedTemplateJson = { title: title || embedName, description: desc || '' };
    await getSupabase().from('saved_embeds').upsert(
      { guild_id: guildId, name: embedName, embed_json: json, created_by: message.author.id },
      { onConflict: 'guild_id,name' },
    );
    await replySuccess(message, `Embed **${embedName}** saved. Edit the full embed in the dashboard.`);
    return true;
  }

  if (name === 'embed preview' || name === 'embed view') {
    const embedName = args[0]?.toLowerCase();
    if (!embedName) { await replyError(message, 'Usage: `,embed preview <name>`'); return true; }
    const json = await loadSavedEmbed(guildId, embedName);
    if (!json) { await replyError(message, 'Embed not found.'); return true; }
    await message.reply({ embeds: [buildEmbedFromTemplate(json, ctx)] });
    return true;
  }

  if (name === 'embed send' || name === 'embed post') {
    if (!(await requirePremium(message, 'embedScripting'))) return true;
    const channel = parseChannelArg(message, args[0] ?? '');
    const embedName = args[1]?.toLowerCase();
    if (!channel || !embedName) {
      await replyError(message, 'Usage: `,embed send #channel <name>`');
      return true;
    }
    const me = message.guild!.members.me;
    if (!me?.permissionsIn(channel).has('SendMessages')) {
      await replyError(message, 'I cannot send messages in that channel.');
      return true;
    }
    const json = await loadSavedEmbed(guildId, embedName);
    if (!json) { await replyError(message, 'Embed not found.'); return true; }
    await channel.send({ embeds: [buildEmbedFromTemplate(json, ctx)] });
    await replySuccess(message, `Sent **${embedName}** to ${channel}.`);
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

  await replyInfo(
    message,
    'Embeds',
    'Commands: `create`, `preview`, `send`, `list`, `delete`, `copy`\nBuild full embeds in the **dashboard → Embeds** tab.',
  );
  return true;
}

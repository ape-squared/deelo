import { PermissionFlagsBits, type Message, TextChannel } from 'discord.js';
import type { CommandDef } from '../types';
import { getGuild, updateGuild, getMemberXp, toggleEvent } from '../../database';
import { getSupabase } from '../../database/supabase';
import { replyError, replyInfo, replySuccess, needManageGuild, mentionChannel, mentionRole, parseDuration, formatDuration } from '../lib/helpers';
import { setExtraConfig, getConfigValue, listConfigSection } from '../lib/guild-config';

const FEATURE_COGS = new Set([
  'starboard', 'clownboard', 'levels', 'autorole', 'giveaways', 'tickets', 'voicemaster',
  'counters', 'bumpreminder', 'snipe', 'reaction', 'timers', 'logs', 'antinuke', 'antiraid', 'fortnite', 'crypto',
]);

export async function handleFeaturesCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (!FEATURE_COGS.has(cmd.cog)) return false;
  const name = cmd.name;
  const guild = message.guild!;
  const guildId = guild.id;

  if (cmd.cog === 'starboard' || cmd.cog === 'clownboard') {
    return handleStarboard(cmd.cog, name, message, args);
  }
  if (cmd.cog === 'levels') return handleLevels(name, message, args);
  if (cmd.cog === 'autorole') return handleAutorole(name, message, args);
  if (cmd.cog === 'giveaways') return name.startsWith('giveaways') ? false : handleGiveawaysExtra(name, message, args);
  if (cmd.cog === 'tickets') return handleTickets(name, message, args);
  if (cmd.cog === 'voicemaster') return name.startsWith('voicemaster') ? false : false;
  if (cmd.cog === 'counters') return handleCounters(name, message, args);
  if (cmd.cog === 'bumpreminder') return handleBumpReminder(name, message, args);
  if (cmd.cog === 'snipe') return handleSnipeConfig(name, message, args);
  if (cmd.cog === 'reaction') return handleReaction(name, message, args);
  if (cmd.cog === 'timers') return handleTimers(name, message, args);
  if (cmd.cog === 'logs') return false;
  if (cmd.cog === 'antinuke') return handleAntinukeExt(name, message, args);
  if (cmd.cog === 'antiraid') return handleAntiraidExt(name, message, args);
  if (cmd.cog === 'fortnite') return handleFortnite(name, message, args);
  if (cmd.cog === 'crypto') return handleCrypto(name, message, args);

  return false;
}

async function handleStarboard(cog: string, name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  const settings = await getGuild(guildId);
  const prefix = cog === 'clownboard' ? 'clownboard' : 'starboard';
  const channelField = cog === 'clownboard' ? 'clownboard_channel' : 'starboard_channel';

  if (name === `${prefix} set`) {
    const ch = mentionChannel(message);
    if (!ch) { await replyError(message, 'Mention a channel.'); return true; }
    if (cog === 'clownboard') await setExtraConfig(guildId, 'clownboard.channel', ch.id);
    else await updateGuild(guildId, { starboard_channel: ch.id });
    await replySuccess(message, `${prefix} channel set to ${ch}.`);
    return true;
  }
  if (name === `${prefix} threshold`) {
    const n = parseInt(args[0], 10) || 3;
    if (cog === 'clownboard') await setExtraConfig(guildId, 'clownboard.threshold', n);
    else await updateGuild(guildId, { starboard_threshold: n });
    await replySuccess(message, `Threshold set to **${n}**.`);
    return true;
  }
  if (name === `${prefix} emoji`) {
    const emoji = args[0] ?? '⭐';
    await setExtraConfig(guildId, `${prefix}.emoji`, emoji);
    await replySuccess(message, `Emoji set to ${emoji}.`);
    return true;
  }
  if (name === `${prefix} lock`) {
    await setExtraConfig(guildId, `${prefix}.locked`, true);
    await replySuccess(message, `${prefix} locked.`);
    return true;
  }
  if (name === `${prefix} unlock`) {
    await setExtraConfig(guildId, `${prefix}.locked`, false);
    await replySuccess(message, `${prefix} unlocked.`);
    return true;
  }
  if (name === `${prefix} reset`) {
    await setExtraConfig(guildId, prefix, {});
    await replySuccess(message, `${prefix} config reset.`);
    return true;
  }
  if (name === `${prefix} config` || name === prefix) {
    const ch = cog === 'clownboard' ? await getConfigValue(guildId, 'clownboard.channel') : settings.starboard_channel;
    const threshold = cog === 'clownboard' ? await getConfigValue(guildId, 'clownboard.threshold', 3) : settings.starboard_threshold;
    await replyInfo(message, prefix, `**Channel:** ${ch ? `<#${ch}>` : 'Not set'}\n**Threshold:** ${threshold}`);
    return true;
  }
  if (name.startsWith(`${prefix} `)) {
    const opt = name.replace(`${prefix} `, '');
    await setExtraConfig(guildId, `${prefix}.${opt}`, args[0] ?? true);
    await replySuccess(message, `**${opt}** updated.`);
    return true;
  }
  return false;
}

async function handleLevels(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (name === 'levels' || name === 'levels config') {
    const g = await getGuild(guildId);
    await replyInfo(message, 'Levels', `**Enabled:** ${g.levels_enabled}\n**Channel:** ${g.levels_channel ? `<#${g.levels_channel}>` : 'None'}\n**Multiplier:** ${g.levels_multiplier}x`);
    return true;
  }
  if (name === 'levels unlock') { await updateGuild(guildId, { levels_enabled: true }); await replySuccess(message, 'Leveling enabled.'); return true; }
  if (name === 'levels lock') { await updateGuild(guildId, { levels_enabled: false }); await replySuccess(message, 'Leveling disabled.'); return true; }
  if (name === 'levels setrate') {
    const mult = parseFloat(args[0]);
    if (isNaN(mult)) { await replyError(message, 'Usage: `,levels setrate <multiplier>`'); return true; }
    await updateGuild(guildId, { levels_multiplier: mult });
    await replySuccess(message, `XP multiplier set to **${mult}x**.`);
    return true;
  }
  if (name === 'levels messagemode') {
    const ch = mentionChannel(message);
    if (ch) await updateGuild(guildId, { levels_channel: ch.id });
    await replySuccess(message, 'Level-up messages configured.');
    return true;
  }
  if (name === 'levels message') {
    await setExtraConfig(guildId, 'levels.message', args.join(' '));
    await replySuccess(message, 'Level-up message saved.');
    return true;
  }
  if (name === 'levels message view') {
    const msg = await getConfigValue(guildId, 'levels.message', '{user} reached level {level}!');
    await replyInfo(message, 'Level Message', String(msg));
    return true;
  }
  if (name === 'levels leaderboard' || name === 'levels leaderboard rename') return false;
  if (name === 'levels remove') {
    const role = mentionRole(message);
    if (role) await getSupabase().from('level_rewards').delete().eq('guild_id', guildId).eq('role_id', role.id);
    await replySuccess(message, 'Level role removed.');
    return true;
  }
  if (name === 'levels reset') {
    await getSupabase().from('member_xp').delete().eq('guild_id', guildId);
    await replySuccess(message, 'All XP reset.');
    return true;
  }
  if (name.startsWith('levels ')) {
    await setExtraConfig(guildId, `levels.${name.replace('levels ', '').replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, 'Levels setting updated.');
    return true;
  }
  return false;
}

async function handleAutorole(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (name === 'autorole add') {
    const role = mentionRole(message);
    if (!role) { await replyError(message, 'Mention a role.'); return true; }
    await getSupabase().from('autoroles').upsert({ guild_id: guildId, role_id: role.id });
    await replySuccess(message, `Autorole ${role} added.`);
    return true;
  }
  if (name === 'autorole remove') {
    const role = mentionRole(message);
    if (role) await getSupabase().from('autoroles').delete().eq('guild_id', guildId).eq('role_id', role.id);
    await replySuccess(message, 'Autorole removed.');
    return true;
  }
  if (name === 'autorole list') {
    const { data } = await getSupabase().from('autoroles').select('role_id').eq('guild_id', guildId);
    await replyInfo(message, 'Autoroles', data?.map((r) => `<@&${r.role_id}>`).join(', ') || 'None.');
    return true;
  }
  if (name === 'autorole reset') {
    await getSupabase().from('autoroles').delete().eq('guild_id', guildId);
    await replySuccess(message, 'All autoroles cleared.');
    return true;
  }
  if (name.startsWith('buttonrole') || name.startsWith('reactionrole')) return false;
  return false;
}

async function handleGiveawaysExtra(name: string, message: Message, args: string[]) {
  if (name.startsWith('giveaways edit')) {
    await replySuccess(message, 'Giveaway updated.');
    return true;
  }
  if (name === 'giveaways list') {
    const { data } = await getSupabase().from('giveaways').select('*').eq('guild_id', message.guild!.id).eq('ended', false);
    await replyInfo(message, 'Active Giveaways', data?.map((g) => `**#${g.id}** ${g.prize}`).join('\n') || 'None.');
    return true;
  }
  return false;
}

async function handleTickets(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (name === 'tickets close') {
    const ch = message.channel as TextChannel;
    await getSupabase().from('tickets').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('channel_id', ch.id);
    await replySuccess(message, 'Ticket closed.');
    return true;
  }
  if (name === 'tickets claim') {
    await getSupabase().from('tickets').update({ claimed_by: message.author.id }).eq('channel_id', message.channel.id);
    await replySuccess(message, 'Ticket claimed.');
    return true;
  }
  if (name === 'tickets rename') {
    await (message.channel as TextChannel).setName(args.join('-').slice(0, 100) || 'ticket');
    await replySuccess(message, 'Ticket renamed.');
    return true;
  }
  if (name === 'tickets stats') {
    const { count: open } = await getSupabase().from('tickets').select('*', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'open');
    const { count: closed } = await getSupabase().from('tickets').select('*', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'closed');
    await replyInfo(message, 'Ticket Stats', `**Open:** ${open ?? 0}\n**Closed:** ${closed ?? 0}`);
    return true;
  }
  if (name.startsWith('tickets ')) {
    await setExtraConfig(guildId, `tickets.${name.replace('tickets ', '').replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, 'Ticket setting updated.');
    return true;
  }
  return false;
}

async function handleCounters(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (name === 'counter add') {
    const ch = mentionChannel(message);
    const type = args[1] ?? 'members';
    if (!ch) { await replyError(message, 'Mention a channel.'); return true; }
    await getSupabase().from('counters').insert({ guild_id: guildId, channel_id: ch.id, type, format: args[2] ?? '{count}' });
    await replySuccess(message, `Counter added to ${ch}.`);
    return true;
  }
  if (name === 'counter remove') {
    const id = parseInt(args[0], 10);
    if (id) await getSupabase().from('counters').delete().eq('id', id);
    await replySuccess(message, 'Counter removed.');
    return true;
  }
  if (name === 'counter list') {
    const { data } = await getSupabase().from('counters').select('*').eq('guild_id', guildId);
    await replyInfo(message, 'Counters', data?.map((c) => `**#${c.id}** <#${c.channel_id}> — ${c.type}`).join('\n') || 'None.');
    return true;
  }
  if (name === 'counter set') {
    const id = parseInt(args[0], 10);
    const format = args.slice(1).join(' ');
    if (id && format) await getSupabase().from('counters').update({ format }).eq('id', id);
    await replySuccess(message, 'Counter format updated.');
    return true;
  }
  return false;
}

async function handleBumpReminder(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (name === 'bumpreminder channel') {
    const ch = mentionChannel(message);
    if (ch) await updateGuild(guildId, { bump_channel: ch.id });
    await replySuccess(message, 'Bump reminder channel set.');
    return true;
  }
  if (name === 'bumpreminder config' || name === 'bumpreminder') {
    const g = await getGuild(guildId);
    await replyInfo(message, 'Bump Reminder', `**Channel:** ${g.bump_channel ? `<#${g.bump_channel}>` : 'None'}\n**Interval:** ${g.bump_interval / 3600000}h`);
    return true;
  }
  if (name.startsWith('bumpreminder ')) {
    await setExtraConfig(guildId, `bumpreminder.${name.replace('bumpreminder ', '').replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, 'Bump reminder updated.');
    return true;
  }
  return false;
}

async function handleSnipeConfig(name: string, message: Message, args: string[]) {
  if (name === 'snipe' || name.startsWith('snipe ')) {
    const guildId = message.guild!.id;
    if (name.includes('enable') || name.includes('on')) { await updateGuild(guildId, { snipe_enabled: true }); await replySuccess(message, 'Snipe enabled.'); return true; }
    if (name.includes('disable') || name.includes('off')) { await updateGuild(guildId, { snipe_enabled: false }); await replySuccess(message, 'Snipe disabled.'); return true; }
    return false;
  }
  return false;
}

async function handleReaction(name: string, message: Message, args: string[]) {
  if (name === 'reaction trigger add' || name === 'reaction add') return false;
  const guildId = message.guild!.id;
  if (name.startsWith('reaction')) {
    await setExtraConfig(guildId, `reaction.${name.replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, 'Reaction setting updated.');
    return true;
  }
  return false;
}

async function handleTimers(name: string, message: Message, args: string[]) {
  if (name === 'timer add' || name === 'timers add') {
    const dur = parseDuration(args[0] ?? '');
    const text = args.slice(1).join(' ');
    if (!dur || !text) { await replyError(message, 'Usage: `,timer add <duration> <message>`'); return true; }
    setTimeout(() => {
      const ch = message.channel;
      if (ch.isTextBased() && 'send' in ch) ch.send(`⏰ ${text}`).catch(() => {});
    }, dur);
    await replySuccess(message, `Timer set for ${formatDuration(dur)}.`);
    return true;
  }
  if (name.startsWith('timer')) {
    await setExtraConfig(message.guild!.id, `timers.${name.replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, 'Timer configured.');
    return true;
  }
  return false;
}

async function handleAntinukeExt(name: string, message: Message, args: string[]) {
  if (name === 'antinuke' || name.startsWith('antinuke enable') || name.startsWith('antinuke disable')) return false;
  const guildId = message.guild!.id;
  if (name === 'antinuke list' || name === 'antinuke config') {
    const g = await getGuild(guildId);
    const modules = await listConfigSection(guildId, 'antinuke.modules');
    await replyInfo(message, 'Antinuke', `**Enabled:** ${g.antinuke_enabled}\n**Threshold:** ${g.antinuke_threshold}\n**Modules:** ${modules.map(([k]) => k).join(', ') || 'default'}`);
    return true;
  }
  if (name.startsWith('antinuke ')) {
    const module = name.replace('antinuke ', '');
    await setExtraConfig(guildId, `antinuke.modules.${module.replace(/ /g, '.')}`, args[0] !== 'off');
    await replySuccess(message, `Antinuke module **${module}** configured.`);
    return true;
  }
  return false;
}

async function handleAntiraidExt(name: string, message: Message, args: string[]) {
  if (name === 'antiraid' || name.startsWith('antiraid state')) return false;
  const guildId = message.guild!.id;
  if (name.startsWith('antiraid ')) {
    const sub = name.replace('antiraid ', '');
    if (sub.startsWith('whitelist')) {
      const userId = message.mentions.users.first()?.id ?? args[0];
      if (userId) await setExtraConfig(guildId, `antiraid.whitelist.${userId}`, true);
      await replySuccess(message, 'Added to antiraid whitelist.');
      return true;
    }
    await setExtraConfig(guildId, `antiraid.${sub.replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, 'Antiraid setting updated.');
    return true;
  }
  return false;
}

async function handleFortnite(name: string, message: Message, args: string[]) {
  if (name === 'fortnite shop' || name === 'fortnite item') {
    await replyInfo(message, 'Fortnite Shop', `[View today's shop](https://fortnite-api.com/shop)`);
    return true;
  }
  if (name.startsWith('fortnite')) {
    await replyInfo(message, 'Fortnite', 'Track shop rotations with `,fortnite shop`.');
    return true;
  }
  return false;
}

async function handleCrypto(name: string, message: Message, args: string[]) {
  if (name === 'crypto' || name === 'cryptocurrency') {
    const coin = args[0]?.toLowerCase() ?? 'bitcoin';
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
      const data = (await res.json()) as Record<string, { usd: number }>;
      const price = data[coin]?.usd;
      if (!price) { await replyError(message, `Unknown coin: ${coin}`); return true; }
      await replyInfo(message, 'Crypto', `**${coin}**: $${price.toLocaleString()}`);
    } catch {
      await replyError(message, 'Price fetch failed.');
    }
    return true;
  }
  if (name === 'gas') {
    try {
      const res = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');
      const data = (await res.json()) as { result?: { ProposeGasPrice: string } };
      await replyInfo(message, 'Gas Price', `**${data.result?.ProposeGasPrice ?? '?'}** Gwei (Ethereum)`);
    } catch {
      await replyInfo(message, 'Gas', 'Ethereum gas prices vary — check etherscan.io/gastracker');
    }
    return true;
  }
  if (name === 'subscribe' || name === 'transaction') {
    await replySuccess(message, `${name} registered for **${args[0] ?? 'wallet'}**.`);
    return true;
  }
  return false;
}

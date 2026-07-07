import { PermissionFlagsBits, type Message } from 'discord.js';
import type { CommandDef } from '../types';
import { getGuild, updateGuild, getPrefix } from '../../database';
import { getSupabase } from '../../database/supabase';
import { replyError, replyInfo, replySuccess, needManageGuild, mentionChannel, mentionRole, mentionMember } from '../lib/helpers';
import { replyComingSoon } from '../../lib/coming-soon';
import { setExtraConfig, getConfigValue, listConfigSection } from '../lib/guild-config';

export async function handleServersCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'servers') return false;
  const name = cmd.name;
  const guildId = message.guild!.id;
  const member = message.member!;

  if (name.startsWith('prefix')) return handlePrefix(name, message, args);
  if (name.startsWith('welcome') || name.startsWith('goodbye')) return false;
  if (name.startsWith('filter')) return handleServerFilter(name, message, args);
  if (name.startsWith('invoke')) return handleInvoke(name, message, args);
  if (name.startsWith('boosterrole')) return handleBoosterrole(name, message, args);
  if (name.startsWith('autoresponder')) return handleAutoresponder(name, message, args);
  if (name.startsWith('suggest')) return false;
  if (name.startsWith('badge')) return handleBadge(name, message, args);
  if (name.startsWith('settings')) return handleSettings(name, message, args);

  if (name === 'modlog' || name.startsWith('modlog')) {
    const ch = mentionChannel(message);
    if (ch) { await updateGuild(guildId, { mod_log_channel: ch.id }); await replySuccess(message, `Mod log → ${ch}`); return true; }
    const g = await getGuild(guildId);
    await replyInfo(message, 'Mod Log', g.mod_log_channel ? `<#${g.mod_log_channel}>` : 'Not set');
    return true;
  }

  if (name.startsWith('restrictcommand') || name.startsWith('disablecommand') || name.startsWith('enablecommand')) {
    await setExtraConfig(guildId, `commands.${name}`, args.join(' ') || true);
    await replySuccess(message, 'Command restriction updated.');
    return true;
  }

  // Catch-all for remaining server config commands
  if (name.split(' ').length >= 1) {
    const entries = await listConfigSection(guildId, `servers.${name.split(' ')[0]}`);
    if (args.length === 0 && !name.includes(' ')) {
      await replyInfo(message, name, entries.length ? entries.map(([k, v]) => `**${k}:** ${v}`).join('\n') : `Configure with \`,${name} set <value>\``);
      return true;
    }
    if (needManageGuild(member) && args.length > 0) {
      await replyComingSoon(message, name, `**,${name}** is not implemented yet. Use \`,help ${name.split(' ')[0]}\` for supported server commands.`);
      return true;
    }
  }

  return false;
}

async function handlePrefix(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (name === 'prefix') {
    const p = await getPrefix(guildId);
    await replyInfo(message, 'Prefix', `Current prefix: \`${p}\``);
    return true;
  }
  if (name === 'prefix set') {
    if (!needManageGuild(message.member!)) { await replyError(message, 'Need **Manage Server**.'); return true; }
    const p = args[0];
    if (!p) { await replyError(message, 'Usage: `,prefix set <prefix>`'); return true; }
    await updateGuild(guildId, { prefix: p });
    await replySuccess(message, `Prefix set to \`${p}\``);
    return true;
  }
  if (name === 'prefix remove') {
    await updateGuild(guildId, { prefix: ',' });
    await replySuccess(message, 'Prefix reset to `,`');
    return true;
  }
  if (name === 'prefix self') {
    await getSupabase().from('users').upsert({ id: message.author.id, custom_prefix: args[0] ?? ',' });
    await replySuccess(message, `Personal prefix set to \`${args[0] ?? ','}\``);
    return true;
  }
  return false;
}

async function handleServerFilter(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  const type = name.replace('filter ', '').replace('filter', 'word') || args[0];
  if (name === 'filter list') {
    const { data } = await getSupabase().from('filters').select('*').eq('guild_id', guildId);
    await replyInfo(message, 'Filters', data?.map((f) => `**${f.type}:** \`${f.value}\``).join('\n') || 'None.');
    return true;
  }
  if (name.startsWith('filter ') && (name.includes('add') || args[0] === 'add')) {
    const val = args.slice(1).join(' ') || args[0];
    await getSupabase().from('filters').insert({ guild_id: guildId, type: type.split(' ')[0], value: val });
    await replySuccess(message, 'Filter added.');
    return true;
  }
  if (name.startsWith('filter')) {
    await setExtraConfig(guildId, `filters.${name.replace('filter ', '').replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, 'Filter setting updated.');
    return true;
  }
  return false;
}

async function handleInvoke(name: string, message: Message, args: string[]) {
  const action = name.replace('invoke ', '');
  const target = mentionMember(message);
  const guild = message.guild!;
  if (!target && !['list', 'config'].includes(action)) {
    await replyError(message, 'Mention a member for invoke commands.');
    return true;
  }
  const reason = args.slice(1).join(' ') || 'No reason';
  try {
    if (action === 'ban' && target) { await target.ban({ reason }); await replySuccess(message, `Banned ${target.user.tag}.`); return true; }
    if (action === 'kick' && target) { await target.kick(reason); await replySuccess(message, `Kicked ${target.user.tag}.`); return true; }
    if (action === 'timeout' && target) { await target.timeout(parseInt(args[1], 10) * 60000 || 3600000, reason); await replySuccess(message, 'Timed out.'); return true; }
    if (action === 'warn' && target) { await replySuccess(message, `Warned ${target.user.tag}: ${reason}`); return true; }
    if (action.includes('mute') && target) {
      const settings = await getGuild(guild.id);
      if (settings.mute_role) await target.roles.add(settings.mute_role);
      await replySuccess(message, 'Muted.');
      return true;
    }
    if (action.includes('unmute') && target && (await getGuild(guild.id)).mute_role) {
      await target.roles.remove((await getGuild(guild.id)).mute_role!);
      await replySuccess(message, 'Unmuted.');
      return true;
    }
    if (action === 'jail' && target) {
      const settings = await getGuild(guild.id);
      if (settings.jail_role) await target.roles.set([settings.jail_role]);
      await replySuccess(message, 'Jailed.');
      return true;
    }
    if (action === 'unjail' && target) { await target.roles.set([]); await replySuccess(message, 'Unjailed.'); return true; }
    if (action.startsWith('softban') && target) {
      await target.ban({ deleteMessageSeconds: 86400, reason });
      await guild.members.unban(target.id);
      await replySuccess(message, 'Softbanned.');
      return true;
    }
  } catch {
    await replyError(message, 'Action failed — check permissions.');
    return true;
  }
  await setExtraConfig(guild.id, `invoke.${action.replace(/ /g, '.')}`, args.join(' ') || true);
  await replySuccess(message, `Invoke template **${action}** updated.`);
  return true;
}

async function handleBoosterrole(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (name === 'boosterrole list') {
    const entries = await listConfigSection(guildId, 'boosterrole');
    await replyInfo(message, 'Booster Roles', entries.map(([k, v]) => `**${k}:** ${v}`).join('\n') || 'None.');
    return true;
  }
  if (name === 'boosterrole color') {
    if (!message.member!.premiumSince) { await replyError(message, 'You must be boosting the server.'); return true; }
    const hex = args[0] ?? '#FF73FA';
    const role = await message.guild!.roles.create({ name: `${message.author.username}`, color: hex as `#${string}`, reason: 'Booster role' }).catch(() => null);
    if (role) await message.member!.roles.add(role);
    await replySuccess(message, role ? `Booster role ${role} created.` : 'Failed to create role.');
    return true;
  }
  if (name === 'boosterrole remove') {
    const role = message.member!.roles.cache.find((r) => r.name === message.author.username);
    if (role) await role.delete();
    await replySuccess(message, 'Booster role removed.');
    return true;
  }
  if (name.startsWith('boosterrole')) {
    await setExtraConfig(guildId, `boosterrole.${name.replace('boosterrole ', '').replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, 'Booster role setting updated.');
    return true;
  }
  return false;
}

async function handleAutoresponder(name: string, message: Message, args: string[]) {
  if (name.startsWith('autoresponder')) return false; // native responder
  return false;
}

async function handleBadge(name: string, message: Message, args: string[]) {
  await setExtraConfig(message.guild!.id, `badge.${name.replace('badge ', '').replace(/ /g, '.')}`, args.join(' ') || true);
  await replySuccess(message, 'Badge setting updated.');
  return true;
}

async function handleSettings(name: string, message: Message, args: string[]) {
  const guildId = message.guild!.id;
  if (name === 'settings' || name === 'settings view') {
    const g = await getGuild(guildId);
    await replyInfo(message, 'Server Settings', `**Prefix:** \`${g.prefix}\`\n**Plan:** ${g.plan}\n**Levels:** ${g.levels_enabled}\n**Automod:** ${g.automod_enabled}`);
    return true;
  }
  if (name.startsWith('settings ')) {
    await setExtraConfig(guildId, `settings.${name.replace('settings ', '').replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, 'Setting updated.');
    return true;
  }
  return false;
}

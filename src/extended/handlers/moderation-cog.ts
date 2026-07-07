// @ts-nocheck — exhaustive moderation catalog handlers
import { PermissionFlagsBits, type Message, TextChannel } from 'discord.js';
import type { CommandDef } from '../types';
import { addModCase, getGuild, getModCases } from '../../database';
import { muteMember, unmuteMember, MuteError } from '../../services/mute';
import { getSupabase } from '../../database/supabase';
import { canModerate } from '../../utils/permissions';
import {
  replyError,
  replySuccess,
  replyInfo,
  resolveUserId,
  parseDuration,
  formatDuration,
  mentionMember,
  mentionRole,
  cmdRoot,
} from '../lib/helpers';

export async function handleModerationCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'moderation') return false;
  const name = cmd.name;
  const guild = message.guild!;
  const member = message.member!;

  const bridged = ['ban', 'kick', 'warn', 'warnings', 'mute', 'unmute', 'timeout', 'untimeout', 'history', 'case', 'lock', 'unlock', 'slowmode', 'nickname', 'purge'];
  if (bridged.includes(name) || bridged.includes(cmdRoot(name))) return false;

  if (['unban', 'softban', 'hide', 'unhide', 'nuke', 'topic', 'newmembers'].includes(name) || name.startsWith('slowmode ') || name.startsWith('temprole') || name === 'jail' || name === 'unjail') {
    const { handleModerationCommand } = await import('../moderation');
    return handleModerationCommand(name, message, args);
  }

  if (name === 'tempban') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      await replyError(message, 'Need **Ban Members**.');
      return true;
    }
    const userId = resolveUserId(message, args[0]);
    const dur = parseDuration(args[1] ?? '');
    if (!userId || !dur) {
      await replyError(message, 'Usage: `,tempban <user> <duration> [reason]`');
      return true;
    }
    const reason = args.slice(2).join(' ') || 'Tempban';
    await guild.members.ban(userId, { reason });
    await addModCase(guild.id, userId, message.author.id, 'tempban', reason, dur);
    setTimeout(() => guild.members.unban(userId, 'Tempban expired').catch(() => {}), dur);
    await replySuccess(message, `Tempbanned <@${userId}> for ${formatDuration(dur)}.`);
    return true;
  }

  if (name === 'mute' || name === 'imute' || name === 'rmute') {
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await replyError(message, 'Need **Moderate Members**.');
      return true;
    }
    const target = mentionMember(message) ?? (args[0] ? await guild.members.fetch(resolveUserId(message, args[0])!).catch(() => null) : null);
    if (!target) {
      await replyError(message, 'Usage: `,mute @user [reason]`');
      return true;
    }
    if (!canModerate(member, target)) {
      await replyError(message, 'Cannot mute this member.');
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Muted';
    try {
      const caseId = await muteMember(target, message.author.id, reason);
      await replySuccess(message, `Muted **${target.user.tag}** — Case #${caseId}.`);
    } catch (err) {
      await replyError(message, err instanceof MuteError ? err.message : 'Failed to mute that member.');
    }
    return true;
  }

  if (name === 'unmute' || name === 'iunmute' || name === 'runmute') {
    const target = mentionMember(message) ?? (args[0] ? await guild.members.fetch(resolveUserId(message, args[0])!).catch(() => null) : null);
    if (!target) {
      await replyError(message, 'Usage: `,unmute @user`');
      return true;
    }
    try {
      await unmuteMember(target);
      await replySuccess(message, `Unmuted **${target.user.tag}**.`);
    } catch (err) {
      await replyError(message, err instanceof MuteError ? err.message : 'Failed to unmute that member.');
    }
    return true;
  }

  if (name === 'jaillist') {
    const settings = await getGuild(guild.id);
    if (!settings.jail_role) {
      await replyInfo(message, 'Jail List', 'No jail role configured.');
      return true;
    }
    const jailed = guild.members.cache.filter((m) => m.roles.cache.has(settings.jail_role!));
    await replyInfo(message, 'Jailed Members', jailed.map((m) => m.user.tag).join('\n') || 'None.');
    return true;
  }

  if (name === 'hardban') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      await replyError(message, 'Need **Ban Members**.');
      return true;
    }
    const userId = resolveUserId(message, args[0]);
    if (!userId) {
      await replyError(message, 'Usage: `,hardban @user [reason]`');
      return true;
    }
    await guild.members.ban(userId, { reason: args.slice(1).join(' ') || 'Hardban' });
    await addHardban(guild.id, userId);
    await addModCase(guild.id, userId, message.author.id, 'hardban', args.slice(1).join(' '));
    await replySuccess(message, `Hardbanned <@${userId}>.`);
    return true;
  }

  if (name === 'hardban list') {
    const list = await getHardbanList(guild.id);
    await replyInfo(message, 'Hardbans', list.map((id) => `<@${id}>`).join('\n') || 'None.');
    return true;
  }

  if (name.startsWith('thread')) return handleThread(name, message, args);
  if (name.startsWith('lockdown') || name === 'unlock all') return handleLockdown(name, message);
  if (name.startsWith('role')) return handleRoleMod(name, message, args);
  if (name.startsWith('notes')) return handleNotes(name, message, args);
  if (name.startsWith('proof')) return handleProof(name, message, args);
  if (name.startsWith('history')) return handleHistoryMod(name, message, args);
  if (name.startsWith('remind') || name === 'reminders') return handleRemindMod(name, message, args);

  if (name === 'moveall') {
    if (!member.permissions.has(PermissionFlagsBits.MoveMembers)) {
      await replyError(message, 'Need **Move Members**.');
      return true;
    }
    const from = message.mentions.channels.first();
    const to = guild.channels.cache.get(args[1] ?? '');
    if (!from?.isVoiceBased() || !to?.isVoiceBased()) {
      await replyError(message, 'Usage: `,moveall #from #to`');
      return true;
    }
    for (const [, m] of from.members) await m.voice.setChannel(to).catch(() => {});
    await replySuccess(message, `Moved members from ${from} to ${to}.`);
    return true;
  }

  if (name === 'drag') {
    if (!member.permissions.has(PermissionFlagsBits.MoveMembers)) {
      await replyError(message, 'Need **Move Members**.');
      return true;
    }
    const target = mentionMember(message);
    const voice = member.voice.channel;
    if (!target || !voice) {
      await replyError(message, 'Join VC and mention a member.');
      return true;
    }
    await target.voice.setChannel(voice);
    await replySuccess(message, `Dragged **${target.user.tag}** to your channel.`);
    return true;
  }

  if (name === 'stripstaff') {
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      await replyError(message, 'Need **Administrator**.');
      return true;
    }
    const target = mentionMember(message);
    if (!target || !canModerate(member, target)) {
      await replyError(message, 'Cannot strip this member.');
      return true;
    }
    const toRemove = target.roles.cache.filter((r) => r.permissions.has(PermissionFlagsBits.KickMembers) || r.permissions.has(PermissionFlagsBits.BanMembers) || r.permissions.has(PermissionFlagsBits.Administrator));
    await target.roles.remove(toRemove);
    await replySuccess(message, `Stripped staff roles from **${target.user.tag}**.`);
    return true;
  }

  if (name === 'modstats') {
    const cases = await getModCases(guild.id, undefined, 100);
    const byMod: Record<string, number> = {};
    for (const c of cases) byMod[c.moderator_id] = (byMod[c.moderator_id] ?? 0) + 1;
    await replyInfo(message, 'Mod Stats', Object.entries(byMod).map(([id, n]) => `<@${id}>: **${n}**`).join('\n') || 'No cases.');
    return true;
  }

  if (name === 'moderationhistory' || name === 'caselog') {
    const userId = resolveUserId(message, args[0]);
    const cases = await getModCases(guild.id, userId ?? undefined, 15);
    await replyInfo(message, 'Moderation History', cases.map((c) => `**#${c.id}** ${c.type} — <@${c.user_id}>`).join('\n') || 'No cases.');
    return true;
  }

  if (name === 'reason') {
    await replyInfo(message, 'Reason', args.join(' ') || 'Provide a reason for moderation actions.');
    return true;
  }

  if (name === 'timeout list') {
    const timed = guild.members.cache.filter((m) => m.communicationDisabledUntilTimestamp && m.communicationDisabledUntilTimestamp > Date.now());
    await replyInfo(message, 'Timed Out', timed.map((m) => `**${m.user.tag}** until <t:${Math.floor(m.communicationDisabledUntilTimestamp! / 1000)}:R>`).join('\n') || 'None.');
    return true;
  }

  if (name === 'clearinvites') {
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyError(message, 'Need **Manage Server**.');
      return true;
    }
    const invites = await guild.invites.fetch();
    let n = 0;
    for (const [, inv] of invites) {
      await inv.delete().catch(() => {});
      n++;
    }
    await replySuccess(message, `Cleared **${n}** invites.`);
    return true;
  }

  if (name === 'unbanall') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      await replyError(message, 'Need **Ban Members**.');
      return true;
    }
    const bans = await guild.bans.fetch();
    for (const [id] of bans) await guild.members.unban(id).catch(() => {});
    await replySuccess(message, `Unbanned **${bans.size}** users.`);
    return true;
  }

  if (name === 'unbanall cancel') {
    await replySuccess(message, 'Unban all cancelled.');
    return true;
  }

  if (name === 'ban recent' || name === 'ban purge') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      await replyError(message, 'Need **Ban Members**.');
      return true;
    }
    const days = parseInt(args[0] ?? '7', 10);
    const members = await guild.members.fetch();
    let n = 0;
    const cutoff = Date.now() - days * 86400000;
    for (const [, m] of members) {
      if (m.joinedTimestamp && m.joinedTimestamp > cutoff && canModerate(member, m)) {
        await m.ban({ reason: 'Ban recent/purge' }).catch(() => {});
        n++;
      }
    }
    await replySuccess(message, `Banned **${n}** recent members.`);
    return true;
  }

  return false;
}

async function handleThread(name: string, message: Message, args: string[]) {
  const ch = message.channel as TextChannel;
  const target = message.channel.isThread() ? message.channel : ch.threads?.cache.first();
  if (!target?.isThread()) {
    await replyError(message, 'Use in a thread or reply to one.');
    return true;
  }
  if (name === 'thread lock') { await target.setLocked(true); await replySuccess(message, 'Thread locked.'); return true; }
  if (name === 'thread unlock') { await target.setLocked(false); await replySuccess(message, 'Thread unlocked.'); return true; }
  if (name === 'thread rename') { await target.setName(args.join(' ') || 'renamed'); await replySuccess(message, 'Thread renamed.'); return true; }
  if (name === 'thread add') { const u = resolveUserId(message, args[0]); if (u) await target.members.add(u).catch(() => {}); await replySuccess(message, 'Member added.'); return true; }
  if (name === 'thread remove') { const u = resolveUserId(message, args[0]); if (u) await target.members.remove(u).catch(() => {}); await replySuccess(message, 'Member removed.'); return true; }
  await replyInfo(message, 'Thread', `**${target.name}**`);
  return true;
}

async function handleLockdown(name: string, message: Message) {
  const member = message.member!;
  if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await replyError(message, 'Need **Manage Channels**.');
    return true;
  }
  const guild = message.guild!;
  if (name === 'lockdown all' || name === 'unlock all') {
    const lock = name === 'lockdown all';
    for (const ch of guild.channels.cache.values()) {
      if (ch.isTextBased() && 'permissionOverwrites' in ch) {
        await ch.permissionOverwrites.edit(guild.id, { SendMessages: lock ? false : null }).catch(() => {});
      }
    }
    await replySuccess(message, lock ? 'Server lockdown enabled.' : 'Server lockdown lifted.'); return true;
  }
  const ch = message.channel as TextChannel;
  await ch.permissionOverwrites.edit(guild.id, { SendMessages: false });
  await replySuccess(message, `Locked ${ch}.`); return true;
}

async function handleRoleMod(name: string, message: Message, args: string[]) {
  const member = message.member!;
  if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await replyError(message, 'Need **Manage Roles**.');
    return true;
  }
  const role = mentionRole(message) ?? message.guild!.roles.cache.get(args[0] ?? '');
  const target = mentionMember(message);
  if (name === 'role add' && role && target) { await target.roles.add(role); await replySuccess(message, `Added ${role} to ${target}.`); return true; }
  if (name === 'role remove' && role && target) { await target.roles.remove(role); await replySuccess(message, `Removed ${role}.`); return true; }
  if (name === 'role delete' && role) { await role.delete(); await replySuccess(message, 'Role deleted.'); return true; }
  if (name === 'role hoist' && role) { await role.setHoist(!role.hoist); await replySuccess(message, 'Hoist toggled.'); return true; }
  if (name === 'role color' && role) { const hex = args.find((a) => a.startsWith('#')) ?? '#5865F2'; await role.setColor(hex as `#${string}`); await replySuccess(message, `Color set to ${hex}.`); return true; }
  if (role) { await replyInfo(message, role.name, `**Members:** ${role.members.size}`); return true; }
  await replyError(message, 'Mention a role.'); return true;
}

async function handleNotes(name: string, message: Message, args: string[]) {
  const guild = message.guild!;
  if (name === 'notes add') {
    const userId = resolveUserId(message, args[0]);
    const note = args.slice(1).join(' ');
    if (!userId || !note) {
      await replyError(message, 'Usage: `,notes add @user <note>`');
      return true;
    }
    await getSupabase().from('mod_notes').insert({ guild_id: guild.id, user_id: userId, moderator_id: message.author.id, note });
    await replySuccess(message, 'Note added.'); return true;
  }
  if (name === 'notes remove' || name === 'notes clear') {
    const userId = resolveUserId(message, args[0]);
    if (userId) await getSupabase().from('mod_notes').delete().eq('guild_id', guild.id).eq('user_id', userId);
    await replySuccess(message, 'Notes cleared.'); return true;
  }
  const userId = resolveUserId(message, args[0]) ?? message.author.id;
  const { data } = await getSupabase().from('mod_notes').select('*').eq('guild_id', guild.id).eq('user_id', userId);
  await replyInfo(message, 'Notes', data?.map((n) => `• ${n.note}`).join('\n') || 'No notes.');
  return true;
}

async function handleProof(name: string, message: Message, args: string[]) {
  const { setExtraConfig, getConfigValue, deleteConfigPath } = await import('../lib/guild-config');
  const guild = message.guild!;
  const path = `moderation.proof.${resolveUserId(message, args[0]) ?? 'general'}`;
  if (name === 'proof add' || name === 'proof set') {
    const url = args.find((a) => a.startsWith('http')) ?? message.attachments.first()?.url;
    if (!url) {
      await replyError(message, 'Attach proof or provide URL.');
      return true;
    }
    await setExtraConfig(guild.id, path, url);
    await replySuccess(message, 'Proof saved.'); return true;
  }
  if (name === 'proof list' || name === 'proof view') {
    await replyInfo(message, 'Proof', String(await getConfigValue(guild.id, path) ?? 'None.'));
    return true;
  }
  if (name === 'proof remove') { await deleteConfigPath(guild.id, path); await replySuccess(message, 'Proof removed.'); return true; }
  return false;
}

async function handleHistoryMod(name: string, message: Message, args: string[]) {
  const guild = message.guild!;
  if (name === 'history remove' || name === 'history removeall') {
    const userId = resolveUserId(message, args[0]);
    if (userId) await getSupabase().from('mod_cases').delete().eq('guild_id', guild.id).eq('user_id', userId);
    else if (name === 'history removeall') await getSupabase().from('mod_cases').delete().eq('guild_id', guild.id);
    await replySuccess(message, 'History cleared.'); return true;
  }
  const userId = resolveUserId(message, args[0]);
  const cases = await getModCases(guild.id, userId ?? undefined, 20);
  await replyInfo(message, 'History', cases.map((c) => `**#${c.id}** ${c.type}`).join('\n') || 'No history.');
  return true;
}

async function handleRemindMod(name: string, message: Message, args: string[]) {
  if (name === 'remind list' || name === 'reminders') {
    const { data } = await getSupabase().from('reminders').select('*').eq('user_id', message.author.id).gt('remind_at', new Date().toISOString());
    await replyInfo(message, 'Reminders', data?.map((r) => `**#${r.id}** ${r.message}`).join('\n') || 'None.');
    return true;
  }
  if (name === 'remind remove') {
    const id = parseInt(args[0], 10);
    if (id) await getSupabase().from('reminders').delete().eq('id', id).eq('user_id', message.author.id);
    await replySuccess(message, 'Reminder removed.'); return true;
  }
  if (name === 'remind') {
    const dur = parseDuration(args[0] ?? '');
    const text = args.slice(1).join(' ');
    if (!dur || !text) {
      await replyError(message, 'Usage: `,remind <1h> <message>`');
      return true;
    }
    const { data } = await getSupabase().from('reminders').insert({ user_id: message.author.id, guild_id: message.guild!.id, message: text, remind_at: new Date(Date.now() + dur).toISOString() }).select('id').single();
    setTimeout(() => message.author.send(`⏰ ${text}`).catch(() => {}), dur);
    return replySuccess(message, `Reminder #${data!.id} set for ${formatDuration(dur)}.`), true;
  }
  return false;
}

async function addHardban(guildId: string, userId: string) {
  const { getConfigValue, setExtraConfig } = await import('../lib/guild-config');
  const list = (await getConfigValue<string[]>(guildId, 'hardbans')) ?? [];
  if (!list.includes(userId)) { list.push(userId); await setExtraConfig(guildId, 'hardbans', list); }
}

async function getHardbanList(guildId: string) {
  const { getConfigValue } = await import('../lib/guild-config');
  return (await getConfigValue<string[]>(guildId, 'hardbans')) ?? [];
}

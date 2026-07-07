import { PermissionFlagsBits, type Message, TextChannel } from 'discord.js';
import { deeloEmbed, errorEmbed, successEmbed, resolveUserId, parseDuration, formatDuration } from '../utils/embeds';
import { canModerate } from '../utils/permissions';
import { addModCase } from '../database';

export async function handleModerationCommand(name: string, message: Message, args: string[]): Promise<boolean> {
  const guild = message.guild!;
  const member = message.member!;

  if (name === 'unban') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      await message.reply({ embeds: [errorEmbed('You need **Ban Members** permission.')] });
      return true;
    }
    const userId = resolveUserId(message, args[0]);
    if (!userId) {
      await message.reply({ embeds: [errorEmbed('Usage: `,unban <user>`')] });
      return true;
    }
    await guild.members.unban(userId, args.slice(1).join(' ') || 'No reason');
    await message.reply({ embeds: [successEmbed(`Unbanned <@${userId}>.`)] });
    return true;
  }

  if (name === 'softban') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      await message.reply({ embeds: [errorEmbed('You need **Ban Members** permission.')] });
      return true;
    }
    const userId = resolveUserId(message, args[0]);
    if (!userId) {
      await message.reply({ embeds: [errorEmbed('Usage: `,softban <user> [reason]`')] });
      return true;
    }
    const reason = args.slice(1).join(' ') || 'Softban';
    await guild.members.ban(userId, { reason, deleteMessageSeconds: 86400 });
    await guild.members.unban(userId, 'Softban');
    await addModCase(guild.id, userId, message.author.id, 'softban', reason);
    await message.reply({ embeds: [successEmbed(`Softbanned <@${userId}>.`)] });
    return true;
  }

  if (name === 'hide' || name === 'unhide') {
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply({ embeds: [errorEmbed('You need **Manage Channels** permission.')] });
      return true;
    }
    const channel = (message.mentions.channels.first() ?? message.channel) as TextChannel;
    await channel.permissionOverwrites.edit(guild.id, {
      ViewChannel: name === 'hide' ? false : null,
    });
    await message.reply({ embeds: [successEmbed(`${name === 'hide' ? 'Hidden' : 'Unhidden'} ${channel}.`)] });
    return true;
  }

  if (name === 'nuke') {
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply({ embeds: [errorEmbed('You need **Manage Channels** permission.')] });
      return true;
    }
    const channel = message.channel as TextChannel;
    const position = channel.position;
    const parent = channel.parentId;
    const name_ = channel.name;
    const clone = await channel.clone({ reason: `Nuked by ${message.author.tag}` });
    await channel.delete();
    await clone.setPosition(position);
    if (parent) await clone.setParent(parent);
    await clone.send({ embeds: [deeloEmbed('💥 Channel Nuked', `Nuked by ${message.author}`)] });
    return true;
  }

  if (name === 'topic') {
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply({ embeds: [errorEmbed('You need **Manage Channels** permission.')] });
      return true;
    }
    const topic = args.join(' ');
    if (!topic) {
      await message.reply({ embeds: [errorEmbed('Usage: `,topic <text>`')] });
      return true;
    }
    await (message.channel as TextChannel).setTopic(topic);
    await message.reply({ embeds: [successEmbed('Channel topic updated.')] });
    return true;
  }

  if (name === 'slowmode off' || name === 'slowmode on') {
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply({ embeds: [errorEmbed('You need **Manage Channels** permission.')] });
      return true;
    }
    const seconds = name === 'slowmode off' ? 0 : parseInt(args[0], 10) || 10;
    await (message.channel as TextChannel).setRateLimitPerUser(seconds);
    await message.reply({ embeds: [successEmbed(`Slowmode set to **${seconds}s**.`)] });
    return true;
  }

  if (name === 'jail') {
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await message.reply({ embeds: [errorEmbed('You need **Moderate Members** permission.')] });
      return true;
    }
    const target = message.mentions.members?.first();
    if (!target) {
      await message.reply({ embeds: [errorEmbed('Usage: `,jail @user [reason]`')] });
      return true;
    }
    if (!canModerate(member, target)) {
      await message.reply({ embeds: [errorEmbed('Cannot jail this member.')] });
      return true;
    }
    const { getGuild } = await import('../database');
    const settings = await getGuild(guild.id);
    if (!settings.jail_role) {
      await message.reply({ embeds: [errorEmbed('Set a jail role in server settings first.')] });
      return true;
    }
    await target.roles.set([settings.jail_role]);
    await addModCase(guild.id, target.id, message.author.id, 'jail', args.slice(1).join(' ') || 'No reason');
    await message.reply({ embeds: [successEmbed(`Jailed **${target.user.tag}**.`)] });
    return true;
  }

  if (name === 'unjail') {
    const target = message.mentions.members?.first();
    if (!target) {
      await message.reply({ embeds: [errorEmbed('Usage: `,unjail @user`')] });
      return true;
    }
    await target.roles.set([]);
    await message.reply({ embeds: [successEmbed(`Unjailed **${target.user.tag}**.`)] });
    return true;
  }

  if (name === 'temprole') {
    const target = message.mentions.members?.first();
    const role = message.mentions.roles.first();
    const duration = parseDuration(args[2] ?? args[1] ?? '');
    if (!target || !role || !duration) {
      await message.reply({ embeds: [errorEmbed('Usage: `,temprole @user @role 1h`')] });
      return true;
    }
    await target.roles.add(role);
    setTimeout(() => target.roles.remove(role).catch(() => {}), duration);
    await message.reply({ embeds: [successEmbed(`Gave ${target} ${role} for ${formatDuration(duration)}.`)] });
    return true;
  }

  if (name === 'notes add') {
    const target = resolveUserId(message, args[0]);
    const note = args.slice(1).join(' ');
    if (!target || !note) {
      await message.reply({ embeds: [errorEmbed('Usage: `,notes add @user <note>`')] });
      return true;
    }
    await message.reply({ embeds: [successEmbed(`Note added for <@${target}>: ${note}`)] });
    return true;
  }

  if (name === 'newmembers') {
    const members = [...guild.members.cache.values()]
      .filter((m) => Date.now() - m.joinedTimestamp! < 86400000 * 7)
      .sort((a, b) => a.joinedTimestamp! - b.joinedTimestamp!)
      .slice(0, 15);
    const list = members.map((m) => `${m.user.tag} — <t:${Math.floor(m.joinedTimestamp! / 1000)}:R>`).join('\n') || 'None this week.';
    await message.reply({ embeds: [deeloEmbed('New Members (7d)', list)] });
    return true;
  }

  return false;
}

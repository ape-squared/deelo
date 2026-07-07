import { PermissionFlagsBits, TextChannel } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed, parseDuration, formatDuration, resolveUserId, parseUserId } from '../../utils/embeds';
import { canModerate } from '../../utils/permissions';
import { addModCase, addWarning, getWarnings, clearWarnings, getModCases, getModCase } from '../../database';
import { muteMember, unmuteMember } from '../../services/mute';

const moderation: Command[] = [
  {
    name: 'ban',
    aliases: ['b'],
    description: 'Ban a member from the server',
    category: 'moderation',
    usage: 'ban <user> [reason]',
    permissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      if (!userId) return void message.reply({ embeds: [errorEmbed('Usage: `,ban <user> [reason]`')] });
      const reason = args.slice(1).join(' ') || 'No reason provided';
      const member = await message.guild!.members.fetch(userId).catch(() => null);
      if (member && !canModerate(message.member!, member)) {
        return void message.reply({ embeds: [errorEmbed('You cannot ban this member.')] });
      }
      await message.guild!.members.ban(userId, { reason });
      const caseId = await addModCase(message.guild!.id, userId, message.author.id, 'ban', reason);
      const { sendModLog } = await import('../../services/logging');
      await sendModLog(message.guild!, '🔨 Member Banned', `**User:** <@${userId}>\n**Moderator:** ${message.author}\n**Reason:** ${reason}\n**Case:** #${caseId}`, { sourceChannelId: message.channel.id });
      await message.reply({ embeds: [successEmbed(`Banned <@${userId}> — Case #${caseId}\n**Reason:** ${reason}`)] });
    },
    slash: {
      description: 'Ban a member',
      options: [
        { name: 'user', description: 'User to ban', type: 6, required: true },
        { name: 'reason', description: 'Reason', type: 3 },
      ],
      run: async ({ interaction }) => {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        await interaction.guild!.members.ban(user.id, { reason });
        const caseId = await addModCase(interaction.guild!.id, user.id, interaction.user.id, 'ban', reason);
        await interaction.reply({ embeds: [successEmbed(`Banned ${user.tag} — Case #${caseId}`)] });
      },
    },
  },
  {
    name: 'kick',
    aliases: ['k'],
    description: 'Kick a member from the server',
    category: 'moderation',
    usage: 'kick <user> [reason]',
    permissions: [PermissionFlagsBits.KickMembers],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      if (!userId) return void message.reply({ embeds: [errorEmbed('Usage: `,kick <user> [reason]`')] });
      const member = await message.guild!.members.fetch(userId).catch(() => null);
      if (!member) return void message.reply({ embeds: [errorEmbed('Member not found.')] });
      if (!canModerate(message.member!, member)) return void message.reply({ embeds: [errorEmbed('Cannot kick this member.')] });
      const reason = args.slice(1).join(' ') || 'No reason';
      await member.kick(reason);
      const caseId = await addModCase(message.guild!.id, userId, message.author.id, 'kick', reason);
      const { sendModLog } = await import('../../services/logging');
      await sendModLog(message.guild!, '👢 Member Kicked', `**User:** ${member.user.tag} (\`${userId}\`)\n**Moderator:** ${message.author}\n**Reason:** ${reason}\n**Case:** #${caseId}`, { sourceChannelId: message.channel.id });
      await message.reply({ embeds: [successEmbed(`Kicked **${member.user.tag}** — Case #${caseId}`)] });
    },
  },
  {
    name: 'warn',
    aliases: ['w'],
    description: 'Warn a member',
    category: 'moderation',
    usage: 'warn <user> [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      if (!userId) return void message.reply({ embeds: [errorEmbed('Usage: `,warn <user> [reason]`')] });
      const reason = args.slice(1).join(' ') || 'No reason';
      const warnId = await addWarning(message.guild!.id, userId, message.author.id, reason);
      const warnings = await getWarnings(message.guild!.id, userId);
      await message.reply({ embeds: [successEmbed(`Warned <@${userId}> (#${warnId}) — Total warnings: **${warnings.length}**`)] });
    },
  },
  {
    name: 'warnings',
    aliases: ['warns'],
    description: 'View warnings for a member',
    category: 'moderation',
    usage: 'warnings <user>',
    permissions: [PermissionFlagsBits.ModerateMembers],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]) ?? message.author.id;
      const warnings = await getWarnings(message.guild!.id, userId);
      if (!warnings.length) return void message.reply({ embeds: [deeloEmbed('Warnings', 'No warnings found.')] });
      const list = warnings.map((w, i) => `**${i + 1}.** ${w.reason ?? 'No reason'} — <t:${Math.floor(new Date(w.created_at).getTime() / 1000)}:R>`).join('\n');
      await message.reply({ embeds: [deeloEmbed(`Warnings for <@${userId}>`, list)] });
    },
  },
  {
    name: 'clearwarnings',
    aliases: ['clearwarns'],
    description: 'Clear all warnings for a member',
    category: 'moderation',
    usage: 'clearwarnings <user>',
    permissions: [PermissionFlagsBits.ModerateMembers],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      if (!userId) return void message.reply({ embeds: [errorEmbed('Usage: `,clearwarnings <user>`')] });
      const count = await clearWarnings(message.guild!.id, userId);
      await message.reply({ embeds: [successEmbed(`Cleared **${count}** warning(s) for <@${userId}>.`)] });
    },
  },
  {
    name: 'mute',
    description: 'Mute a member (role-based)',
    category: 'moderation',
    usage: 'mute <user> [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ManageRoles],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      if (!userId) return void message.reply({ embeds: [errorEmbed('Usage: `,mute <user> [reason]`')] });
      const member = await message.guild!.members.fetch(userId).catch(() => null);
      if (!member) return void message.reply({ embeds: [errorEmbed('Member not found.')] });
      if (!canModerate(message.member!, member)) return void message.reply({ embeds: [errorEmbed('Cannot mute this member.')] });
      const reason = args.slice(1).join(' ') || 'Muted';
      try {
        const caseId = await muteMember(member, message.author.id, reason);
        const { sendModLog } = await import('../../services/logging');
        await sendModLog(message.guild!, '🔇 Member Muted', `**User:** ${member.user.tag}\n**Moderator:** ${message.author}\n**Reason:** ${reason}\n**Case:** #${caseId}`, { sourceChannelId: message.channel.id });
        await message.reply({ embeds: [successEmbed(`Muted **${member.user.tag}** — Case #${caseId}`)] });
      } catch (err) {
        const { MuteError } = await import('../../services/mute');
        const msg = err instanceof MuteError ? err.message : 'Failed to mute that member.';
        await message.reply({ embeds: [errorEmbed(msg)] });
      }
    },
  },
  {
    name: 'unmute',
    description: 'Unmute a member',
    category: 'moderation',
    usage: 'unmute <user>',
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ManageRoles],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      if (!userId) return void message.reply({ embeds: [errorEmbed('Usage: `,unmute <user>`')] });
      const member = await message.guild!.members.fetch(userId).catch(() => null);
      if (!member) return void message.reply({ embeds: [errorEmbed('Member not found.')] });
      try {
        await unmuteMember(member);
        await message.reply({ embeds: [successEmbed(`Unmuted **${member.user.tag}**.`)] });
      } catch (err) {
        const { MuteError } = await import('../../services/mute');
        const msg = err instanceof MuteError ? err.message : 'Failed to unmute that member.';
        await message.reply({ embeds: [errorEmbed(msg)] });
      }
    },
  },
  {
    name: 'timeout',
    aliases: ['to'],
    description: 'Timeout a member',
    category: 'moderation',
    usage: 'timeout <user> <duration> [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      const duration = parseDuration(args[1] ?? '');
      if (!userId || !duration) return void message.reply({ embeds: [errorEmbed('Usage: `,timeout <user> <1m|1h|1d> [reason]`')] });
      const member = await message.guild!.members.fetch(userId).catch(() => null);
      if (!member || !canModerate(message.member!, member)) return void message.reply({ embeds: [errorEmbed('Cannot timeout this member.')] });
      const reason = args.slice(2).join(' ') || 'No reason';
      await member.timeout(duration, reason);
      const caseId = await addModCase(message.guild!.id, userId, message.author.id, 'timeout', reason, duration);
      await message.reply({ embeds: [successEmbed(`Timed out **${member.user.tag}** for ${formatDuration(duration)} — Case #${caseId}`)] });
    },
  },
  {
    name: 'untimeout',
    description: 'Remove timeout from a member',
    category: 'moderation',
    usage: 'untimeout <user>',
    permissions: [PermissionFlagsBits.ModerateMembers],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      if (!userId) return void message.reply({ embeds: [errorEmbed('Usage: `,untimeout <user>`')] });
      const member = await message.guild!.members.fetch(userId).catch(() => null);
      if (!member) return void message.reply({ embeds: [errorEmbed('Member not found.')] });
      await member.timeout(null);
      await message.reply({ embeds: [successEmbed(`Removed timeout from **${member.user.tag}**.`)] });
    },
  },
  {
    name: 'purge',
    aliases: ['clear', 'prune'],
    description: 'Delete messages in bulk',
    category: 'moderation',
    usage: 'purge <amount> [user]',
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    run: async ({ message, args }) => {
      const amount = parseInt(args[0], 10);
      if (!amount || amount < 1) return void message.reply({ embeds: [errorEmbed('Usage: `,purge <1-100>`')] });
      const { getGuildPlan } = await import('../../database');
      const { getLimit } = await import('../../config/plans');
      const plan = await getGuildPlan(message.guild!.id);
      const max = getLimit(plan, 'maxPurgeAmount');
      const count = Math.min(amount, max);
      const userId = args[1] ? parseUserId(args[1]) : null;
      if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
      const textChannel = message.channel;
      const messages = await textChannel.messages.fetch({ limit: 100 });
      const filtered = [...messages.values()].filter((m) => !m.pinned && (!userId || m.author.id === userId));
      const toDelete = filtered.slice(0, count);
      const deleted = await textChannel.bulkDelete(toDelete, true);
      const reply = await textChannel.send({ embeds: [successEmbed(`Deleted **${deleted.size}** message(s).`)] });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
    },
  },
  {
    name: 'history',
    aliases: ['modhistory', 'cases'],
    description: 'View moderation history',
    category: 'moderation',
    usage: 'history [user]',
    permissions: [PermissionFlagsBits.ModerateMembers],
    run: async ({ message, args }) => {
      const userId = args[0] ? resolveUserId(message, args[0]) ?? undefined : undefined;
      const cases = await getModCases(message.guild!.id, userId, 10);
      if (!cases.length) return void message.reply({ embeds: [deeloEmbed('Mod History', 'No cases found.')] });
      const list = cases.map((c) => `**#${c.id}** ${c.type} — <@${c.user_id}> by <@${c.moderator_id}> — <t:${Math.floor(new Date(c.created_at).getTime() / 1000)}:R>`).join('\n');
      await message.reply({ embeds: [deeloEmbed('Mod History', list)] });
    },
  },
  {
    name: 'case',
    description: 'View a specific moderation case',
    category: 'moderation',
    usage: 'case <id>',
    permissions: [PermissionFlagsBits.ModerateMembers],
    run: async ({ message, args }) => {
      const id = parseInt(args[0], 10);
      if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,case <id>`')] });
      const c = await getModCase(id, message.guild!.id);
      if (!c) return void message.reply({ embeds: [errorEmbed('Case not found.')] });
      await message.reply({
        embeds: [deeloEmbed(`Case #${c.id}`, `**Type:** ${c.type}\n**User:** <@${c.user_id}>\n**Moderator:** <@${c.moderator_id}>\n**Reason:** ${c.reason ?? 'None'}\n**Date:** <t:${Math.floor(new Date(c.created_at).getTime() / 1000)}:F>`)],
      });
    },
  },
  {
    name: 'lock',
    description: 'Lock a channel',
    category: 'moderation',
    usage: 'lock [channel]',
    permissions: [PermissionFlagsBits.ManageChannels],
    premiumFeature: 'lock',
    run: async ({ message, args }) => {
      const channel = (message.mentions.channels.first() ?? message.channel) as TextChannel;
      if (!channel.isTextBased() || channel.isDMBased() || !('permissionOverwrites' in channel)) return;
      await channel.permissionOverwrites.edit(message.guild!.id, { SendMessages: false });
      await message.reply({ embeds: [successEmbed(`Locked ${channel}.`)] });
    },
  },
  {
    name: 'unlock',
    description: 'Unlock a channel',
    category: 'moderation',
    usage: 'unlock [channel]',
    permissions: [PermissionFlagsBits.ManageChannels],
    run: async ({ message }) => {
      const channel = message.channel as TextChannel;
      if (!channel.isTextBased() || channel.isDMBased() || !('permissionOverwrites' in channel)) return;
      await channel.permissionOverwrites.edit(message.guild!.id, { SendMessages: null });
      await message.reply({ embeds: [successEmbed(`Unlocked ${channel}.`)] });
    },
  },
  {
    name: 'slowmode',
    aliases: ['slow'],
    description: 'Set channel slowmode',
    category: 'moderation',
    usage: 'slowmode <seconds>',
    permissions: [PermissionFlagsBits.ManageChannels],
    run: async ({ message, args }) => {
      const seconds = parseInt(args[0], 10);
      if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
        return void message.reply({ embeds: [errorEmbed('Usage: `,slowmode <0-21600>`')] });
      }
      if (message.channel.isTextBased() && 'setRateLimitPerUser' in message.channel) {
        await message.channel.setRateLimitPerUser(seconds);
        await message.reply({ embeds: [successEmbed(`Slowmode set to **${seconds}s**.`)] });
      }
    },
  },
  {
    name: 'nickname',
    aliases: ['nick'],
    description: 'Change a member nickname',
    category: 'moderation',
    usage: 'nickname <user> <name>',
    permissions: [PermissionFlagsBits.ManageNicknames],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      const nick = args.slice(1).join(' ');
      if (!userId) return void message.reply({ embeds: [errorEmbed('Usage: `,nickname <user> <name>`')] });
      const member = await message.guild!.members.fetch(userId).catch(() => null);
      if (!member) return void message.reply({ embeds: [errorEmbed('Member not found.')] });
      await member.setNickname(nick || null);
      await message.reply({ embeds: [successEmbed(`Updated nickname for **${member.user.tag}**.`)] });
    },
  },
];

export default moderation;

import { type Message, ChannelType, type GuildBasedChannel } from 'discord.js';
import { deeloEmbed, errorEmbed, resolveUserId } from '../utils/embeds';

export async function handleInformationCommand(name: string, message: Message, args: string[]): Promise<boolean> {
  const guild = message.guild!;

  if (name === 'roleinfo' || name === 'ri') {
    const role = message.mentions.roles.first() ?? guild.roles.cache.get(args[0] ?? '');
    if (!role) {
      await message.reply({ embeds: [errorEmbed('Usage: `,roleinfo @role`')] });
      return true;
    }
    await message.reply({
      embeds: [deeloEmbed(role.name, `**ID:** ${role.id}\n**Color:** ${role.hexColor}\n**Members:** ${role.members.size}\n**Hoisted:** ${role.hoist}\n**Mentionable:** ${role.mentionable}\n**Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`)],
    });
    return true;
  }

  if (name === 'channelinfo' || name === 'ci') {
    const ch = (message.mentions.channels.first() ?? message.channel) as GuildBasedChannel;
    await message.reply({
      embeds: [deeloEmbed(`#${'name' in ch ? ch.name : 'channel'}`, `**ID:** ${ch.id}\n**Type:** ${ChannelType[ch.type]}\n**Created:** <t:${Math.floor((ch.createdTimestamp ?? Date.now()) / 1000)}:R>`)],
    });
    return true;
  }

  if (name === 'bots') {
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    await message.reply({ embeds: [deeloEmbed('Bots', `**${bots}** bots in this server.`)] });
    return true;
  }

  if (name === 'roles') {
    const list = guild.roles.cache.sort((a, b) => b.position - a.position).map((r) => r.toString()).slice(0, 30).join(', ');
    await message.reply({ embeds: [deeloEmbed('Roles', list || 'None')] });
    return true;
  }

  if (name === 'emotes' || name === 'emojis') {
    const emojis = guild.emojis.cache.map((e) => e.toString()).join(' ') || 'No custom emojis.';
    await message.reply({ embeds: [deeloEmbed('Emojis', emojis.slice(0, 4000))] });
    return true;
  }

  if (name === 'boosters') {
    const boosters = guild.members.cache.filter((m) => m.premiumSince).map((m) => m.user.tag).slice(0, 20);
    await message.reply({ embeds: [deeloEmbed('Boosters', boosters.join('\n') || 'No boosters.')] });
    return true;
  }

  if (name === 'hex') {
    const user = message.mentions.users.first() ?? message.author;
    const member = guild.members.cache.get(user.id);
    const color = member?.displayHexColor ?? '#000000';
    await message.reply({ embeds: [deeloEmbed(`${user.username}'s Color`, color).setColor(color as `#${string}`)] });
    return true;
  }

  if (name === 'banner') {
    const user = message.mentions.users.first() ?? message.author;
    const fetched = await user.fetch();
    const url = fetched.bannerURL({ size: 4096 });
    if (!url) {
      await message.reply({ embeds: [errorEmbed('No banner set.')] });
      return true;
    }
    await message.reply({ embeds: [deeloEmbed(`${user.username}'s Banner`, '').setImage(url)] });
    return true;
  }

  if (name === 'membercount') {
    await message.reply({ embeds: [deeloEmbed('Member Count', `**${guild.memberCount}** members`)] });
    return true;
  }

  if (name === 'inviteinfo') {
    const code = args[0]?.replace('https://discord.gg/', '') ?? '';
    if (!code) {
      await message.reply({ embeds: [errorEmbed('Usage: `,inviteinfo <code>`')] });
      return true;
    }
    const invite = await guild.client.fetchInvite(code).catch(() => null);
    if (!invite) {
      await message.reply({ embeds: [errorEmbed('Invalid invite.')] });
      return true;
    }
    await message.reply({
      embeds: [deeloEmbed('Invite Info', `**Server:** ${invite.guild?.name}\n**Uses:** ${invite.uses}\n**Inviter:** ${invite.inviter?.tag ?? 'Unknown'}`)],
    });
    return true;
  }

  if (name === 'seen') {
    const userId = resolveUserId(message, args[0]) ?? message.author.id;
    const m = guild.members.cache.get(userId);
    await message.reply({
      embeds: [deeloEmbed('Seen', m ? `**${m.user.tag}** last seen in this server.\n**Joined:** <t:${Math.floor(m.joinedTimestamp! / 1000)}:R>` : 'Member not in server.')],
    });
    return true;
  }

  return false;
}

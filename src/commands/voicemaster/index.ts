import { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { getGuild, updateGuild } from '../../database';
import { getSupabase } from '../../database/supabase';

const voicemaster: Command[] = [
  {
    name: 'voicemaster',
    aliases: ['vm', 'vc'],
    description: 'Temporary voice channel system',
    category: 'voicemaster',
    usage: 'voicemaster <setup|lock|unlock|limit|rename|claim|ghost|permit>',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      const member = message.member!;
      const voice = member.voice.channel;

      if (sub === 'setup') {
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
          return void message.reply({ embeds: [errorEmbed('You need Manage Channels.')] });
        }
        const category = await message.guild!.channels.create({ name: 'Voice Channels', type: ChannelType.GuildCategory });
        const join = await message.guild!.channels.create({ name: '➕ Join to Create', type: ChannelType.GuildVoice, parent: category.id });
        const iface = await message.guild!.channels.create({ name: 'interface', type: ChannelType.GuildText, parent: category.id });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('vm_limit').setLabel('Limit').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
        );

        await iface.send({ embeds: [deeloEmbed('VoiceMaster', 'Join **Join to Create** to make your own voice channel.\nUse the buttons below to control your channel.')], components: [row] });

        await updateGuild(message.guild!.id, {
          voicemaster_category: category.id,
          voicemaster_join_channel: join.id,
          voicemaster_interface_channel: iface.id,
        });
        return void message.reply({ embeds: [successEmbed('VoiceMaster setup complete!')] });
      }

      if (!voice) return void message.reply({ embeds: [errorEmbed('You must be in a voice channel.')] });

      const { data: vm } = await getSupabase().from('voicemaster_channels').select('*').eq('channel_id', voice.id).maybeSingle();
      if (!vm && !['setup'].includes(sub ?? '')) return void message.reply({ embeds: [errorEmbed('Not a VoiceMaster channel.')] });

      if (sub === 'lock' && vm) {
        if (vm.owner_id !== member.id) return void message.reply({ embeds: [errorEmbed("You don't own this channel.")] });
        await voice.permissionOverwrites.edit(message.guild!.id, { Connect: false });
        await getSupabase().from('voicemaster_channels').update({ locked: true }).eq('channel_id', voice.id);
        return void message.reply({ embeds: [successEmbed('Channel locked.')] });
      }

      if (sub === 'unlock' && vm) {
        if (vm.owner_id !== member.id) return void message.reply({ embeds: [errorEmbed("You don't own this channel.")] });
        await voice.permissionOverwrites.edit(message.guild!.id, { Connect: true });
        await getSupabase().from('voicemaster_channels').update({ locked: false }).eq('channel_id', voice.id);
        return void message.reply({ embeds: [successEmbed('Channel unlocked.')] });
      }

      if (sub === 'limit' && vm) {
        const limit = parseInt(args[1], 10);
        if (!limit) return void message.reply({ embeds: [errorEmbed('Usage: `,voicemaster limit <0-99>`')] });
        await voice.setUserLimit(limit);
        await getSupabase().from('voicemaster_channels').update({ user_limit: limit }).eq('channel_id', voice.id);
        return void message.reply({ embeds: [successEmbed(`User limit set to **${limit}**.`)] });
      }

      if (sub === 'rename' && vm) {
        const name = args.slice(1).join(' ');
        if (!name) return void message.reply({ embeds: [errorEmbed('Usage: `,voicemaster rename <name>`')] });
        await voice.setName(name);
        return void message.reply({ embeds: [successEmbed(`Renamed to **${name}**.`)] });
      }

      if (sub === 'claim' && vm) {
        const owner = await message.guild!.members.fetch(vm.owner_id).catch(() => null);
        if (owner?.voice.channelId === voice.id) return void message.reply({ embeds: [errorEmbed('Owner is still in the channel.')] });
        await getSupabase().from('voicemaster_channels').update({ owner_id: member.id }).eq('channel_id', voice.id);
        return void message.reply({ embeds: [successEmbed('You claimed this channel.')] });
      }

      if (sub === 'ghost' && vm) {
        const { requirePremium } = await import('../../premium/check');
        if (!(await requirePremium(message, 'voicemasterGhost'))) return;
        await voice.permissionOverwrites.edit(message.guild!.id, { ViewChannel: false });
        await getSupabase().from('voicemaster_channels').update({ ghosted: true }).eq('channel_id', voice.id);
        return void message.reply({ embeds: [successEmbed('Channel ghosted.')] });
      }

      if (sub === 'permit' && vm) {
        const target = message.mentions.members?.first();
        if (!target) return void message.reply({ embeds: [errorEmbed('Mention a member.')] });
        await voice.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true });
        return void message.reply({ embeds: [successEmbed(`Permitted **${target.user.tag}**.`)] });
      }

      const guild = await getGuild(message.guild!.id);
      await message.reply({
        embeds: [deeloEmbed('VoiceMaster', `**Setup:** ${guild.voicemaster_join_channel ? 'Yes' : 'No'}\n**Join channel:** ${guild.voicemaster_join_channel ? `<#${guild.voicemaster_join_channel}>` : 'None'}\n\nSubcommands: setup, lock, unlock, limit, rename, claim, ghost (premium), permit`)],
      });
    },
  },
];

export default voicemaster;

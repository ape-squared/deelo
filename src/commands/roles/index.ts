import { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed, resolveUserId } from '../../utils/embeds';
import { getSupabase } from '../../database/supabase';

const roles: Command[] = [
  {
    name: 'reactionrole',
    aliases: ['rr'],
    description: 'Create reaction roles',
    category: 'roles',
    usage: 'reactionrole <message_id> <emoji> <role>',
    permissions: [PermissionFlagsBits.ManageRoles],
    run: async ({ message, args }) => {
      const msgId = args[0];
      const emoji = args[1];
      const role = message.mentions.roles.first();
      if (!msgId || !emoji || !role) return void message.reply({ embeds: [errorEmbed('Usage: `,reactionrole <message_id> <emoji> <@role>`')] });
      const targetMsg = await message.channel.messages.fetch(msgId).catch(() => null);
      if (!targetMsg) return void message.reply({ embeds: [errorEmbed('Message not found in this channel.')] });
      await targetMsg.react(emoji);
      await getSupabase().from('reaction_roles').insert({ guild_id: message.guild!.id, channel_id: message.channel.id, message_id: msgId, emoji, role_id: role.id });
      await message.reply({ embeds: [successEmbed(`Reaction role added: ${emoji} → ${role}`)] });
    },
  },
  {
    name: 'buttonrole',
    aliases: ['br'],
    description: 'Create button roles',
    category: 'roles',
    usage: 'buttonrole <label> <role>',
    permissions: [PermissionFlagsBits.ManageRoles],
    premiumFeature: 'buttonRoles',
    run: async ({ message, args }) => {
      const label = args[0];
      const role = message.mentions.roles.first();
      if (!label || !role) return void message.reply({ embeds: [errorEmbed('Usage: `,buttonrole <label> <@role>`')] });
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`role_${role.id}`).setLabel(label).setStyle(ButtonStyle.Primary),
      );
      if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
      const panel = await message.channel.send({ embeds: [deeloEmbed('Role Menu', `Click to get ${role}`)], components: [row] });
      await getSupabase().from('button_roles').insert({ guild_id: message.guild!.id, channel_id: message.channel.id, message_id: panel.id, label, role_id: role.id });
      await message.reply({ embeds: [successEmbed('Button role panel created.')] });
    },
  },
  {
    name: 'rolerestore',
    aliases: ['restoreroles'],
    description: 'Restore roles a member had before leaving',
    category: 'roles',
    usage: 'rolerestore <user>',
    permissions: [PermissionFlagsBits.ManageRoles],
    botPermissions: [PermissionFlagsBits.ManageRoles],
    run: async ({ message, args }) => {
      const userId = resolveUserId(message, args[0]);
      if (!userId) return void message.reply({ embeds: [errorEmbed('Usage: `,rolerestore <user>`')] });

      const member = await message.guild!.members.fetch(userId).catch(() => null);
      if (!member) {
        return void message.reply({
          embeds: [errorEmbed('Member must be in the server. Roles are saved automatically when they leave.')],
        });
      }

      const { restoreMemberRoles } = await import('../../services/role-restore');
      try {
        const { restored, skipped, nickRestored } = await restoreMemberRoles(member);
        const lines = [
          restored.length ? `**Restored:** ${restored.join(', ')}` : '**Restored:** none',
          skipped.length ? `**Skipped:** ${skipped.join(', ')}` : '',
          nickRestored ? '**Nickname** restored.' : '',
        ].filter(Boolean);
        await message.reply({ embeds: [successEmbed(lines.join('\n'))] });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to restore roles.';
        await message.reply({ embeds: [errorEmbed(msg)] });
      }
    },
  },
  {
    name: 'vanity',
    description: 'Reward members for server vanity in status',
    category: 'roles',
    usage: 'vanity <add|remove|list> [string] [role]',
    permissions: [PermissionFlagsBits.ManageRoles],
    premiumFeature: 'vanityRoles',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      if (sub === 'add') {
        const str = args[1];
        const role = message.mentions.roles.first();
        if (!str || !role) return void message.reply({ embeds: [errorEmbed('Usage: `,vanity add <string> <@role>`')] });
        await getSupabase().from('vanity_roles').upsert({ guild_id: message.guild!.id, vanity_string: str.toLowerCase(), role_id: role.id });
        return void message.reply({ embeds: [successEmbed(`Vanity role: members with **${str}** in status get ${role}.`)] });
      }
      if (sub === 'list') {
        const { data } = await getSupabase().from('vanity_roles').select('*').eq('guild_id', message.guild!.id);
        const list = data?.map((v) => `**${v.vanity_string}** → <@&${v.role_id}>`).join('\n') || 'None.';
        return void message.reply({ embeds: [deeloEmbed('Vanity Roles', list)] });
      }
      if (sub === 'remove') {
        const str = args[1]?.toLowerCase();
        if (!str) return void message.reply({ embeds: [errorEmbed('Usage: `,vanity remove <string>`')] });
        await getSupabase().from('vanity_roles').delete().eq('guild_id', message.guild!.id).eq('vanity_string', str);
        return void message.reply({ embeds: [successEmbed(`Removed vanity role for **${str}**.`)] });
      }
      await message.reply({ embeds: [deeloEmbed('Vanity Roles', 'Reward members who advertise your server in their status.\nUsage: `,vanity add <string> <@role>` · `,vanity remove <string>` · `,vanity list`')] });
    },
  },
];

export default roles;

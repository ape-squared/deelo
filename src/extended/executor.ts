import { PermissionFlagsBits, type Message } from 'discord.js';
import type { CommandDef } from './types';
import { errorEmbed } from '../utils/embeds';
import { getGuildPlan } from '../database';
import { hasFeature } from '../config/plans';
import { dispatchCatalogCommand } from './handlers/dispatch';

/** Read-only catalog commands that should not require Manage Server. */
const PERMISSION_EXEMPT = new Set([
  'fortnite',
  'fortnite item',
  'fortniteshop',
  'fnshop',
  'fortnite watch list',
]);

async function checkPermission(message: Message, cmd: CommandDef): Promise<boolean> {
  if (!cmd.permission || !message.member) return true;

  if (PERMISSION_EXEMPT.has(cmd.name)) return true;
  if (cmd.name === 'fortnite shop' && !message.mentions.channels.size) return true;

  const perm = cmd.permission.toLowerCase();
  if (perm.includes('booster') || perm.includes('donator') || perm.includes('premium')) {
    const plan = await getGuildPlan(message.guild!.id);
    if (!hasFeature(plan, 'chatgpt')) {
      await message.reply({ embeds: [errorEmbed('This command requires **Premium**. Use `,premium` to upgrade.')] });
      return false;
    }
  }
  if (perm.includes('administrator') && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await message.reply({ embeds: [errorEmbed('You need **Administrator** permission.')] });
    return false;
  }
  if (perm.includes('manage guild') && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply({ embeds: [errorEmbed('You need **Manage Server** permission.')] });
    return false;
  }
  if (perm.includes('manage channels') && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await message.reply({ embeds: [errorEmbed('You need **Manage Channels** permission.')] });
    return false;
  }
  if (perm.includes('manage roles') && !message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await message.reply({ embeds: [errorEmbed('You need **Manage Roles** permission.')] });
    return false;
  }
  return true;
}

export async function executeExtendedCommand(message: Message, cmd: CommandDef, args: string[]): Promise<boolean> {
  if (!(await checkPermission(message, cmd))) return true;
  return dispatchCatalogCommand(cmd, message, args);
}

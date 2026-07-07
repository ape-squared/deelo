import { PermissionFlagsBits, type Message } from 'discord.js';
import type { CommandDef } from './types';
import { errorEmbed } from '../utils/embeds';
import { getGuildPlan } from '../database';
import { hasFeature } from '../config/plans';
import { dispatchCatalogCommand } from './handlers/dispatch';

async function checkPermission(message: Message, cmd: CommandDef): Promise<boolean> {
  if (!cmd.permission || !message.member) return true;
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
  if (perm.includes('manage messages') && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await message.reply({ embeds: [errorEmbed('You need **Manage Messages** permission.')] });
    return false;
  }
  return true;
}

export async function executeExtendedCommand(message: Message, cmd: CommandDef, args: string[]): Promise<boolean> {
  if (!(await checkPermission(message, cmd))) return true;
  return dispatchCatalogCommand(cmd, message, args);
}

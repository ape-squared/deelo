import { Collection } from 'discord.js';
import { config } from '../config';
import type { DeeloClient } from '../client';
import type { Command, CommandContext } from '../types/command';
import { errorEmbed } from '../utils/embeds';
import { formatPermissionList } from '../utils/permissions';
import { ackCommandMessage, shouldAckCommand } from './command-ack';
import { getGuild, getGuildPlan } from '../database';

export async function runCommand(
  client: DeeloClient,
  message: import('discord.js').Message,
  command: Command,
  args: string[]
): Promise<void> {
  if (client.commandExecutions.has(message.id)) {
    return;
  }
  client.commandExecutions.add(message.id);
  setTimeout(() => client.commandExecutions.delete(message.id), 15_000);

  const guildSettings = message.guild ? await getGuild(message.guild.id) : undefined;
  const effectivePlan = message.guild ? await getGuildPlan(message.guild.id) : undefined;
  const embedGuild = guildSettings
    ? { extra_config: guildSettings.extra_config, plan: effectivePlan ?? guildSettings.plan }
    : undefined;

  if (message.guild && guildSettings) {
    const { ensureGuildBotIdentity } = await import('../services/guild-identity');
    void ensureGuildBotIdentity(message.guild, guildSettings.extra_config ?? null, effectivePlan);
  }

  if (command.ownerOnly && !config.ownerIds.includes(message.author.id)) {
    await message.reply({ embeds: [errorEmbed('This command is owner-only.', embedGuild)] });
    return;
  }
  if (command.permissions && message.member) {
    const missing = command.permissions.filter((p) => !message.member!.permissions.has(p));
    if (missing.length) {
      const list = formatPermissionList(missing);
      const noun = list.includes(',') ? 'permissions' : 'permission';
      await message.reply({
        embeds: [errorEmbed(`You need **${list}** ${noun}.`, embedGuild)],
      });
      return;
    }
  }
  if (command.botPermissions && message.guild?.members.me) {
    const me = message.guild.members.me;
    const missing = command.botPermissions.filter((p) => !me.permissions.has(p));
    if (missing.length) {
      const list = formatPermissionList(missing);
      const noun = list.includes(',') ? 'permissions' : 'permission';
      await message.reply({
        embeds: [
          errorEmbed(
            `I need **${list}** ${noun}. Check my role permissions and hierarchy.`,
            embedGuild,
          ),
        ],
      });
      return;
    }
  }
  if (command.premiumFeature && message.guild) {
    const { checkPremium } = await import('../premium/check');
    const allowed = await checkPremium(message.guild.id, command.premiumFeature, (opts) => message.reply(opts));
    if (!allowed) return;
  }
  if (command.cooldown) {
    if (!client.cooldowns.has(command.name)) client.cooldowns.set(command.name, new Collection());
    const timestamps = client.cooldowns.get(command.name)!;
    const now = Date.now();
    const expiration = timestamps.get(message.author.id);
    if (expiration && now < expiration) {
      await message.reply({ embeds: [errorEmbed(`Cooldown: ${((expiration - now) / 1000).toFixed(1)}s remaining.`, embedGuild)] });
      return;
    }
    timestamps.set(message.author.id, now + command.cooldown * 1000);
    setTimeout(() => timestamps.delete(message.author.id), command.cooldown * 1000);
  }

  let replyCount = 0;
  const originalReply = message.reply.bind(message);
  message.reply = async (...replyArgs: Parameters<typeof message.reply>) => {
    replyCount++;
    return originalReply(...replyArgs);
  };

  const ctx: CommandContext = {
    client,
    message,
    args,
    commandName: command.name,
    guildSettings: guildSettings ? { ...guildSettings, plan: effectivePlan ?? guildSettings.plan } : undefined,
  };
  let succeeded = true;
  try {
    await command.run(ctx);
  } catch (err) {
    succeeded = false;
    console.error(`Error in ${command.name}:`, err);
    await originalReply({ embeds: [errorEmbed('An error occurred running that command.', embedGuild)] }).catch(() => {});
  } finally {
    message.reply = originalReply;
    if (shouldAckCommand(command, replyCount, succeeded)) {
      await ackCommandMessage(message);
    }
  }
}

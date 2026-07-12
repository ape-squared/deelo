import { Collection } from 'discord.js';
import { config } from '../config';
import type { DeeloClient } from '../client';
import type { Command, CommandContext } from '../types/command';
import { errorEmbed } from '../utils/embeds';
import { formatPermissionList } from '../utils/permissions';
import { ackCommandMessage, shouldAckCommand } from './command-ack';
import { getGuild, getGuildPlan } from '../database';
import { getPlatformStaffRole, staffMeetsRole } from '../services/platform-staff';

export async function runCommand(
  client: DeeloClient,
  message: import('discord.js').Message,
  command: Command,
  args: string[]
): Promise<void> {
  if (client.commandExecutions.has(message.id)) {
    console.warn(`[dedup] runCommand skipped — already executed for ${message.id}`);
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

  let replyCount = 0;
  let hasReplied = false;
  const originalReply = message.reply.bind(message);

  const safeReply: typeof message.reply = async (...replyArgs) => {
    if (hasReplied) {
      console.warn(`[dedup] blocked duplicate reply on message ${message.id} (${command.name})`);
      return null as unknown as Awaited<ReturnType<typeof message.reply>>;
    }
    hasReplied = true;
    replyCount++;
    return originalReply(...replyArgs);
  };

  message.reply = safeReply;

  try {
    if (command.ownerOnly && !config.ownerIds.includes(message.author.id)) {
      const role = await getPlatformStaffRole(message.author.id);
      const staffOk = role !== null && staffMeetsRole(role, 'developer');
      if (!staffOk) {
        await safeReply({
          embeds: [
            errorEmbed(
              [
                'This command is owner-only.',
                `Your Discord ID: \`${message.author.id}\``,
                config.ownerIds.length
                  ? 'If you run the bot, add your ID to `OWNER_IDS` in the bot environment and redeploy.'
                  : '`OWNER_IDS` is not set on this bot — add your ID there and redeploy.',
              ].join('\n'),
              embedGuild,
            ),
          ],
        });
        return;
      }
    }
    if (command.permissions && message.member) {
      const missing = command.permissions.filter((p) => !message.member!.permissions.has(p));
      if (missing.length) {
        const list = formatPermissionList(missing);
        const noun = list.includes(',') ? 'permissions' : 'permission';
        await safeReply({
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
        await safeReply({
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
      const allowed = await checkPremium(message.guild.id, command.premiumFeature, (opts) => safeReply(opts));
      if (!allowed) return;
    }
    if (command.cooldown) {
      if (!client.cooldowns.has(command.name)) client.cooldowns.set(command.name, new Collection());
      const timestamps = client.cooldowns.get(command.name)!;
      const now = Date.now();
      const expiration = timestamps.get(message.author.id);
      if (expiration && now < expiration) {
        await safeReply({ embeds: [errorEmbed(`Cooldown: ${((expiration - now) / 1000).toFixed(1)}s remaining.`, embedGuild)] });
        return;
      }
      timestamps.set(message.author.id, now + command.cooldown * 1000);
      setTimeout(() => timestamps.delete(message.author.id), command.cooldown * 1000);
    }

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
      if (!hasReplied) {
        await safeReply({ embeds: [errorEmbed('An error occurred running that command.', embedGuild)] }).catch(() => {});
      }
    } finally {
      if (shouldAckCommand(command, replyCount, succeeded)) {
        await ackCommandMessage(message);
      }
    }
  } finally {
    message.reply = originalReply;
  }
}

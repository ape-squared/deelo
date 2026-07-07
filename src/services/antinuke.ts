import type { Guild, GuildChannel, Role, TextChannel } from 'discord.js';
import { AuditLogEvent } from 'discord.js';
import type { GuildSettings } from '../database';
import { getConfigValue, setExtraConfig } from '../extended/lib/guild-config';

type ActionType = 'channel' | 'role';

const actionCounts = new Map<string, { count: number; resetAt: number }>();

function trackKey(guildId: string, userId: string, type: ActionType): number {
  const key = `${guildId}:${userId}:${type}`;
  const now = Date.now();
  const entry = actionCounts.get(key);
  if (!entry || now > entry.resetAt) {
    actionCounts.set(key, { count: 1, resetAt: now + 10_000 });
    return 1;
  }
  entry.count++;
  return entry.count;
}

async function getExecutor(guild: Guild, type: AuditLogEvent): Promise<string | null> {
  try {
    const logs = await guild.fetchAuditLogs({ limit: 1, type });
    const entry = logs.entries.first();
    if (!entry || Date.now() - entry.createdTimestamp > 5000) return null;
    return entry.executorId;
  } catch {
    return null;
  }
}

export async function handleAntiNuke(
  guild: Guild,
  settings: GuildSettings,
  type: ActionType,
  target: GuildChannel | Role,
): Promise<void> {
  if (!settings.antinuke_enabled) return;

  const modules = await getConfigValue<Record<string, boolean>>(
    guild.id,
    'antinuke.modules',
    { channel: true, role: true },
  );
  if (modules[type] === false) return;

  const auditType = type === 'channel' ? AuditLogEvent.ChannelDelete : AuditLogEvent.RoleDelete;
  const executorId = await getExecutor(guild, auditType);
  if (!executorId || executorId === guild.client.user?.id) return;

  if (guild.ownerId === executorId) return;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  if (member.permissions.has('Administrator')) return;

  const count = trackKey(guild.id, executorId, type);
  if (count < settings.antinuke_threshold) return;

  await member.ban({ reason: `Deelo anti-nuke: mass ${type} deletion` }).catch(() => {});

  const logChannel = settings.mod_log_channel
    ? guild.channels.cache.get(settings.mod_log_channel)
    : null;

  if (logChannel?.isTextBased()) {
    await (logChannel as TextChannel).send(
      `🚨 **Anti-nuke triggered** — banned <@${executorId}> after ${count} ${type} deletions.`,
    ).catch(() => {});
  }

  await setExtraConfig(guild.id, `antinuke.last.${type}`, {
    at: new Date().toISOString(),
    executor: executorId,
    target: target.id,
  });
}

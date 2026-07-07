import { PermissionFlagsBits, type Guild, GuildMember } from 'discord.js';
import { addModCase, getGuild, updateGuild } from '../database';

export class MuteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MuteError';
  }
}

async function ensureMuteRolePosition(guild: Guild, muteRoleId: string) {
  const me = guild.members.me;
  if (!me) return;
  const muteRole = guild.roles.cache.get(muteRoleId);
  if (!muteRole) return;
  const botTop = me.roles.highest.position;
  if (muteRole.position >= botTop && botTop > 0) {
    await muteRole.setPosition(Math.max(1, botTop - 1), { reason: 'Deelo mute role positioning' }).catch(() => {});
  }
}

export async function getOrCreateMuteRole(guild: Guild) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new MuteError('I need the **Manage Roles** permission to mute members.');
  }

  const settings = await getGuild(guild.id);
  let muteRole = settings.mute_role ? guild.roles.cache.get(settings.mute_role) : null;
  if (!muteRole) {
    muteRole = guild.roles.cache.find((r) => r.name.toLowerCase() === 'muted') ?? null;
  }
  if (!muteRole) {
    muteRole = await guild.roles.create({ name: 'Muted', permissions: [], reason: 'Deelo mute role' });
    for (const ch of guild.channels.cache.values()) {
      if (ch.isTextBased() && 'permissionOverwrites' in ch) {
        await ch.permissionOverwrites
          .edit(muteRole!, { SendMessages: false, AddReactions: false, Speak: false })
          .catch(() => {});
      }
    }
    await updateGuild(guild.id, { mute_role: muteRole.id });
  }

  await ensureMuteRolePosition(guild, muteRole.id);

  const botTop = me.roles.highest.position;
  if (muteRole.position >= botTop) {
    throw new MuteError(
      'Move my role **above** the **Muted** role in Server Settings → Roles, then try again.',
    );
  }

  return muteRole;
}

export async function muteMember(member: GuildMember, moderatorId: string, reason = 'Muted') {
  const muteRole = await getOrCreateMuteRole(member.guild);

  if (member.roles.cache.has(muteRole.id)) {
    throw new MuteError(`**${member.user.tag}** is already muted.`);
  }

  try {
    await member.roles.add(muteRole, reason);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Missing Permissions') || msg.includes('50013')) {
      throw new MuteError(
        'I could not assign the Muted role. Move my role **above** Muted in Server Settings → Roles.',
      );
    }
    if (msg.includes('Hierarchy') || msg.includes('50001')) {
      throw new MuteError('I cannot mute this member — they are above me in the role hierarchy.');
    }
    throw new MuteError(`Failed to mute: ${msg}`);
  }

  const caseId = await addModCase(member.guild.id, member.id, moderatorId, 'mute', reason);
  return caseId;
}

export async function unmuteMember(member: GuildMember) {
  const settings = await getGuild(member.guild.id);
  let removed = false;
  if (settings.mute_role) {
    if (member.roles.cache.has(settings.mute_role)) {
      await member.roles.remove(settings.mute_role).catch(() => {});
      removed = true;
    }
  }
  const muted = member.guild.roles.cache.find((r) => r.name.toLowerCase() === 'muted');
  if (muted && member.roles.cache.has(muted.id)) {
    await member.roles.remove(muted).catch(() => {});
    removed = true;
  }
  if (!removed) {
    throw new MuteError(`**${member.user.tag}** is not muted.`);
  }
}

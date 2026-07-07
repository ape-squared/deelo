import type { GuildMember } from 'discord.js';
import type { GuildSettings } from '../database';

export async function handleAntiRaid(member: GuildMember, guild: GuildSettings): Promise<void> {
  let suspicious = false;
  const accountAge = Date.now() - member.user.createdTimestamp;
  const minAgeMs = guild.antiraid_min_age * 86400000;

  if (accountAge < minAgeMs) suspicious = true;
  if (guild.antiraid_avatar && !member.user.avatar) suspicious = true;

  if (suspicious) {
    await member.kick('Deelo Anti-Raid: suspicious account').catch(() => {});
    const logChannel = guild.mod_log_channel ? member.guild.channels.cache.get(guild.mod_log_channel) : null;
    if (logChannel?.isTextBased()) {
      await logChannel.send(`🛡️ Anti-Raid kicked **${member.user.tag}** (account age: ${Math.floor(accountAge / 86400000)}d)`);
    }
  }
}

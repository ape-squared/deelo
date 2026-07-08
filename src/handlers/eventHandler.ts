import type { DeeloClient } from '../client';
import { handleMessage, handleInteraction } from './commandHandler';

export function registerEvents(client: DeeloClient): void {
  if (client.eventsRegistered) return;
  client.eventsRegistered = true;

  client.once('ready', () => {
    console.log(`Deelo logged in as ${client.user?.tag}`);
    client.user?.setActivity('deelo.bot | ,help', { type: 3 });
    void import('../services/guild-identity').then(({ syncAllGuildIdentities }) =>
      syncAllGuildIdentities(client).catch((err) => console.warn('[guild-identity] sync failed:', err)),
    );
    void import('../services/social-poll').then(({ startSocialPollLoop }) => startSocialPollLoop(client));
    void import('../services/counters').then(({ startCounterSyncLoop }) => startCounterSyncLoop(client));
    void import('../services/bump-reminder').then(({ startBumpReminderLoop }) => startBumpReminderLoop(client));
  });

  client.on('messageCreate', async (message) => {
    // Handle prefix commands first
    await handleMessage(client, message);

    if (message.author.bot || !message.guild) return;

    const { getGuild, getPrefix, getAutoResponders, addXp, getAfk, isEventEnabled } = await import('../database');
    const prefix = await getPrefix(message.guild.id);

    if (message.author.id === (await import('../services/bump-reminder')).DISBOARD_BOT_ID) {
      const { handleDisboardBumpMessage } = await import('../services/bump-reminder');
      await handleDisboardBumpMessage(message);
    }

    // Skip background handlers for command messages
    if (message.content.startsWith(prefix)) return;

    const guild = await getGuild(message.guild.id);

    if (guild.automod_enabled) {
      const { handleAutomod } = await import('../services/automod');
      if (await handleAutomod(message, guild)) return;
    }

    if (guild.levels_enabled && (await isEventEnabled(message.guild.id, 'levels'))) {
      const xpGain = Math.floor(Math.random() * 15 + 10) * guild.levels_multiplier;
      const result = await addXp(message.guild.id, message.author.id, xpGain);
      if (result.leveledUp && guild.levels_channel) {
        const ch = message.guild.channels.cache.get(guild.levels_channel);
        if (ch?.isTextBased()) {
          await ch.send(`🎉 ${message.author} leveled up to **Level ${result.level}**!`).catch(() => {});
        }
      }
    }

    const responders = await getAutoResponders(message.guild.id);
    for (const r of responders) {
      const content = message.content.toLowerCase();
      const trigger = r.trigger.toLowerCase();
      const match =
        r.match_type === 'exact'
          ? content === trigger
          : r.match_type === 'startswith'
            ? content.startsWith(trigger)
            : content.includes(trigger);
      if (match) {
        await message.reply(r.response).catch(() => {});
        break;
      }
    }

    const { handleAutoreact } = await import('../services/autoreact');
    await handleAutoreact(message);

    if (message.mentions.users.size && (await isEventEnabled(message.guild.id, 'afk'))) {
      for (const [, user] of message.mentions.users) {
        const afk = await getAfk(user.id);
        if (afk) {
          await message.reply(`💤 **${user.username}** is AFK: ${afk.reason}`).catch(() => {});
        }
      }
    }
  });

  client.on('guildCreate', async (guild) => {
    const { getGuild, getGuildPlan } = await import('../database');
    const settings = await getGuild(guild.id);
    const plan = await getGuildPlan(guild.id);
    const { applyGuildBotIdentity } = await import('../services/guild-identity');
    await applyGuildBotIdentity(guild, settings.extra_config ?? null, plan);
    console.log(`[sync] Registered guild ${guild.name} (${guild.id})`);
  });

  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
      if (!message.guild || !message.author || message.author.bot) return;

      const { handleReactionRole } = await import('../services/reaction-roles');
      await handleReactionRole(reaction, user, true);

      const emoji = reaction.emoji.name;
      const { getGuild } = await import('../database');
      const guild = await getGuild(message.guild.id);
      const count = reaction.count ?? 1;

      if (emoji === '⭐' || emoji === 'star') {
        const { handleStarboardReaction } = await import('../services/starboard');
        await handleStarboardReaction(message, guild, count);
      }

      const { handleClownboardReaction } = await import('../services/clownboard');
      await handleClownboardReaction(reaction, message);
    } catch (err) {
      console.error('reaction handler:', err);
    }
  });

  client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    try {
      const { handleReactionRole } = await import('../services/reaction-roles');
      await handleReactionRole(reaction, user, false);
    } catch (err) {
      console.error('reaction remove handler:', err);
    }
  });

  client.on('channelDelete', async (channel) => {
    if (!('guild' in channel) || !channel.guild) return;
    const { getGuild } = await import('../database');
    const guild = await getGuild(channel.guild.id);
    const { handleAntiNuke } = await import('../services/antinuke');
    await handleAntiNuke(channel.guild, guild, 'channel', channel);

    const { updateGuildCounters } = await import('../services/counters');
    await updateGuildCounters(channel.guild).catch(() => {});
  });

  client.on('channelCreate', async (channel) => {
    if (!('guild' in channel) || !channel.guild) return;
    const { updateGuildCounters } = await import('../services/counters');
    await updateGuildCounters(channel.guild).catch(() => {});
  });

  client.on('roleDelete', async (role) => {
    const { getGuild } = await import('../database');
    const guild = await getGuild(role.guild.id);
    const { handleAntiNuke } = await import('../services/antinuke');
    await handleAntiNuke(role.guild, guild, 'role', role);
  });

  client.on('interactionCreate', (i) => handleInteraction(client, i));

  client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot || !message.content) return;

    const { sendEventLog } = await import('../services/logging');
    const preview = message.content.length > 900 ? `${message.content.slice(0, 900)}…` : message.content;
    await sendEventLog(
      message.guild,
      'messages',
      '🗑️ Message Deleted',
      `**Author:** ${message.author}\n**Channel:** <#${message.channel.id}>\n**Content:** ${preview || '*empty*'}`,
      { userId: message.author?.id, channelId: message.channel.id },
    );

    const { getGuild, isEventEnabled } = await import('../database');
    const guild = await getGuild(message.guild.id);
    if (!guild.snipe_enabled || !(await isEventEnabled(message.guild.id, 'snipe'))) return;
    client.snipes.set(message.channel.id, {
      content: message.content,
      author: message.author?.tag ?? 'Unknown',
      attachment: message.attachments.first()?.url,
      timestamp: Date.now(),
    });
    setTimeout(() => client.snipes.delete(message.channel.id), 300000);
  });

  client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (newMsg.author?.bot || !newMsg.guild || !oldMsg.content || oldMsg.content === newMsg.content) return;

    const { sendEventLog } = await import('../services/logging');
    const oldPreview = oldMsg.content.length > 400 ? `${oldMsg.content.slice(0, 400)}…` : oldMsg.content;
    const newPreview = (newMsg.content ?? '').length > 400 ? `${(newMsg.content ?? '').slice(0, 400)}…` : (newMsg.content ?? '');
    await sendEventLog(
      newMsg.guild,
      'messages',
      '✏️ Message Edited',
      `**Author:** ${newMsg.author}\n**Channel:** <#${newMsg.channel.id}>\n**Before:** ${oldPreview}\n**After:** ${newPreview}`,
      { userId: newMsg.author?.id, channelId: newMsg.channel.id },
    );

    const { isEventEnabled } = await import('../database');
    if (!(await isEventEnabled(newMsg.guild.id, 'snipe'))) return;
    client.editSnipes.set(newMsg.channel.id, {
      oldContent: oldMsg.content,
      newContent: newMsg.content ?? '',
      author: newMsg.author?.tag ?? 'Unknown',
      timestamp: Date.now(),
    });
    setTimeout(() => client.editSnipes.delete(newMsg.channel.id), 300000);
  });

  client.on('guildMemberAdd', async (member) => {
    const { getGuild } = await import('../database');
    const guild = await getGuild(member.guild.id);

    if (guild.antiraid_enabled) {
      const { handleAntiRaid } = await import('../services/antiraid');
      await handleAntiRaid(member, guild);
    }

    const { tryAutoRestoreOnJoin } = await import('../services/role-restore');
    const autoRestored = await tryAutoRestoreOnJoin(member);

    if (!autoRestored && guild.autorole) {
      const role = member.guild.roles.cache.get(guild.autorole);
      if (role) await member.roles.add(role).catch(() => {});
    }

    if (guild.welcome_channel && guild.welcome_message) {
      const channel = member.guild.channels.cache.get(guild.welcome_channel);
      if (channel?.isTextBased()) {
        const msg = guild.welcome_message
          .replace(/{user}/g, member.toString())
          .replace(/{user.name}/g, member.user.username)
          .replace(/{server}/g, member.guild.name)
          .replace(/{membercount}/g, member.guild.memberCount.toString());
        await channel.send(msg).catch(() => {});
      }
    }

    const { sendEventLog } = await import('../services/logging');
    await sendEventLog(
      member.guild,
      'join',
      '📥 Member Joined',
      `**User:** ${member.user.tag} (${member})\n**Account created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n**Member count:** ${member.guild.memberCount}`,
      { userId: member.id },
    );
    await sendEventLog(
      member.guild,
      'members',
      '📥 Member Joined',
      `**User:** ${member.user.tag} (${member})\n**Member count:** ${member.guild.memberCount}`,
      { userId: member.id },
    );

    const { updateGuildCounters } = await import('../services/counters');
    await updateGuildCounters(member.guild).catch(() => {});
  });

  client.on('guildMemberRemove', async (member) => {
    const { getGuild } = await import('../database');
    const guild = await getGuild(member.guild.id);

    const { saveMemberRoles } = await import('../services/role-restore');
    if (member.user) {
      await saveMemberRoles(member as import('discord.js').GuildMember).catch((err) =>
        console.error('[rolerestore] save failed:', err),
      );
    }

    const { sendEventLog } = await import('../services/logging');
    const tag = member.user?.tag ?? 'Unknown';
    await sendEventLog(
      member.guild,
      'leave',
      '📤 Member Left',
      `**User:** ${tag}${member.user ? ` (<@${member.id}>)` : ''}\n**Member count:** ${member.guild.memberCount}`,
      { userId: member.id },
    );
    await sendEventLog(
      member.guild,
      'members',
      '📤 Member Left',
      `**User:** ${tag}${member.user ? ` (<@${member.id}>)` : ''}\n**Member count:** ${member.guild.memberCount}`,
      { userId: member.id },
    );

    if (guild.goodbye_channel && guild.goodbye_message) {
      const channel = member.guild.channels.cache.get(guild.goodbye_channel);
      if (channel?.isTextBased()) {
        const msg = guild.goodbye_message
          .replace(/{user}/g, member.user?.username ?? 'Unknown')
          .replace(/{server}/g, member.guild.name)
          .replace(/{membercount}/g, member.guild.memberCount.toString());
        await channel.send(msg).catch(() => {});
      }
    }

    const { updateGuildCounters } = await import('../services/counters');
    await updateGuildCounters(member.guild).catch(() => {});
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
    const { handleVoiceMaster } = await import('../services/voicemaster');
    await handleVoiceMaster(client, oldState, newState);
  });
}

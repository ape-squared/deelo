import type { VoiceState } from 'discord.js';
import type { DeeloClient } from '../client';
import { getSupabase } from '../database/supabase';
import { getGuild } from '../database';

export async function handleVoiceMaster(client: DeeloClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
  const guild = newState.guild ?? oldState.guild;
  if (!guild) return;

  const settings = await getGuild(guild.id);
  if (!settings.voicemaster_join_channel) return;

  const joinChannelId = settings.voicemaster_join_channel;

  if (newState.channelId === joinChannelId && newState.member) {
    const category = settings.voicemaster_category
      ? guild.channels.cache.get(settings.voicemaster_category)
      : null;

    const name = settings.voicemaster_default_name
      .replace('{user}', newState.member.displayName)
      .replace('{user.name}', newState.member.user.username)
      .replace('{user.display_name}', newState.member.displayName);

    const channel = await guild.channels.create({
      name,
      type: 2,
      parent: category?.id,
      bitrate: Math.min(settings.voicemaster_default_bitrate * 1000, guild.maximumBitrate),
      permissionOverwrites: [{ id: guild.id, allow: ['Connect', 'ViewChannel'] }],
    });

    await getSupabase().from('voicemaster_channels').insert({
      channel_id: channel.id,
      guild_id: guild.id,
      owner_id: newState.member.id,
    });

    await newState.setChannel(channel.id);

    if (settings.voicemaster_join_role) {
      const role = guild.roles.cache.get(settings.voicemaster_join_role);
      if (role) await newState.member.roles.add(role).catch(() => {});
    }
  }

  if (oldState.channel && oldState.channel.members.size === 0) {
    const { data } = await getSupabase()
      .from('voicemaster_channels')
      .select('*')
      .eq('channel_id', oldState.channel.id)
      .maybeSingle();

    if (data) {
      await oldState.channel.delete().catch(() => {});
      await getSupabase().from('voicemaster_channels').delete().eq('channel_id', oldState.channel.id);
    }
  }

  if (oldState.member && settings.voicemaster_join_role) {
    const stillInVm = guild.channels.cache.some(
      (ch) => ch.type === 2 && ch.members.has(oldState.member!.id) && ch.id !== joinChannelId
    );
    if (!stillInVm) {
      const role = guild.roles.cache.get(settings.voicemaster_join_role);
      if (role) await oldState.member.roles.remove(role).catch(() => {});
    }
  }
}

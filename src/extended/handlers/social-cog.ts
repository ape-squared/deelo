import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { getSupabase } from '../../database/supabase';
import { replyError, replyInfo, replySuccess, mentionChannel } from '../lib/helpers';
import { setExtraConfig, getConfigValue } from '../lib/guild-config';

const SOCIAL_COGS = new Set([
  'instagram', 'twitter', 'tiktok', 'youtube', 'twitch', 'kick', 'pinterest', 'reddit', 'soundcloud',
]);

export async function handleSocialPlatformCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (!SOCIAL_COGS.has(cmd.cog)) return false;
  const platform = cmd.cog;
  const name = cmd.name;
  const guildId = message.guild!.id;

  if (name === platform) {
    const { data } = await getSupabase().from('social_feeds').select('*').eq('guild_id', guildId).eq('platform', platform);
    await replyInfo(message, platform.charAt(0).toUpperCase() + platform.slice(1), data?.map((f) => `@${f.username} → <#${f.channel_id}>`).join('\n') || `No feeds. Add with \`,${platform} add #channel <username>\``);
    return true;
  }

  if (name === `${platform} add`) {
    const ch = mentionChannel(message);
    const username = args.find((a) => !a.startsWith('<#')) ?? args[0];
    if (!ch || !username) { await replyError(message, `Usage: \`,${platform} add #channel <username>\``); return true; }
    await getSupabase().from('social_feeds').insert({ guild_id: guildId, platform, channel_id: ch.id, username });
    await replySuccess(message, `Now tracking **@${username}** on ${platform} → ${ch}`);
    return true;
  }

  if (name === `${platform} remove`) {
    const username = args[0];
    if (username) await getSupabase().from('social_feeds').delete().eq('guild_id', guildId).eq('platform', platform).eq('username', username);
    await replySuccess(message, 'Feed removed.');
    return true;
  }

  if (name === `${platform} list`) {
    const { data } = await getSupabase().from('social_feeds').select('*').eq('guild_id', guildId).eq('platform', platform);
    await replyInfo(message, `${platform} Feeds`, data?.map((f) => `@${f.username} → <#${f.channel_id}>`).join('\n') || 'None.');
    return true;
  }

  if (name.includes('message')) {
    const msg = await getConfigValue(guildId, `${platform}.message`, 'New post from {username}!');
    if (name.includes('view')) { await replyInfo(message, 'Notification Message', String(msg)); return true; }
    await setExtraConfig(guildId, `${platform}.message`, args.join(' '));
    await replySuccess(message, 'Notification message updated.');
    return true;
  }

  if (name.includes('story') || name.includes('stories') || name.includes('highlights') || name.includes('live') || name.includes('retweets')) {
    await replySuccess(message, `**${name}** tracking enabled for ${platform}.`);
    return true;
  }

  if (name.startsWith(platform)) {
    await setExtraConfig(guildId, `${platform}.${name.replace(`${platform} `, '').replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, `${platform} setting updated.`);
    return true;
  }

  return false;
}

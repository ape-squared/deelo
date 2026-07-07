import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { getSupabase } from '../../database/supabase';
import { replyError, replyInfo, replySuccess, mentionChannel, mentionRole } from '../lib/helpers';
import { setExtraConfig, getConfigValue } from '../lib/guild-config';
import { seedSocialFeed } from '../../services/social-poll';

const SOCIAL_COGS = new Set([
  'instagram', 'twitter', 'tiktok', 'youtube', 'twitch', 'kick', 'pinterest', 'reddit', 'soundcloud',
]);

function resolvePlatform(cmd: CommandDef): string | null {
  if (SOCIAL_COGS.has(cmd.cog)) return cmd.cog;
  if (cmd.cog === 'reddit') return 'reddit';
  return null;
}

function commandRoot(platform: string): string {
  return platform === 'reddit' ? 'subreddit' : platform;
}

export async function handleSocialPlatformCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  const platform = resolvePlatform(cmd);
  if (!platform) return false;

  const root = commandRoot(platform);
  const name = cmd.name;
  const guildId = message.guild!.id;

  if (name === root || name === platform) {
    const { data } = await getSupabase().from('social_feeds').select('*').eq('guild_id', guildId).eq('platform', platform);
    await replyInfo(
      message,
      platform.charAt(0).toUpperCase() + platform.slice(1),
      data?.map((f) => `@${f.username} → <#${f.channel_id}>`).join('\n')
        || `No feeds. Add with \`,${root} add #channel <username>\``,
    );
    return true;
  }

  if (name === `${root} add` || name === `${platform} add`) {
    const ch = mentionChannel(message);
    const username = args.find((a) => !a.startsWith('<#') && !a.startsWith('<@')) ?? args[0];
    if (!ch || !username) {
      await replyError(message, `Usage: \`,${root} add #channel <username>\``);
      return true;
    }
    const clean = username.replace(/^@/, '').replace(/^r\//i, '');
    const { data, error } = await getSupabase()
      .from('social_feeds')
      .insert({ guild_id: guildId, platform, channel_id: ch.id, username: clean })
      .select()
      .single();

    if (error) {
      await replyError(message, error.message.includes('duplicate') ? 'That feed is already tracked.' : 'Failed to add feed.');
      return true;
    }

    if (data) await seedSocialFeed(data.id, platform, clean);
    await replySuccess(message, `Now tracking **@${clean}** on ${platform} → ${ch}`);
    return true;
  }

  if (name === `${root} remove` || name === `${platform} remove`) {
    const username = args[0]?.replace(/^@/, '').replace(/^r\//i, '');
    if (username) {
      await getSupabase().from('social_feeds').delete().eq('guild_id', guildId).eq('platform', platform).eq('username', username);
    }
    await replySuccess(message, 'Feed removed.');
    return true;
  }

  if (name === `${root} list` || name === `${platform} list`) {
    const { data } = await getSupabase().from('social_feeds').select('*').eq('guild_id', guildId).eq('platform', platform);
    await replyInfo(message, `${platform} Feeds`, data?.map((f) => `@${f.username} → <#${f.channel_id}>`).join('\n') || 'None.');
    return true;
  }

  if (name.includes('message')) {
    const msg = await getConfigValue(guildId, `${platform}.message`, 'New post from {username}!');
    if (name.includes('view')) {
      await replyInfo(message, 'Notification Message', String(msg));
      return true;
    }
    await setExtraConfig(guildId, `${platform}.message`, args.join(' '));
    await replySuccess(message, 'Notification message updated.');
    return true;
  }

  if (name.includes('story') || name.includes('stories') || name.includes('highlights') || name.includes('live') || name.includes('retweets')) {
    await setExtraConfig(guildId, `${platform}.${name.replace(`${root} `, '').replace(/ /g, '.')}`, true);
    await replySuccess(message, `**${name}** tracking enabled for ${platform}.`);
    return true;
  }

  if (name.startsWith(root) || name.startsWith(platform)) {
    await setExtraConfig(guildId, `${platform}.${name.replace(`${root} `, '').replace(/ /g, '.')}`, args.join(' ') || true);
    await replySuccess(message, `${platform} setting updated.`);
    return true;
  }

  return false;
}

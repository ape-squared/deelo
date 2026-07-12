import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { getSupabase } from '../../database/supabase';
import { replyError, replyInfo, replySuccess, mentionChannel, needManageGuild } from '../lib/helpers';
import { setExtraConfig, getConfigValue } from '../lib/guild-config';
import { seedSocialFeed } from '../../services/social-poll';
import {
  buildPinterestSearchEmbed,
  buildSocialPreviewEmbed,
  buildSoundcloudSearchEmbed,
} from '../../services/integrations/social-lookups';

const SOCIAL_COGS = new Set([
  'instagram', 'twitter', 'tiktok', 'youtube', 'twitch', 'kick', 'pinterest', 'reddit', 'soundcloud',
]);

const FEED_ACTIONS = new Set([
  'add', 'remove', 'list', 'message', 'story', 'stories', 'highlights', 'live', 'retweets', 'embeds', 'color', 'view',
]);

function resolvePlatform(cmd: CommandDef): string | null {
  if (SOCIAL_COGS.has(cmd.cog)) return cmd.cog;
  return null;
}

function commandRoot(platform: string): string {
  return platform === 'reddit' ? 'subreddit' : platform;
}

async function tryUsernamePreview(platform: string, message: Message, args: string[]): Promise<boolean> {
  const user = args[0]?.replace(/^@/, '').replace(/^r\//i, '');
  if (!user || user.startsWith('<#') || FEED_ACTIONS.has(user.toLowerCase())) return false;
  if (/^https?:\/\//i.test(user)) return false;

  try {
    const embed = await buildSocialPreviewEmbed(platform, user);
    await message.reply({ embeds: [embed] });
    return true;
  } catch (err) {
    await replyError(message, err instanceof Error ? err.message : 'Lookup failed.');
    return true;
  }
}

export async function handleSocialPlatformCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  const platform = resolvePlatform(cmd);
  if (!platform) return false;

  const root = commandRoot(platform);
  const name = cmd.name;
  const guildId = message.guild!.id;

  if (name === 'pinterestsearch' || name === 'pinterest search') {
    const query = args.join(' ').trim();
    if (!query) {
      await replyError(message, 'Usage: `,pinterestsearch <query>`');
      return true;
    }
    await message.reply({ embeds: [await buildPinterestSearchEmbed(query)] });
    return true;
  }

  if (name === 'pinterest embeds') {
    if (!needManageGuild(message.member!)) {
      await replyError(message, 'You need **Manage Server** permission.');
      return true;
    }
    const mode = args[0]?.toLowerCase() ?? 'on';
    await setExtraConfig(guildId, 'pinterest.embeds', mode !== 'off');
    await replySuccess(message, `Pinterest notification embeds: **${mode === 'off' ? 'off' : 'on'}**.`);
    return true;
  }

  if (name === 'subreddit color' || name === 'reddit color') {
    if (!needManageGuild(message.member!)) {
      await replyError(message, 'You need **Manage Server** permission.');
      return true;
    }
    const hex = args[0]?.replace(/^#/, '');
    if (!hex || !/^[0-9a-fA-F]{6}$/.test(hex)) {
      await replyError(message, 'Usage: `,subreddit color <hex>` (e.g. `ff4500`)');
      return true;
    }
    await setExtraConfig(guildId, 'reddit.color', `#${hex}`);
    await replySuccess(message, `Reddit embed color set to **#${hex}**.`);
    return true;
  }

  if (platform === 'soundcloud' && (name === 'soundcloud' || name === 'soundcloud search') && args.length > 0) {
    const query = args.join(' ').trim();
    if (!FEED_ACTIONS.has(args[0].toLowerCase())) {
      await message.reply({ embeds: [await buildSoundcloudSearchEmbed(query)] });
      return true;
    }
  }

  if (name === root || name === platform) {
    if (args.length > 0 && await tryUsernamePreview(platform, message, args)) return true;

    const { data } = await getSupabase().from('social_feeds').select('*').eq('guild_id', guildId).eq('platform', platform);
    await replyInfo(
      message,
      platform.charAt(0).toUpperCase() + platform.slice(1),
      [
        data?.map((f) => `@${f.username} → <#${f.channel_id}>`).join('\n')
          || `No feeds. Add with \`,${root} add #channel <username>\``,
        '',
        `**Preview:** \`,${root} <username>\` — latest post or live status`,
        `**Track:** \`,${root} add #channel <username>\``,
      ].join('\n'),
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

  if (name.includes('story') || name.includes('stories') || name.includes('highlights')) {
    if (args.length > 0 && await tryUsernamePreview(platform, message, args)) return true;
    await replyInfo(
      message,
      name,
      `**,${name}** uses the same feed tracker. Add a channel with \`,${root} add #channel <username>\` — stories/highlights are included when the platform exposes them.`,
    );
    return true;
  }

  if (name.includes('live') || name.includes('retweets')) {
    if (args.length > 0 && await tryUsernamePreview(platform, message, args)) return true;
    await replyInfo(
      message,
      name,
      `Use \`,${root} <username>\` to check live status, or \`,${root} add #channel <username>\` to get notifications.`,
    );
    return true;
  }

  if (name.startsWith(root) || name.startsWith(platform)) {
    if (args.length > 0 && await tryUsernamePreview(platform, message, args)) return true;
    if (needManageGuild(message.member!) && args.length > 0) {
      await setExtraConfig(guildId, `${cmd.cog}.${name.replace(/ /g, '.')}`, args.join(' ') || true);
      await replySuccess(message, `**${name}** saved for ${platform}.`);
      return true;
    }
    await replyInfo(message, name, `Use \`,${root} <username>\` to preview, \`,${root} add #channel <username>\` to track, or \`,${root} list\`.`);
    return true;
  }

  return false;
}

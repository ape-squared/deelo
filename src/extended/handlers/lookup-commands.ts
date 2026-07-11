import type { Message } from 'discord.js';
import { deeloEmbed } from '../../utils/embeds';
import { replyError, replyInfo, replySuccess, resolveUserId } from '../lib/helpers';
import { runLookupCommand, LOOKUP_COMMANDS } from '../../services/lookups';
import {
  birthdayConfigLines,
  birthdayEmbed,
  getBirthdayConfig,
  listBirthdays,
  removeBirthday,
  setBirthday,
  setBirthdayConfig,
} from '../../services/birthdays';
import {
  addHighlight,
  addIgnored,
  listHighlights,
  listIgnored,
  removeHighlight,
  resetHighlights,
} from '../../services/highlights';

export async function handleLookupCommands(name: string, message: Message, args: string[]): Promise<boolean> {
  const guild = message.guild!;
  const lower = name.toLowerCase();

  if (LOOKUP_COMMANDS[lower]) {
    const query = args.join(' ').trim();
    if (!query) {
      await replyError(message, `Usage: \`,${name} <query>\``);
      return true;
    }
    try {
      const embed = await runLookupCommand(lower, query);
      if (embed) await message.reply({ embeds: [embed] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lookup failed.';
      await replyError(message, msg);
    }
    return true;
  }

  if (lower.startsWith('roblox ')) {
    const sub = lower.replace('roblox ', '');
    const query = args.join(' ').trim();
    if (sub === 'item' || sub === 'inventory' || sub === 'template' || sub === 'outfits') {
      if (!query) {
        await replyError(message, `Usage: \`,${name} <username or id>\``);
        return true;
      }
      const { lookupRoblox, lookupRobloxId } = await import('../../services/lookups');
      try {
        const embed = /^\d+$/.test(query)
          ? await lookupRobloxId(query)
          : await lookupRoblox(query);
        await message.reply({
          embeds: [
            embed.setDescription(
              `${embed.data.description ?? ''}\n\n*${sub} details:* [Roblox profile](https://www.roblox.com/search/users?keyword=${encodeURIComponent(query)})`,
            ),
          ],
        });
      } catch (err) {
        await replyError(message, err instanceof Error ? err.message : 'Roblox lookup failed.');
      }
      return true;
    }
    if (sub === 'devex' || sub === 'todiscord') {
      await replyInfo(message, name, 'Link your Roblox account in the dashboard or use `,roblox <username>` for profile lookup.');
      return true;
    }
  }

  if (lower === 'serveravatar' || lower === 'guildicon') {
    const url = guild.iconURL({ size: 4096 });
    if (!url) {
      await replyError(message, 'This server has no icon.');
      return true;
    }
    await message.reply({ embeds: [deeloEmbed(`${guild.name} Icon`, '').setImage(url)] });
    return true;
  }

  if (lower === 'serverbanner' || lower === 'guildbanner') {
    const url = guild.bannerURL({ size: 4096 });
    if (!url) {
      await replyError(message, 'This server has no banner.');
      return true;
    }
    await message.reply({ embeds: [deeloEmbed(`${guild.name} Banner`, '').setImage(url)] });
    return true;
  }

  if (lower === 'splash') {
    const url = guild.splashURL({ size: 4096 });
    if (!url) {
      await replyError(message, 'This server has no splash image.');
      return true;
    }
    await message.reply({ embeds: [deeloEmbed(`${guild.name} Splash`, '').setImage(url)] });
    return true;
  }

  if (lower.startsWith('birthday')) {
    const sub = lower.replace('birthday', '').trim() || 'help';
    const targetId = resolveUserId(message, args[0]) ?? message.author.id;

    if (sub === 'set' || sub === '') {
      const date = sub === 'set' ? args.slice(1).join(' ') : args.join(' ');
      const result = await setBirthday(guild.id, targetId, date);
      if (!result.ok) {
        await replyError(message, result.error);
        return true;
      }
      await replySuccess(message, `Birthday saved for <@${targetId}>.`);
      return true;
    }

    if (sub === 'list') {
      const rows = await listBirthdays(guild.id);
      const list = rows.map((r) => `<@${r.user_id}> — **${r.month}/${r.day}**`).join('\n') || 'No birthdays set.';
      await replyInfo(message, 'Birthdays', list);
      return true;
    }

    if (sub === 'channel') {
      const ch = message.mentions.channels.first();
      if (!ch) {
        await replyError(message, 'Mention a channel.');
        return true;
      }
      await setBirthdayConfig(guild.id, 'channel', ch.id);
      await replySuccess(message, `Birthday announcements → ${ch}`);
      return true;
    }

    if (sub === 'role') {
      const role = message.mentions.roles.first();
      if (!role) {
        await replyError(message, 'Mention a role.');
        return true;
      }
      await setBirthdayConfig(guild.id, 'role', role.id);
      await replySuccess(message, `Birthday role → ${role}`);
      return true;
    }

    if (sub === 'lock') {
      await setBirthdayConfig(guild.id, 'locked', true);
      await replySuccess(message, 'Birthday commands locked to staff.');
      return true;
    }
    if (sub === 'unlock') {
      await setBirthdayConfig(guild.id, 'locked', false);
      await replySuccess(message, 'Birthday commands unlocked.');
      return true;
    }

    if (sub === 'config') {
      await replyInfo(message, 'Birthday config', await birthdayConfigLines(guild.id));
      return true;
    }

    if (sub === 'celebrate' || sub === 'celebrate list') {
      const today = new Date();
      const rows = (await listBirthdays(guild.id)).filter((r) => r.month === today.getMonth() + 1 && r.day === today.getDate());
      const list = rows.map((r) => `<@${r.user_id}>`).join(', ') || 'No birthdays today.';
      await replyInfo(message, 'Celebrating today', list);
      return true;
    }

    const cfg = await getBirthdayConfig(guild.id);
    await replyInfo(
      message,
      'Birthdays',
      `**,birthday set MM/DD** · **list** · **channel** · **role** · **lock/unlock**\nChannel: ${cfg.channel ? `<#${cfg.channel}>` : '—'} · Role: ${cfg.role ? `<@&${cfg.role}>` : '—'}`,
    );
    return true;
  }

  if (lower.startsWith('highlight')) {
    const sub = lower.replace('highlight', '').trim() || 'help';
    const userId = message.author.id;

    if (sub === 'add') {
      const word = args.join(' ');
      const result = await addHighlight(guild.id, userId, word);
      if (!result.ok) {
        await replyError(message, result.error);
        return true;
      }
      await replySuccess(message, `Highlight added: **${word.trim().toLowerCase()}**`);
      return true;
    }

    if (sub === 'remove') {
      const word = args.join(' ');
      const ok = await removeHighlight(guild.id, userId, word);
      await replySuccess(message, ok ? 'Highlight removed.' : 'That highlight was not found.');
      return true;
    }

    if (sub === 'list') {
      const words = await listHighlights(guild.id, userId);
      await replyInfo(message, 'Your highlights', words.map((w) => `\`${w.word}\``).join(', ') || 'None.');
      return true;
    }

    if (sub === 'reset') {
      await resetHighlights(guild.id, userId);
      await replySuccess(message, 'All highlights cleared.');
      return true;
    }

    if (sub === 'ignore add') {
      const target = resolveUserId(message, args[0]);
      if (!target) {
        await replyError(message, 'Mention a user to ignore.');
        return true;
      }
      await addIgnored(guild.id, userId, target);
      await replySuccess(message, `Ignoring highlights from <@${target}>.`);
      return true;
    }

    if (sub === 'ignore list') {
      const ignored = await listIgnored(guild.id, userId);
      await replyInfo(message, 'Ignored users', ignored.map((id) => `<@${id}>`).join(', ') || 'None.');
      return true;
    }

    await replyInfo(message, 'Highlights', '**,highlight add <word>** · **remove** · **list** · **reset** · **ignore add @user**');
    return true;
  }

  return false;
}

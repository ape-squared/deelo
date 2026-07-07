import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { handleInformationCommand } from '../information';
import { replyError, replyInfo, replySuccess, resolveUserId, deeloEmbed } from '../lib/helpers';
import { replyWithMediaEffect, resolveImageUrl } from '../../lib/reply-media';
import { config } from '../../config';

export async function handleInformationCog(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (cmd.cog !== 'information') return false;
  if (await handleInformationCommand(cmd.name, message, args)) return true;

  const name = cmd.name;
  const guild = message.guild!;

  if (name === 'status') {
    const user = message.mentions.users.first() ?? message.author;
    const m = guild.members.cache.get(user.id);
    const status = m?.presence?.status ?? 'offline';
    await replyInfo(message, `${user.username}'s Status`, `**Status:** ${status}`);
    return true;
  }

  if (name === 'donate') {
    await replyInfo(message, 'Support Deelo', 'Premium plans: `,premium`\nActivate: `,activate premium`');
    return true;
  }

  if (name.startsWith('sticker')) return handleSticker(name, message, args);
  if (name.startsWith('emoji')) return handleEmoji(name, message, args);

  if (name === 'rotate') {
    const url = resolveImageUrl(message, args);
    if (!url) { await replyError(message, 'Attach an image to rotate.'); return true; }
    return replyWithMediaEffect(message, 'spin', url);
  }

  if (name === 'compress' || name === 'invert' || name === 'blur') {
    const url = resolveImageUrl(message, args);
    if (!url) { await replyError(message, `Attach an image for **${name}**.`); return true; }
    return replyWithMediaEffect(message, name, url);
  }

  if (name === 'urbandictionary' || name === 'ud') {
    const word = args.join(' ');
    if (!word) await replyError(message, 'Usage: `,urbandictionary <word>`'); return true;
    try {
      const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
      const data = (await res.json()) as { list?: Array<{ definition: string; permalink: string }> };
      const def = data.list?.[0];
      await replyInfo(message, word, def?.definition?.slice(0, 2000) ?? 'Not found.');
    } catch {
      await replyError(message, 'Lookup failed.');
    }
    return true;
  }

  if (name === 'weather') {
    const loc = args.join(' ');
    if (!loc) await replyError(message, 'Usage: `,weather <city>`'); return true;
    await replyInfo(message, `Weather — ${loc}`, `[OpenWeather search](https://openweathermap.org/find?q=${encodeURIComponent(loc)})`);
    return true;
  }

  if (name === 'timezone' || name === 'tz') {
    await replyInfo(message, 'Timezone', `Your local time: <t:${Math.floor(Date.now() / 1000)}:F>`);
    return true;
  }

  if (name === 'firstmessage' || name === 'firstmsg') {
    const msgs = await message.channel.messages.fetch({ after: '1', limit: 1 }).catch(() => null);
    const first = msgs?.first();
    await replyInfo(message, 'First Message', first ? first.content.slice(0, 500) : 'Could not fetch.');
    return true;
  }

  if (name === 'members' || name === 'membercount') {
    await replyInfo(message, 'Members', `**${guild.memberCount}** total\n**${guild.members.cache.filter((m) => !m.user.bot).size}** humans\n**${guild.members.cache.filter((m) => m.user.bot).size}** bots`);
    return true;
  }

  if (name === 'created' || name === 'age') {
    const user = message.mentions.users.first() ?? message.author;
    await replyInfo(message, 'Account Age', `**${user.tag}** created <t:${Math.floor(user.createdTimestamp / 1000)}:R>`);
    return true;
  }

  if (name === 'joined' || name === 'joinedat') {
    const m = message.mentions.members?.first() ?? message.member!;
    await replyInfo(message, 'Joined', `**${m.user.tag}** joined <t:${Math.floor(m.joinedTimestamp! / 1000)}:R>`);
    return true;
  }

  if (name === 'permissions' || name === 'perms') {
    const m = message.mentions.members?.first() ?? message.member!;
    const perms = m.permissions.toArray().slice(0, 20).join(', ') || 'None';
    await replyInfo(message, 'Permissions', perms);
    return true;
  }

  if (name === 'roles' || name === 'rolelist') {
    const list = guild.roles.cache.sort((a, b) => b.position - a.position).map((r) => r.toString()).slice(0, 40).join(' ');
    await replyInfo(message, 'Roles', list || 'None');
    return true;
  }

  if (name === 'channels') {
    const list = [...guild.channels.cache.values()].map((c) => ('name' in c ? `#${(c as { name: string }).name}` : (c as { id: string }).id)).slice(0, 30).join(', ');
    await replyInfo(message, 'Channels', list);
    return true;
  }

  if (name === 'invites') {
    const invites = await guild.invites.fetch();
    await replyInfo(message, 'Invites', invites.map((i) => `\`${i.code}\` — ${i.uses} uses`).join('\n') || 'None');
    return true;
  }

  if (name === 'bans') {
    if (!message.member!.permissions.has('BanMembers')) {
      await replyError(message, 'Need **Ban Members**.');
      return true;
    }
    const bans = await guild.bans.fetch();
    await replyInfo(message, 'Bans', bans.map((b) => `**${b.user.tag}** — ${b.reason ?? 'No reason'}`).join('\n').slice(0, 2000) || 'None');
    return true;
  }

  if (name === 'emotes' || name === 'emojis') {
    await replyInfo(message, 'Emojis', guild.emojis.cache.map((e) => e.toString()).join(' ') || 'No custom emojis.');
    return true;
  }

  if (name === 'stats' || name === 'serverstats') {
    await replyInfo(message, guild.name, `**Members:** ${guild.memberCount}\n**Channels:** ${guild.channels.cache.size}\n**Roles:** ${guild.roles.cache.size}\n**Boosts:** ${guild.premiumSubscriptionCount ?? 0}`);
    return true;
  }

  if (name === 'avatar' || name === 'av') return false; // native bridge

  if (name === 'banner') {
    const user = message.mentions.users.first() ?? message.author;
    const u = await user.fetch();
    const url = u.bannerURL({ size: 4096 });
    if (!url) {
      await replyError(message, 'No banner.');
      return true;
    }
    await message.reply({ embeds: [deeloEmbed(`${user.username}'s Banner`, '').setImage(url)] });
    return true;
  }

  if (name === 'google' || name === 'g') {
    const q = args.join(' ');
    if (!q) await replyError(message, 'Usage: `,google <query>`'); return true;
    await replyInfo(message, 'Google', `[Search "${q}"](https://www.google.com/search?q=${encodeURIComponent(q)})`);
    return true;
  }

  if (name === 'define') {
    const word = args[0];
    if (!word) await replyError(message, 'Usage: `,define <word>`'); return true;
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) await replyError(message, 'Word not found.'); return true;
    const data = (await res.json()) as Array<{ meanings: Array<{ definitions: Array<{ definition: string }> }> }>;
    await replyInfo(message, word, data[0]?.meanings[0]?.definitions[0]?.definition ?? 'No definition.');
    return true;
  }

  return false;
}

async function handleSticker(name: string, message: Message, args: string[]) {
  const guild = message.guild!;
  if (!message.member!.permissions.has('ManageGuildExpressions')) {
    await replyError(message, 'Need **Manage Expressions**.');
    return true;
  }
  if (name === 'sticker add' && message.stickers.first()) {
    const s = message.stickers.first()!;
    await guild.stickers.create({ file: s.url, name: args[0] ?? s.name, tags: args[0] ?? 'sticker' }).catch(() => {});
    await replySuccess(message, 'Sticker added.');
    return true;
  }
  if (name === 'sticker remove') {
    const st = guild.stickers.cache.get(args[0] ?? '');
    if (st) await st.delete();
    await replySuccess(message, 'Sticker removed.');
    return true;
  }
  if (name === 'sticker rename') {
    const st = guild.stickers.cache.get(args[0] ?? '');
    if (st) await st.edit({ name: args[1] ?? st.name });
    await replySuccess(message, 'Sticker renamed.');
    return true;
  }
  await replyInfo(message, 'Stickers', guild.stickers.cache.map((s) => `**${s.name}** (${s.id})`).join('\n') || 'None');
  return true;
}

async function handleEmoji(name: string, message: Message, args: string[]) {
  const guild = message.guild!;
  if (name === 'emoji add' && message.attachments.first()) {
    const att = message.attachments.first()!;
    const emoji = await guild.emojis.create({ attachment: att.url, name: args[0] ?? 'emoji' }).catch(() => null);
    await replySuccess(message, emoji ? `Added ${emoji}` : 'Failed to add emoji.');
    return true;
  }
  if (name === 'emoji remove') {
    const em = guild.emojis.cache.get(args[0]?.replace(/[^0-9]/g, '') ?? '');
    if (em) await em.delete();
    await replySuccess(message, 'Emoji removed.');
    return true;
  }
  if (name === 'emoji stats') {
    await replyInfo(message, 'Emoji Stats', `**${guild.emojis.cache.size}** emojis (${guild.emojis.cache.filter((e) => e.animated).size} animated)`);
    return true;
  }
  await replyInfo(message, 'Emojis', guild.emojis.cache.map((e) => e.toString()).join(' ').slice(0, 2000) || 'None');
  return true;
}

import type { Message } from 'discord.js';
import type { GuildSettings } from '../database';
import { getFilters } from '../database';

const INVITE_RE = /(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-z0-9-]+/i;

export async function handleAutomod(message: Message, guild: GuildSettings): Promise<boolean> {
  if (!guild.automod_enabled || message.member?.permissions.has('ManageMessages')) return false;

  const content = message.content;
  if (!content) return false;

  if (INVITE_RE.test(content)) {
    await message.delete().catch(() => {});
    if (message.channel.isSendable()) {
      const sent = await message.channel
        .send({
          content: `${message.author}, invite links are not allowed here.`,
          allowedMentions: { users: [message.author.id] },
        })
        .catch(() => null);
      if (sent) setTimeout(() => sent.delete().catch(() => {}), 5000);
    }
    return true;
  }

  const filters = await getFilters(message.guild!.id);
  const lower = content.toLowerCase();

  for (const f of filters) {
    const word = String(f.value ?? '').toLowerCase();
    if (!word) continue;

    const hit =
      f.type === 'exact' || f.action === 'exact' ? lower === word
      : f.type === 'startswith' || f.action === 'startswith' ? lower.startsWith(word)
      : lower.includes(word);

    if (hit) {
      await message.delete().catch(() => {});
      if (guild.mod_log_channel) {
        const log = message.guild!.channels.cache.get(guild.mod_log_channel);
        if (log?.isTextBased()) {
          await log.send(`🛡️ Automod deleted message from ${message.author} — filter \`${f.value}\``).catch(() => {});
        }
      }
      return true;
    }
  }

  return false;
}

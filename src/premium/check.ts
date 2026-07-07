import { getGuildPlan } from '../database';
import { hasFeature, getLimit, type PlanFeatures, type PlanLimits } from '../config/plans';
import { premiumEmbed } from '../utils/embeds';
import type { Message } from 'discord.js';

export async function checkPremium(
  guildId: string,
  feature: keyof PlanFeatures,
  reply: (msg: { embeds: ReturnType<typeof premiumEmbed>[] }) => Promise<unknown>
): Promise<boolean> {
  const plan = await getGuildPlan(guildId);
  if (!hasFeature(plan, feature)) {
    await reply({ embeds: [premiumEmbed(feature)] });
    return false;
  }
  return true;
}

export async function checkLimit(
  guildId: string,
  limit: keyof PlanLimits,
  current: number,
  reply: (msg: { embeds: ReturnType<typeof import('../utils/embeds').errorEmbed>[] }) => Promise<unknown>
): Promise<boolean> {
  const plan = await getGuildPlan(guildId);
  const max = getLimit(plan, limit);
  if (current >= max) {
    const { errorEmbed } = await import('../utils/embeds');
    await reply({
      embeds: [errorEmbed(`You've reached the limit (${max}) for your **${plan}** plan. Upgrade with \`,premium\` for higher limits.`)],
    });
    return false;
  }
  return true;
}

export async function requirePremium(message: Message, feature: keyof PlanFeatures): Promise<boolean> {
  if (!message.guild) return false;
  return checkPremium(message.guild.id, feature, (opts) => message.reply(opts));
}

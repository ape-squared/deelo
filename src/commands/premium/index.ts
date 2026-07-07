import { PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { PLANS } from '../../config/plans';
import { getGuildPlan, setGuildPlan } from '../../database';
import { config } from '../../config';

const premium: Command[] = [
  {
    name: 'premium',
    aliases: ['plan', 'plans', 'upgrade'],
    description: 'View premium plans and server status',
    category: 'premium',
    run: async ({ message }) => {
      const plan = await getGuildPlan(message.guild!.id);
      const current = PLANS[plan];
      const tiers = Object.entries(PLANS)
        .map(([key, p]) => {
          const active = key === plan ? ' ← **Current**' : '';
          return `**${p.name}** (${p.price})${active}`;
        })
        .join('\n');

      await message.reply({
        embeds: [deeloEmbed('⭐ Deelo Premium', `**Your plan:** ${current.name}\n\n${tiers}\n\n**Free** — Moderation, levels, snipe, giveaways, basic voicemaster\n**Premium** — Antinuke, tickets, starboard, TTS, integrations\n**Premium+** — GIF maker, background removal, early access\n\nRedeem a code with \`,redeem <code>\` or use the web dashboard.`)],
      });
    },
  },
  {
    name: 'redeem',
    description: 'Redeem a premium code for this server',
    category: 'premium',
    usage: 'redeem <code>',
    permissions: [PermissionFlagsBits.ManageGuild],
    run: async ({ message, args }) => {
      const code = args.join(' ');
      if (!code) {
        return void message.reply({ embeds: [errorEmbed('Usage: `,redeem <code>`\nRedeem codes from giveaways, partners, or the dashboard.')] });
      }
      const { redeemCodeForGuild } = await import('../../services/redeem');
      const result = await redeemCodeForGuild(message.guild!.id, message.author.id, code);
      if (!result.ok) {
        return void message.reply({ embeds: [errorEmbed(result.message)] });
      }
      await message.reply({ embeds: [successEmbed(result.message)] });
    },
  },
  {
    name: 'activate',
    description: 'Activate premium for a server (owner only)',
    category: 'premium',
    usage: 'activate <free|premium|premium_plus> [days]',
    ownerOnly: true,
    run: async ({ message, args }) => {
      const tier = args[0] as 'free' | 'premium' | 'premium_plus';
      if (!['free', 'premium', 'premium_plus'].includes(tier)) {
        return void message.reply({ embeds: [errorEmbed('Usage: `,activate <free|premium|premium_plus> [days]`')] });
      }
      const days = parseInt(args[1] ?? '30', 10);
      const expires = tier === 'free' ? undefined : new Date(Date.now() + days * 86400000).toISOString();
      await setGuildPlan(message.guild!.id, tier, expires);
      await message.reply({ embeds: [successEmbed(`Activated **${PLANS[tier].name}** for **${days}** days.`)] });
    },
  },
  {
    name: 'perks',
    description: 'View your current plan perks',
    category: 'premium',
    run: async ({ message }) => {
      const plan = await getGuildPlan(message.guild!.id);
      const features = PLANS[plan].features;
      const enabled = Object.entries(features).filter(([, v]) => v).map(([k]) => k).join(', ');
      const limits = PLANS[plan].limits;
      await message.reply({
        embeds: [deeloEmbed(`${PLANS[plan].name} Perks`, `**Features:** ${enabled}\n\n**Limits:**\n• Purge: ${limits.maxPurgeAmount}\n• Auto responders: ${limits.maxAutoResponders}\n• Music queue: ${limits.maxMusicQueue}\n• Giveaways: ${limits.maxConcurrentGiveaways}`)],
      });
    },
  },
];

export default premium;

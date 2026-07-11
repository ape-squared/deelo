import { PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { getGuild, updateGuild, getMemberBalance } from '../../database';
import { getSupabase } from '../../database/supabase';
import {
  adminSetBalance,
  claimDaily,
  claimWork,
  economyConfig,
  formatCooldown,
  formatCurrency,
  getBalanceLeaderboard,
  getEconomyShopItems,
  isEconomyEnabled,
  purchaseShopItem,
  renderShopList,
  resetEconomyBalances,
  transferBalance,
} from '../../services/economy';

function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw.replace(/,/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function targetUserId(message: import('discord.js').Message, args: string[]): string | null {
  return message.mentions.users.first()?.id ?? args.find((a) => /^\d{17,20}$/.test(a)) ?? null;
}

const economy: Command[] = [
  {
    name: 'balance',
    aliases: ['bal', 'money', 'coins', 'wallet'],
    description: 'View your or a member balance',
    category: 'economy',
    usage: 'balance [user]',
    run: async ({ message, args }) => {
      const { enabled, guild } = await isEconomyEnabled(message.guild!.id);
      if (!enabled) return void message.reply({ embeds: [errorEmbed('Economy is disabled in this server.')] });

      const userId = targetUserId(message, args) ?? message.author.id;
      const cfg = economyConfig(guild);
      const row = await getMemberBalance(message.guild!.id, userId, cfg.startingBalance);
      await message.reply({
        embeds: [deeloEmbed(
          `Balance — <@${userId}>`,
          `${formatCurrency(row.balance, cfg.currency)}`,
        )],
      });
    },
  },
  {
    name: 'daily',
    description: 'Claim your daily reward',
    category: 'economy',
    usage: 'daily',
    run: async ({ message }) => {
      const result = await claimDaily(message.guild!.id, message.author.id);
      if (!result.ok) {
        if (result.reason === 'disabled') return void message.reply({ embeds: [errorEmbed('Economy is disabled.')] });
        return void message.reply({
          embeds: [errorEmbed(`Daily already claimed. Try again in **${formatCooldown(result.waitMs ?? 0)}**.`)],
        });
      }
      await message.reply({
        embeds: [successEmbed(`You claimed ${formatCurrency(result.amount, result.currency)}. New balance: ${formatCurrency(result.balance, result.currency)}.`)],
      });
    },
  },
  {
    name: 'work',
    description: 'Work for coins',
    category: 'economy',
    usage: 'work',
    run: async ({ message }) => {
      const result = await claimWork(message.guild!.id, message.author.id);
      if (!result.ok) {
        if (result.reason === 'disabled') return void message.reply({ embeds: [errorEmbed('Economy is disabled.')] });
        return void message.reply({
          embeds: [errorEmbed(`You are tired. Work again in **${formatCooldown(result.waitMs ?? 0)}**.`)],
        });
      }
      await message.reply({
        embeds: [successEmbed(`You ${result.message} and earned ${formatCurrency(result.amount, result.currency)}. Balance: ${formatCurrency(result.balance, result.currency)}.`)],
      });
    },
  },
  {
    name: 'pay',
    aliases: ['transfer', 'send'],
    description: 'Pay another member',
    category: 'economy',
    usage: 'pay <user> <amount>',
    run: async ({ message, args }) => {
      const toId = targetUserId(message, args);
      const amountArg = args.find((a) => /^\d/.test(a.replace(/,/g, '')));
      const amount = parseAmount(amountArg);
      if (!toId || !amount) {
        return void message.reply({ embeds: [errorEmbed('Usage: `,pay @user <amount>`')] });
      }

      const result = await transferBalance(message.guild!.id, message.author.id, toId, amount);
      if (!result.ok) {
        const msg = result.reason === 'insufficient'
          ? 'You do not have enough balance.'
          : result.reason === 'self'
            ? 'You cannot pay yourself.'
            : result.reason === 'invalid'
              ? 'Enter a valid amount.'
              : 'Economy is disabled.';
        return void message.reply({ embeds: [errorEmbed(msg)] });
      }

      const taxLine = result.tax > 0 ? ` (tax: ${formatCurrency(result.tax, result.currency)})` : '';
      await message.reply({
        embeds: [successEmbed(`Sent ${formatCurrency(result.received, result.currency)} to <@${toId}>${taxLine}.`)],
      });
    },
  },
  {
    name: 'shop',
    description: 'View the server shop',
    category: 'economy',
    usage: 'shop',
    run: async ({ message }) => {
      const { enabled, guild } = await isEconomyEnabled(message.guild!.id);
      if (!enabled) return void message.reply({ embeds: [errorEmbed('Economy is disabled.')] });
      const cfg = economyConfig(guild);
      const items = await getEconomyShopItems(message.guild!.id, true);
      await message.reply({
        embeds: [deeloEmbed('Shop', renderShopList(items, cfg.currency))],
      });
    },
  },
  {
    name: 'buy',
    description: 'Buy a shop item',
    category: 'economy',
    usage: 'buy <item>',
    run: async ({ message, args }) => {
      const query = args.join(' ').trim();
      if (!query) return void message.reply({ embeds: [errorEmbed('Usage: `,buy <item name or id>`')] });

      const member = await message.guild!.members.fetch(message.author.id).catch(() => null);
      const result = await purchaseShopItem(message.guild!.id, message.author.id, query, member ?? undefined);
      if (!result.ok) {
        const msg = result.reason === 'not_found'
          ? 'Item not found.'
          : result.reason === 'insufficient'
            ? 'You cannot afford that item.'
            : result.reason === 'out_of_stock'
              ? 'That item is out of stock.'
              : result.reason === 'role_error'
                ? 'Purchase refunded — I could not grant the role. Check my role hierarchy.'
                : 'Economy is disabled.';
        return void message.reply({ embeds: [errorEmbed(msg)] });
      }

      const roleLine = result.item.role_id ? ` You received <@&${result.item.role_id}>.` : '';
      await message.reply({
        embeds: [successEmbed(`Purchased **${result.item.name}** for ${formatCurrency(result.item.price, result.currency)}.${roleLine} Balance: ${formatCurrency(result.balance, result.currency)}.`)],
      });
    },
  },
  {
    name: 'baltop',
    aliases: ['rich', 'econleaderboard', 'ecolb', 'moneylb'],
    description: 'View the richest members',
    category: 'economy',
    usage: 'baltop',
    run: async ({ message }) => {
      const { enabled, guild } = await isEconomyEnabled(message.guild!.id);
      if (!enabled) return void message.reply({ embeds: [errorEmbed('Economy is disabled.')] });
      const cfg = economyConfig(guild);
      const rows = await getBalanceLeaderboard(message.guild!.id, 10);
      if (!rows.length) return void message.reply({ embeds: [deeloEmbed('Balance Leaderboard', 'No balances yet.')] });
      const list = rows.map((r, i) => `**${i + 1}.** <@${r.user_id}> — ${formatCurrency(r.balance, cfg.currency)}`).join('\n');
      await message.reply({ embeds: [deeloEmbed('Balance Leaderboard', list)] });
    },
  },
  {
    name: 'economy',
    aliases: ['eco'],
    description: 'Configure the economy system',
    category: 'economy',
    usage: 'economy <enable|disable|currency|give|take|set|reset|shop>',
    permissions: [PermissionFlagsBits.ManageGuild],
    run: async ({ message, args }) => {
      const guildId = message.guild!.id;
      const sub = args[0]?.toLowerCase();

      if (sub === 'enable' || sub === 'unlock') {
        await updateGuild(guildId, { economy_enabled: true });
        return void message.reply({ embeds: [successEmbed('Economy **enabled**.')] });
      }
      if (sub === 'disable' || sub === 'lock') {
        await updateGuild(guildId, { economy_enabled: false });
        return void message.reply({ embeds: [successEmbed('Economy **disabled**.')] });
      }
      if (sub === 'currency') {
        const name = args.slice(1).join(' ').trim().slice(0, 32);
        if (!name) return void message.reply({ embeds: [errorEmbed('Usage: `,economy currency <name>`')] });
        await updateGuild(guildId, { economy_currency_name: name });
        return void message.reply({ embeds: [successEmbed(`Currency renamed to **${name}**.`)] });
      }
      if (sub === 'give' || sub === 'take' || sub === 'set') {
        const userId = targetUserId(message, args.slice(1));
        const amount = parseAmount(args.find((a, i) => i > 0 && /^\d/.test(a.replace(/,/g, ''))));
        if (!userId || amount === null) {
          return void message.reply({ embeds: [errorEmbed(`Usage: \`,economy ${sub} @user <amount>\``)] });
        }
        const result = await adminSetBalance(guildId, userId, amount, message.author.id, sub);
        const verb = sub === 'give' ? 'gave' : sub === 'take' ? 'removed' : 'set';
        const deltaLine = sub === 'set' ? '' : ` (${result.delta >= 0 ? '+' : ''}${result.delta.toLocaleString()})`;
        return void message.reply({
          embeds: [successEmbed(`${verb.charAt(0).toUpperCase() + verb.slice(1)} balance for <@${userId}>${deltaLine}. New balance: ${formatCurrency(result.balance, result.currency)}.`)],
        });
      }
      if (sub === 'reset') {
        const userId = targetUserId(message, args.slice(1));
        const count = await resetEconomyBalances(guildId, userId ?? undefined);
        return void message.reply({
          embeds: [successEmbed(userId ? `Reset balance for <@${userId}>.` : `Reset **${count}** member balance${count === 1 ? '' : 's'}.`)],
        });
      }
      if (sub === 'shop') {
        const shopSub = args[1]?.toLowerCase();
        if (shopSub === 'add') {
          const price = parseAmount(args.find((a) => /^\d/.test(a.replace(/,/g, ''))));
          const role = message.mentions.roles.first();
          const nameParts = args.slice(2).filter((a) => !/^\d/.test(a.replace(/,/g, '')) && !a.startsWith('<@&'));
          const name = nameParts.join(' ').trim();
          if (!name || price === null) {
            return void message.reply({ embeds: [errorEmbed('Usage: `,economy shop add <name> <price> [@role]`')] });
          }
          const { data, error } = await getSupabase()
            .from('economy_shop_items')
            .insert({
              guild_id: guildId,
              name,
              price,
              role_id: role?.id ?? null,
            })
            .select()
            .single();
          if (error) return void message.reply({ embeds: [errorEmbed(error.message)] });
          return void message.reply({ embeds: [successEmbed(`Added shop item **${data.name}** (#${data.id}) for ${price.toLocaleString()}.`)] });
        }
        if (shopSub === 'remove' || shopSub === 'delete') {
          const id = parseInt(args[2] ?? '', 10);
          if (!id) return void message.reply({ embeds: [errorEmbed('Usage: `,economy shop remove <id>`')] });
          await getSupabase().from('economy_shop_items').delete().eq('guild_id', guildId).eq('id', id);
          return void message.reply({ embeds: [successEmbed(`Removed shop item **#${id}**.`)] });
        }
        const guild = await getGuild(guildId);
        const cfg = economyConfig(guild);
        const items = await getEconomyShopItems(guildId, false);
        return void message.reply({ embeds: [deeloEmbed('Economy Shop (admin)', renderShopList(items, cfg.currency))] });
      }

      const guild = await getGuild(guildId);
      const cfg = economyConfig(guild);
      await message.reply({
        embeds: [deeloEmbed(
          'Economy',
          [
            `**Enabled:** ${guild.economy_enabled ? 'yes' : 'no'}`,
            `**Currency:** ${cfg.currency}`,
            `**Daily:** ${cfg.dailyMin.toLocaleString()}–${cfg.dailyMax.toLocaleString()}`,
            `**Work:** ${cfg.workMin.toLocaleString()}–${cfg.workMax.toLocaleString()} every ${formatCooldown(cfg.workCooldownMs)}`,
            `**Transfer tax:** ${cfg.transferTaxPercent}%`,
            `**Starting balance:** ${cfg.startingBalance.toLocaleString()}`,
          ].join('\n'),
        )],
      });
    },
  },
];

export default economy;

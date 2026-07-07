import type { Command } from '../../types/command';
import { getPlatformStaffRole, isBotOwner, staffMeetsRole } from '../../services/platform-staff';
import { getGuild } from '../../database';
import { deeloEmbed } from '../../utils/embeds';

const staffCommand: Command = {
  name: 'staff',
  category: 'staff',
  description: 'Platform staff utilities',
  usage: 'staff [guild|ping|reload] [args]',
  run: async ({ message, args, client }) => {
    const role = await getPlatformStaffRole(message.author.id);
    if (!role) {
      await message.reply({ embeds: [deeloEmbed('Staff', 'You are not on the Deelo staff roster.')] });
      return;
    }

    const sub = args[0]?.toLowerCase();

    if (sub === 'ping') {
      await message.reply({
        embeds: [deeloEmbed('Staff Ping', `WS: **${client.ws.ping}ms** · Role: **${role}**`)],
      });
      return;
    }

    if (sub === 'guild') {
      if (!staffMeetsRole(role, 'support')) {
        await message.reply({ embeds: [deeloEmbed('Staff', 'Forbidden.')] });
        return;
      }
      const guildId = args[1];
      if (!guildId || !/^\d{17,20}$/.test(guildId)) {
        await message.reply({ embeds: [deeloEmbed('Staff', 'Usage: `,staff guild <guild_id>`')] });
        return;
      }
      const guild = await getGuild(guildId);
      await message.reply({
        embeds: [
          deeloEmbed(`Guild ${guildId}`, [
            `**Plan:** ${guild.plan}`,
            `**Prefix:** \`${guild.prefix}\``,
            `**Automod:** ${guild.automod_enabled ? 'on' : 'off'}`,
            `**Levels:** ${guild.levels_enabled ? 'on' : 'off'}`,
            `**Antinuke:** ${guild.antinuke_enabled ? 'on' : 'off'}`,
          ].join('\n')),
        ],
      });
      return;
    }

    if (sub === 'reload') {
      if (!staffMeetsRole(role, 'developer')) {
        await message.reply({ embeds: [deeloEmbed('Staff', 'Developer access required.')] });
        return;
      }
      if (message.guild) {
        const { ensureGuildBotIdentity } = await import('../../services/guild-identity');
        const guild = await getGuild(message.guild.id);
        await ensureGuildBotIdentity(message.guild, guild.extra_config ?? null, guild.plan);
      }
      await message.reply({ embeds: [deeloEmbed('Staff', 'Guild identity refreshed.')] });
      return;
    }

    await message.reply({
      embeds: [
        deeloEmbed('Deelo Staff', [
          `**Role:** ${role}`,
          `**Owner:** ${isBotOwner(message.author.id) ? 'yes' : 'no'}`,
          '',
          '`,staff ping` — latency',
          '`,staff guild <id>` — guild snapshot',
          '`,staff reload` — refresh appearance (developer+)',
        ].join('\n')),
      ],
    });
  },
};

const evalCommand: Command = {
  name: 'eval',
  category: 'staff',
  description: 'Owner eval',
  ownerOnly: true,
  run: async ({ message, args }) => {
    const code = args.join(' ');
    if (!code) return;
    try {
      // eslint-disable-next-line no-eval
      const result = await eval(code);
      await message.reply({ content: `\`\`\`js\n${String(result).slice(0, 1900)}\n\`\`\`` });
    } catch (err) {
      await message.reply({ content: `\`\`\`\n${String(err)}\n\`\`\`` });
    }
  },
};

export default [staffCommand, evalCommand];

import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { setAfk, getAfk } from '../../database';
import { CATEGORIES } from '../../types/command';

const utility: Command[] = [
  {
    name: 'help',
    aliases: ['h', 'commands'],
    description: 'View all commands',
    category: 'utility',
    usage: 'help [category|command]',
    run: async ({ message, args, client }) => {
      const query = args.join(' ').trim();

      if (query) {
        const cmd = client.commands.get(query) ?? client.commands.get(client.aliases.get(query) ?? '');
        if (cmd) {
          return void message.reply({
            embeds: [deeloEmbed(cmd.name, `**Category:** ${cmd.category}\n**Description:** ${cmd.description}\n**Usage:** \`,${cmd.usage ?? cmd.name}\`${cmd.aliases?.length ? `\n**Aliases:** ${cmd.aliases.join(', ')}` : ''}`)],
          });
        }
        const { catalogHelp } = await import('../../extended/router');
        if (await catalogHelp(message, query)) return;
        const cat = CATEGORIES.find((c) => c.name === query);
        if (cat) {
          const cmds = [...client.commands.values()].filter((c) => c.category === cat.name);
          const list = cmds.map((c) => `\`${c.name}\` — ${c.description}`).join('\n');
          return void message.reply({ embeds: [deeloEmbed(`${cat.emoji} ${cat.name}`, list || 'No commands.')] });
        }
        return void message.reply({ embeds: [errorEmbed(`No command found for "${query}". Try \`,help search ${query}\``)] });
      }

      const { catalogHelpOverview } = await import('../../extended/router');
      await catalogHelpOverview(message);
    },
    slash: { description: 'View bot commands', run: async ({ interaction, client }) => {
      const overview = CATEGORIES.map((c) => `${c.emoji} **${c.name}** — ${c.description}`).join('\n');
      await interaction.reply({ embeds: [deeloEmbed('Deelo Help', overview)] });
    }},
  },
  {
    name: 'ping',
    description: 'Check bot latency',
    category: 'utility',
    run: async ({ message, client }) => {
      const sent = await message.reply('🏓 Pinging...');
      const latency = sent.createdTimestamp - message.createdTimestamp;
      await sent.edit({ content: null, embeds: [deeloEmbed('Pong!', `**Latency:** ${latency}ms\n**API:** ${client.ws.ping}ms`)] });
    },
    slash: { description: 'Check bot latency', run: async ({ interaction, client }) => {
      const start = Date.now();
      await interaction.reply('🏓');
      const latency = Date.now() - start;
      await interaction.editReply({ embeds: [deeloEmbed('Pong!', `**Latency:** ${latency}ms\n**API:** ${client.ws.ping}ms`)] });
    }},
  },
  {
    name: 'status',
    aliases: ['botstatus'],
    description: 'View bot status and uptime',
    category: 'utility',
    run: async ({ message, client }) => {
      const guilds = client.guilds.cache.size;
      const users = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount ?? 0), 0);
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '';
      await message.reply({
        embeds: [deeloEmbed('Deelo Status', [
          `**Servers:** ${guilds.toLocaleString()}`,
          `**Users:** ${users.toLocaleString()}`,
          `**API latency:** ${client.ws.ping}ms`,
          `**Uptime:** ${h}h ${m}m`,
          `**Shards:** ${client.shard?.count ?? 1}`,
          '',
          `[View live status](${appUrl}/status)`,
        ].join('\n'))],
      });
    },
  },
  {
    name: 'snipe',
    description: 'View the last deleted message',
    category: 'utility',
    run: async ({ message, client }) => {
      const snipe = client.snipes.get(message.channel.id);
      if (!snipe) return void message.reply({ embeds: [errorEmbed('Nothing to snipe.')] });
      await message.reply({
        embeds: [deeloEmbed('Snipe', `**Author:** ${snipe.author}\n**Message:** ${snipe.content || '*empty*'}${snipe.attachment ? `\n**Attachment:** ${snipe.attachment}` : ''}\n<t:${Math.floor(snipe.timestamp / 1000)}:R>`)],
      });
    },
  },
  {
    name: 'editsnipe',
    aliases: ['esnipe'],
    description: 'View the last edited message',
    category: 'utility',
    run: async ({ message, client }) => {
      const snipe = client.editSnipes.get(message.channel.id);
      if (!snipe) return void message.reply({ embeds: [errorEmbed('Nothing to editsnipe.')] });
      await message.reply({
        embeds: [deeloEmbed('Edit Snipe', `**Author:** ${snipe.author}\n**Before:** ${snipe.oldContent}\n**After:** ${snipe.newContent}\n<t:${Math.floor(snipe.timestamp / 1000)}:R>`)],
      });
    },
  },
  {
    name: 'afk',
    description: 'Set your AFK status',
    category: 'utility',
    usage: 'afk [reason]',
    run: async ({ message, args }) => {
      const reason = args.join(' ') || 'AFK';
      await setAfk(message.author.id, reason);
      await message.reply({ embeds: [successEmbed(`You're now AFK: **${reason}**`)] });
    },
  },
  {
    name: 'avatar',
    aliases: ['av', 'pfp'],
    description: 'View a user avatar',
    category: 'utility',
    usage: 'avatar [user]',
    run: async ({ message, args }) => {
      const user = message.mentions.users.first() ?? (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) ?? message.author;
      await message.reply({
        embeds: [deeloEmbed(`${user.username}'s Avatar`, `[Download](${user.displayAvatarURL({ size: 4096 })})`).setImage(user.displayAvatarURL({ size: 4096 }))],
      });
    },
  },
  {
    name: 'serverinfo',
    aliases: ['si', 'guildinfo'],
    description: 'View server information',
    category: 'utility',
    run: async ({ message }) => {
      const g = message.guild!;
      await message.reply({
        embeds: [deeloEmbed(g.name, `**Owner:** <@${g.ownerId}>\n**Members:** ${g.memberCount}\n**Channels:** ${g.channels.cache.size}\n**Roles:** ${g.roles.cache.size}\n**Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:R>`)
          .setThumbnail(g.iconURL({ size: 256 }) ?? null)],
      });
    },
  },
  {
    name: 'userinfo',
    aliases: ['ui', 'whois'],
    description: 'View user information',
    category: 'utility',
    usage: 'userinfo [user]',
    run: async ({ message, args }) => {
      const member = message.mentions.members?.first() ?? message.member!;
      await message.reply({
        embeds: [deeloEmbed(member.user.tag, `**ID:** ${member.id}\n**Joined:** <t:${Math.floor(member.joinedTimestamp! / 1000)}:R>\n**Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n**Roles:** ${member.roles.cache.filter((r) => r.id !== message.guild!.id).map((r) => r.toString()).join(', ') || 'None'}`)
          .setThumbnail(member.displayAvatarURL({ size: 256 }))],
      });
    },
  },
  {
    name: 'translate',
    aliases: ['tr'],
    description: 'Translate text',
    category: 'utility',
    usage: 'translate <language> <text>',
    premiumFeature: 'translate',
    run: async ({ message, args }) => {
      const lang = args[0];
      const text = args.slice(1).join(' ');
      if (!lang || !text) return void message.reply({ embeds: [errorEmbed('Usage: `,translate <lang> <text>`\nExample: `,translate es hello world`')] });
      await message.reply({ embeds: [deeloEmbed('Translation', `**${lang}:** ${text}\n\n*Connect a translation API (Google/DeepL) in production for live translations.*`)] });
    },
  },
  {
    name: 'poll',
    description: 'Create a quick poll',
    category: 'utility',
    usage: 'poll <question>',
    run: async ({ message, args }) => {
      const question = args.join(' ');
      if (!question) return void message.reply({ embeds: [errorEmbed('Usage: `,poll <question>`')] });
      const poll = await message.reply({ embeds: [deeloEmbed('📊 Poll', question)] });
      await poll.react('👍');
      await poll.react('👎');
    },
  },
  {
    name: 'remind',
    aliases: ['reminder', 'remindme'],
    description: 'Set a reminder',
    category: 'utility',
    usage: 'remind <time> <message>',
    run: async ({ message, args }) => {
      const { parseDuration, formatDuration } = await import('../../utils/embeds');
      const duration = parseDuration(args[0] ?? '');
      const text = args.slice(1).join(' ');
      if (!duration || !text) return void message.reply({ embeds: [errorEmbed('Usage: `,remind <1m|1h|1d> <message>`')] });
      await message.reply({ embeds: [successEmbed(`I'll remind you in **${formatDuration(duration)}**: ${text}`)] });
      setTimeout(() => message.author.send({ embeds: [deeloEmbed('⏰ Reminder', text)] }).catch(() => {}), duration);
    },
  },
];

export default utility;

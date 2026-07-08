import { REST, Routes } from 'discord.js';
import { config } from '../config';
import type { DeeloClient } from '../client';
import { getSlashData } from './commandLoader';
import { errorEmbed } from '../utils/embeds';
import { getPrefix } from '../database';
import { runCommand } from '../lib/run-command';
import { tryClaimMessage } from '../lib/message-dedup';

export async function registerSlashCommands(client: DeeloClient): Promise<void> {
  const data = getSlashData(client);
  if (data.length === 0) return;
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationCommands(client.user!.id), { body: data });
  console.log(`Registered ${data.length} slash commands`);
}

async function runNativeCommand(client: DeeloClient, message: import('discord.js').Message, command: import('../types/command').Command, args: string[]): Promise<void> {
  await runCommand(client, message, command, args);
}

export async function handleMessage(client: DeeloClient, message: import('discord.js').Message): Promise<void> {
  if (message.author.bot || !message.guild) return;

  const prefix = await getPrefix(message.guild.id);
  if (!message.content.startsWith(prefix)) return;

  let content = message.content.slice(prefix.length).trim();
  if (!content) return;

  if (client.handledMessages.has(message.id)) return;
  if (!(await tryClaimMessage(message.id))) return;
  client.handledMessages.add(message.id);
  setTimeout(() => client.handledMessages.delete(message.id), 15_000);

  const { commandRegistry, handleExtendedCommand } = await import('../extended/router');
  let words = content.split(/\s+/);
  let firstWord = words[0].toLowerCase();

  const { resolveGuildCommandAlias } = await import('../services/command-aliases');
  const guildAlias = await resolveGuildCommandAlias(message.guild.id, firstWord);
  if (guildAlias) {
    const remainder = words.slice(1).join(' ');
    const resolved = remainder ? `${guildAlias} ${remainder}` : guildAlias;
    words = resolved.split(/\s+/);
    firstWord = words[0].toLowerCase();
    content = resolved;
  }

  const nativeName = client.aliases.get(firstWord) ?? firstWord;
  const native = client.commands.get(nativeName);
  const extMatch = commandRegistry.match(content);

  // Prefer multi-word catalog commands over single-word native (e.g. `kick add` vs mod `kick`)
  const preferExtended =
    extMatch &&
    extMatch.command.name.includes(' ') &&
    extMatch.command.name.split(' ')[0] === firstWord;

  if (preferExtended) {
    const handled = await handleExtendedCommand(message, content);
    if (handled) return;
  }

  // Native commands take priority over the extended catalog (avoids mute/timeout routing bugs)
  if (native) {
    await runNativeCommand(client, message, native, words.slice(1));
    return;
  }

  if (extMatch) {
    const handled = await handleExtendedCommand(message, content);
    if (handled) return;
    await message.reply({
      embeds: [errorEmbed(`**${extMatch.command.name}** isn't available yet. Use \`,help ${extMatch.command.name}\` for info.`)],
    }).catch(() => {});
    return;
  }

  await message.reply({ embeds: [errorEmbed(`Unknown command \`${firstWord}\`. Use \`,help\` for a list.`)] }).catch(() => {});
}

export async function handleInteraction(client: DeeloClient, interaction: import('discord.js').Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command?.slash) return;

  if (command.premiumFeature && interaction.guild) {
    const { checkPremium } = await import('../premium/check');
    const allowed = await checkPremium(interaction.guild.id, command.premiumFeature, (opts) => interaction.reply({ ...opts, ephemeral: true }));
    if (!allowed) return;
  }

  try {
    await command.slash.run({ client, interaction });
  } catch (err) {
    console.error(`Slash error in ${command.name}:`, err);
    const payload = { embeds: [errorEmbed('An error occurred.')], ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
    else await interaction.reply(payload);
  }
}

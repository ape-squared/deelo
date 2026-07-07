import type { Message } from 'discord.js';
import { commandRegistry } from './registry';
import { executeExtendedCommand } from './executor';
import { deeloEmbed, errorEmbed } from '../utils/embeds';

export function initCommandCatalog(): number {
  return commandRegistry.load();
}

export async function handleExtendedCommand(message: Message, contentAfterPrefix: string): Promise<boolean> {
  const match = commandRegistry.match(contentAfterPrefix);
  if (!match) return false;

  try {
    return await executeExtendedCommand(message, match.command, match.args);
  } catch (err) {
    console.error(`Extended command error [${match.command.name}]:`, err);
    await message.reply({ embeds: [errorEmbed('An error occurred running that command.')] }).catch(() => {});
    return true;
  }
}

export async function catalogHelp(message: Message, query: string): Promise<boolean> {
  const q = query.toLowerCase().trim();
  const cogs = commandRegistry.getCogs().filter((c) => c.count > 0);
  const cog = cogs.find((c) => c.id === q || c.name.toLowerCase() === q);

  if (cog) {
    const cmds = commandRegistry.getCogCommands(cog.id).slice(0, 25);
    const list = cmds.map((c) => `\`${c.name}\`${c.description ? ` — ${c.description.slice(0, 60)}` : ''}`).join('\n');
    const more = cog.count > 25 ? `\n\n*...and ${cog.count - 25} more. Use \`,help search ${cog.id}\`*` : '';
    await message.reply({ embeds: [deeloEmbed(`${cog.name} (${cog.count})`, (cog.description ? cog.description + '\n\n' : '') + list + more)] });
    return true;
  }

  const cmd = commandRegistry.get(q);
  if (cmd) {
    const lines = [
      cmd.description || 'No description.',
      cmd.syntax ? `**Format:** \`${cmd.syntax}\`` : `**Usage:** \`,${cmd.name}\``,
      cmd.permission ? `**Permission:** ${cmd.permission}` : '',
      cmd.aliases.length ? `**Aliases:** ${cmd.aliases.join(', ')}` : '',
      `**Category:** ${cmd.cogName}`,
    ].filter(Boolean);
    await message.reply({ embeds: [deeloEmbed(cmd.name, lines.join('\n'))] });
    return true;
  }

  if (q.startsWith('search ') || q.startsWith('find ')) {
    const term = q.replace(/^(search|find)\s+/, '');
    const results = commandRegistry.search(term, 20);
    if (!results.length) {
      await message.reply({ embeds: [errorEmbed(`No commands found for "${term}".`)] });
      return true;
    }
    const list = results.map((c) => `\`${c.name}\`${c.description ? ` — ${c.description.slice(0, 50)}` : ''}`).join('\n');
    await message.reply({ embeds: [deeloEmbed(`Search: ${term}`, list)] });
    return true;
  }

  return false;
}

export async function catalogHelpOverview(message: Message): Promise<void> {
  const cogs = commandRegistry.getCogs().filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  const list = cogs.map((c) => `**${c.name}** (${c.count})`).slice(0, 20).join('\n');
  await message.reply({
    embeds: [
      deeloEmbed(
        'Deelo Commands',
        `${list}\n\n**${commandRegistry.size}** commands available.\n\n\`,help <category>\` — browse a category\n\`,help <command>\` — command info\n\`,help search <term>\` — search`
      ),
    ],
  });
}

export { commandRegistry };

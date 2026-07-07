import fs from 'fs';
import path from 'path';
import type { DeeloClient } from '../client';
import type { Command } from '../types/command';

export async function loadCommands(client: DeeloClient): Promise<void> {
  const commandsDir = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsDir).filter((f) => fs.statSync(path.join(commandsDir, f)).isDirectory());

  for (const category of categories) {
    const categoryPath = path.join(commandsDir, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of files) {
      const mod = await import(path.join(categoryPath, file));
      const exported = mod.default ?? mod.command;
      if (!exported) continue;

      const commands: Command[] = Array.isArray(exported) ? exported : [exported];
      for (const command of commands) {
        if (!command?.name) continue;
        client.commands.set(command.name, command);
        if (command.aliases) {
          for (const alias of command.aliases) {
            client.aliases.set(alias, command.name);
          }
        }
      }
    }
  }

  console.log(`Loaded ${client.commands.size} commands`);
}

export function getSlashData(client: DeeloClient) {
  return client.commands
    .filter((cmd) => cmd.slash)
    .map((cmd) => ({
      name: cmd.name,
      description: cmd.slash!.description,
      options: cmd.slash!.options ?? [],
    }));
}

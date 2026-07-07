import fs from 'fs';
import path from 'path';
import type { CommandDef, CommandsCatalogFile } from './types';

function sanitizeCatalogText(text: string): string {
  return text
    .replace(/bleed\.bot/gi, 'Deelo')
    .replace(/bleed's/gi, "Deelo's")
    .replace(/Bleed Booster/gi, 'Premium')
    .replace(/\bbleed\b/gi, 'Deelo');
}

export class CommandRegistry {
  private commands = new Map<string, CommandDef>();
  private aliasToName = new Map<string, string>();
  private byCog = new Map<string, CommandDef[]>();
  private cogMeta = new Map<string, { name: string; description: string; count: number }>();

  load(): number {
    const filePath = path.join(__dirname, '..', 'data', 'commands-catalog.json');
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CommandsCatalogFile;

    for (const cog of raw.cogs) {
      if (!cog.commands?.length) continue;
      const cogLabel = cog.alt_name || cog.cog_name;
      this.cogMeta.set(cog.cog_name, {
        name: cogLabel,
        description: sanitizeCatalogText(cog.description || ''),
        count: cog.count,
      });
      const list: CommandDef[] = [];

      for (const cmd of cog.commands) {
        const entry: CommandDef = {
          name: cmd.name.toLowerCase(),
          aliases: (cmd.aliases || []).map((a) => a.toLowerCase()),
          description: sanitizeCatalogText(cmd.description || '').trim(),
          syntax: cmd.syntax,
          example: cmd.example,
          permission: cmd.permission ? sanitizeCatalogText(cmd.permission) : undefined,
          cooldown: cmd.cooldown,
          args: cmd.args || [],
          cog: cog.cog_name,
          cogName: cogLabel,
        };
        this.commands.set(entry.name, entry);
        list.push(entry);
        for (const alias of entry.aliases) {
          if (!this.aliasToName.has(alias)) {
            this.aliasToName.set(alias, entry.name);
          }
        }
      }
      this.byCog.set(cog.cog_name, list);
    }
    return this.commands.size;
  }

  match(input: string): { command: CommandDef; args: string[] } | null {
    const words = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return null;

    for (let len = words.length; len >= 1; len--) {
      const slice = words.slice(0, len);
      const directCandidate = slice.join(' ');
      const directCommand = this.commands.get(directCandidate);
      if (directCommand) return { command: directCommand, args: words.slice(len) };

      const aliased = [...slice];
      aliased[0] = this.aliasToName.get(aliased[0]) ?? aliased[0];
      const aliasCandidate = aliased.join(' ');
      if (aliasCandidate !== directCandidate) {
        const command = this.commands.get(aliasCandidate);
        if (command) return { command, args: words.slice(len) };
      }
    }
    return null;
  }

  get(name: string): CommandDef | undefined {
    const key = name.toLowerCase();
    const direct = this.commands.get(key);
    if (direct) return direct;
    const aliased = this.aliasToName.get(key);
    return aliased ? this.commands.get(aliased) : undefined;
  }

  search(query: string, limit = 15): CommandDef[] {
    const q = query.toLowerCase();
    const results: CommandDef[] = [];
    for (const cmd of this.commands.values()) {
      if (cmd.name.includes(q) || cmd.description.toLowerCase().includes(q) || cmd.aliases.some((a) => a.includes(q))) {
        results.push(cmd);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  getCogs() {
    return [...this.cogMeta.entries()].map(([id, meta]) => ({ id, ...meta }));
  }

  getCogCommands(cogId: string): CommandDef[] {
    return this.byCog.get(cogId) ?? [];
  }

  get size() {
    return this.commands.size;
  }
}

export const commandRegistry = new CommandRegistry();

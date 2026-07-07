/**
 * Generates per-cog handler stubs from commands-catalog.json.
 * Run: npx tsx scripts/generate-cog-handlers.ts
 */
import fs from 'fs';
import path from 'path';

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/commands-catalog.json'), 'utf-8')) as {
  cogs: Array<{ cog_name: string; commands: Array<{ name: string }> }>;
};

const outDir = path.join(__dirname, '../src/extended/handlers/generated');
fs.mkdirSync(outDir, { recursive: true });

for (const cog of catalog.cogs) {
  if (!cog.commands?.length) continue;
  const varName = cog.cog_name.replace(/[^a-z0-9]/gi, '_');
  const names = cog.commands.map((c) => c.name);
  const lines = [
    `import type { Message } from 'discord.js';`,
    `import type { CommandDef } from '../types';`,
    `import { handleUniversal } from './universal';`,
    `import { cmdRoot, replyInfo, replySuccess, setExtraConfig } from '../lib/helpers';`,
    ``,
    `const COMMANDS = new Set(${JSON.stringify(names)});`,
    ``,
    `export async function handle_${varName}(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {`,
    `  if (cmd.cog !== '${cog.cog_name}') return false;`,
    `  if (!COMMANDS.has(cmd.name)) return false;`,
    `  // Cog-specific logic for ${cog.cog_name}`,
    `  const handled = await handle${capitalize(cog.cog_name)}Specific(cmd, message, args);`,
    `  if (handled) return true;`,
    `  return handleUniversal(cmd, message, args);`,
    `}`,
    ``,
    `async function handle${capitalize(cog.cog_name)}Specific(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {`,
    `  return false;`,
    `}`,
    ``,
  ];
  fs.writeFileSync(path.join(outDir, `${cog.cog_name}.ts`), lines.join('\n'));
}

const imports = catalog.cogs
  .filter((c) => c.commands?.length)
  .map((c) => `import { handle_${c.cog_name.replace(/[^a-z0-9]/gi, '_')} } from './generated/${c.cog_name}';`)
  .join('\n');

const calls = catalog.cogs
  .filter((c) => c.commands?.length)
  .map((c) => `  handle_${c.cog_name.replace(/[^a-z0-9]/gi, '_')},`)
  .join('\n');

fs.writeFileSync(
  path.join(outDir, 'index.ts'),
  `${imports}\n\nexport const GENERATED_HANDLERS = [\n${calls}\n];\n`
);

console.log('Generated', catalog.cogs.filter((c) => c.commands?.length).length, 'cog handlers');

function capitalize(s: string) {
  return s.replace(/(^|[^a-z0-9])([a-z])/gi, (_, a, b) => a + b.toUpperCase()).replace(/[^a-z0-9]/gi, '');
}

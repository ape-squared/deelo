#!/usr/bin/env node
/**
 * Generates web/src/data/native-commands.json from Deelo's native command modules.
 * Run before `next build` so /commands stays in sync with the bot.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const commandsDir = join(repoRoot, 'src/commands');
const outFile = join(__dirname, '../src/data/native-commands.json');

const SKIP_CATEGORIES = new Set(['staff']);
const SKIP_NAMES = new Set(['staff', 'eval']);

const CATEGORY_TO_COG = {
  moderation: 'moderation',
  utility: 'misc',
  fun: 'fun',
  levels: 'levels',
  economy: 'economy',
  config: 'servers',
  roles: 'autorole',
  giveaways: 'giveaways',
  tickets: 'tickets',
  voicemaster: 'voicemaster',
  music: 'music',
  integrations: 'misc',
  premium: 'misc',
};

const NEW_COGS = {
  economy: {
    alt_name: 'Economy',
    description: 'Server economy — balance, daily rewards, shop, and transfers.',
  },
};

/** Subcommands not declared as top-level Command objects */
const EXTRA_BY_COG = {
  music: [
    {
      name: 'stream play',
      description: 'Play or switch to a live stream URL — ,stream play <url> or ,stream <url>',
    },
    {
      name: 'stream add',
      description: 'Queue a radio station without switching — ,stream add [name] <url>',
    },
    { name: 'stream queue', description: 'View the current station and queued radio streams' },
    { name: 'stream skip', description: 'Skip to the next queued radio station' },
    { name: 'stream now', description: 'Show the currently streaming radio station' },
    { name: 'stream remove', description: 'Remove a station from the radio queue by position' },
    { name: 'stream clear', description: 'Clear queued radio stations (keeps the current stream)' },
    { name: 'stream pause', description: 'Pause live radio playback' },
    { name: 'stream resume', description: 'Resume paused radio playback' },
    { name: 'stream volume', description: 'Set radio volume — ,stream volume <0-200>' },
    { name: 'stream stop', description: 'Stop radio playback and clear the queue' },
    { name: 'stream help', description: 'Show radio / stream command help' },
  ],
  fun: [
    {
      name: 'secondlife lindex',
      description: 'LindeX market buy/sell rates and volumes for Second Life',
    },
  ],
  misc: [
    {
      name: 'social add',
      description: 'Track a social feed — ,social add <platform> #channel <username>. Premium.',
    },
    { name: 'social list', description: 'List configured social notification feeds' },
    { name: 'social remove', description: 'Remove a social feed by platform and username' },
    { name: 'chatgpt reset', description: 'Clear ChatGPT conversation memory in the current channel' },
    { name: 'tts voices', description: 'List available text-to-speech voices' },
    { name: 'tts channel', description: 'Speak in your current voice channel — ,tts channel <text>' },
  ],
  servers: [
    { name: 'autoreact add', description: 'Add an auto-react trigger — ,autoreact add <word> <emoji>' },
    { name: 'autoreact remove', description: 'Remove an auto-react trigger by ID' },
    { name: 'autoreact list', description: 'List auto-react triggers for this server' },
    { name: 'log add', description: 'Route a log event to a channel — ,log add #channel <event>' },
    { name: 'suggest channel', description: 'Set the channel for member suggestions' },
  ],
  tickets: [
    { name: 'tickets panel', description: 'Create and post a ticket panel (Administrator). Premium.' },
    { name: 'tickets panels', description: 'List configured ticket panels' },
    { name: 'tickets list', description: 'List open support tickets' },
    { name: 'tickets add', description: 'Add a member to the current ticket' },
    { name: 'tickets remove', description: 'Remove a member from the current ticket' },
    { name: 'tickets unclaim', description: 'Release a claimed ticket back to the queue' },
    { name: 'tickets delete', description: 'Delete a ticket panel by ID' },
    { name: 'tickets blacklist add', description: 'Block a user from opening tickets' },
    { name: 'tickets blacklist remove', description: 'Remove a user from the ticket blacklist' },
    { name: 'tickets blacklist list', description: 'List users blocked from opening tickets' },
  ],
};

function resolveCog(category, name) {
  if (SKIP_CATEGORIES.has(category) || SKIP_NAMES.has(name)) return null;
  if (category === 'security') {
    if (name === 'antinuke') return 'antinuke';
    if (name === 'antiraid') return 'antiraid';
    return 'moderation';
  }
  return CATEGORY_TO_COG[category] ?? 'misc';
}

function walkCommandFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'staff') continue;
      walkCommandFiles(full, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

function parseCommandsFromSource(content) {
  const commands = [];
  // Top-level Command objects use 4-space indent; slash options are deeper.
  const re =
    /^    name: ['"]([^'"]+)['"][\s\S]*?^    description: ['"]([^'"]+)['"][\s\S]*?^    category: ['"]([^'"]+)['"][\s\S]*?^    run:/gm;
  let match;
  while ((match = re.exec(content)) !== null) {
    commands.push({ name: match[1], description: match[2], category: match[3] });
  }
  return commands;
}

function parseLookupCommands() {
  const path = join(repoRoot, 'src/services/lookups.ts');
  const content = readFileSync(path, 'utf8');
  const block = content.match(/export const LOOKUP_COMMANDS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) return [];

  const names = [...block[1].matchAll(/^\s*['"]?([^'":\s]+)['"]?\s*:/gm)].map((m) => m[1]);
  const descriptions = {
    cashapp: 'Look up a Cash App $cashtag profile',
    github: 'Look up a GitHub user profile',
    steam: 'Look up a Steam profile by ID or vanity URL',
    roblox: 'Look up a Roblox user profile',
    minecraft: 'Look up a Minecraft player profile',
    osu: 'Look up an osu! player profile',
    valorant: 'Look up a Valorant player profile',
    xbox: 'Look up an Xbox gamertag',
    snapchat: 'Look up a Snapchat profile',
    snapchatstory: 'Look up a Snapchat story',
    telegram: 'Look up a Telegram profile',
    screenshot: 'Capture a screenshot of a website URL',
    weather: 'Get weather for a city',
    define: 'Look up an English word definition',
  };

  return names.map((name) => ({
    name,
    description: descriptions[name] ?? `Look up ${name}`,
    cog: 'information',
  }));
}

function addCommand(byCog, cogName, entry) {
  if (!cogName || !entry?.name) return;
  if (!byCog[cogName]) byCog[cogName] = [];
  const key = entry.name.toLowerCase();
  if (byCog[cogName].some((c) => c.name.toLowerCase() === key)) return;
  byCog[cogName].push({ name: entry.name, description: entry.description ?? '' });
}

const byCog = {};

for (const file of walkCommandFiles(commandsDir)) {
  const content = readFileSync(file, 'utf8');
  for (const cmd of parseCommandsFromSource(content)) {
    const cog = resolveCog(cmd.category, cmd.name);
    addCommand(byCog, cog, cmd);
  }
}

for (const cmd of parseLookupCommands()) {
  addCommand(byCog, cmd.cog, cmd);
}

for (const [cogName, extras] of Object.entries(EXTRA_BY_COG)) {
  for (const entry of extras) addCommand(byCog, cogName, entry);
}

for (const cogName of Object.keys(byCog)) {
  byCog[cogName].sort((a, b) => a.name.localeCompare(b.name));
}

const output = {
  generated_at: new Date().toISOString(),
  by_cog: byCog,
  new_cogs: NEW_COGS,
};

writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);

const total = Object.values(byCog).reduce((n, list) => n + list.length, 0);
console.log(
  `[native-commands] Wrote ${total} command(s) across ${Object.keys(byCog).length} cog(s) → ${outFile}`,
);

import type { Message } from 'discord.js';
import type { DeeloClient } from '../../client';
import type { Command } from '../../types/command';
import { runCommand } from '../../lib/run-command';

/** Catalog command name → native command + optional arg prefix */
const CATALOG_TO_NATIVE: Record<string, { cmd: string; prefix?: string[] }> = {
  giveaways: { cmd: 'giveaway' },
  'giveaways start': { cmd: 'giveaway', prefix: ['start'] },
  'giveaways end': { cmd: 'giveaway', prefix: ['end'] },
  'giveaways reroll': { cmd: 'giveaway', prefix: ['reroll'] },
  'giveaways list': { cmd: 'giveaway', prefix: ['list'] },
  gw: { cmd: 'giveaway' },
  levels: { cmd: 'levels' },
  'levels leaderboard': { cmd: 'leaderboard' },
  rank: { cmd: 'rank' },
  voicemaster: { cmd: 'voicemaster' },
  tickets: { cmd: 'tickets' },
  lastfm: { cmd: 'lastfm' },
  lfm: { cmd: 'lastfm' },
  chatgpt: { cmd: 'chatgpt' },
  gpt: { cmd: 'chatgpt' },
  ai: { cmd: 'chatgpt' },
  premium: { cmd: 'premium' },
  play: { cmd: 'play' },
  p: { cmd: 'play' },
  queue: { cmd: 'queue' },
  q: { cmd: 'queue' },
  skip: { cmd: 'skip' },
  s: { cmd: 'skip' },
  stop: { cmd: 'stop' },
  nowplaying: { cmd: 'nowplaying' },
  np: { cmd: 'nowplaying' },
  pause: { cmd: 'pause' },
  resume: { cmd: 'resume' },
  volume: { cmd: 'volume' },
  vol: { cmd: 'volume' },
  shuffle: { cmd: 'shuffle' },
  ban: { cmd: 'ban' },
  kick: { cmd: 'kick' },
  warn: { cmd: 'warn' },
  warnings: { cmd: 'warnings' },
  warns: { cmd: 'warnings' },
  mute: { cmd: 'mute' },
  unmute: { cmd: 'unmute' },
  timeout: { cmd: 'timeout' },
  untimeout: { cmd: 'untimeout' },
  purge: { cmd: 'purge' },
  history: { cmd: 'history' },
  case: { cmd: 'case' },
  lock: { cmd: 'lock' },
  unlock: { cmd: 'unlock' },
  slowmode: { cmd: 'slowmode' },
  slow: { cmd: 'slowmode' },
  nickname: { cmd: 'nickname' },
  nick: { cmd: 'nickname' },
  antinuke: { cmd: 'antinuke' },
  antiraid: { cmd: 'antiraid' },
  automod: { cmd: 'automod' },
  filter: { cmd: 'filter' },
  fakepermissions: { cmd: 'fakepermissions' },
  fakeperms: { cmd: 'fakepermissions' },
  settings: { cmd: 'settings' },
  setup: { cmd: 'settings' },
  prefix: { cmd: 'prefix' },
  welcome: { cmd: 'welcome' },
  goodbye: { cmd: 'goodbye' },
  autorole: { cmd: 'autorole' },
  modlog: { cmd: 'modlog' },
  log: { cmd: 'log' },
  logs: { cmd: 'log' },
  logging: { cmd: 'log' },
  logger: { cmd: 'log' },
  'log add': { cmd: 'log', prefix: ['add'] },
  'log remove': { cmd: 'log', prefix: ['remove'] },
  'log ignore': { cmd: 'log', prefix: ['ignore'] },
  'log ignore list': { cmd: 'log', prefix: ['ignore', 'list'] },
  event: { cmd: 'event' },
  responder: { cmd: 'responder' },
  autoresponder: { cmd: 'responder' },
  ar: { cmd: 'responder' },
  autoreact: { cmd: 'autoreact' },
  reactiontrigger: { cmd: 'autoreact' },
  rt: { cmd: 'autoreact' },
  'reaction add': { cmd: 'autoreact', prefix: ['add'] },
  'reaction trigger add': { cmd: 'autoreact', prefix: ['add'] },
  rolerestore: { cmd: 'rolerestore' },
  restoreroles: { cmd: 'rolerestore' },
  suggest: { cmd: 'suggest' },
  suggestion: { cmd: 'suggest' },
  idea: { cmd: 'suggest' },
  'suggest channel': { cmd: 'suggest', prefix: ['channel'] },
  'suggest status': { cmd: 'suggest', prefix: ['status'] },
  reactionrole: { cmd: 'reactionrole' },
  buttonrole: { cmd: 'buttonrole' },
  vanity: { cmd: 'vanity' },
  help: { cmd: 'help' },
  h: { cmd: 'help' },
  commands: { cmd: 'help' },
  ping: { cmd: 'ping' },
  status: { cmd: 'status' },
  botstatus: { cmd: 'status' },
  snipe: { cmd: 'snipe' },
  editsnipe: { cmd: 'editsnipe' },
  esnipe: { cmd: 'editsnipe' },
  afk: { cmd: 'afk' },
  avatar: { cmd: 'avatar' },
  av: { cmd: 'avatar' },
  pfp: { cmd: 'avatar' },
  serverinfo: { cmd: 'serverinfo' },
  si: { cmd: 'serverinfo' },
  guildinfo: { cmd: 'serverinfo' },
  userinfo: { cmd: 'userinfo' },
  ui: { cmd: 'userinfo' },
  whois: { cmd: 'userinfo' },
  translate: { cmd: 'translate' },
  tr: { cmd: 'translate' },
  poll: { cmd: 'poll' },
  remind: { cmd: 'remind' },
  reminder: { cmd: 'remind' },
  remindme: { cmd: 'remind' },
  tictactoe: { cmd: 'tictactoe' },
  move: { cmd: 'move' },
  '8ball': { cmd: '8ball' },
  coinflip: { cmd: 'coinflip' },
  roll: { cmd: 'roll' },
  blacktea: { cmd: 'blacktea' },
  'blacktea end': { cmd: 'blacktea', prefix: ['end'] },
  juul: { cmd: 'juul' },
  'juul pass': { cmd: 'juul', prefix: ['pass'] },
  'juul hit': { cmd: 'juul', prefix: ['hit'] },
  'juul toggle': { cmd: 'juul', prefix: ['toggle'] },
  'juul flavor': { cmd: 'juul', prefix: ['flavor'] },
  'juul stats': { cmd: 'juul', prefix: ['stats'] },
  'juul steal': { cmd: 'juul', prefix: ['steal'] },
  game: { cmd: 'game' },
  'tictactoe statistics': { cmd: 'tictactoe', prefix: ['statistics'] },
  'tictactoe leaderboard': { cmd: 'tictactoe', prefix: ['leaderboard'] },
  social: { cmd: 'social' },
  feed: { cmd: 'social' },
  notify: { cmd: 'social' },
  activate: { cmd: 'activate' },
  perks: { cmd: 'perks' },
};

export function resolveNative(name: string): { cmd: string; args: string[] } | null {
  const key = name.toLowerCase();
  const direct = CATALOG_TO_NATIVE[key];
  if (direct) {
    const rest = key === name ? [] : name.split(' ').slice(key.split(' ').length);
    return { cmd: direct.cmd, args: [...(direct.prefix ?? []), ...rest] };
  }

  const parts = name.split(' ');
  const root = parts[0].toLowerCase();
  const mapped = CATALOG_TO_NATIVE[root];
  if (mapped && parts.length > 1) {
    return { cmd: mapped.cmd, args: parts.slice(1) };
  }
  if (mapped) return { cmd: mapped.cmd, args: [] };

  return null;
}

export async function runNativeBridge(message: Message, catalogName: string, args: string[]): Promise<boolean> {
  const client = message.client as DeeloClient;
  const resolved = resolveNative(catalogName);
  if (!resolved) return false;

  const command: Command | undefined =
    client.commands.get(resolved.cmd) ?? client.commands.get(client.aliases.get(resolved.cmd) ?? '');
  if (!command) return false;

  const allArgs = [...resolved.args, ...args];
  try {
    await runCommand(client, message, command, allArgs);
    return true;
  } catch (err) {
    console.error(`Native bridge error [${catalogName} → ${command.name}]:`, err);
    return false;
  }
}

import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { deleteConfigPath, getConfigValue, listConfigSection, setExtraConfig } from '../lib/guild-config';
import { cmdRoot, cmdTail, replyError, replyInfo, replySuccess, needManageGuild } from '../lib/helpers';

const LIST_ACTIONS = new Set(['list', 'view', 'config', 'show']);
const ADD_ACTIONS = new Set(['add', 'set', 'create', 'enable', 'on', 'unlock']);
const REMOVE_ACTIONS = new Set(['remove', 'delete', 'del', 'disable', 'off', 'lock', 'reset', 'clear', 'removeall']);
const TOGGLE_ON = new Set(['enable', 'on', 'unlock']);
const TOGGLE_OFF = new Set(['disable', 'off', 'lock']);

/** Smart fallback: config CRUD for any catalog command using extra_config storage */
export async function handleUniversal(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (!message.guild || !message.member) return false;
  const guildId = message.guild.id;
  const name = cmd.name;
  const root = cmdRoot(name);
  const tail = cmdTail(name);
  const action = tail.split(' ').pop() ?? name;
  const configPath = `${cmd.cog}.${name.replace(/ /g, '.')}`;

  if (LIST_ACTIONS.has(action) || name.endsWith(' list') || name.endsWith(' config') || name.endsWith(' view')) {
    const section = name.replace(/ (list|config|view|show)$/, '').replace(/ /g, '.');
    const entries = await listConfigSection(guildId, `${cmd.cog}.${section}`);
    const guildVal = await getConfigValue(guildId, `${cmd.cog}.${section}`);
    const lines =
      entries.length > 0
        ? entries.map(([k, v]) => `**${k}:** ${formatVal(v)}`).join('\n')
        : guildVal !== undefined
          ? formatVal(guildVal)
          : 'No entries configured.';
    await replyInfo(message, name, lines);
    return true;
  }

  if (REMOVE_ACTIONS.has(action)) {
    if (!needManageGuild(message.member)) {
      await replyError(message, 'You need **Manage Server** permission.');
      return true;
    }
    const target = args[0] ?? tail.replace(/^(remove|delete|del|reset|clear|removeall) ?/, '');
    if (target) {
      await deleteConfigPath(guildId, `${cmd.cog}.${root}.${target}`);
      await replySuccess(message, `Removed **${target}** from ${root}.`);
    } else {
      await deleteConfigPath(guildId, `${cmd.cog}.${root}`);
      await replySuccess(message, `Reset **${root}** configuration.`);
    }
    return true;
  }

  if (ADD_ACTIONS.has(action) || TOGGLE_ON.has(action) || TOGGLE_OFF.has(action)) {
    if (!needManageGuild(message.member)) {
      await replyError(message, 'You need **Manage Server** permission.');
      return true;
    }
    if (TOGGLE_ON.has(action) || TOGGLE_OFF.has(action)) {
      await setExtraConfig(guildId, `${cmd.cog}.${name.replace(/ /g, '.')}`, TOGGLE_ON.has(action));
      await replySuccess(message, `**${name}** ${TOGGLE_ON.has(action) ? 'enabled' : 'disabled'}.`);
      return true;
    }
    const value = args.join(' ') || 'true';
    await setExtraConfig(guildId, configPath, value);
    await replySuccess(message, `Set **${name}** → ${value}`);
    return true;
  }

  if (!tail && args.length === 0) {
    const val = await getConfigValue(guildId, `${cmd.cog}.${root}`);
    const desc = cmd.description || `Configure **${root}** for this server.`;
    await replyInfo(
      message,
      root,
      val !== undefined ? `${desc}\n\n**Current:** ${formatVal(val)}` : `${desc}\n\nUse \`,${name} set <value>\` or \`,${name} list\` to configure.`
    );
    return true;
  }

  if (args.length > 0) {
    if (!needManageGuild(message.member)) {
      await replyError(message, 'You need **Manage Server** permission.');
      return true;
    }
    await setExtraConfig(guildId, configPath, args.join(' '));
    await replySuccess(message, `**${name}** applied: ${args.join(' ')}`);
    return true;
  }

  // Guaranteed handler — every catalog command gets a response
  const desc = cmd.description || `**${name}** command executed.`;
  await replyInfo(message, name, desc);
  return true;
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '*(not set)*';
  if (typeof v === 'object') return '```json\n' + JSON.stringify(v, null, 2).slice(0, 1800) + '\n```';
  return String(v);
}

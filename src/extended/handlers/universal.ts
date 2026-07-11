import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { deleteConfigPath, getConfigValue, listConfigSection, setExtraConfig } from '../lib/guild-config';
import { cmdRoot, cmdTail, replyError, replyInfo, needManageGuild } from '../lib/helpers';
import { runLookupCommand, LOOKUP_COMMANDS } from '../../services/lookups';

const LIST_ACTIONS = new Set(['list', 'view', 'config', 'show']);
const ADD_ACTIONS = new Set(['add', 'set', 'create', 'enable', 'on', 'unlock']);
const REMOVE_ACTIONS = new Set(['remove', 'delete', 'del', 'disable', 'off', 'lock', 'reset', 'clear', 'removeall']);
const TOGGLE_ON = new Set(['enable', 'on', 'unlock']);
const TOGGLE_OFF = new Set(['disable', 'off', 'lock']);

/** Cogs where member-facing commands should not require Manage Server */
const PUBLIC_COGS = new Set(['information', 'roleplay', 'fun', 'misc', 'manipulation', 'music', 'levels', 'economy']);

/** Smart fallback: config views, persisted settings, and public lookups */
export async function handleUniversal(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (!message.guild || !message.member) return false;
  const guildId = message.guild.id;
  const name = cmd.name;
  const root = cmdRoot(name);
  const tail = cmdTail(name);
  const action = tail.split(' ').pop() ?? name;

  if (LOOKUP_COMMANDS[name.toLowerCase()] && args.length > 0) {
    try {
      const embed = await runLookupCommand(name.toLowerCase(), args.join(' '));
      if (embed) {
        await message.reply({ embeds: [embed] });
        return true;
      }
    } catch (err) {
      await replyError(message, err instanceof Error ? err.message : 'Lookup failed.');
      return true;
    }
  }

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

  if (REMOVE_ACTIONS.has(action) || ADD_ACTIONS.has(action) || TOGGLE_ON.has(action) || TOGGLE_OFF.has(action)) {
    if (!needManageGuild(message.member)) {
      await replyError(message, 'You need **Manage Server** permission.');
      return true;
    }
    const path = `${cmd.cog}.${name.replace(/ /g, '.')}`;
    if (REMOVE_ACTIONS.has(action) || TOGGLE_OFF.has(action)) {
      await deleteConfigPath(guildId, path).catch(() => {});
      await replyInfo(message, name, 'Setting removed.');
      return true;
    }
    const value = args.length ? args.join(' ') : true;
    await setExtraConfig(guildId, path, value);
    await replyInfo(message, name, `Saved **${name}** → ${formatVal(value)}`);
    return true;
  }

  if (!tail && args.length === 0) {
    const val = await getConfigValue(guildId, `${cmd.cog}.${root}`);
    const desc = cmd.description || `Configure **${root}** for this server.`;
    await replyInfo(
      message,
      root,
      val !== undefined
        ? `${desc}\n\n**Current:** ${formatVal(val)}`
        : `${desc}\n\nUse \`,${name} list\` or \`,help ${root}\` for options.`,
    );
    return true;
  }

  if (args.length > 0) {
    if (PUBLIC_COGS.has(cmd.cog)) {
      await replyError(message, `**,${name}** couldn't run with those arguments. Use \`,help ${name}\` for usage.`);
      return true;
    }
    if (!needManageGuild(message.member)) {
      await replyError(message, 'You need **Manage Server** permission.');
      return true;
    }
    const path = `${cmd.cog}.${name.replace(/ /g, '.')}`;
    await setExtraConfig(guildId, path, args.join(' '));
    await replyInfo(message, name, `Saved **${name}** setting.`);
    return true;
  }

  await replyInfo(message, name, cmd.description || `Use \`,help ${root}\` for **${name}** options.`);
  return true;
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '*(not set)*';
  if (typeof v === 'object') return '```json\n' + JSON.stringify(v, null, 2).slice(0, 1800) + '\n```';
  return String(v);
}

import { getSupabase } from '../database/supabase';
import { getGuildPlan } from '../database';
import { hasFeature } from '../config/plans';

const CACHE_MS = 60_000;
const cache = new Map<string, { map: Map<string, string>; at: number }>();

export async function resolveGuildCommandAlias(guildId: string, alias: string): Promise<string | null> {
  const plan = await getGuildPlan(guildId);
  if (!hasFeature(plan, 'commandAliases')) return null;

  const map = await getCommandAliasMap(guildId);
  return map.get(alias.toLowerCase()) ?? null;
}

export async function getCommandAliasMap(guildId: string): Promise<Map<string, string>> {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.map;

  const { data, error } = await getSupabase()
    .from('command_aliases')
    .select('alias, command')
    .eq('guild_id', guildId);

  const map = new Map<string, string>();
  if (!error && data) {
    for (const row of data) {
      map.set(String(row.alias).toLowerCase(), String(row.command).trim());
    }
  }

  cache.set(guildId, { map, at: Date.now() });
  return map;
}

export function invalidateCommandAliasCache(guildId: string): void {
  cache.delete(guildId);
}

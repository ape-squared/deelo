import { getGuild, updateGuild } from '../../database';
import { getSupabase } from '../../database/supabase';

type Json = Record<string, unknown>;

export async function getExtraConfig(guildId: string): Promise<Json> {
  const { data, error } = await getSupabase().from('guilds').select('extra_config').eq('id', guildId).maybeSingle();
  if (error) throw error;
  return (data?.extra_config as Json) ?? {};
}

export async function setExtraConfig(guildId: string, path: string, value: unknown): Promise<void> {
  const cfg = await getExtraConfig(guildId);
  setNested(cfg, path.split('.'), value);
  await getSupabase().from('guilds').update({ extra_config: cfg }).eq('id', guildId);
}

export async function getConfigValue<T = unknown>(guildId: string, path: string, fallback?: T): Promise<T> {
  const cfg = await getExtraConfig(guildId);
  const val = getNested(cfg, path.split('.'));
  return (val !== undefined ? val : fallback) as T;
}

export async function deleteConfigPath(guildId: string, path: string): Promise<void> {
  const cfg = await getExtraConfig(guildId);
  deleteNested(cfg, path.split('.'));
  await getSupabase().from('guilds').update({ extra_config: cfg }).eq('id', guildId);
}

export async function listConfigSection(guildId: string, prefix: string): Promise<[string, unknown][]> {
  const cfg = await getExtraConfig(guildId);
  const node = getNested(cfg, prefix.split('.')) as Json | undefined;
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node);
}

export async function getGuildField<K extends keyof Awaited<ReturnType<typeof getGuild>>>(
  guildId: string,
  field: K
): Promise<Awaited<ReturnType<typeof getGuild>>[K]> {
  const g = await getGuild(guildId);
  return g[field];
}

export async function setGuildField(guildId: string, updates: Parameters<typeof updateGuild>[1]): Promise<void> {
  await updateGuild(guildId, updates);
}

function setNested(obj: Json, keys: string[], value: unknown): void {
  let cur: Json = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k] as Json;
  }
  cur[keys[keys.length - 1]] = value;
}

function getNested(obj: Json, keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Json)[k];
  }
  return cur;
}

function deleteNested(obj: Json, keys: string[]): void {
  let cur: Json = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) return;
    cur = cur[k] as Json;
  }
  delete cur[keys[keys.length - 1]];
}

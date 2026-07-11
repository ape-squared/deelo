import { getConfigValue, setExtraConfig } from '../extended/lib/guild-config';

export interface HighlightWord {
  word: string;
}

async function userWords(guildId: string, userId: string): Promise<string[]> {
  const all = await getConfigValue<Record<string, string[]>>(guildId, 'highlights.users', {});
  return all?.[userId] ?? [];
}

async function allUserMaps(guildId: string): Promise<Record<string, string[]>> {
  const all = await getConfigValue<Record<string, string[]>>(guildId, 'highlights.users', {});
  return all && typeof all === 'object' ? all : {};
}

export async function listHighlights(guildId: string, userId?: string): Promise<HighlightWord[]> {
  if (userId) return (await userWords(guildId, userId)).map((word) => ({ word }));
  const all = await allUserMaps(guildId);
  const out: HighlightWord[] = [];
  for (const words of Object.values(all)) {
    for (const word of words) out.push({ word });
  }
  return out;
}

export async function addHighlight(guildId: string, userId: string, word: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const w = word.trim().toLowerCase();
  if (!w || w.length < 2) return { ok: false, error: 'Keyword must be at least 2 characters.' };
  if (w.length > 32) return { ok: false, error: 'Keyword too long (max 32).' };
  const all = await allUserMaps(guildId);
  const words = all[userId] ?? [];
  if (words.length >= 15) return { ok: false, error: 'Highlight limit reached (15).' };
  if (!words.includes(w)) words.push(w);
  all[userId] = words;
  await setExtraConfig(guildId, 'highlights.users', all);
  return { ok: true };
}

export async function removeHighlight(guildId: string, userId: string, word: string): Promise<boolean> {
  const all = await allUserMaps(guildId);
  const w = word.trim().toLowerCase();
  const next = (all[userId] ?? []).filter((x) => x !== w);
  if (next.length === (all[userId] ?? []).length) return false;
  all[userId] = next;
  await setExtraConfig(guildId, 'highlights.users', all);
  return true;
}

export async function resetHighlights(guildId: string, userId: string): Promise<void> {
  const all = await allUserMaps(guildId);
  delete all[userId];
  await setExtraConfig(guildId, 'highlights.users', all);
}

export async function listIgnored(guildId: string, userId: string): Promise<string[]> {
  const all = await getConfigValue<Record<string, string[]>>(guildId, 'highlights.ignore', {});
  return all?.[userId] ?? [];
}

export async function addIgnored(guildId: string, userId: string, targetId: string): Promise<void> {
  const all = await getConfigValue<Record<string, string[]>>(guildId, 'highlights.ignore', {});
  const list = all?.[userId] ?? [];
  if (!list.includes(targetId)) list.push(targetId);
  await setExtraConfig(guildId, 'highlights.ignore', { ...all, [userId]: list });
}

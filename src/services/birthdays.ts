import { getConfigValue, setExtraConfig, listConfigSection } from '../extended/lib/guild-config';
import { deeloEmbed } from '../utils/embeds';

export interface BirthdayEntry {
  user_id: string;
  month: number;
  day: number;
}

function parseDate(input: string): { month: number; day: number } | null {
  const s = input.trim();
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-]\d{2,4})?$/);
  if (mdy) return { month: parseInt(mdy[1], 10), day: parseInt(mdy[2], 10) };
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { month: parseInt(iso[2], 10), day: parseInt(iso[3], 10) };
  return null;
}

async function usersMap(guildId: string): Promise<Record<string, { month: number; day: number }>> {
  const raw = await getConfigValue<Record<string, { month: number; day: number }>>(guildId, 'birthday.users', {});
  return raw && typeof raw === 'object' ? raw : {};
}

export async function listBirthdays(guildId: string): Promise<BirthdayEntry[]> {
  const map = await usersMap(guildId);
  return Object.entries(map).map(([user_id, v]) => ({ user_id, month: v.month, day: v.day }));
}

export async function setBirthday(guildId: string, userId: string, date: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseDate(date);
  if (!parsed || parsed.month < 1 || parsed.month > 12 || parsed.day < 1 || parsed.day > 31) {
    return { ok: false, error: 'Invalid date. Use `MM/DD` or `YYYY-MM-DD`.' };
  }
  const map = await usersMap(guildId);
  map[userId] = parsed;
  await setExtraConfig(guildId, 'birthday.users', map);
  return { ok: true };
}

export async function removeBirthday(guildId: string, userId: string): Promise<void> {
  const map = await usersMap(guildId);
  delete map[userId];
  await setExtraConfig(guildId, 'birthday.users', map);
}

export async function getBirthdayConfig(guildId: string) {
  return {
    channel: await getConfigValue<string | null>(guildId, 'birthday.channel', null),
    role: await getConfigValue<string | null>(guildId, 'birthday.role', null),
    locked: await getConfigValue<boolean>(guildId, 'birthday.locked', false),
  };
}

export async function setBirthdayConfig(guildId: string, key: string, value: unknown): Promise<void> {
  await setExtraConfig(guildId, `birthday.${key}`, value);
}

export async function birthdayConfigLines(guildId: string): Promise<string> {
  const cfg = await getBirthdayConfig(guildId);
  const entries = await listConfigSection(guildId, 'birthday');
  const lines = entries.map(([k, v]) => `**${k}:** ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  if (cfg.channel) lines.unshift(`**channel:** ${cfg.channel}`);
  if (cfg.role) lines.unshift(`**role:** ${cfg.role}`);
  return lines.join('\n') || 'No birthday settings yet.';
}

export function birthdayEmbed(title: string, body: string) {
  return deeloEmbed(title, body);
}

import { NextResponse } from 'next/server';
import { getDashboardSession, fetchUserGuilds, canManageServer } from '@/lib/session';

export async function requireGuildManager(guildId: string) {
  const session = await getDashboardSession();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const result = await fetchUserGuilds(session.discordId);
  if (!result.ok) return { error: NextResponse.json({ error: 'Failed to verify guild access' }, { status: 502 }) };

  const guild = result.guilds.find((g) => g.id === guildId);
  if (!guild || !canManageServer(guild)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { session, guild };
}

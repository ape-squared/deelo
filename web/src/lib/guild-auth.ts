import { requireGuildAccess, type GuildAccess } from '@/lib/guild-access';
import type { DashboardSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export type { GuildAccess };

export async function requireGuildManager(guildId: string): Promise<
  | { error: NextResponse }
  | { session: DashboardSession; guild: { id: string }; access: GuildAccess }
> {
  const result = await requireGuildAccess(guildId);
  if ('error' in result && result.error) return { error: result.error };
  return {
    session: result.session!,
    guild: { id: guildId },
    access: result.access!,
  };
}

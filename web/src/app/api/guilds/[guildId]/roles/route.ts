import { NextRequest, NextResponse } from 'next/server';
import { requireGuildManager } from '@/lib/guild-auth';
import { isBotInGuild } from '@/lib/discord-bot';
import { fetchGuildRoles } from '@/lib/discord-guild';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const auth = await requireGuildManager(guildId);
  if ('error' in auth) return auth.error;

  if (!(await isBotInGuild(guildId))) {
    return NextResponse.json(
      { error: 'Deelo is not in this server. Invite the bot to load roles.' },
      { status: 404 },
    );
  }

  try {
    const roles = await fetchGuildRoles(guildId);
    return NextResponse.json({ roles });
  } catch (err) {
    console.error('GET /api/guilds/[guildId]/roles:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load roles' },
      { status: 502 },
    );
  }
}

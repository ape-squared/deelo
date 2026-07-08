import { NextResponse } from 'next/server';
import { getDashboardSession, type DashboardSession } from '@/lib/session';
import {
  getOfficialGuildInviteUrl,
  isMemberOfOfficialGuild,
} from '@/lib/official-guild';

export type DashboardAuthResult =
  | { session: DashboardSession; member: true }
  | { error: NextResponse };

export async function requireDashboardSession(): Promise<
  { session: DashboardSession } | { error: NextResponse }
> {
  const session = await getDashboardSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: 'Sign in with Discord to continue.', code: 'login_required' },
        { status: 401 },
      ),
    };
  }
  return { session };
}

export async function requireOfficialMember(): Promise<DashboardAuthResult> {
  const auth = await requireDashboardSession();
  if ('error' in auth) return auth;

  const member = await isMemberOfOfficialGuild(auth.session.discordId);
  if (!member) {
    return {
      error: NextResponse.json(
        {
          error: 'Join the official Deelo Discord server to use this feature.',
          code: 'guild_required',
          inviteUrl: getOfficialGuildInviteUrl(),
          guildId: process.env.OFFICIAL_GUILD_ID || '1523831534799425576',
        },
        { status: 403 },
      ),
    };
  }

  return { session: auth.session, member: true };
}

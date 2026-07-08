import { NextResponse } from 'next/server';
import { getDashboardSession } from '@/lib/session';
import { getOfficialGuildInviteUrl, isMemberOfOfficialGuild } from '@/lib/official-guild';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const officialMember = await isMemberOfOfficialGuild(session.discordId);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.discordId,
      username: session.username,
      avatar: session.avatar,
    },
    officialMember,
    officialGuildInvite: getOfficialGuildInviteUrl(),
  });
}

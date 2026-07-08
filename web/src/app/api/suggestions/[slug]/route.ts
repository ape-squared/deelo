import { NextRequest, NextResponse } from 'next/server';
import { getFeatureRequestBySlug, getUserVotes } from '@/lib/feature-requests';
import { getDashboardSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const request = await getFeatureRequestBySlug(slug);
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const session = await getDashboardSession();
  let userVoted = false;
  if (session) {
    const votes = await getUserVotes(session.discordId, [request.id]);
    userVoted = votes.has(request.id);
  }

  return NextResponse.json({ request, userVoted });
}

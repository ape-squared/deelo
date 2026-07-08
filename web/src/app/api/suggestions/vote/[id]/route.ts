import { NextRequest, NextResponse } from 'next/server';
import { getFeatureRequestById, toggleFeatureVote } from '@/lib/feature-requests';
import { requireOfficialMember } from '@/lib/require-dashboard';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOfficialMember();
  if ('error' in auth) return auth.error;

  const { id: idParam } = await ctx.params;
  const id = parseInt(idParam, 10);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const request = await getFeatureRequestById(id);
  if (!request || request.hidden) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (request.author_discord_id === auth.session.discordId) {
    return NextResponse.json({ error: 'You cannot vote on your own request.' }, { status: 400 });
  }

  try {
    const result = await toggleFeatureVote(id, auth.session.discordId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Vote failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

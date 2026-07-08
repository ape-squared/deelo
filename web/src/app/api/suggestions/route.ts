import { NextRequest, NextResponse } from 'next/server';
import {
  createFeatureRequest,
  getUserVotes,
  listFeatureRequests,
  type FeatureCategory,
  type FeatureStatus,
} from '@/lib/feature-requests';
import { requireOfficialMember } from '@/lib/require-dashboard';
import { getDashboardSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sort = req.nextUrl.searchParams.get('sort') === 'new' ? 'new' : 'top';
  const statusParam = req.nextUrl.searchParams.get('status') ?? 'all';
  const status = (
    ['open', 'under_review', 'planned', 'in_progress', 'completed', 'declined', 'all'].includes(statusParam)
      ? statusParam
      : 'all'
  ) as FeatureStatus | 'all';

  const requests = await listFeatureRequests({ sort, status, limit: 100 });

  const session = await getDashboardSession();
  let userVotes: number[] = [];
  if (session && requests.length) {
    const votes = await getUserVotes(session.discordId, requests.map((r) => r.id));
    userVotes = [...votes];
  }

  return NextResponse.json({ requests, userVotes });
}

export async function POST(req: NextRequest) {
  const auth = await requireOfficialMember();
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const title = String(body.title ?? '').trim();
  const content = String(body.body ?? body.description ?? '').trim();
  if (!title || title.length < 4) {
    return NextResponse.json({ error: 'Title must be at least 4 characters.' }, { status: 400 });
  }
  if (!content || content.length < 10) {
    return NextResponse.json({ error: 'Description must be at least 10 characters.' }, { status: 400 });
  }

  const category = (['feature', 'improvement', 'bug', 'other'].includes(body.category)
    ? body.category
    : 'feature') as FeatureCategory;

  try {
    const request = await createFeatureRequest({
      title,
      body: content,
      category,
      authorDiscordId: auth.session.discordId,
      authorUsername: auth.session.username,
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create request';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOperator, logPlatformAction } from '@/lib/platform-operator';
import {
  listFeatureRequestsAdmin,
  updateFeatureRequest,
  type FeatureCategory,
  type FeatureStatus,
} from '@/lib/feature-requests';

export async function GET() {
  const auth = await requirePlatformOperator({ cmsRead: true });
  if ('error' in auth) return auth.error;
  const requests = await listFeatureRequestsAdmin();
  return NextResponse.json({ requests });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformOperator({ cmsWrite: true });
  if ('error' in auth) return auth.error;
  const { operator } = auth;

  const body = await req.json();
  const id = parseInt(String(body.id ?? ''), 10);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Parameters<typeof updateFeatureRequest>[1] = {};

  if ('title' in body) updates.title = String(body.title).trim().slice(0, 200);
  if ('body' in body) updates.body = String(body.body ?? '').slice(0, 8000);
  if ('category' in body && ['feature', 'improvement', 'bug', 'other'].includes(body.category)) {
    updates.category = body.category as FeatureCategory;
  }
  if (
    'status' in body &&
    ['open', 'under_review', 'planned', 'in_progress', 'completed', 'declined'].includes(body.status)
  ) {
    updates.status = body.status as FeatureStatus;
  }
  if ('pinned' in body) updates.pinned = Boolean(body.pinned);
  if ('hidden' in body) updates.hidden = Boolean(body.hidden);
  if ('staff_response' in body) {
    updates.staff_response = body.staff_response ? String(body.staff_response).slice(0, 4000) : null;
    updates.staff_responder_id = body.staff_response ? operator.id : null;
  }

  try {
    const request = await updateFeatureRequest(id, updates);
    await logPlatformAction(operator, 'feature_request.update', 'feature_requests', String(id), updates);
    return NextResponse.json({ request });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

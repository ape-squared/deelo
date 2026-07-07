import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOperator, logPlatformAction } from '@/lib/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllChangelogAdmin } from '@/lib/site-data';

export async function GET() {
  const auth = await requirePlatformOperator({ cmsRead: true });
  if ('error' in auth) return auth.error;
  const entries = await getAllChangelogAdmin();
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformOperator({ cmsWrite: true });
  if ('error' in auth) return auth.error;
  const { operator } = auth;

  const body = await req.json();
  const title = String(body.title ?? '').trim();
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const category = ['feature', 'improvement', 'fix', 'breaking'].includes(body.category)
    ? body.category
    : 'improvement';
  const status = body.status === 'published' ? 'published' : 'draft';
  const now = new Date().toISOString();

  const row = {
    version: body.version ? String(body.version).slice(0, 32) : null,
    title,
    body: String(body.body ?? ''),
    category,
    status,
    published_at: status === 'published' ? now : null,
    created_by: operator.id,
    updated_at: now,
  };

  const db = createAdminClient();
  const { data, error } = await db.from('site_changelog').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logPlatformAction(operator, 'changelog.create', 'site_changelog', String(data.id), { title, category, status });
  return NextResponse.json({ entry: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformOperator({ cmsWrite: true });
  if ('error' in auth) return auth.error;
  const { operator } = auth;

  const body = await req.json();
  const id = parseInt(String(body.id ?? ''), 10);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('version' in body) updates.version = body.version ? String(body.version).slice(0, 32) : null;
  if ('title' in body) updates.title = String(body.title).trim();
  if ('body' in body) updates.body = String(body.body ?? '');
  if ('category' in body && ['feature', 'improvement', 'fix', 'breaking'].includes(body.category)) {
    updates.category = body.category;
  }
  if ('status' in body && ['draft', 'published'].includes(body.status)) {
    updates.status = body.status;
    if (body.status === 'published') updates.published_at = new Date().toISOString();
    if (body.status === 'draft') updates.published_at = null;
  }

  const db = createAdminClient();
  const { data, error } = await db.from('site_changelog').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logPlatformAction(operator, 'changelog.update', 'site_changelog', String(id), updates);
  return NextResponse.json({ entry: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePlatformOperator({ cmsWrite: true });
  if ('error' in auth) return auth.error;
  const { operator } = auth;

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') ?? '', 10);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db.from('site_changelog').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logPlatformAction(operator, 'changelog.delete', 'site_changelog', String(id));
  return NextResponse.json({ ok: true });
}

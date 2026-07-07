import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllAnnouncementsAdmin } from '@/lib/site-data';
import { slugify } from '@/lib/site-content';

export async function GET() {
  const auth = await requireAdmin('website.read');
  if (auth.error) return auth.error;
  const announcements = await getAllAnnouncementsAdmin();
  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin('website.write');
  if (auth.error) return auth.error;
  const admin = auth.admin;

  const body = await req.json();
  const title = String(body.title ?? '').trim();
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const slug = body.slug ? slugify(String(body.slug)) : slugify(title);
  const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
  const now = new Date().toISOString();

  const row = {
    title,
    slug,
    summary: body.summary ? String(body.summary).slice(0, 500) : null,
    body: String(body.body ?? ''),
    status,
    pinned: !!body.pinned,
    show_banner: !!body.show_banner,
    published_at: status === 'published' ? (body.published_at ?? now) : null,
    created_by: admin.id,
    updated_at: now,
  };

  const db = createAdminClient();
  const { data, error } = await db.from('site_announcements').insert(row).select().single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(admin.id, 'announcement.create', 'site_announcement', String(data.id), { title, status });
  return NextResponse.json({ announcement: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin('website.write');
  if (auth.error) return auth.error;
  const admin = auth.admin;

  const body = await req.json();
  const id = parseInt(String(body.id ?? ''), 10);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('title' in body) updates.title = String(body.title).trim();
  if ('slug' in body) updates.slug = slugify(String(body.slug));
  if ('summary' in body) updates.summary = body.summary ? String(body.summary).slice(0, 500) : null;
  if ('body' in body) updates.body = String(body.body ?? '');
  if ('pinned' in body) updates.pinned = !!body.pinned;
  if ('show_banner' in body) updates.show_banner = !!body.show_banner;

  if ('status' in body && ['draft', 'published', 'archived'].includes(body.status)) {
    updates.status = body.status;
    if (body.status === 'published' && !body.keep_published_at) {
      updates.published_at = new Date().toISOString();
    }
    if (body.status === 'draft') updates.published_at = null;
  }

  const db = createAdminClient();
  const { data, error } = await db.from('site_announcements').update(updates).eq('id', id).select().single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(admin.id, 'announcement.update', 'site_announcement', String(id), updates);
  return NextResponse.json({ announcement: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin('website.write');
  if (auth.error) return auth.error;
  const admin = auth.admin;

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') ?? '', 10);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db.from('site_announcements').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin.id, 'announcement.delete', 'site_announcement', String(id));
  return NextResponse.json({ ok: true });
}

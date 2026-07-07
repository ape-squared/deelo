import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, logAdminAction } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteSettingsAdmin } from '@/lib/site-data';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await getSiteSettingsAdmin();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const key = String(body.key ?? '');
  if (!key || !/^[a-z_]+$/.test(key)) {
    return NextResponse.json({ error: 'Invalid settings key' }, { status: 400 });
  }

  const value = body.value ?? {};
  const db = createAdminClient();
  const { data, error } = await db
    .from('site_settings')
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin.id, 'site_settings.update', 'site_settings', key, { value });
  return NextResponse.json({ setting: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteSettingsAdmin } from '@/lib/site-data';

export async function GET() {
  const auth = await requireAdmin('website.read');
  if (auth.error) return auth.error;
  const settings = await getSiteSettingsAdmin();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin('website.write');
  if (auth.error) return auth.error;
  const admin = auth.admin;

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

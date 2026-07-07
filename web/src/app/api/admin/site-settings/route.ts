import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOperator, logPlatformAction } from '@/lib/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteSettingsAdmin } from '@/lib/site-data';

export async function GET() {
  const auth = await requirePlatformOperator({ cmsRead: true });
  if ('error' in auth) return auth.error;
  const settings = await getSiteSettingsAdmin();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformOperator({ cmsWrite: true });
  if ('error' in auth) return auth.error;
  const { operator } = auth;

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
      updated_by: operator.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logPlatformAction(operator, 'site_settings.update', 'site_settings', key, { value });
  return NextResponse.json({ setting: data });
}

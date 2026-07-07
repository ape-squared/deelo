import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformStaff } from '@/lib/platform-staff';
import { createAdminClient } from '@/lib/supabase/admin';
import { platformRoleLabel } from '@/lib/platform-roles';

export async function GET() {
  const auth = await requirePlatformStaff('staff.manage');
  if (auth.error) return auth.error;

  const { data, error } = await createAdminClient()
    .from('platform_staff')
    .select('discord_id, role, display_name, notes, granted_by, created_at, last_login')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformStaff('staff.manage');
  if (auth.error) return auth.error;

  const body = await req.json();
  const discordId = String(body.discord_id ?? '').trim();
  const role = String(body.role ?? 'support');
  if (!/^\d{17,20}$/.test(discordId)) {
    return NextResponse.json({ error: 'Valid Discord user ID required' }, { status: 400 });
  }
  if (!['lead', 'developer', 'moderator', 'support'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from('platform_staff')
    .upsert({
      discord_id: discordId,
      role,
      display_name: body.display_name ? String(body.display_name).slice(0, 64) : null,
      notes: body.notes ? String(body.notes).slice(0, 500) : null,
      granted_by: auth.staff.discordId,
    }, { onConflict: 'discord_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    staff: data,
    message: `Granted ${platformRoleLabel(role as import('@/lib/platform-roles').PlatformStaffRole)} access`,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePlatformStaff('staff.manage');
  if (auth.error) return auth.error;

  const discordId = new URL(req.url).searchParams.get('discord_id');
  if (!discordId) return NextResponse.json({ error: 'discord_id required' }, { status: 400 });

  const { error } = await createAdminClient().from('platform_staff').delete().eq('discord_id', discordId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

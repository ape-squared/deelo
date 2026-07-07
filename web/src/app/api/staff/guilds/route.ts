import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformStaff } from '@/lib/platform-staff';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const auth = await requirePlatformStaff('guilds.read');
  if (auth.error) return auth.error;

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  const db = createAdminClient();

  if (q && /^\d{17,20}$/.test(q)) {
    const { data: guild } = await db.from('guilds').select('*').eq('id', q).maybeSingle();
    const { data: sub } = await db
      .from('subscriptions')
      .select('*')
      .eq('guild_id', q)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json({ guild, subscription: sub });
  }

  const { data: guilds } = await db
    .from('guilds')
    .select('id, plan, prefix, plan_expires_at')
    .order('id', { ascending: false })
    .limit(25);

  return NextResponse.json({ guilds: guilds ?? [] });
}

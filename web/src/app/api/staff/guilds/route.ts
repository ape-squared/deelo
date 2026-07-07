import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformStaff, logStaffAction } from '@/lib/platform-staff';
import { setGuildSubscription } from '@/lib/admin-subscriptions';
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

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformStaff('guilds.write');
  if (auth.error) return auth.error;
  const { staff } = auth;

  const { guildId, plan, days } = (await req.json()) as { guildId: string; plan: string; days?: number };
  if (!guildId || !plan) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const expiresAt = plan === 'free' || !days
    ? null
    : new Date(Date.now() + days * 86400000).toISOString();

  const db = createAdminClient();
  await setGuildSubscription(db, {
    guildId,
    plan,
    expiresAt,
    notes: `Set by staff ${staff.discordId}`,
  });

  await logStaffAction(staff.discordId, 'guild.plan_update', 'guild', guildId, { plan, days });

  const { data: guild } = await db.from('guilds').select('id, plan, prefix, plan_expires_at').eq('id', guildId).single();
  return NextResponse.json({ guild });
}

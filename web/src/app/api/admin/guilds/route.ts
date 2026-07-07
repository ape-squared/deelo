import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { setGuildSubscription } from '@/lib/admin-subscriptions';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin('guilds.write');
  if (auth.error) return auth.error;
  const admin = auth.admin;

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
    notes: `Set by admin ${admin.email}`,
  });

  await logAdminAction(admin.id, 'guild.plan_update', 'guild', guildId, { plan, days });

  const { data: guild } = await db.from('guilds').select('id, plan, prefix, plan_expires_at').eq('id', guildId).single();
  return NextResponse.json({ guild });
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, logAdminAction } from '@/lib/admin';
import { setGuildSubscription } from '@/lib/admin-subscriptions';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = createAdminClient();
  const [{ data: subs }, { data: guilds }] = await Promise.all([
    db.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(500),
    db.from('guilds').select('id, plan'),
  ]);

  const guildPlans = new Map((guilds ?? []).map((g) => [g.id, g.plan]));
  return NextResponse.json({ subscriptions: subs ?? [], guildPlans: Object.fromEntries(guildPlans) });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const db = createAdminClient();

  if ('id' in body && 'status' in body) {
    const status = body.status as string;
    const { data: sub } = await db.from('subscriptions').select('guild_id').eq('id', body.id).maybeSingle();

    await db
      .from('subscriptions')
      .update({ status, cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', body.id);

    if (status === 'cancelled' && sub?.guild_id) {
      const { data: otherActive } = await db
        .from('subscriptions')
        .select('id')
        .eq('guild_id', sub.guild_id)
        .eq('status', 'active')
        .neq('id', body.id)
        .limit(1);

      if (!otherActive?.length) {
        await db.from('guilds').update({ plan: 'free', plan_expires_at: null }).eq('id', sub.guild_id);
      }
    }

    await logAdminAction(admin.id, 'subscription.cancel', 'subscription', String(body.id));
    return NextResponse.json({ ok: true });
  }

  const { guildId, plan, days, notes } = body as { guildId: string; plan: string; days: number; notes?: string };
  const expiresAt = plan === 'free' ? null : new Date(Date.now() + (days || 30) * 86400000).toISOString();

  const subscription = await setGuildSubscription(db, {
    guildId,
    plan,
    expiresAt,
    notes: notes ?? `Created by ${admin.email}`,
  });

  await logAdminAction(admin.id, 'subscription.create', 'guild', guildId, { plan, days });
  return NextResponse.json({ subscription });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const db = createAdminClient();

  // Extend existing subscription
  if ('id' in body && 'days' in body) {
    const { data: sub } = await db.from('subscriptions').select('*').eq('id', body.id).single();
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const base = sub.expires_at && new Date(sub.expires_at).getTime() > Date.now()
      ? new Date(sub.expires_at).getTime()
      : Date.now();
    const expiresAt = new Date(base + Number(body.days) * 86400000).toISOString();

    await db.from('subscriptions').update({ expires_at: expiresAt, status: 'active', updated_at: new Date().toISOString() }).eq('id', body.id);
    await db.from('guilds').update({ plan: sub.plan, plan_expires_at: expiresAt }).eq('id', sub.guild_id);
    await logAdminAction(admin.id, 'subscription.extend', 'subscription', String(body.id), { days: body.days });

    const { data: updated } = await db.from('subscriptions').select('*').eq('id', body.id).single();
    return NextResponse.json({ subscription: updated });
  }

  return POST(req);
}

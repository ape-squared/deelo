import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformStaff, logStaffAction } from '@/lib/platform-staff';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateRedeemCode, normalizeRedeemCode } from '@/lib/redeem-codes';

export async function GET() {
  const auth = await requirePlatformStaff('redeem.read');
  if (auth.error) return auth.error;

  const db = createAdminClient();
  const { data, error } = await db
    .from('redeem_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformStaff('redeem.write');
  if (auth.error) return auth.error;
  const { staff } = auth;

  const body = await req.json();
  const plan = body.plan === 'premium_plus' ? 'premium_plus' : 'premium';
  const days = Math.min(Math.max(parseInt(String(body.days ?? 30), 10) || 30, 1), 3650);
  const maxUses = Math.min(Math.max(parseInt(String(body.maxUses ?? 1), 10) || 1, 1), 10000);
  const notes = body.notes ? String(body.notes).slice(0, 500) : null;
  const customCode = body.code ? normalizeRedeemCode(String(body.code)) : generateRedeemCode();
  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + Number(body.expiresInDays) * 86400000).toISOString()
    : null;

  const db = createAdminClient();
  const { data, error } = await db
    .from('redeem_codes')
    .insert({
      code: customCode,
      plan,
      days,
      max_uses: maxUses,
      expires_at: expiresAt,
      notes,
      created_by: staff.discordId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Code already exists.' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logStaffAction(staff.discordId, 'redeem_code.create', 'redeem_code', String(data.id), { code: customCode, plan, days });
  return NextResponse.json({ code: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformStaff('redeem.write');
  if (auth.error) return auth.error;
  const { staff } = auth;

  const body = await req.json();
  const id = parseInt(String(body.id ?? ''), 10);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if ('disabled' in body) updates.disabled = !!body.disabled;
  if ('notes' in body) updates.notes = body.notes ? String(body.notes).slice(0, 500) : null;

  const db = createAdminClient();
  const { data, error } = await db.from('redeem_codes').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logStaffAction(staff.discordId, 'redeem_code.update', 'redeem_code', String(id), updates);
  return NextResponse.json({ code: data });
}

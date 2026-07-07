import { NextRequest, NextResponse } from 'next/server';
import { requireGuildManager } from '@/lib/guild-auth';
import { redeemCodeForGuild } from '@/lib/redeem';
import { loadGuildWithPlan } from '@/lib/guild-plan-loader';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const auth = await requireGuildManager(guildId);
  if (auth.error) return auth.error;

  const body = await req.json();
  const code = String(body.code ?? '');
  if (!code.trim()) return NextResponse.json({ error: 'Enter a redeem code.' }, { status: 400 });

  const result = await redeemCodeForGuild(guildId, auth.session!.discordId, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  const db = createAdminClient();
  const { guild, subscription } = await loadGuildWithPlan(db, guildId);

  return NextResponse.json({
    message: result.message,
    plan: result.plan,
    days: result.days,
    expiresAt: result.expiresAt,
    guild,
    subscription,
  });
}

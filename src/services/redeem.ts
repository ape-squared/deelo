import { getSupabase } from '../database/supabase';
import { setGuildPlan } from '../database';
import {
  normalizeRedeemCode,
  validateRedeemCodeRow,
  REDEEM_ERROR_MESSAGES,
  type RedeemCodeRow,
  type RedeemError,
} from '../lib/redeem-codes';

export interface RedeemResult {
  ok: boolean;
  error?: RedeemError;
  message: string;
  plan?: string;
  days?: number;
  expiresAt?: string;
}

export async function redeemCodeForGuild(
  guildId: string,
  redeemedBy: string,
  rawCode: string,
): Promise<RedeemResult> {
  const code = normalizeRedeemCode(rawCode);
  if (!code || code.length < 6) {
    return { ok: false, error: 'invalid_code', message: REDEEM_ERROR_MESSAGES.invalid_code };
  }

  const db = getSupabase();

  const { data: row, error: fetchError } = await db
    .from('redeem_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: 'db_error', message: REDEEM_ERROR_MESSAGES.db_error };
  }

  const { data: priorUse } = await db
    .from('redeem_code_uses')
    .select('id')
    .eq('code_id', (row as RedeemCodeRow | null)?.id ?? -1)
    .eq('guild_id', guildId)
    .maybeSingle();

  const check = validateRedeemCodeRow(row as RedeemCodeRow | null, !!priorUse);
  if (!check.ok) {
    return { ok: false, error: check.error, message: REDEEM_ERROR_MESSAGES[check.error] };
  }

  const redeemRow = row as RedeemCodeRow;
  const expiresAt = new Date(Date.now() + redeemRow.days * 86400000).toISOString();

  const { error: useError } = await db.from('redeem_code_uses').insert({
    code_id: redeemRow.id,
    guild_id: guildId,
    redeemed_by: redeemedBy,
  });

  if (useError) {
    if (useError.code === '23505') {
      return { ok: false, error: 'already_redeemed', message: REDEEM_ERROR_MESSAGES.already_redeemed };
    }
    return { ok: false, error: 'db_error', message: REDEEM_ERROR_MESSAGES.db_error };
  }

  const { error: incError } = await db
    .from('redeem_codes')
    .update({ uses: redeemRow.uses + 1 })
    .eq('id', redeemRow.id)
    .eq('uses', redeemRow.uses);

  if (incError) {
    return { ok: false, error: 'db_error', message: REDEEM_ERROR_MESSAGES.db_error };
  }

  await setGuildPlan(guildId, redeemRow.plan, expiresAt);

  // Mirror web subscription flow
  await db
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('guild_id', guildId)
    .eq('status', 'active');

  await db.from('subscriptions').insert({
    guild_id: guildId,
    plan: redeemRow.plan,
    status: 'active',
    expires_at: expiresAt,
    notes: `Redeemed code ${redeemRow.code}`,
  });

  const planLabel = redeemRow.plan === 'premium_plus' ? 'Premium+' : 'Premium';
  return {
    ok: true,
    message: `Redeemed **${planLabel}** for **${redeemRow.days}** days! Expires <t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:D>.`,
    plan: redeemRow.plan,
    days: redeemRow.days,
    expiresAt,
  };
}

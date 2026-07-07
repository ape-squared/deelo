import { createAdminClient } from '@/lib/supabase/admin';
import { setGuildSubscription } from '@/lib/admin-subscriptions';
import {
  normalizeRedeemCode,
  validateRedeemCodeRow,
  REDEEM_ERROR_MESSAGES,
  type RedeemCodeRow,
  type RedeemError,
} from '@/lib/redeem-codes';

export interface RedeemResult {
  ok: boolean;
  error?: RedeemError;
  message: string;
  plan?: string;
  days?: number;
  expiresAt?: string | null;
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

  const db = createAdminClient();

  const { data: row, error: fetchError } = await db
    .from('redeem_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: 'db_error', message: REDEEM_ERROR_MESSAGES.db_error };
  }

  const redeemRow = row as RedeemCodeRow | null;

  const { data: priorUse } = redeemRow
    ? await db.from('redeem_code_uses').select('id').eq('code_id', redeemRow.id).eq('guild_id', guildId).maybeSingle()
    : { data: null };

  const check = validateRedeemCodeRow(redeemRow, !!priorUse);
  if (!check.ok) {
    return { ok: false, error: check.error, message: REDEEM_ERROR_MESSAGES[check.error] };
  }

  const r = redeemRow!;
  const expiresAt = new Date(Date.now() + r.days * 86400000).toISOString();

  const { error: useError } = await db.from('redeem_code_uses').insert({
    code_id: r.id,
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
    .update({ uses: r.uses + 1 })
    .eq('id', r.id)
    .eq('uses', r.uses);

  if (incError) {
    return { ok: false, error: 'db_error', message: REDEEM_ERROR_MESSAGES.db_error };
  }

  await setGuildSubscription(db, {
    guildId,
    plan: r.plan,
    expiresAt,
    notes: `Redeemed code ${r.code} by ${redeemedBy}`,
  });

  const planLabel = r.plan === 'premium_plus' ? 'Premium+' : 'Premium';
  return {
    ok: true,
    message: `Redeemed ${planLabel} for ${r.days} days.`,
    plan: r.plan,
    days: r.days,
    expiresAt,
  };
}

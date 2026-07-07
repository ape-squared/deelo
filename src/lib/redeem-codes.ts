/** Redeem code helpers (synced from deelo/shared/redeem.ts). */

export type RedeemPlan = 'premium' | 'premium_plus';

export function normalizeRedeemCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export interface RedeemCodeRow {
  id: number;
  code: string;
  plan: RedeemPlan;
  days: number;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  notes: string | null;
  disabled: boolean;
  created_at: string;
}

export type RedeemError =
  | 'invalid_code'
  | 'disabled'
  | 'expired'
  | 'max_uses'
  | 'already_redeemed'
  | 'db_error';

export function validateRedeemCodeRow(
  row: RedeemCodeRow | null,
  alreadyUsed: boolean,
): { ok: true } | { ok: false; error: RedeemError } {
  if (!row) return { ok: false, error: 'invalid_code' };
  if (row.disabled) return { ok: false, error: 'disabled' };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'expired' };
  }
  if (row.uses >= row.max_uses) return { ok: false, error: 'max_uses' };
  if (alreadyUsed) return { ok: false, error: 'already_redeemed' };
  return { ok: true };
}

export const REDEEM_ERROR_MESSAGES: Record<RedeemError, string> = {
  invalid_code: 'That code is invalid or does not exist.',
  disabled: 'This code has been disabled.',
  expired: 'This code has expired.',
  max_uses: 'This code has already been fully redeemed.',
  already_redeemed: 'This server has already redeemed this code.',
  db_error: 'Something went wrong. Try again later.',
};

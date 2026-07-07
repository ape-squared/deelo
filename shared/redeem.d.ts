/** Shared redeem code helpers (bot + web). */
export type RedeemPlan = 'premium' | 'premium_plus';
export declare function normalizeRedeemCode(raw: string): string;
export declare function generateRedeemCode(): string;
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
export type RedeemError = 'invalid_code' | 'disabled' | 'expired' | 'max_uses' | 'already_redeemed' | 'db_error';
export declare function validateRedeemCodeRow(row: RedeemCodeRow | null, alreadyUsed: boolean): {
    ok: true;
} | {
    ok: false;
    error: RedeemError;
};
export declare const REDEEM_ERROR_MESSAGES: Record<RedeemError, string>;
//# sourceMappingURL=redeem.d.ts.map
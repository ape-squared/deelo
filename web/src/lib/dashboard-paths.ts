/** Deep link into the dashboard redeem flow (General → redeem panel). */
export function dashboardRedeemPath(guildId?: string): string {
  if (guildId) return `/dashboard/${guildId}?m=general`;
  return '/dashboard?redeem=1';
}

export const DASHBOARD_REDEEM_QUERY = '/dashboard?redeem=1';

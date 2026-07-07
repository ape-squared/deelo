import { createAdminClient } from '@/lib/supabase/admin';
import { RedeemCodeManager } from '@/components/admin-redeem-codes';
import { AdminPageHeader } from '@/components/admin/ui';
import type { RedeemCodeRow } from '@/lib/redeem-codes';

export default async function AdminRedeemCodesPage() {
  const db = createAdminClient();
  const { data: codes } = await db
    .from('redeem_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <AdminPageHeader
        title="Redeem Codes"
        description="Create premium codes for giveaways, partners, and promotions. Users redeem with ,redeem or the dashboard."
      />
      <RedeemCodeManager initial={(codes ?? []) as RedeemCodeRow[]} />
    </div>
  );
}

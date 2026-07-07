import { createAdminClient } from '@/lib/supabase/admin';
import { RedeemCodeManager } from '@/components/admin-redeem-codes';
import { requireStaffPage } from '@/lib/staff-page';
import { StaffPageHeader } from '@/components/staff/ui';
import type { RedeemCodeRow } from '@/lib/redeem-codes';
import { platformHasPermission } from '@/lib/platform-roles';

export default async function ModeratorRedeemPage() {
  const staff = await requireStaffPage('redeem.read');

  const db = createAdminClient();
  const { data: codes } = await db
    .from('redeem_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const canWrite = platformHasPermission(staff.role, 'redeem.write');

  return (
    <div>
      <StaffPageHeader
        badge="Bot moderator"
        title="Redeem codes"
        description={canWrite
          ? 'Create and manage premium promo codes for giveaways and partners.'
          : 'View promo codes and usage. Disable codes that are being abused — contact a developer to create new ones.'}
      />
      <RedeemCodeManager
        initial={(codes ?? []) as RedeemCodeRow[]}
        readOnly={!canWrite}
        apiEndpoint="/api/staff/redeem-codes"
      />
    </div>
  );
}

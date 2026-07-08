import Link from 'next/link';
import { StaffPageHeader } from '@/components/staff/ui';
import { FeatureRequestsManager } from '@/components/admin/feature-requests-manager';
import { requireStaffPage } from '@/lib/staff-page';
import { ExternalLink } from 'lucide-react';

export default async function StaffSuggestionsPage() {
  await requireStaffPage('cms.read');

  return (
    <div>
      <StaffPageHeader
        title="Feature requests"
        description="Moderate community suggestions and update roadmap status."
        action={
          <Link href="/suggestions" className="btn-secondary text-sm" target="_blank">
            <ExternalLink className="h-4 w-4" />
            Public board
          </Link>
        }
      />
      <FeatureRequestsManager />
    </div>
  );
}

import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/ui';
import { FeatureRequestsManager } from '@/components/admin/feature-requests-manager';
import { ExternalLink } from 'lucide-react';

export default function AdminSuggestionsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Feature requests"
        badge="Community"
        description="Review community suggestions, update status, and respond to popular ideas."
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

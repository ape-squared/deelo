import { MarketingLayout } from '@/components/marketing/site-layout';
import { StatusView } from './status-view';

export default function StatusPage() {
  return (
    <MarketingLayout banner={false}>
      <StatusView />
    </MarketingLayout>
  );
}

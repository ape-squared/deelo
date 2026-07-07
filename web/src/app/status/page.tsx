import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-chrome';
import { StatusView } from './status-view';

export default function StatusPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <StatusView />
      <SiteFooter />
    </div>
  );
}

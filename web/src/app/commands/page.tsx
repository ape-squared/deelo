import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-chrome';
import { CommandsView } from './commands-view';

export default function CommandsPage() {
  return (
    <div className="mesh-bg flex min-h-screen flex-col">
      <SiteHeader />
      <CommandsView />
      <SiteFooter />
    </div>
  );
}

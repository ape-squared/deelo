import { MarketingLayout } from '@/components/marketing/site-layout';
import { CommandsView } from './commands-view';

export default function CommandsPage() {
  return (
    <MarketingLayout banner={false}>
      <CommandsView />
    </MarketingLayout>
  );
}

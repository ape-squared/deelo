import { MarketingLayout } from '@/components/marketing/site-layout';
import { MarketingSubHero } from '@/components/marketing/page-hero';
import { CommandsView } from './commands-view';
import commands from '@/data/commands-catalog.json';
import { mergeNativeCommands } from '@/lib/deelo-native-commands';
import { Terminal } from 'lucide-react';

type Cog = {
  cog_name: string;
  alt_name?: string;
  count: number;
  commands: Array<{ name: string; description?: string }>;
};

export default function CommandsPage() {
  const cogs = mergeNativeCommands((commands as { cogs: Cog[] }).cogs)
    .filter((c) => c.commands.length > 0);
  const totalCommands = cogs.reduce((n, c) => n + c.commands.length, 0);

  return (
    <MarketingLayout banner={false}>
      <main className="flex-1">
        <MarketingSubHero
          icon={Terminal}
          label="Command reference"
          title={
            <>
              <span className="gradient-text">{totalCommands.toLocaleString()}</span> commands
            </>
          }
          description={`Browse ${cogs.length} categories. Default prefix is comma (,).`}
        />
        <CommandsView />
      </main>
    </MarketingLayout>
  );
}

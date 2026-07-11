import nativeData from '@/data/native-commands.json';

type CatalogCommand = { name: string; description?: string };
type CatalogCog = {
  cog_name: string;
  alt_name?: string;
  description?: string;
  count: number;
  commands: CatalogCommand[];
};

interface NativeCommandsFile {
  generated_at: string;
  by_cog: Record<string, CatalogCommand[]>;
  new_cogs?: Record<string, { alt_name: string; description: string }>;
}

const data = nativeData as NativeCommandsFile;

export function mergeNativeCommands(cogs: CatalogCog[]): CatalogCog[] {
  const order = cogs.map((c) => c.cog_name);
  const byName = new Map<string, CatalogCog>(
    cogs.map((cog) => [cog.cog_name, { ...cog, commands: [...cog.commands] }]),
  );

  for (const [cogName, extras] of Object.entries(data.by_cog ?? {})) {
    if (!extras?.length) continue;

    let cog = byName.get(cogName);
    if (!cog) {
      const meta = data.new_cogs?.[cogName];
      cog = {
        cog_name: cogName,
        alt_name: meta?.alt_name ?? cogName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: meta?.description ?? `Deelo ${cogName} commands.`,
        count: 0,
        commands: [],
      };
      byName.set(cogName, cog);
      order.push(cogName);
    }

    const existing = new Set(cog.commands.map((c) => c.name.toLowerCase()));
    const added = extras.filter((c) => !existing.has(c.name.toLowerCase()));
    if (!added.length) {
      cog.count = cog.commands.length;
      continue;
    }

    cog.commands = [...cog.commands, ...added].sort((a, b) => a.name.localeCompare(b.name));
    cog.count = cog.commands.length;
  }

  return order.map((name) => byName.get(name)!).filter(Boolean);
}

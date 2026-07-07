type CatalogCommand = { name: string; description?: string };
type CatalogCog = {
  cog_name: string;
  alt_name?: string;
  count: number;
  commands: CatalogCommand[];
};

/** Native Deelo commands to inject into the public commands catalog. */
const NATIVE_BY_COG: Record<string, CatalogCommand[]> = {
  servers: [
    {
      name: 'autoreact',
      description: 'Manage auto-reactions when messages match triggers. Aliases: rt, reactiontrigger, reaction',
    },
    {
      name: 'autoreact add',
      description: 'Add a trigger — ,autoreact add <word> <emoji> [exact|contains|startswith]. Premium.',
    },
    {
      name: 'autoreact remove',
      description: 'Remove an auto-react trigger by ID from ,autoreact list',
    },
    {
      name: 'autoreact list',
      description: 'List all auto-react triggers configured for this server',
    },
    {
      name: 'rolerestore',
      description: 'Restore roles a member had before they left the server. Alias: restoreroles',
    },
    {
      name: 'log',
      description: 'Configure server event log channels. Aliases: logs, logging',
    },
    {
      name: 'log add',
      description: 'Route an event to a channel — ,log add #channel moderation',
    },
    {
      name: 'suggest',
      description: 'Submit a server suggestion. Aliases: suggestion, idea',
    },
    {
      name: 'suggest channel',
      description: 'Set the channel for suggestions — ,suggest channel #channel',
    },
  ],
};

export function mergeNativeCommands(cogs: CatalogCog[]): CatalogCog[] {
  return cogs.map((cog) => {
    const extras = NATIVE_BY_COG[cog.cog_name];
    if (!extras?.length) return { ...cog, count: cog.commands.length };

    const existing = new Set(cog.commands.map((c) => c.name));
    const added = extras.filter((c) => !existing.has(c.name));
    if (!added.length) return { ...cog, count: cog.commands.length };

    const commands = [...cog.commands, ...added];
    return { ...cog, commands, count: commands.length };
  });
}

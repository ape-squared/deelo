/** Catalog cogs and commands excluded from Deelo (not shipped). */
export const EXCLUDED_COGS = new Set(['lastfm', 'spotify']);

export const EXCLUDED_MISC_COMMANDS = new Set(['nba', 'nfl', 'mlb', 'soccer', 'futbol', 'nhl']);

export function isExcludedCatalogCommand(cogName: string, commandName: string): boolean {
  if (EXCLUDED_COGS.has(cogName)) return true;
  const root = commandName.split(' ')[0]?.toLowerCase();
  if (EXCLUDED_COGS.has(root)) return true;
  if (cogName === 'misc' && EXCLUDED_MISC_COMMANDS.has(root)) return true;
  return false;
}

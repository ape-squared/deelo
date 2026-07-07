/** Cogs with full native + handler coverage for most commands. */
export const SUPPORTED_COGS = new Set([
  'moderation',
  'information',
  'fun',
  'roleplay',
  'music',
  'misc',
  'manipulation',
  'events',
  'antinuke',
  'antiraid',
  'starboard',
  'voicemaster',
  'autorole',
  'fortnite',
  'lastfm',
  'emoji',
  'bleedtickets',
  'tickets',
  'levels',
  'giveaways',
]);

/** Cogs with real commands for common actions; many catalog entries still coming soon. */
export const PARTIAL_COGS = new Set([
  'servers',
  'features',
  'integrations',
  'instagram',
  'twitter',
  'tiktok',
  'youtube',
  'twitch',
  'kick',
  'reddit',
  'soundcloud',
  'spotify',
  'counters',
  'bumpreminder',
  'alias',
  'crypto',
  'applications',
  'metrics',
  'monitor',
  'network',
  'clownboard',
  'pinterest',
  'reaction',
  'logs',
  'snipe',
  'timers',
]);

export type CommandImplementationStatus = 'supported' | 'partial' | 'coming-soon';

export function getCogImplementationStatus(cogName: string): CommandImplementationStatus {
  if (SUPPORTED_COGS.has(cogName)) return 'supported';
  if (PARTIAL_COGS.has(cogName)) return 'partial';
  return 'coming-soon';
}

export const COG_STATUS_LABEL: Record<CommandImplementationStatus, string> = {
  supported: 'Supported',
  partial: 'Partial',
  'coming-soon': 'Coming soon',
};

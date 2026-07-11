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
  'emoji',
  'bleedtickets',
  'tickets',
  'levels',
  'economy',
  'giveaways',
  'clownboard',
  'alias',
  'bumpreminder',
  'logs',
  'timers',
  'counters',
  'snipe',
  'reaction',
  'servers',
]);

/** Cogs with real commands for common actions; many catalog entries still coming soon. */
export const PARTIAL_COGS = new Set([
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
  'crypto',
  'applications',
  'metrics',
  'monitor',
  'network',
  'pinterest',
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

export interface FilterRow {
  id: number;
  guild_id: string;
  type: string;
  value: string;
  action: string;
  enabled: boolean;
}

export interface ResponderRow {
  id: number;
  guild_id: string;
  trigger: string;
  response: string;
  match_type: string;
  enabled: boolean;
}

export interface TicketPanelRow {
  id: number;
  guild_id: string;
  name: string;
  channel_id: string;
  message_id: string | null;
  category_id: string | null;
  support_role: string | null;
  form_json: unknown;
}

export interface LevelRewardRow {
  id: number;
  guild_id: string;
  level: number;
  role_id: string;
}

export interface CounterRow {
  id: number;
  guild_id: string;
  channel_id: string;
  type: string;
  format: string;
}

export interface SocialFeedRow {
  id: number;
  guild_id: string;
  platform: string;
  channel_id: string;
  username: string;
  last_post_id: string | null;
}

export interface VanityRoleRow {
  guild_id: string;
  vanity_string: string;
  role_id: string;
}

export interface ReactionTriggerRow {
  id: number;
  guild_id: string;
  trigger: string;
  emoji: string;
  match_type: string;
}

export interface CommandAliasRow {
  id: number;
  guild_id: string;
  alias: string;
  command: string;
}

export interface AutoroleRow {
  guild_id: string;
  role_id: string;
}

export interface ReactionRoleRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string;
  emoji: string;
  role_id: string;
}

export interface ButtonRoleRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string;
  label: string;
  role_id: string;
  style: string;
}

export interface EventToggleRow {
  event: string;
  enabled: boolean;
}

export interface GuildFullConfig {
  guild: import('@/lib/guild-settings').DashboardGuildSettings;
  subscription: { plan: string; status: string; expires_at: string | null } | null;
  eventToggles: EventToggleRow[];
  filters: FilterRow[];
  responders: ResponderRow[];
  ticketPanels: TicketPanelRow[];
  levelRewards: LevelRewardRow[];
  counters: CounterRow[];
  socialFeeds: SocialFeedRow[];
  vanityRoles: VanityRoleRow[];
  reactionTriggers: ReactionTriggerRow[];
  commandAliases: CommandAliasRow[];
  autoroles: AutoroleRow[];
  reactionRoles: ReactionRoleRow[];
  buttonRoles: ButtonRoleRow[];
  tickets: Array<{ id: number; channel_id: string; user_id: string; panel_name: string | null; status: string; created_at: string }>;
}

/** Common extra_config paths editable from dashboard */
export const EXTRA_CONFIG_FIELDS = [
  { key: 'starboard.emoji', label: 'Starboard emoji', type: 'text', placeholder: '⭐' },
  { key: 'levels.message', label: 'Level-up message', type: 'textarea', placeholder: 'GG {user}, you reached level {level}!' },
  { key: 'suggest.channel', label: 'Suggestions channel', type: 'channel' },
  { key: 'logs.join', label: 'Join log channel', type: 'channel' },
  { key: 'logs.leave', label: 'Leave log channel', type: 'channel' },
  { key: 'logs.message', label: 'Message log channel', type: 'channel' },
  { key: 'bumpreminder.message', label: 'Bump reminder message', type: 'textarea' },
] as const;

export const KNOWN_EVENTS = [
  { id: 'snipe', label: 'Snipe', desc: 'Show deleted/edited messages' },
  { id: 'levels', label: 'Levels', desc: 'XP and leveling system' },
  { id: 'afk', label: 'AFK', desc: 'AFK status commands' },
  { id: 'autoresponder', label: 'Auto-responders', desc: 'Trigger-based auto replies' },
  { id: 'reactiontrigger', label: 'Reaction triggers', desc: 'React to trigger messages' },
] as const;

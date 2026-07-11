export type PlanTier = 'free' | 'premium' | 'premium_plus';

export interface PlanLimits {
  maxPurgeAmount: number;
  maxAutoResponders: number;
  maxReactionTriggers: number;
  maxReactionRolePanels: number;
  maxCounters: number;
  maxConcurrentGiveaways: number;
  maxMusicQueue: number;
  maxTicketPanels: number;
  maxFilters: number;
  maxBumpReminders: number;
  maxStarboardChannels: number;
  maxSavedEmbeds: number;
}

export interface PlanFeatures {
  // Moderation
  moderation: boolean;
  advancedModeration: boolean;
  purge: boolean;
  slowmode: boolean;
  lock: boolean;
  unlock: boolean;
  hide: boolean;
  unhide: boolean;
  nuke: boolean;
  role: boolean;
  nickname: boolean;
  history: boolean;
  case: boolean;

  // Security
  antinuke: boolean;
  antiraid: boolean;
  fakePermissions: boolean;
  automod: boolean;
  advancedFilters: boolean;

  // Utility
  snipe: boolean;
  editsnipe: boolean;
  reactionsnipe: boolean;
  afk: boolean;
  translate: boolean;
  tts: boolean;
  search: boolean;
  imageManipulation: boolean;
  backgroundRemoval: boolean;
  makegif: boolean;

  // Engagement
  levels: boolean;
  levelRewards: boolean;
  giveaways: boolean;
  games: boolean;
  starboard: boolean;

  // Roles
  reactionRoles: boolean;
  buttonRoles: boolean;
  boosterRoles: boolean;
  vanityRoles: boolean;

  // Config
  welcome: boolean;
  goodbye: boolean;
  logging: boolean;
  autoResponders: boolean;
  reactionTriggers: boolean;
  autoMessages: boolean;
  bumpReminder: boolean;
  counters: boolean;
  commandAliases: boolean;

  // Voice
  voicemaster: boolean;
  voicemasterGhost: boolean;
  voicemasterMusic: boolean;

  // Tickets
  tickets: boolean;
  ticketForms: boolean;
  ticketStats: boolean;

  // Music
  music: boolean;
  musicFilters: boolean;

  // Integrations
  socialNotifications: boolean;
  fortnite: boolean;

  // Premium extras
  chatgpt: boolean;
  cleverbot: boolean;
  webhook: boolean;
  embedScripting: boolean;
  customPrefix: boolean;
  earlyAccess: boolean;
}

const FREE_LIMITS: PlanLimits = {
  maxPurgeAmount: 100,
  maxAutoResponders: 3,
  maxReactionTriggers: 5,
  maxReactionRolePanels: 1,
  maxCounters: 3,
  maxConcurrentGiveaways: 1,
  maxMusicQueue: 25,
  maxTicketPanels: 0,
  maxFilters: 5,
  maxBumpReminders: 1,
  maxStarboardChannels: 0,
  maxSavedEmbeds: 5,
};

const PREMIUM_LIMITS: PlanLimits = {
  maxPurgeAmount: 1000,
  maxAutoResponders: 50,
  maxReactionTriggers: 50,
  maxReactionRolePanels: 20,
  maxCounters: 20,
  maxConcurrentGiveaways: 10,
  maxMusicQueue: 500,
  maxTicketPanels: 10,
  maxFilters: 50,
  maxBumpReminders: 5,
  maxStarboardChannels: 3,
  maxSavedEmbeds: 50,
};

const PREMIUM_PLUS_LIMITS: PlanLimits = {
  ...PREMIUM_LIMITS,
  maxAutoResponders: 100,
  maxReactionTriggers: 100,
  maxReactionRolePanels: 50,
  maxCounters: 50,
  maxConcurrentGiveaways: 25,
  maxMusicQueue: 1000,
  maxTicketPanels: 25,
  maxFilters: 100,
  maxStarboardChannels: 10,
  maxSavedEmbeds: 100,
};

const FREE_FEATURES: PlanFeatures = {
  moderation: true,
  advancedModeration: false,
  purge: true,
  slowmode: true,
  lock: true,
  unlock: true,
  hide: false,
  unhide: false,
  nuke: false,
  role: true,
  nickname: true,
  history: true,
  case: true,
  antinuke: false,
  antiraid: false,
  fakePermissions: false,
  automod: true,
  advancedFilters: false,
  snipe: true,
  editsnipe: true,
  reactionsnipe: false,
  afk: true,
  translate: true,
  tts: false,
  search: true,
  imageManipulation: false,
  backgroundRemoval: false,
  makegif: false,
  levels: true,
  levelRewards: false,
  giveaways: true,
  games: true,
  starboard: false,
  reactionRoles: true,
  buttonRoles: false,
  boosterRoles: false,
  vanityRoles: false,
  welcome: true,
  goodbye: true,
  logging: false,
  autoResponders: true,
  reactionTriggers: false,
  autoMessages: false,
  bumpReminder: true,
  counters: true,
  commandAliases: false,
  voicemaster: true,
  voicemasterGhost: false,
  voicemasterMusic: false,
  tickets: false,
  ticketForms: false,
  ticketStats: false,
  music: true,
  musicFilters: false,
  socialNotifications: false,
  fortnite: false,
  chatgpt: false,
  cleverbot: false,
  webhook: false,
  embedScripting: false,
  customPrefix: false,
  earlyAccess: false,
};

const PREMIUM_FEATURES: PlanFeatures = {
  ...FREE_FEATURES,
  advancedModeration: true,
  hide: true,
  unhide: true,
  nuke: true,
  antinuke: true,
  antiraid: true,
  fakePermissions: true,
  advancedFilters: true,
  reactionsnipe: true,
  tts: true,
  imageManipulation: true,
  levelRewards: true,
  starboard: true,
  buttonRoles: true,
  boosterRoles: true,
  vanityRoles: true,
  logging: true,
  reactionTriggers: true,
  autoMessages: true,
  commandAliases: true,
  voicemasterGhost: true,
  voicemasterMusic: true,
  tickets: true,
  ticketForms: true,
  ticketStats: true,
  musicFilters: true,
  socialNotifications: true,
  fortnite: true,
  chatgpt: true,
  cleverbot: true,
  webhook: true,
  embedScripting: true,
  customPrefix: true,
};

const PREMIUM_PLUS_FEATURES: PlanFeatures = {
  ...PREMIUM_FEATURES,
  backgroundRemoval: true,
  makegif: true,
  earlyAccess: true,
};

export const PLANS: Record<PlanTier, { name: string; price: string; limits: PlanLimits; features: PlanFeatures }> = {
  free: {
    name: 'Free',
    price: '$0',
    limits: FREE_LIMITS,
    features: FREE_FEATURES,
  },
  premium: {
    name: 'Premium',
    price: '$5/mo',
    limits: PREMIUM_LIMITS,
    features: PREMIUM_FEATURES,
  },
  premium_plus: {
    name: 'Premium+',
    price: '$10/mo',
    limits: PREMIUM_PLUS_LIMITS,
    features: PREMIUM_PLUS_FEATURES,
  },
};

export function getPlanFeatures(tier: PlanTier): PlanFeatures {
  return PLANS[tier].features;
}

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLANS[tier].limits;
}

export function hasFeature(tier: PlanTier, feature: keyof PlanFeatures): boolean {
  return PLANS[tier].features[feature];
}

export function getLimit(tier: PlanTier, limit: keyof PlanLimits): number {
  return PLANS[tier].limits[limit];
}

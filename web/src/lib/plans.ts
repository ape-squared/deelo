export type PlanTier = 'free' | 'premium' | 'premium_plus';

export const PLANS = {
  free: {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to get started — no trial, no time limit.',
    highlights: [
      '100+ moderation commands',
      'Levels & XP leaderboard',
      'Music queue (25 tracks)',
      'Snipe, AFK & utilities',
      '1 active giveaway',
      'Web dashboard access',
    ],
  },
  premium: {
    name: 'Premium',
    price: '$5',
    period: '/month',
    description: 'Replace your paid bot stack for less than one premium bot.',
    highlights: [
      'Anti-nuke & anti-raid',
      'Tickets & starboard',
      'Social feed integrations',
      'ChatGPT & TTS commands',
      'Custom prefix & bot appearance',
      'Music filters & Spotify',
    ],
  },
  premium_plus: {
    name: 'Premium+',
    price: '$10',
    period: '/month',
    description: 'Maximum power for large servers that need every edge.',
    highlights: [
      'Everything in Premium',
      'Early access features',
      'Background removal',
      'Higher embed & limit caps',
      'Priority support',
      'Best for 5k+ members',
    ],
  },
} as const;

/** Typical monthly cost when stacking popular single-purpose bots */
export const TYPICAL_STACK_COST = {
  monthly: 27,
  bots: ['MEE6', 'Dyno', 'Carl-bot', 'Ticket Tool', 'ProBot'],
  label: '$27+/mo',
};

export const PRICING_STATS = [
  { label: 'Deelo Premium', value: '$5/mo' },
  { label: 'Typical bot stack', value: '$27+/mo' },
  { label: 'You save', value: '~80%' },
  { label: 'Commands included', value: '1,144+' },
];

export const BOT_STACK_ROWS = [
  {
    feature: 'Moderation & cases',
    deelo: true,
    mee6: true,
    dyno: true,
    carl: true,
    ticketTool: false,
    musicBot: false,
  },
  {
    feature: 'Levels & XP',
    deelo: true,
    mee6: true,
    dyno: false,
    carl: false,
    ticketTool: false,
    musicBot: false,
  },
  {
    feature: 'Music & voice',
    deelo: true,
    mee6: false,
    dyno: false,
    carl: false,
    ticketTool: false,
    musicBot: true,
  },
  {
    feature: 'Tickets & panels',
    deelo: true,
    mee6: false,
    dyno: false,
    carl: false,
    ticketTool: true,
    musicBot: false,
  },
  {
    feature: 'Starboard',
    deelo: true,
    mee6: false,
    dyno: false,
    carl: true,
    ticketTool: false,
    musicBot: false,
  },
  {
    feature: 'Anti-nuke & anti-raid',
    deelo: true,
    mee6: false,
    dyno: 'partial' as const,
    carl: false,
    ticketTool: false,
    musicBot: false,
  },
  {
    feature: 'Social feed integrations',
    deelo: true,
    mee6: false,
    dyno: false,
    carl: false,
    ticketTool: false,
    musicBot: false,
  },
  {
    feature: 'Unified web dashboard',
    deelo: true,
    mee6: 'partial' as const,
    dyno: 'partial' as const,
    carl: false,
    ticketTool: 'partial' as const,
    musicBot: false,
  },
  {
    feature: 'One prefix, one bot',
    deelo: true,
    mee6: false,
    dyno: false,
    carl: false,
    ticketTool: false,
    musicBot: false,
  },
];

export const BOT_STACK_COLUMNS = [
  { key: 'deelo', label: 'Deelo', highlight: true as const, price: '$5/mo' },
  { key: 'mee6', label: 'MEE6', highlight: false as const, price: '~$12/mo' },
  { key: 'dyno', label: 'Dyno', highlight: false as const, price: '~$5/mo' },
  { key: 'carl', label: 'Carl-bot', highlight: false as const, price: '~$4/mo' },
  { key: 'ticketTool', label: 'Ticket Tool', highlight: false as const, price: '~$6/mo' },
  { key: 'musicBot', label: 'Music bot', highlight: false as const, price: '~$0–5/mo' },
] as const;

export type FeatureMatrixValue = boolean | string;

export const FEATURE_MATRIX = [
  { feature: 'Moderation & case system', free: true, premium: true, premium_plus: true },
  { feature: 'Levels & XP', free: true, premium: true, premium_plus: true },
  { feature: 'Music & queue', free: '25 tracks', premium: 'Unlimited + filters', premium_plus: 'Unlimited + filters' },
  { feature: 'Web dashboard', free: true, premium: true, premium_plus: true },
  { feature: 'Giveaways', free: '1 active', premium: 'Unlimited', premium_plus: 'Unlimited' },
  { feature: 'Anti-nuke & anti-raid', free: false, premium: true, premium_plus: true },
  { feature: 'Tickets & starboard', free: false, premium: true, premium_plus: true },
  { feature: 'Social feeds (X, TikTok, etc.)', free: false, premium: true, premium_plus: true },
  { feature: 'ChatGPT & TTS', free: false, premium: true, premium_plus: true },
  { feature: 'Custom prefix', free: false, premium: true, premium_plus: true },
  { feature: 'Bot appearance customization', free: false, premium: true, premium_plus: true },
  { feature: 'Background removal', free: false, premium: false, premium_plus: true },
  { feature: 'Early access features', free: false, premium: false, premium_plus: true },
  { feature: 'Priority support', free: false, premium: false, premium_plus: true },
];

export const SWITCH_BENEFITS = [
  {
    title: 'Cut your bot bill',
    description: 'Most servers pay for MEE6, a ticket bot, and a music bot separately. Deelo Premium covers all of it for $5/mo.',
  },
  {
    title: 'One dashboard',
    description: 'Stop jumping between five websites to configure welcome messages, mod logs, tickets, and levels. Everything lives in one place.',
  },
  {
    title: 'One prefix to learn',
    description: 'Members use comma (,) for everything — moderation, music, levels, tickets. No more guessing which bot handles what.',
  },
  {
    title: 'Free tier that actually works',
    description: 'No 14-day trial games. Deelo Free includes real moderation, music, levels, and 1,144 commands with no expiration.',
  },
];

export const MIGRATION_STEPS = [
  {
    step: '1',
    title: 'Invite Deelo',
    description: 'Add Deelo alongside your existing bots. Nothing breaks — configure modules at your own pace.',
  },
  {
    step: '2',
    title: 'Configure in the dashboard',
    description: 'Set up moderation, welcome, levels, and tickets from the web dashboard. Changes sync live to Discord.',
  },
  {
    step: '3',
    title: 'Remove the old stack',
    description: 'Once you\'re happy, kick the bots you no longer need. Most servers end up running Deelo alone.',
  },
];

export const PRICING_FAQ = [
  {
    q: 'Can Deelo really replace MEE6, Dyno, and Ticket Tool?',
    a: 'For most servers, yes. Deelo bundles moderation, levels, music, tickets, starboard, automod, and 1,144 commands in one bot with a unified dashboard. You get comparable features without paying for three or four separate subscriptions.',
  },
  {
    q: 'Is the free plan actually free forever?',
    a: 'Yes. No credit card, no trial countdown. Free includes moderation, levels, music, snipe, giveaways, and full dashboard access. Premium unlocks advanced security, tickets, social feeds, and AI commands.',
  },
  {
    q: 'How do I upgrade or redeem a code?',
    a: 'Open the dashboard, select your server, and go to Plan settings. Enter a redeem code or contact staff for subscription grants. Upgrades apply instantly.',
  },
  {
    q: 'What happens if I downgrade?',
    a: 'Premium features turn off at the end of your billing period. Your server data and settings are kept — re-upgrade anytime to restore access.',
  },
  {
    q: 'Do I need Premium for a serious moderation setup?',
    a: 'Free covers bans, kicks, mutes, warnings, cases, automod basics, and logging commands. Premium adds anti-nuke, anti-raid, mod log channels, tickets, and starboard — recommended for servers above ~500 members.',
  },
  {
    q: 'Can I switch without downtime?',
    a: 'Absolutely. Invite Deelo first, configure modules, then remove old bots when ready. Many servers run both during a transition week.',
  },
];

export const FEATURE_SECTIONS = [
  {
    title: 'Moderation & Security',
    description: 'Keep your community safe with automated filters, anti-nuke, anti-raid, and 100+ mod commands.',
    tags: ['Filters', 'Anti-Nuke', 'Anti-Raid', 'Fake Permissions', 'Case System'],
  },
  {
    title: 'Integrations',
    description: 'Connect Last.fm, Spotify, Instagram, X, TikTok, YouTube, Twitch, and more.',
    tags: ['Last.fm', 'Spotify', 'Social Feeds', 'Notifications'],
  },
  {
    title: 'Voicemaster',
    description: 'Temporary voice channels with ghost mode, limits, roles, and a built-in interface.',
    tags: ['Join to Create', 'Ghost', 'Music Channels', 'Transfer'],
  },
  {
    title: 'Music',
    description: 'Queue, filters, presets, and Spotify integration for premium servers.',
    tags: ['Queue', 'Presets', 'Spotify', 'Volume Control'],
  },
  {
    title: 'Engagement',
    description: 'Levels, giveaways, games, starboard, bump reminders, and auto responders.',
    tags: ['Levels', 'Giveaways', 'Starboard', 'Counters'],
  },
];

export const STATS = [
  { label: 'Commands', value: '1,144+' },
  { label: 'Categories', value: '36' },
  { label: 'Integrations', value: '12+' },
  { label: 'Uptime', value: '99.9%' },
];

export { getInviteUrl } from './invite';

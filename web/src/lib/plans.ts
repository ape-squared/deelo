export type PlanTier = 'free' | 'premium' | 'premium_plus';

export const PLANS = {
  free: {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to get started.',
    highlights: ['Basic moderation', 'Levels & XP', 'Snipe & utility', '1 giveaway at a time', 'Music queue (25)'],
  },
  premium: {
    name: 'Premium',
    price: '$5',
    period: '/month',
    description: 'Advanced tools for growing communities.',
    highlights: ['Anti-nuke & anti-raid', 'Tickets & starboard', 'Social feeds', 'ChatGPT & TTS', 'Music filters & Spotify'],
  },
  premium_plus: {
    name: 'Premium+',
    price: '$10',
    period: '/month',
    description: 'Maximum power for large servers.',
    highlights: ['Everything in Premium', 'Early access features', 'Background removal', 'Higher limits', 'Priority support'],
  },
} as const;

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

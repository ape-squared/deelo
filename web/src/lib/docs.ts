export type DocsBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; id: string; text: string }
  | { type: 'h3'; id: string; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; variant?: 'info' | 'warn' | 'tip'; text: string }
  | { type: 'code'; language?: string; code: string }
  | { type: 'steps'; items: { title: string; body: string }[] }
  | { type: 'cards'; items: { title: string; description: string; href: string }[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface DocsPage {
  slug: string[];
  title: string;
  description: string;
  section: string;
  blocks: DocsBlock[];
}

export interface DocsNavItem {
  title: string;
  href: string;
}

export interface DocsNavGroup {
  title: string;
  items: DocsNavItem[];
}

function page(
  slug: string,
  title: string,
  description: string,
  section: string,
  blocks: DocsBlock[],
): DocsPage {
  return { slug: slug.split('/').filter(Boolean), title, description, section, blocks };
}

export const DOCS_NAV: DocsNavGroup[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Introduction', href: '/docs/overview/introduction' },
      { title: 'Getting Started', href: '/docs/overview/getting-started' },
      { title: 'Premium', href: '/docs/overview/premium' },
      { title: 'Dashboard', href: '/docs/overview/dashboard' },
    ],
  },
  {
    title: 'Security',
    items: [
      { title: 'Antinuke', href: '/docs/security/antinuke' },
      { title: 'Antiraid', href: '/docs/security/antiraid' },
      { title: 'Moderation', href: '/docs/security/moderation' },
      { title: 'Automod', href: '/docs/security/automod' },
    ],
  },
  {
    title: 'Server Setup',
    items: [
      { title: 'Welcome & Goodbye', href: '/docs/configuration/welcome' },
      { title: 'Logging', href: '/docs/configuration/logging' },
      { title: 'Tickets', href: '/docs/configuration/tickets' },
      { title: 'Roles', href: '/docs/configuration/roles' },
      { title: 'Starboard', href: '/docs/configuration/starboard' },
      { title: 'VoiceMaster', href: '/docs/configuration/voicemaster' },
      { title: 'Levels', href: '/docs/configuration/levels' },
      { title: 'Command Aliases', href: '/docs/configuration/aliases' },
    ],
  },
  {
    title: 'Features',
    items: [
      { title: 'Music', href: '/docs/features/music' },
      { title: 'Giveaways', href: '/docs/features/giveaways' },
      { title: 'Utility', href: '/docs/features/utility' },
    ],
  },
    {
      title: 'Integrations',
      items: [
        { title: 'Last.fm', href: '/docs/integrations/lastfm' },
        { title: 'Social Feeds', href: '/docs/integrations/social' },
        { title: 'Fortnite', href: '/docs/integrations/fortnite' },
        { title: 'Second Life', href: '/docs/integrations/secondlife' },
        { title: 'ChatGPT', href: '/docs/integrations/chatgpt' },
        { title: 'Text-to-Speech', href: '/docs/integrations/tts' },
      ],
    },
  {
    title: 'Resources',
    items: [
      { title: 'Prefix & Syntax', href: '/docs/resources/syntax' },
      { title: 'Permissions', href: '/docs/resources/permissions' },
      { title: 'Commands', href: '/docs/resources/commands' },
      { title: 'Common Issues', href: '/docs/resources/common-issues' },
    ],
  },
];

export const DOCS_PAGES: DocsPage[] = [
  page(
    'overview/introduction',
    'Introduction',
    'Learn how to set up Deelo in your server or enhance everyday use with commands & more.',
    'Overview',
    [
      {
        type: 'callout',
        variant: 'info',
        text: 'Server prefix is set to `,` by default. Use `,prefix set <symbol>` to change it for your server (Premium).',
      },
      { type: 'h2', id: 'guides', text: 'Guides' },
      { type: 'p', text: 'Pick a path based on what you want to set up first. Most servers start with moderation and welcome messages, then layer on levels, tickets, and music.' },
      {
        type: 'cards',
        items: [
          { title: 'Security Setup', description: 'Antinuke, antiraid, moderation, and automod.', href: '/docs/security/antinuke' },
          { title: 'Server Configuration', description: 'Welcome, logs, tickets, roles, VoiceMaster, and levels.', href: '/docs/configuration/welcome' },
          { title: 'Integrations', description: 'Last.fm, social feeds, Fortnite shop, and more.', href: '/docs/integrations/lastfm' },
          { title: 'Getting Started', description: 'Invite Deelo and configure your first server.', href: '/docs/overview/getting-started' },
        ],
      },
      { type: 'h2', id: 'what-is-deelo', text: 'What is Deelo?' },
      {
        type: 'p',
        text: 'Deelo is an all-in-one Discord bot for moderation, music, levels, tickets, security, and community tools — one prefix, one dashboard, and 1,144+ commands.',
      },
      {
        type: 'ul',
        items: [
          'Default prefix: `,` (comma)',
          'Web dashboard for live guild configuration',
          'Free plan with real moderation, music, and levels — no trial expiry',
          'Premium unlocks antinuke, tickets, social feeds, custom prefix, and more',
        ],
      },
    ],
  ),
  page(
    'overview/getting-started',
    'Getting Started',
    'Invite Deelo, set permissions, and configure your first modules.',
    'Overview',
    [
      { type: 'h2', id: 'invite', text: '1. Invite Deelo' },
      {
        type: 'p',
        text: 'Use Add to Discord from the website or dashboard. Grant Manage Server (or Administrator) so Deelo can create channels, manage roles, and moderate members.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Place Deelo’s role above roles it needs to assign or moderate. Discord only lets bots manage roles below their highest role.',
      },
      { type: 'h2', id: 'first-commands', text: '2. Try your first commands' },
      {
        type: 'code',
        language: 'bash',
        code: ',help\n,ping\n,prefix\n,ban @user spam\n,play never gonna give you up',
      },
      { type: 'h2', id: 'dashboard', text: '3. Open the dashboard' },
      {
        type: 'p',
        text: 'Sign in at /dashboard, select your server, and toggle modules. Changes sync live to Discord — no restart required.',
      },
      {
        type: 'steps',
        items: [
          { title: 'Invite', body: 'Add Deelo with the permissions your modules need.' },
          { title: 'Configure', body: 'Set welcome, logs, and moderation from the dashboard or prefix commands.' },
          { title: 'Invite members', body: 'Share `,help` so your community learns the comma prefix.' },
        ],
      },
    ],
  ),
  page(
    'overview/premium',
    'Premium',
    'What Free, Premium, and Premium+ unlock.',
    'Overview',
    [
      { type: 'h2', id: 'plans', text: 'Plans' },
      {
        type: 'table',
        headers: ['Plan', 'Price', 'Best for'],
        rows: [
          ['Free', '$0 forever', 'Getting started with moderation, music, and levels'],
          ['Premium', '$5/mo', 'Replacing a paid bot stack'],
          ['Premium+', '$10/mo', 'Large servers that need every limit raised'],
        ],
      },
      { type: 'h2', id: 'premium-features', text: 'Premium highlights' },
      {
        type: 'ul',
        items: [
          'Antinuke & antiraid',
          'Tickets & starboard',
          'Social feed integrations',
          'ChatGPT & TTS commands',
          'Custom prefix & bot appearance',
          'Music filters & Spotify playlists',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Redeem codes from the dashboard Pricing / Redeem flow. Ask in Discord support if a code fails.',
      },
      { type: 'p', text: 'See full pricing comparisons on the /pricing page.' },
    ],
  ),
  page(
    'overview/dashboard',
    'Dashboard',
    'Configure modules from the web without fighting Discord settings menus.',
    'Overview',
    [
      { type: 'h2', id: 'access', text: 'Access' },
      {
        type: 'p',
        text: 'Open /dashboard and sign in with Discord. You need Manage Guild (or Administrator) on a server where Deelo is present.',
      },
      { type: 'h2', id: 'modules', text: 'Modules' },
      {
        type: 'ul',
        items: [
          'Overview — plan, prefix, and quick toggles',
          'Welcome / goodbye — multi-message flows',
          'Moderation — automod, antinuke, antiraid, logs',
          'Levels, tickets, VoiceMaster, giveaways, and more',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Module toggles disable features without deleting your saved config, so you can re-enable later.',
      },
    ],
  ),
  page(
    'security/antinuke',
    'Antinuke',
    'Impose restrictions on moderators to prevent destructive behavior.',
    'Security',
    [
      {
        type: 'callout',
        variant: 'warn',
        text: 'Antinuke is a Premium feature. Enable it from the dashboard or with `,antinuke`.',
      },
      { type: 'h2', id: 'overview', text: 'Overview' },
      {
        type: 'p',
        text: 'Antinuke watches for mass bans, kicks, channel deletes, role wipes, and similar nuke patterns. When thresholds are hit, Deelo can strip permissions or remove the offender.',
      },
      { type: 'h2', id: 'setup', text: 'Setup' },
      {
        type: 'ol',
        items: [
          'Enable antinuke in the dashboard Moderation module (or `,antinuke`).',
          'Set thresholds that match your staff size — too low causes false positives.',
          'Whitelist trusted bots and owners so legitimate admin work is not blocked.',
          'Ensure Deelo’s role is high enough to punish offenders.',
        ],
      },
      {
        type: 'code',
        language: 'bash',
        code: ',antinuke\n,antinuke whitelist @TrustedAdmin\n,help antinuke',
      },
    ],
  ),
  page(
    'security/antiraid',
    'Antiraid',
    'Slow or stop join floods from automated accounts.',
    'Security',
    [
      { type: 'h2', id: 'overview', text: 'Overview' },
      {
        type: 'p',
        text: 'Antiraid detects rapid joins and can lock down the server, kick new accounts, or require verification until the flood stops.',
      },
      { type: 'h2', id: 'tips', text: 'Tips' },
      {
        type: 'ul',
        items: [
          'Tune join rate thresholds for your normal growth.',
          'Pair with automod invite filters during raids.',
          'Keep a staff-only channel for raid alerts.',
        ],
      },
      {
        type: 'code',
        language: 'bash',
        code: ',antiraid\n,help antiraid',
      },
    ],
  ),
  page(
    'security/moderation',
    'Moderation',
    'Ban, kick, mute, warn, purge, and case history.',
    'Security',
    [
      { type: 'h2', id: 'core-commands', text: 'Core commands' },
      {
        type: 'code',
        language: 'bash',
        code: ',ban @user [reason]\n,kick @user [reason]\n,mute @user 1h [reason]\n,warn @user [reason]\n,purge 50\n,cases @user',
      },
      { type: 'h2', id: 'best-practices', text: 'Best practices' },
      {
        type: 'ul',
        items: [
          'Always include a reason — it shows in logs and cases.',
          'Use timeouts (`,mute`) for temporary issues instead of bans.',
          'Configure a mod-log channel so actions are auditable.',
        ],
      },
      { type: 'p', text: 'Browse the full moderation list on /commands under Moderation.' },
    ],
  ),
  page(
    'security/automod',
    'Automod',
    'Filter spam, invites, links, and bad words automatically.',
    'Security',
    [
      { type: 'h2', id: 'overview', text: 'Overview' },
      {
        type: 'p',
        text: 'Automod watches messages for invites, mass mentions, banned words, and other patterns. Configure filters from the dashboard or related commands.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Whitelist staff roles and bot channels so legitimate announcements are not deleted.',
      },
      {
        type: 'ul',
        items: [
          'Invite & link filters',
          'Spam / flood detection',
          'Word blacklists',
          'Optional punishments (delete, mute, warn)',
        ],
      },
    ],
  ),
  page(
    'configuration/welcome',
    'Welcome & Goodbye',
    'Greet new members and say goodbye when they leave.',
    'Server Setup',
    [
      { type: 'h2', id: 'setup', text: 'Setup' },
      {
        type: 'p',
        text: 'Configure welcome and goodbye from the dashboard Welcome module. Deelo supports multi-message flows so you can send a channel greeting plus a DM.',
      },
      {
        type: 'code',
        language: 'bash',
        code: ',welcome\n,goodbye',
      },
      { type: 'h2', id: 'tips', text: 'Tips' },
      {
        type: 'ul',
        items: [
          'Mention rules and roles in the first welcome message.',
          'Keep DMs short — many users disable them.',
          'Test with an alt account after changing templates.',
        ],
      },
    ],
  ),
  page(
    'configuration/logging',
    'Logging',
    'Send moderation and server events to dedicated log channels.',
    'Server Setup',
    [
      { type: 'h2', id: 'setup', text: 'Setup' },
      {
        type: 'p',
        text: 'Point event categories (moderation, messages, members, voice, etc.) at channels from the dashboard Logs module or `,log` commands.',
      },
      {
        type: 'code',
        language: 'bash',
        code: ',log add #mod-logs moderation\n,log list\n,help log',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Use separate channels for message deletes vs. mod actions so staff can scan quickly.',
      },
    ],
  ),
  page(
    'configuration/tickets',
    'Tickets',
    'Private support channels for reports, appeals, and applications.',
    'Server Setup',
    [
      {
        type: 'callout',
        variant: 'warn',
        text: 'Tickets are a Premium feature.',
      },
      { type: 'h2', id: 'overview', text: 'Overview' },
      {
        type: 'p',
        text: 'Create panels members click to open private ticket channels. Staff claim, close, and transcript tickets from Discord or the dashboard.',
      },
      {
        type: 'steps',
        items: [
          { title: 'Create a panel', body: 'Define categories (support, report, appeal) and the channel where the panel posts.' },
          { title: 'Set staff roles', body: 'Only ticket staff should see open tickets.' },
          { title: 'Publish', body: 'Post the panel and test opening/closing a ticket.' },
        ],
      },
      {
        type: 'code',
        language: 'bash',
        code: ',ticket\n,help ticket',
      },
    ],
  ),
  page(
    'configuration/roles',
    'Roles',
    'Reaction roles, button roles, and vanity rewards.',
    'Server Setup',
    [
      { type: 'h2', id: 'self-roles', text: 'Self-assign roles' },
      {
        type: 'p',
        text: 'Let members pick roles by reacting to a message or clicking buttons. Keep Deelo’s role above the roles it assigns.',
      },
      {
        type: 'code',
        language: 'bash',
        code: ',role\n,help reaction\n,help button',
      },
      { type: 'h2', id: 'vanity', text: 'Vanity / booster roles' },
      {
        type: 'p',
        text: 'Reward members who advertise your vanity URL in their status, or give boosters a unique role.',
      },
    ],
  ),
  page(
    'configuration/starboard',
    'Starboard',
    'Repost highly reacted messages to a highlight channel.',
    'Server Setup',
    [
      { type: 'h2', id: 'setup', text: 'Setup' },
      {
        type: 'ol',
        items: [
          'Create a #starboard (or #highlights) channel.',
          'Set the channel and reaction threshold.',
          'Optionally configure clownboard for negative reactions.',
        ],
      },
      {
        type: 'code',
        language: 'bash',
        code: ',starboard set #starboard\n,starboard threshold 5\n,starboard config',
      },
    ],
  ),
  page(
    'configuration/voicemaster',
    'VoiceMaster',
    'Join-to-create temporary voice channels members can customize.',
    'Server Setup',
    [
      { type: 'h2', id: 'setup', text: 'Setup' },
      {
        type: 'p',
        text: 'Designate a join channel. When a member joins it, Deelo creates a personal voice channel they can rename, lock, or limit.',
      },
      {
        type: 'code',
        language: 'bash',
        code: ',voicemaster\n,help voicemaster',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Ghost / invisible owner features may require Premium depending on your plan.',
      },
    ],
  ),
  page(
    'configuration/levels',
    'Levels',
    'XP, leaderboards, and level-up rewards.',
    'Server Setup',
    [
      { type: 'h2', id: 'overview', text: 'Overview' },
      {
        type: 'p',
        text: 'Members earn XP from chatting. Configure multipliers, level-up messages, and role rewards from the dashboard or `,levels` commands.',
      },
      {
        type: 'code',
        language: 'bash',
        code: ',rank\n,leaderboard\n,levels setrate 1.5\n,levels message',
      },
    ],
  ),
  page(
    'configuration/aliases',
    'Command Aliases',
    'Create guild shortcuts that map to other commands.',
    'Server Setup',
    [
      { type: 'h2', id: 'overview', text: 'Overview' },
      {
        type: 'p',
        text: 'Aliases let you map short names to longer commands — for example `,b` → `ban` or `,np` → `lastfm nowplaying`. Configure them in the dashboard or with alias commands.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Aliases are per-server and resolve before native command matching.',
      },
    ],
  ),
  page(
    'features/music',
    'Music',
    'Play tracks in voice channels with queues, filters, and playlists.',
    'Features',
    [
      { type: 'h2', id: 'basics', text: 'Basics' },
      {
        type: 'code',
        language: 'bash',
        code: ',play <query or url>\n,skip\n,queue\n,pause\n,resume\n,stop\n,nowplaying',
      },
      { type: 'h2', id: 'tips', text: 'Tips' },
      {
        type: 'ul',
        items: [
          'Join a voice channel before `,play`.',
          'Free plan includes a queue; Premium unlocks filters and Spotify.',
          'Use `,stream <url>` for live radio / continuous streams.',
        ],
      },
    ],
  ),
  page(
    'features/giveaways',
    'Giveaways',
    'Run timed prize drops with reaction or button entry.',
    'Features',
    [
      {
        type: 'code',
        language: 'bash',
        code: ',giveaway start 1d 1 Nitro\n,giveaway end\n,giveaway reroll',
      },
      {
        type: 'p',
        text: 'Free servers get limited concurrent giveaways; Premium raises caps. Always announce rules and eligibility in the prize description.',
      },
    ],
  ),
  page(
    'features/utility',
    'Utility',
    'Snipe, AFK, polls, translate, and everyday helpers.',
    'Features',
    [
      {
        type: 'code',
        language: 'bash',
        code: ',snipe\n,afk [reason]\n,poll Question | Option A | Option B\n,avatar @user\n,help',
      },
      {
        type: 'p',
        text: 'See the full utility catalog on /commands.',
      },
    ],
  ),
  page(
    'integrations/lastfm',
    'Last.fm',
    'Share what you are listening to with `,lastfm` / `,lfm`.',
    'Integrations',
    [
      {
        type: 'code',
        language: 'bash',
        code: ',lastfm set <username>\n,lastfm nowplaying\n,lfm np',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Last.fm is a Premium integration. Live now-playing needs LASTFM_API_KEY configured on the bot host.',
      },
    ],
  ),
  page(
    'integrations/social',
    'Social Feeds',
    'Announce new posts from YouTube, Twitch, TikTok, Reddit, and more.',
    'Integrations',
    [
      {
        type: 'callout',
        variant: 'warn',
        text: 'Social notifications are a Premium feature.',
      },
      {
        type: 'code',
        language: 'bash',
        code: ',social add youtube #announcements channelname\n,social add twitch #live streamer\n,social list\n,social remove youtube channelname',
      },
      {
        type: 'p',
        text: 'Supported platforms include Instagram, Twitter/X, TikTok, YouTube, Twitch, SoundCloud, Reddit, Kick, and Pinterest.',
      },
    ],
  ),
  page(
    'integrations/fortnite',
    'Fortnite',
    'Item shop rotations, cosmetic lookup, and watch lists.',
    'Integrations',
    [
      {
        type: 'code',
        language: 'bash',
        code: ',fortnite shop\n,fortnite item <skin name>\n,fortnite shop #channel\n,fortnite watch <item>',
      },
      {
        type: 'p',
        text: 'Auto-post shop rotations to a channel and optionally ping a role when the shop refreshes.',
      },
    ],
  ),
  page(
    'integrations/secondlife',
    'Second Life',
    'Live grid stats and LindeX exchange data from Linden Lab feeds.',
    'Integrations',
    [
      {
        type: 'code',
        language: 'bash',
        code: ',secondlife\n,linden\n,secondlife lindex\n,sl',
      },
      {
        type: 'p',
        text: 'Shows grid online status, residents in-world, total signups, L$ exchange rate, and LindeX market buy/sell volumes. Data comes from official Linden Lab live data feeds — no API key required.',
      },
    ],
  ),
  page(
    'integrations/chatgpt',
    'ChatGPT',
    'Ask questions with conversation memory in Discord.',
    'Integrations',
    [
      {
        type: 'callout',
        variant: 'warn',
        text: 'ChatGPT is Premium. Prefer `PUTER_AUTH_TOKEN` (free OpenAI gateway via Puter) or fall back to `OPENAI_API_KEY`.',
      },
      {
        type: 'code',
        language: 'bash',
        code: ',chatgpt How do I set up antinuke?\n,ask Explain timeouts vs mutes\n,chatgpt reset',
      },
      {
        type: 'ul',
        items: [
          'Aliases: `,gpt`, `,ai`, `,ask`, `,askgpt`',
          'Remembers the last ~6 turns per user in each channel (30 minutes)',
          '`,chatgpt reset` clears your memory in the current channel',
          'Slash: `/chatgpt prompt:` with optional reset',
          'Provider: Puter first (https://developer.puter.com/tutorials/free-unlimited-openai-api/), then OpenAI',
        ],
      },
    ],
  ),
  page(
    'integrations/tts',
    'Text-to-Speech',
    'Generate MP3 speech and optionally play it in a voice channel.',
    'Integrations',
    [
      {
        type: 'callout',
        variant: 'warn',
        text: 'TTS is Premium and uses the same Puter / OpenAI credentials as ChatGPT.',
      },
      {
        type: 'code',
        language: 'bash',
        code: ',tts Hello everyone\n,tts onyx Welcome to the server\n,tts channel nova Raid starting in 5 minutes\n,tts voices',
      },
      {
        type: 'ul',
        items: [
          '`,tts <text>` attaches an MP3',
          '`,tts channel <text>` speaks in your current voice channel (skips if music is playing and attaches the file instead)',
          'Pick a voice: alloy, ash, coral, echo, fable, onyx, nova, sage, shimmer, and more',
          'Max 400 characters per clip',
          'Powered by Puter OpenAI TTS (`gpt-4o-mini-tts` / `tts-1`) when configured',
        ],
      },
    ],
  ),
  page(
    'resources/syntax',
    'Prefix & Syntax',
    'How Deelo parses commands and arguments.',
    'Resources',
    [
      { type: 'h2', id: 'prefix', text: 'Prefix' },
      {
        type: 'p',
        text: 'Default prefix is a comma: `,`. Example: `,ban @user reason`. Custom prefixes require Premium via `,prefix set`.',
      },
      { type: 'h2', id: 'arguments', text: 'Arguments' },
      {
        type: 'ul',
        items: [
          '`<required>` — must be provided',
          '`[optional]` — can be omitted',
          'Mentions — `@user`, `#channel`, `@role`',
          'Durations — `10m`, `1h`, `1d`',
        ],
      },
      {
        type: 'code',
        language: 'bash',
        code: ',mute @user 1h spamming\n,giveaway start 2d 3 Steam key',
      },
    ],
  ),
  page(
    'resources/permissions',
    'Permissions',
    'Discord permissions Deelo needs for common modules.',
    'Resources',
    [
      {
        type: 'table',
        headers: ['Module', 'Bot needs'],
        rows: [
          ['Moderation', 'Ban Members, Kick Members, Moderate Members, Manage Messages'],
          ['Roles', 'Manage Roles (above target roles)'],
          ['VoiceMaster', 'Manage Channels, Move Members, Connect'],
          ['Music', 'Connect, Speak'],
          ['Tickets', 'Manage Channels, Manage Roles, View Channels'],
          ['Logging', 'View Audit Log, Send Messages, Embed Links'],
        ],
      },
      {
        type: 'callout',
        variant: 'warn',
        text: 'If a command silently fails, check channel permission overwrites — they often block Send Messages or Embed Links.',
      },
    ],
  ),
  page(
    'resources/commands',
    'Commands',
    'Browse the full live command catalog.',
    'Resources',
    [
      {
        type: 'p',
        text: 'Deelo ships 1,144+ commands across moderation, security, music, levels, tickets, fun, and integrations.',
      },
      {
        type: 'cards',
        items: [
          { title: 'Command browser', description: 'Search and filter every command on the website.', href: '/commands' },
          { title: 'In Discord', description: 'Use ,help [command] or ,help [category].', href: '/docs/overview/getting-started' },
        ],
      },
    ],
  ),
  page(
    'resources/common-issues',
    'Common Issues',
    'Fixes for the problems we see most often.',
    'Resources',
    [
      { type: 'h2', id: 'bot-not-responding', text: 'Bot not responding' },
      {
        type: 'ul',
        items: [
          'Confirm the prefix is `,` (or your custom prefix).',
          'Check channel permissions for View Channel, Send Messages, Embed Links.',
          'Verify Deelo is online on /status.',
        ],
      },
      { type: 'h2', id: 'cannot-moderate', text: 'Cannot ban / mute / assign roles' },
      {
        type: 'ul',
        items: [
          'Deelo’s highest role must be above the target member’s highest role.',
          'The bot needs the matching Discord permission (Ban Members, etc.).',
          'You cannot moderate server owners or roles equal/above Deelo.',
        ],
      },
      { type: 'h2', id: 'music', text: 'Music will not play' },
      {
        type: 'ul',
        items: [
          'Join a voice channel first.',
          'Grant Connect + Speak in that channel.',
          'Try a different query or URL if a source fails.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Still stuck? Join the support Discord from /support.',
      },
    ],
  ),
];

const byPath = new Map(DOCS_PAGES.map((p) => [p.slug.join('/'), p]));

export function getDocsPage(slug: string[]): DocsPage | undefined {
  return byPath.get(slug.join('/'));
}

export function getAllDocsSlugs(): string[][] {
  return DOCS_PAGES.map((p) => p.slug);
}

export function getDocsHref(page: DocsPage): string {
  return `/docs/${page.slug.join('/')}`;
}

export function getAdjacentDocs(slug: string[]): { prev: DocsPage | null; next: DocsPage | null } {
  const flat = DOCS_NAV.flatMap((g) => g.items);
  const href = `/docs/${slug.join('/')}`;
  const idx = flat.findIndex((i) => i.href === href);
  if (idx < 0) return { prev: null, next: null };

  const prevHref = flat[idx - 1]?.href;
  const nextHref = flat[idx + 1]?.href;
  const prev = prevHref ? byPath.get(prevHref.replace(/^\/docs\//, '')) ?? null : null;
  const next = nextHref ? byPath.get(nextHref.replace(/^\/docs\//, '')) ?? null : null;
  return { prev, next };
}

export function searchDocs(query: string): { title: string; href: string; description: string; section: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DOCS_PAGES.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.section.toLowerCase().includes(q) ||
      p.blocks.some((b) => JSON.stringify(b).toLowerCase().includes(q)),
  )
    .slice(0, 12)
    .map((p) => ({
      title: p.title,
      href: getDocsHref(p),
      description: p.description,
      section: p.section,
    }));
}

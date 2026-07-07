# Deelo Discord Bot

**Deelo** is an all-in-one Discord community bot with a **freemium** plan system (Free / Premium / Premium+).

## Features

| Category | Free | Premium | Premium+ |
|----------|------|---------|----------|
| Moderation | ban, kick, warn, timeout, purge (100), lock/unlock | + nuke, advanced purge (1000) | Same |
| Security | automod, basic filters | antinuke, antiraid, fake permissions | Same |
| Utility | snipe, editsnipe, afk, avatar, help, poll | + TTS, reactionsnipe | + background removal, makegif |
| Levels | XP, rank, leaderboard | + level rewards | Same |
| Voice | Voicemaster (basic) | + ghost, music channels | Same |
| Tickets | — | Full ticket system | + forms, stats |
| Music | Queue (25 songs) | Filters, Spotify, queue 500 | Queue 1000 |
| Integrations | Last.fm (basic) | Social feeds, ChatGPT | Early access features |
| Roles | Reaction roles (1 panel) | Button roles, vanity, booster | More limits |

## Prerequisites

- **Node.js 18+**
- **Discord Bot Token** — [Discord Developer Portal](https://discord.com/developers/applications)
- **Supabase project** — [supabase.com](https://supabase.com) (free tier works)

Enable these **Privileged Gateway Intents** in the Developer Portal:
- Server Members Intent
- Message Content Intent

## 1. Supabase Setup

### Option A: Remote Supabase (recommended for testing)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** → **New query**
3. Paste the contents of `supabase/migrations/20260706000000_syntax_bot.sql` and run it (creates the `deelo` schema; later migrations rename `syntax` → `deelo` if upgrading)
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret, server-side only)

### Option B: Local Supabase (offline dev)

```bash
# Install Supabase CLI: https://supabase.com/docs/guides/cli
brew install supabase/tap/supabase   # macOS

cd deelo
supabase init          # if not already initialized
supabase start         # starts local Postgres + API

# Apply migration
supabase db reset      # or paste migration SQL in local SQL editor
```

Local URLs are printed by `supabase start` — use `http://127.0.0.1:54321` as `SUPABASE_URL` and the `service_role` key shown in the output.

## 2. Discord Bot Setup

1. Create an application at [discord.com/developers/applications](https://discord.com/developers/applications)
2. Go to **Bot** → create bot → copy token
3. Enable intents: **Server Members**, **Message Content**
4. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Administrator` (or select: Manage Channels, Manage Roles, Ban/Kick/Mute, Manage Messages, Connect/Speak)
5. Invite the bot to your test server

## 3. Local Testing — Step by Step

```bash
cd deelo

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN=your_bot_token
OWNER_IDS=your_discord_user_id
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DEFAULT_PREFIX=,
```

Run in development mode (auto-restarts on file changes):

```bash
npm run dev
```

You should see:

```
Supabase connected
Loaded 50+ commands
Deelo logged in as Deelo#1234
```

### Test commands in Discord

```
,help
,ping
,premium
,ban @user reason
,warn @user rule violation
,rank
,giveaway start 1h 1 Nitro
,voicemaster setup
,premium activate premium 30    # owner-only, for testing premium
,antinuke enable               # requires premium
,tickets panel Support         # requires premium
```

### Production build

```bash
npm run build
npm start
```

## Project Structure

```
deelo/
├── src/
│   ├── commands/       # Commands by category (moderation, security, etc.)
│   ├── config/         # Bot config + freemium plan definitions
│   ├── database/       # Supabase client + data access
│   ├── handlers/       # Command/event/button handlers
│   ├── premium/        # Feature gating by plan
│   ├── services/       # Antiraid, voicemaster, etc.
│   └── index.ts        # Entry point
├── supabase/migrations/  # Database schema (deelo schema)
└── .env.example
```

## Freemium System

Plans are stored per-guild in `deelo.guilds.plan`. Use:

- `,premium` — view plans and current status
- `,perks` — view enabled features for your plan
- `,activate premium 30` — owner-only command to test premium (replace with Stripe/Discord Server Subscriptions in production)

Plan definitions live in `src/config/plans.ts` — adjust limits and features there.

## Adding Payment (Production)

For real premium subscriptions, integrate:
- **Discord Server Subscriptions**
- **Stripe** webhooks → update `deelo.guilds.plan` via Supabase
- A small admin API or Edge Function to call `setGuildPlan()`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Bot token |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (backend only) |
| `OWNER_IDS` | No | Comma-separated owner user IDs |
| `LASTFM_API_KEY` | No | Last.fm now playing |
| `OPENAI_API_KEY` | No | ChatGPT command |
| `DEFAULT_PREFIX` | No | Default `,` |

## Notes

- Music playback requires `@discordjs/voice` + `play-dl` — queue system is built; wire up voice connection for full playback
- Translation/TTS need external API keys for production
- Social feed notifications need polling workers (cron job or Edge Function)
- The bot uses the isolated `deelo` Postgres schema so it won't conflict with other tables in your Supabase project

## License

MIT

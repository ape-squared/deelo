# Deelo Web

Marketing site, Discord dashboard, and Supabase admin panel for Deelo bot.

## Setup

### 1. Database migration

```bash
cd .. && supabase db push
```

### 2. Discord OAuth application

1. [Discord Developer Portal](https://discord.com/developers/applications) → your bot app (same as bot token)
2. OAuth2 → add redirect: `http://localhost:3000/api/auth/discord/callback`
3. Copy Client ID and Client Secret

### 3. Environment

```bash
node scripts/sync-env.mjs
```

This copies Supabase credentials from the bot root `.env`. Then add your **Discord OAuth Client Secret** from the [Discord Developer Portal](https://discord.com/developers/applications) → OAuth2:

```
DISCORD_CLIENT_SECRET=your_secret_here
```

Also add redirect URL in Discord OAuth2 settings:
`http://localhost:3000/api/auth/discord/callback`

### 4. Create first admin user

```bash
node scripts/setup-admin.mjs your-email@example.com YourSecurePassword
```

Or create a user in Supabase Auth dashboard, then SQL:

```sql
INSERT INTO syntax.admin_users (id, email, role)
SELECT id, email, 'superadmin' FROM auth.users WHERE email = 'your-email@example.com';
```

### 5. Run

```bash
npm run dev
```

- **Site:** http://localhost:3000
- **Dashboard:** http://localhost:3000/dashboard (Discord login)
- **Admin:** http://localhost:3000/admin (Supabase login)

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/commands` | Command catalog |
| `/pricing` | Plans |
| `/dashboard` | User server list (Discord OAuth) |
| `/dashboard/[guildId]` | Guild settings editor |
| `/admin` | Admin overview |
| `/admin/guilds` | Manage guild plans |
| `/admin/subscriptions` | Subscription CRUD |
| `/admin/users` | Dashboard users |
| `/admin/audit` | Admin audit log |

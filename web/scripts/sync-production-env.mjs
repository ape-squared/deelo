#!/usr/bin/env node
/**
 * Build web/.env.production from local bot + web env for Vercel deploys.
 * Run: node web/scripts/sync-production-env.mjs [production-url]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.join(__dirname, '..');
const botEnvPath = path.join(webDir, '..', '.env');
const webEnvPath = path.join(webDir, '.env.local');
const outPath = path.join(webDir, '.env.production');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const bot = parseEnv(botEnvPath);
const web = parseEnv(webEnvPath);
const productionUrl = (
  process.argv[2] ||
  bot.APP_URL ||
  web.NEXT_PUBLIC_APP_URL ||
  bot.PUBLIC_APP_URL ||
  'https://deelo.nikkithewikki.top'
).replace(/\/$/, '');

const discordClientId = web.DISCORD_CLIENT_ID || web.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1188001834305060925';
const supabaseUrl = web.SUPABASE_URL || bot.SUPABASE_URL || web.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = web.SUPABASE_SERVICE_ROLE_KEY || bot.SUPABASE_SERVICE_ROLE_KEY;
const discordSecret = web.DISCORD_CLIENT_SECRET || bot.DISCORD_CLIENT_SECRET || '';
const sessionSecret = web.SESSION_SECRET || bot.SESSION_SECRET || '';
const botToken = web.DISCORD_BOT_TOKEN || bot.DISCORD_TOKEN || '';
const anonKey = web.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'not-required-for-dashboard';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!discordSecret) {
  console.error('Missing DISCORD_CLIENT_SECRET — set it in web/.env.local');
  process.exit(1);
}
if (!sessionSecret) {
  console.error('Missing SESSION_SECRET — run: node web/scripts/sync-env.mjs');
  process.exit(1);
}

const lines = [
  '# Production env for Vercel — synced from local .env files',
  `# Generated ${new Date().toISOString()}`,
  '',
  `NEXT_PUBLIC_APP_URL=${productionUrl}`,
  `NEXT_PUBLIC_DISCORD_CLIENT_ID=${discordClientId}`,
  `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
  '',
  `DISCORD_CLIENT_ID=${discordClientId}`,
  `DISCORD_CLIENT_SECRET=${discordSecret}`,
  `DISCORD_BOT_TOKEN=${botToken}`,
  `DISCORD_TOKEN=${botToken}`,
  `SUPABASE_URL=${supabaseUrl}`,
  `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
  `SESSION_SECRET=${sessionSecret}`,
  '',
];

fs.writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${outPath} (NEXT_PUBLIC_APP_URL=${productionUrl})`);

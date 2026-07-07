#!/usr/bin/env node
/**
 * Create Supabase Auth user + deelo.admin_users row.
 * Usage: node scripts/setup-admin.mjs admin@example.com YourPassword123
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

function parseEnv(filePath) {
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && m[2]) out[m[1]] = m[2].trim();
  }
  return out;
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/setup-admin.mjs <email> <password>');
  process.exit(1);
}

const env = parseEnv(envPath);
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Run node scripts/sync-env.mjs first');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

let userId;

const createRes = await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ email, password, email_confirm: true }),
});

if (createRes.ok) {
  const data = await createRes.json();
  userId = data.id;
  console.log('Created auth user:', userId);
} else {
  const errText = await createRes.text();
  if (errText.includes('already been registered') || createRes.status === 422) {
    const listRes = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers });
    const list = await listRes.json();
    userId = list.users?.[0]?.id;
    if (!userId) {
      console.error('User exists but could not resolve ID:', errText);
      process.exit(1);
    }
    console.log('Using existing auth user:', userId);
  } else {
    console.error('Create user failed:', createRes.status, errText);
    process.exit(1);
  }
}

const dbHeaders = {
  ...headers,
  'Accept-Profile': 'deelo',
  'Content-Profile': 'deelo',
  Prefer: 'resolution=merge-duplicates',
};

const upsertRes = await fetch(`${url}/rest/v1/admin_users`, {
  method: 'POST',
  headers: { ...dbHeaders, Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify({ id: userId, email, role: 'superadmin' }),
});

if (!upsertRes.ok) {
  console.error('admin_users insert failed:', await upsertRes.text());
  process.exit(1);
}

console.log(`✅ Admin ready: ${email} (superadmin)`);
const adminLoginUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://deelo.nikkithewikki.top'}/admin/login`;
console.log(`Login at ${adminLoginUrl}`);

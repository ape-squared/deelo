#!/usr/bin/env node
/**
 * Grant admin access to an existing Supabase Auth user.
 * Usage: node scripts/grant-admin.mjs your@email.com [role]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

function parseEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && m[2]) out[m[1]] = m[2].trim();
  }
  return out;
}

const email = process.argv[2];
const role = process.argv[3] || 'superadmin';

if (!email) {
  console.error('Usage: node scripts/grant-admin.mjs <email> [role]');
  console.error('Roles: admin | superadmin | support');
  process.exit(1);
}

const env = parseEnv(envPath);
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in web/.env.local');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

// Find auth user by email
const listRes = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers });
if (!listRes.ok) {
  console.error('Failed to list users:', listRes.status, await listRes.text());
  process.exit(1);
}

const list = await listRes.json();
const user = list.users?.[0];
if (!user) {
  console.error(`No Supabase Auth user found for: ${email}`);
  console.error('Create the user first in Supabase Dashboard → Authentication → Users');
  process.exit(1);
}

const dbHeaders = {
  ...headers,
  Accept: 'application/json',
  'Accept-Profile': 'deelo',
  'Content-Profile': 'deelo',
  Prefer: 'resolution=merge-duplicates,return=representation',
};

const upsertRes = await fetch(`${url}/rest/v1/admin_users`, {
  method: 'POST',
  headers: dbHeaders,
  body: JSON.stringify({ id: user.id, email: user.email, role }),
});

if (!upsertRes.ok) {
  console.error('admin_users upsert failed:', upsertRes.status, await upsertRes.text());
  process.exit(1);
}

const row = await upsertRes.json();
console.log(`✅ Granted ${role} to ${email} (${user.id})`);
const adminLoginUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://deelo.nikkithewikki.top'}/admin/login`;
console.log(`Login at ${adminLoginUrl}`);

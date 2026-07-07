#!/usr/bin/env node
/** List Supabase Auth users and whether they are in deelo.admin_users */
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

const env = parseEnv(envPath);
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}` };

const usersRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=50`, { headers });
const usersData = await usersRes.json();

const adminRes = await fetch(`${url}/rest/v1/admin_users?select=id,email,role`, {
  headers: { ...headers, Accept: 'application/json', 'Accept-Profile': 'deelo' },
});
const admins = await adminRes.json();
const adminSet = new Set(admins.map((a) => a.id));

console.log('\nSupabase Auth users:\n');
for (const u of usersData.users ?? []) {
  const isAdmin = adminSet.has(u.id);
  console.log(`${isAdmin ? '✅' : '❌'} ${u.email}  (${u.id})${isAdmin ? ` → ${admins.find((a) => a.id === u.id)?.role}` : ' — NOT in admin_users'}`);
}
console.log('\nTo grant admin: node scripts/grant-admin.mjs <email>\n');

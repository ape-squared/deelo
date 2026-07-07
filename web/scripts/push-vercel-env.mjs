#!/usr/bin/env node
/** Push web/.env.production vars to Vercel (production). Run: node web/scripts/push-vercel-env.mjs */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(webDir, '.env.production');

if (!fs.existsSync(envPath)) {
  console.error('Missing web/.env.production — run: npm run web:env:prod');
  process.exit(1);
}

const vars = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) vars[m[1]] = m[2];
}

for (const [key, value] of Object.entries(vars)) {
  if (!value) continue;
  console.log(`Setting ${key} …`);
  try {
    execSync(`npx vercel@latest env rm ${key} production --yes`, { cwd: webDir, stdio: 'pipe' });
  } catch {
    /* not set yet */
  }
  execSync(`npx vercel@latest env add ${key} production --force`, {
    cwd: webDir,
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

console.log('Done — Vercel production env synced from .env.production');

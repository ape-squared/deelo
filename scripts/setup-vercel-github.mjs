#!/usr/bin/env node
/**
 * One-time helper: link Vercel project + print GitHub secret values.
 *
 * Prerequisites:
 *   1. npm i -g vercel && vercel login
 *   2. gh auth login
 *
 * Run from repo root:
 *   node scripts/setup-vercel-github.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(root, 'web');

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
}

console.log('Linking Vercel project in web/ …');
try {
  sh('npx vercel link --yes', { cwd: webDir, stdio: 'inherit' });
} catch {
  console.error('Run: cd web && npx vercel link');
  process.exit(1);
}

const projectPath = path.join(webDir, '.vercel', 'project.json');
if (!fs.existsSync(projectPath)) {
  console.error('Missing web/.vercel/project.json after link');
  process.exit(1);
}

const { orgId, projectId } = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
console.log('\nAdd these GitHub repository secrets (ape-squared/deelo):\n');
console.log(`  VERCEL_ORG_ID=${orgId}`);
console.log(`  VERCEL_PROJECT_ID=${projectId}`);
console.log('  VERCEL_TOKEN=<create at https://vercel.com/account/tokens>\n');
console.log('Then push env to Vercel:');
console.log('  cd web && npx vercel env pull .env.vercel.check && rm .env.vercel.check');
console.log('  # committed web/.env.production is used for builds after sync-production-env.mjs\n');
console.log('Set custom domain deelo.bot in Vercel → Project → Settings → Domains');
console.log('Add Discord redirect: https://deelo.bot/api/auth/discord/callback');

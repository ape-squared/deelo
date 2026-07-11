#!/usr/bin/env node
/**
 * Generates web/src/data/releases.json from recent git commits.
 * Run automatically before `next build` so /changelog and What's New stay in sync.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(join(__dirname, '..'));
const outFile = join(__dirname, '../src/data/releases.json');

function inferCategory(subject) {
  const s = subject.toLowerCase();
  if (s.startsWith('fix') || s.includes('bug')) return 'fix';
  if (s.includes('breaking')) return 'breaking';
  if (
    s.includes('v3') ||
    s.startsWith('add') ||
    s.includes('implement') ||
    s.includes('overhaul') ||
    s.includes('merge')
  ) {
    return 'feature';
  }
  return 'improvement';
}

function findRepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return join(startDir, '..');
}

function parseCommits(repoRoot) {
  try {
    const raw = execSync("git log -40 --pretty=format:'%H|%h|%s|%cI' --no-merges", {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();

    if (!raw) return [];
    return raw.split('\n').map((line) => {
      const [hash, short, subject, date] = line.split('|');
      return { hash, short, subject: subject.trim(), date };
    });
  } catch {
    return [];
  }
}

const commits = parseCommits(repoRoot);

if (!commits.length) {
  if (existsSync(outFile)) {
    console.log('[releases] No git history available — keeping existing releases.json');
    process.exit(0);
  }
  console.warn('[releases] No git history and no existing releases.json');
}
const byDay = new Map();

for (const commit of commits) {
  const day = commit.date.slice(0, 10);
  if (!byDay.has(day)) byDay.set(day, []);
  byDay.get(day).push(commit);
}

const releases = [...byDay.entries()]
  .sort(([a], [b]) => (a < b ? 1 : -1))
  .slice(0, 14)
  .map(([day, dayCommits]) => {
    const lead = dayCommits[0];
    const items = dayCommits.slice(0, 12).map((c) => ({
      title: c.subject.replace(/\.$/, ''),
      category: inferCategory(c.subject),
      hash: c.short,
    }));

    return {
      id: `release-${day}`,
      version: lead.short,
      published_at: lead.date,
      title: items.length > 1 ? `Updates for ${formatDay(day)}` : lead.subject.replace(/\.$/, ''),
      category: inferCategory(lead.subject),
      body: items.map((i) => `- ${i.title}`).join('\n'),
      items,
      source: 'git',
    };
  });

function formatDay(isoDay) {
  return new Date(`${isoDay}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      latest: releases[0] ?? null,
      releases,
    },
    null,
    2,
  ) + '\n',
);

console.log(`[releases] Wrote ${releases.length} release(s) → ${outFile}`);

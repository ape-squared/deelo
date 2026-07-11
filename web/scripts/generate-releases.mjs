#!/usr/bin/env node
/**
 * Generates web/src/data/releases.json from recent git commits.
 * Run automatically before `next build` so /changelog and What's New stay in sync.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
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

function formatDay(isoDay) {
  return new Date(`${isoDay}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function loadExistingReleases() {
  if (!existsSync(outFile)) return null;
  try {
    return JSON.parse(readFileSync(outFile, 'utf8'));
  } catch {
    return null;
  }
}

function mergeReleaseItems(existingItems, incomingItems) {
  const ordered = [];
  const seen = new Set();

  for (const item of incomingItems ?? []) {
    const key = item.hash ?? item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(item);
  }

  for (const item of existingItems ?? []) {
    const key = item.hash ?? item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(item);
  }

  return ordered.slice(0, 12);
}

function buildReleaseFromDay(day, items, meta = {}) {
  const slice = items.slice(0, 12);
  const lead = slice[0];

  return {
    id: `release-${day}`,
    version: meta.version ?? lead?.hash ?? '',
    published_at: meta.published_at ?? meta.publishedAt ?? lead?.published_at ?? new Date(`${day}T12:00:00`).toISOString(),
    title: slice.length > 1 ? `Updates for ${formatDay(day)}` : (lead?.title ?? meta.title ?? 'Update'),
    category: meta.category ?? lead?.category ?? 'improvement',
    body: slice.map((i) => `- ${i.title}`).join('\n'),
    items: slice.map(({ title, category, hash }) => ({ title, category, hash })),
    source: 'git',
  };
}

/** Union commit items for the same day — shallow CI clones only see the latest commit. */
function mergeReleaseDay(day, existing, incoming) {
  const mergedItems = mergeReleaseItems(existing?.items, incoming.items);
  return buildReleaseFromDay(day, mergedItems, {
    version: incoming.version ?? existing?.version,
    published_at: incoming.published_at ?? existing?.published_at,
    category: incoming.category ?? existing?.category,
  });
}

function mergeReleases(existing, fromGit) {
  const byId = new Map();
  for (const release of existing.releases ?? []) byId.set(release.id, release);

  for (const release of fromGit) {
    const day = release.id.replace(/^release-/, '');
    const prev = byId.get(release.id);
    byId.set(release.id, prev ? mergeReleaseDay(day, prev, release) : release);
  }

  const merged = [...byId.values()]
    .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
    .slice(0, 14);

  return {
    generated_at: new Date().toISOString(),
    latest: merged[0] ?? null,
    releases: merged,
  };
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
    console.log('[releases] No git history in build context — keeping existing releases.json');
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

    return buildReleaseFromDay(day, items, {
      version: lead.short,
      published_at: lead.date,
      category: inferCategory(lead.subject),
    });
  });

mkdirSync(dirname(outFile), { recursive: true });

const existing = loadExistingReleases();
const output = existing
  ? (() => {
      const merged = mergeReleases(existing, releases);
      const shallow = releases.length < (existing.releases?.length ?? 0);
      if (shallow) {
        console.log(
          `[releases] Shallow git (${releases.length} day(s) visible) — preserved ${merged.releases.length} release bundle(s)`,
        );
      } else {
        console.log(`[releases] Merged ${releases.length} day(s) from git into ${merged.releases.length} bundle(s)`);
      }
      return merged;
    })()
  : {
      generated_at: new Date().toISOString(),
      latest: releases[0] ?? null,
      releases,
    };

writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);

console.log(`[releases] Wrote ${output.releases.length} release(s) → ${outFile}`);

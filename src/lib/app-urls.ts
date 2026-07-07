/** Resolve web app base URLs — public first, then Docker/internal fallbacks. */
export function appBaseUrls(): string[] {
  const raw = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.STATUS_INTERNAL_URL,
    process.env.WEB_INTERNAL_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    'http://web:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
  ];

  const out: string[] = [];
  for (const u of raw) {
    if (!u?.trim()) continue;
    const base = u.trim().replace(/\/$/, '');
    if (!out.includes(base)) out.push(base);
  }
  return out;
}

export async function fetchAppJson<T>(path: string, timeoutMs = 10_000): Promise<T | null> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  for (const base of appBaseUrls()) {
    try {
      const res = await fetch(`${base}${normalized}`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) return (await res.json()) as T;
    } catch {
      // try next base URL
    }
  }
  return null;
}

export async function probeAppReachable(timeoutMs = 5_000): Promise<{ ok: boolean; detail: string }> {
  for (const base of appBaseUrls()) {
    try {
      const statusRes = await fetch(`${base}/api/status`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json' },
      });
      if (statusRes.ok) {
        return { ok: true, detail: 'Operational' };
      }
      const homeRes = await fetch(`${base}/`, { signal: AbortSignal.timeout(timeoutMs) });
      if (homeRes.ok) {
        return { ok: true, detail: 'Reachable' };
      }
    } catch {
      // try next base URL
    }
  }
  return { ok: false, detail: 'Unreachable from bot' };
}

export function primaryAppUrl(): string {
  return appBaseUrls()[0] ?? 'https://deelo.bot';
}

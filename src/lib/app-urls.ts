const INTERNAL_HOSTS = new Set(['localhost', '127.0.0.1', 'web', '0.0.0.0']);

export function isInternalUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol === 'http:' && INTERNAL_HOSTS.has(hostname)) return true;
    if (hostname.endsWith('.internal')) return true;
    return false;
  } catch {
    return true;
  }
}

function trimUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/** Public-facing site URL for links, embeds, and OAuth — never Docker/localhost. */
export function publicAppUrl(): string {
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.PUBLIC_APP_URL,
  ]
    .filter(Boolean)
    .map((u) => trimUrl(String(u)));

  for (const url of candidates) {
    if (!isInternalUrl(url)) return url;
  }

  return 'https://deelo.nikkithewikki.top';
}

export function publicAppHost(): string {
  try {
    return new URL(publicAppUrl()).host;
  } catch {
    return 'deelo.nikkithewikki.top';
  }
}

/** URLs the bot may call to reach the web API (public first, then Docker internal). */
export function fetchAppUrls(preferInternal = false): string[] {
  const internal = [
    process.env.STATUS_INTERNAL_URL,
    process.env.WEB_INTERNAL_URL,
    'http://web:3000',
  ]
    .filter(Boolean)
    .map((u) => trimUrl(String(u)));

  const publicUrl = publicAppUrl();
  const raw = preferInternal
    ? [...internal, publicUrl]
    : [publicUrl, ...internal];

  const out: string[] = [];
  for (const u of raw) {
    if (!u?.trim()) continue;
    const base = trimUrl(u.trim());
    if (!out.includes(base)) out.push(base);
  }
  return out;
}

export async function fetchAppJson<T>(
  path: string,
  timeoutMs = 10_000,
  preferInternal = false,
): Promise<T | null> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  for (const base of fetchAppUrls(preferInternal)) {
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
  for (const base of fetchAppUrls()) {
    try {
      const statusRes = await fetch(`${base}/api/status`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json' },
      });
      if (statusRes.ok) {
        return { ok: true, detail: publicAppHost() };
      }
      const homeRes = await fetch(`${base}/`, { signal: AbortSignal.timeout(timeoutMs) });
      if (homeRes.ok) {
        return { ok: true, detail: publicAppHost() };
      }
    } catch {
      // try next base URL
    }
  }
  return { ok: false, detail: 'Unreachable from bot' };
}

/** @deprecated use publicAppUrl */
export function primaryAppUrl(): string {
  return publicAppUrl();
}

/** @deprecated use fetchAppUrls */
export function appBaseUrls(): string[] {
  return fetchAppUrls();
}

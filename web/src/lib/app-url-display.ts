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

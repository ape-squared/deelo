'use client';

import { useEffect, useState } from 'react';

export default function DevelopersPage() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-bold mb-2">Developer tools</h1>
      <p className="text-muted text-sm mb-6">Live bot status and service health.</p>
      <pre className="card p-4 text-xs overflow-auto max-h-[70vh]">
        {status ? JSON.stringify(status, null, 2) : 'Loading…'}
      </pre>
    </div>
  );
}

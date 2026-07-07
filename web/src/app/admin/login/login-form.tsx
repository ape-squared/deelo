'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';

export default function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(params.get('error') ?? '');
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        setLoading(false);
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Could not reach server.');
      setLoading(false);
    }
  }

  return (
    <div className="mesh-bg flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-border">
        <Link href="/" className="flex items-center gap-2 text-muted hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" />
          Back to site
        </Link>
        <div>
          <div className="mb-6 flex items-center gap-3">
            <span className="brand-logo-mark flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/15">
              <DeeloIcon size={40} />
            </span>
            <DeeloWordmark height={28} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Admin</h1>
          <p className="text-muted leading-relaxed max-w-md">
            Manage guilds, subscriptions, dashboard users, and audit logs across the entire Deelo platform.
          </p>
        </div>
        <p className="text-xs text-muted">Authorized personnel only</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-scale-in">
          <div className="lg:hidden mb-8 text-center">
            <div className="mx-auto mb-4 brand-logo-mark flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/15">
              <DeeloIcon size={32} />
            </div>
            <DeeloWordmark height={22} className="mx-auto mb-2" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>

          <div className="card p-8">
            <h2 className="text-xl font-semibold mb-1 lg:hidden">Sign in</h2>
            <p className="text-sm text-muted mb-8">Use your Supabase admin credentials.</p>

            <form onSubmit={login} className="space-y-5">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-fade-in">
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

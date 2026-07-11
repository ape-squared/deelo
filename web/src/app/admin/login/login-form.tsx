'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { DeeloIcon, DeeloWordmark } from '@/components/brand/logo';
import { DashAlert, DashButton, DashInput, DashLoginCard, DashLoginField } from '@/components/ui/dashboard-kit';

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
    <div className="admin-app mesh-bg flex min-h-screen" data-theme="dark">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-border p-12">
        <Link href="/" className="flex items-center gap-2 text-muted transition hover:text-foreground">
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
          <h1 className="mb-4 text-4xl font-bold">Admin</h1>
          <p className="max-w-md leading-relaxed text-muted">
            Manage guilds, subscriptions, staff, and platform settings. Sign in with email or Discord staff access.
          </p>
        </div>
        <p className="text-xs text-muted">Authorized personnel only</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-scale-in">
          <div className="mb-8 text-center lg:hidden">
            <div className="brand-logo-mark mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/15">
              <DeeloIcon size={32} />
            </div>
            <DeeloWordmark height={22} className="mx-auto mb-2" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>

          <DashLoginCard title="Sign in" subtitle="Use your Supabase admin credentials.">
            <form onSubmit={login} className="space-y-5">
              <DashLoginField label="Email">
                <DashInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </DashLoginField>
              <DashLoginField label="Password">
                <DashInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </DashLoginField>
              {error && <DashAlert status="danger">{error}</DashAlert>}
              <DashButton type="submit" className="w-full" isDisabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  'Sign in with email'
                )}
              </DashButton>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-2 text-muted">or</span>
              </div>
            </div>

            <a href="/api/auth/discord?return=/admin" className="btn-secondary w-full text-center">
              Sign in with Discord (staff)
            </a>
          </DashLoginCard>
        </div>
      </div>
    </div>
  );
}

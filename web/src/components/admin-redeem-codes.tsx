'use client';

import { useState } from 'react';
import { Plus, Copy, Ban, Check, Loader2, Ticket } from 'lucide-react';
import { AdminCard, AdminEmpty, AdminStatCard, AdminTable } from '@/components/admin/ui';
import type { RedeemCodeRow } from '@/lib/redeem-codes';

export function RedeemCodeManager({
  initial,
  readOnly = false,
  apiEndpoint = '/api/admin/redeem-codes',
}: {
  initial: RedeemCodeRow[];
  readOnly?: boolean;
  apiEndpoint?: string;
}) {
  const [codes, setCodes] = useState(initial);
  const [plan, setPlan] = useState<'premium' | 'premium_plus'>('premium');
  const [days, setDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState('');
  const [notes, setNotes] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const active = codes.filter((c) => !c.disabled && c.uses < c.max_uses).length;
  const totalUses = codes.reduce((n, c) => n + c.uses, 0);

  async function create() {
    setCreating(true);
    setMessage('');
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        days,
        maxUses,
        notes: notes || undefined,
        code: customCode || undefined,
        expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : undefined,
      }),
    });
    setCreating(false);
    const data = await res.json();
    if (res.ok) {
      setCodes([data.code, ...codes]);
      setCustomCode('');
      setNotes('');
      setMessage(`Created code ${data.code.code}`);
      setTimeout(() => setMessage(''), 4000);
    } else {
      setMessage(data.error ?? 'Failed to create code');
    }
  }

  async function toggleDisable(id: number, disabled: boolean) {
    const res = await fetch(apiEndpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, disabled }),
    });
    if (res.ok) {
      const { code } = await res.json();
      setCodes((list) => list.map((c) => (c.id === id ? code : c)));
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${message.includes('Failed') ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-green-500/30 bg-green-500/10 text-green-400'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Total codes" value={codes.length} icon="credit-card" />
        <AdminStatCard label="Active codes" value={active} icon="crown" variant="success" />
        <AdminStatCard label="Total redemptions" value={totalUses} icon="users" />
      </div>

      {!readOnly && (
      <AdminCard title="Create redeem code" desc="Users redeem with ,redeem in Discord or the dashboard.">
        <div className="p-5 lg:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Custom code (optional)</label>
            <input className="input font-mono text-sm uppercase" value={customCode} onChange={(e) => setCustomCode(e.target.value)} placeholder="Auto-generated if empty" />
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as 'premium' | 'premium_plus')}>
              <option value="premium">Premium</option>
              <option value="premium_plus">Premium+</option>
            </select>
          </div>
          <div>
            <label className="label">Duration (days)</label>
            <input type="number" min={1} max={3650} className="input" value={days} onChange={(e) => setDays(parseInt(e.target.value, 10) || 30)} />
          </div>
          <div>
            <label className="label">Max uses</label>
            <input type="number" min={1} className="input" value={maxUses} onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 1)} />
          </div>
          <div>
            <label className="label">Code expires in (days)</label>
            <input type="number" min={1} className="input" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder="Never" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <input className="input text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Giveaway, partner, promo..." />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="button" onClick={create} className="btn-primary text-sm" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Generate code
            </button>
          </div>
        </div>
      </AdminCard>
      )}

      <AdminCard title="All codes">
        <AdminTable>
          <thead className="border-b border-border bg-background/50 text-left text-muted">
            <tr>
              <th className="p-4 font-medium">Code</th>
              <th className="p-4 font-medium">Plan</th>
              <th className="p-4 font-medium">Uses</th>
              <th className="p-4 font-medium">Days</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => {
              const exhausted = c.uses >= c.max_uses;
              const expired = c.expires_at && new Date(c.expires_at) < new Date();
              return (
                <tr key={c.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code className="text-accent font-mono text-xs">{c.code}</code>
                      <button type="button" onClick={() => copyCode(c.code)} className="text-muted hover:text-foreground">
                        {copied === c.code ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {c.notes && <p className="text-[10px] text-muted mt-1">{c.notes}</p>}
                  </td>
                  <td className="p-4 capitalize">{c.plan.replace('_', ' ')}</td>
                  <td className="p-4 font-mono text-xs">{c.uses}/{c.max_uses}</td>
                  <td className="p-4">{c.days}d</td>
                  <td className="p-4">
                    {c.disabled ? <span className="badge badge-muted">Disabled</span>
                      : expired ? <span className="badge border-red-500/30 text-red-400">Expired</span>
                      : exhausted ? <span className="badge badge-warning">Used up</span>
                      : <span className="badge badge-success">Active</span>}
                  </td>
                  <td className="p-4">
                    {!readOnly && !c.disabled && (
                      <button type="button" onClick={() => toggleDisable(c.id, true)} className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1">
                        <Ban className="h-3 w-3" /> Disable
                      </button>
                    )}
                    {!readOnly && c.disabled && (
                      <button type="button" onClick={() => toggleDisable(c.id, false)} className="text-xs text-accent hover:underline">
                        Re-enable
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
        {!codes.length && <AdminEmpty message="No redeem codes yet. Create one above." />}
      </AdminCard>
    </div>
  );
}

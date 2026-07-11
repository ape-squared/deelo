'use client';

import { useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';

export function RedeemCodePanel({
  guildId,
  currentPlan,
  onRedeemed,
}: {
  guildId: string;
  currentPlan: string;
  onRedeemed: (guild: { plan: string; plan_expires_at: string | null }) => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setMessage('');
    setError(false);

    const res = await fetch(`/api/guilds/${guildId}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage(data.message);
      setCode('');
      onRedeemed(data.guild);
      setTimeout(() => setMessage(''), 6000);
    } else {
      setError(true);
      setMessage(data.error ?? 'Redemption failed');
    }
  }

  return (
    <div className="rounded-xl border border-accent/20 bg-accent-soft/30 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-accent" />
        <div>
          <p className="font-medium">Redeem premium code</p>
          <p className="text-xs text-muted">Current plan: <span className="capitalize text-foreground">{currentPlan.replace('_', ' ')}</span></p>
        </div>
      </div>

      <form onSubmit={redeem} className="flex flex-wrap gap-2">
        <input
          className="input flex-1 min-w-[200px] font-mono text-sm uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="SYNTAX-XXXX-XXXX"
          disabled={loading}
        />
        <button type="submit" className="btn-primary text-sm" disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem'}
        </button>
      </form>

      {message && (
        <p className={`text-sm ${error ? 'text-red-400' : 'text-green-400'}`}>{message}</p>
      )}

      <p className="text-xs text-muted">Also works in Discord: <code className="text-accent">,redeem {'<code>'}</code></p>
    </div>
  );
}

import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { groupSubscriptionsByGuild, subscriptionStats } from '@/lib/admin-subscriptions';
import { AdminPageHeader, AdminStatCard, AdminCard, AdminTable, formatRelative } from '@/components/admin/ui';
import { ArrowRight, ScrollText, CreditCard, AlertTriangle, BarChart3 } from 'lucide-react';

export default async function AdminOverviewPage() {
  const db = createAdminClient();

  const [
    { count: guildCount },
    { count: userCount },
    { data: allSubs },
    { data: recentGuilds },
    { data: planBreakdown },
    { data: auditLogs },
    { data: guilds },
  ] = await Promise.all([
    db.from('guilds').select('*', { count: 'exact', head: true }),
    db.from('dashboard_users').select('*', { count: 'exact', head: true }),
    db.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(200),
    db.from('guilds').select('id, plan, prefix, created_at').order('created_at', { ascending: false }).limit(8),
    db.from('guilds').select('plan'),
    db.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(6),
    db.from('guilds').select('id, plan'),
  ]);

  const guildPlans = new Map((guilds ?? []).map((g) => [g.id, g.plan]));
  const { current: activeSubs, duplicateCount } = groupSubscriptionsByGuild(allSubs ?? [], guildPlans);
  const stats = subscriptionStats(allSubs ?? []);

  const plans = { free: 0, premium: 0, premium_plus: 0 };
  for (const g of planBreakdown ?? []) {
    const p = g.plan as keyof typeof plans;
    if (p in plans) plans[p]++;
  }

  const total = plans.free + plans.premium + plans.premium_plus;
  const premiumPct = total ? Math.round(((plans.premium + plans.premium_plus) / total) * 100) : 0;
  const activeUnique = activeSubs.filter((s) => s.status === 'active').length;
  // Server-rendered snapshot for expiring-subscription filter
  // eslint-disable-next-line react-hooks/purity -- intentional request-time clock on the server
  const nowMs = Date.now();
  const weekMs = 7 * 86400000;
  const expiring = activeSubs.filter((s) => {
    if (s.status !== 'active' || !s.expires_at) return false;
    const exp = new Date(s.expires_at).getTime();
    return exp > nowMs && exp < nowMs + weekMs;
  });

  return (
    <div>
      <AdminPageHeader
        title="Overview"
        description="Platform health, revenue indicators, and recent activity across Deelo."
        action={
          <Link href="/admin/subscriptions" className="btn-secondary text-sm">
            <CreditCard className="h-4 w-4" />
            Manage subscriptions
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        <AdminStatCard label="Registered guilds" value={guildCount ?? 0} icon="server" />
        <AdminStatCard label="Dashboard users" value={userCount ?? 0} icon="users" />
        <AdminStatCard label="Active subscriptions" value={activeUnique} icon="credit-card" variant="success" trend={`${stats.byPlan.premium + stats.byPlan.premium_plus} paid`} />
        <AdminStatCard label="Premium rate" value={`${premiumPct}%`} icon="crown" trend={`${plans.premium + plans.premium_plus} guilds`} />
      </div>

      <div className="mb-8">
        <Link href="/admin/analytics" className="admin-stat-card flex items-center justify-between group">
          <div>
            <p className="text-sm font-medium text-accent">View full analytics →</p>
            <p className="text-xs text-muted mt-1">Bot health, growth charts, feature adoption</p>
          </div>
          <div className="admin-stat-icon group-hover:scale-110 transition-transform">
            <BarChart3 className="h-5 w-5" />
          </div>
        </Link>
      </div>

      {(duplicateCount > 0 || expiring.length > 0) && (
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          {duplicateCount > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-medium text-amber-200">Legacy duplicate subscriptions</p>
                <p className="text-sm text-amber-200/70 mt-1">{duplicateCount} extra rows in history. New grants auto-replace active subs.</p>
                <Link href="/admin/subscriptions" className="text-xs text-amber-300 hover:underline mt-2 inline-block">Review subscriptions →</Link>
              </div>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <p className="font-medium text-orange-200 mb-2">Expiring within 7 days ({expiring.length})</p>
              <div className="space-y-1.5">
                {expiring.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex justify-between text-xs font-mono text-orange-200/80">
                    <span>{s.guild_id}</span>
                    <span>{formatRelative(s.expires_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminCard title="Plan distribution" className="lg:col-span-1">
          <div className="p-5 space-y-4">
            {[
              { label: 'Free', count: plans.free, color: 'bg-zinc-500' },
              { label: 'Premium', count: plans.premium, color: 'bg-accent' },
              { label: 'Premium+', count: plans.premium_plus, color: 'bg-amber-500' },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="text-muted">{count} ({total ? Math.round((count / total) * 100) : 0}%)</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: total ? `${(count / total) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Recent guilds" desc="Latest servers that registered with Deelo" className="lg:col-span-1">
          <div className="divide-y divide-border/50">
            {(recentGuilds ?? []).map((g) => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-white/[0.02] transition">
                <div className="min-w-0">
                  <p className="font-mono text-xs truncate text-muted">{g.id}</p>
                  <p className="text-xs text-muted mt-0.5">Prefix <span className="text-foreground">{g.prefix}</span></p>
                </div>
                <span className="badge badge-accent capitalize shrink-0 ml-2">{g.plan.replace('_', ' ')}</span>
              </div>
            ))}
            {!recentGuilds?.length && <p className="p-6 text-sm text-muted text-center">No guilds yet</p>}
          </div>
        </AdminCard>

        <AdminCard title="Recent admin actions" className="lg:col-span-1">
          <div className="divide-y divide-border/50">
            {(auditLogs ?? []).map((l) => (
              <div key={l.id} className="px-5 py-3 hover:bg-white/[0.02] transition">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-sm font-medium truncate">{l.action}</span>
                </div>
                <p className="text-xs text-muted mt-1 pl-5">
                  {new Date(l.created_at).toLocaleString()}
                  {l.target_id && <> · {l.target_id.slice(0, 12)}…</>}
                </p>
              </div>
            ))}
            {!auditLogs?.length && <p className="p-6 text-sm text-muted text-center">No audit entries</p>}
          </div>
          <div className="border-t border-border px-5 py-3">
            <Link href="/admin/audit" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
              View full audit log <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </AdminCard>
      </div>

      <AdminCard title="Latest subscriptions" desc="One row per guild — current subscription state" className="mt-6">
        <AdminTable>
          <thead>
            <tr>
              <th>Guild</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {activeSubs.slice(0, 8).map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.guild_id}</td>
                <td className="capitalize">{s.plan.replace('_', ' ')}</td>
                <td><span className="badge badge-success capitalize">{s.status}</span></td>
                <td className="text-xs text-muted">{s.expires_at ? formatRelative(s.expires_at) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
        <div className="border-t border-border px-5 py-3">
          <Link href="/admin/subscriptions" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
            Manage all subscriptions <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </AdminCard>
    </div>
  );
}

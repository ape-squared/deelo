import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminAnalytics } from '@/lib/admin-analytics';
import { AdminPageHeader, AdminStatCard, AdminCard } from '@/components/admin/ui';
import { AnalyticsCharts } from '@/components/admin/analytics-charts';
import { Activity, Server, Users, Database, Ticket, Shield, Gift } from 'lucide-react';

export default async function AdminAnalyticsPage() {
  const db = createAdminClient();
  const data = await getAdminAnalytics(db);

  const totalPlans = data.plans.free + data.plans.premium + data.plans.premium_plus;
  const discordGuilds = data.bot.guildCount;
  const dbGuilds = data.counts.guilds;

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        description="Bot health, platform usage, and growth metrics across Deelo."
      />

      <div className={`admin-alert mb-8 ${data.bot.online ? 'admin-alert-success' : 'admin-alert-danger'}`}>
        <Activity className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">{data.bot.online ? 'Bot is online' : 'Bot appears offline'}</p>
          <p className="text-sm opacity-80 mt-0.5">
            Discord: {discordGuilds.toLocaleString()} servers · {data.bot.latencyMs ?? '—'}ms API · DB: {dbGuilds.toLocaleString()} registered guilds
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <AdminStatCard label="Live Discord servers" value={discordGuilds} icon="server" variant="success" trend="via API" />
        <AdminStatCard label="DB guild rows" value={dbGuilds} icon="server" trend={`${Math.max(0, dbGuilds - discordGuilds)} drift`} />
        <AdminStatCard label="Dashboard users" value={data.counts.dashboardUsers} icon="users" />
        <AdminStatCard label="Active subscriptions" value={data.subscriptions.active} icon="credit-card" variant="success" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <AdminStatCard label="Members tracked (XP)" value={data.counts.memberXp} icon="users" />
        <AdminStatCard label="Mod cases" value={data.counts.modCases} icon="alert" />
        <AdminStatCard label="Open tickets" value={data.counts.openTickets} icon="clock" />
        <AdminStatCard label="Active giveaways" value={data.counts.activeGiveaways} icon="crown" />
      </div>

      <AnalyticsCharts growth={data.growth} plans={data.plans} modules={data.modules} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AdminCard title="Feature usage" desc="Configured resources across all guilds">
          <div className="p-5 grid gap-3 sm:grid-cols-2">
            {[
              { icon: Shield, label: 'Filters', value: data.counts.filters },
              { icon: Users, label: 'Auto responders', value: data.counts.autoResponders },
              { icon: Activity, label: 'Auto reacts', value: data.counts.reactionTriggers },
              { icon: Ticket, label: 'Open tickets', value: data.counts.openTickets },
              { icon: Gift, label: 'Redeem codes', value: data.counts.redeemCodes },
              { icon: Database, label: 'Redemptions', value: data.counts.redeemUses },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="admin-mini-stat">
                <Icon className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-lg font-semibold">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Subscription health">
          <div className="p-5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Active</span>
              <span className="font-semibold text-green-400">{data.subscriptions.active}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Cancelled</span>
              <span className="font-semibold">{data.subscriptions.cancelled}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Expiring in 7 days</span>
              <span className="font-semibold text-amber-400">{data.subscriptions.expiring7d}</span>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted mb-3">Plan distribution ({totalPlans} guilds)</p>
              {[
                { label: 'Free', count: data.plans.free, color: 'bg-zinc-500' },
                { label: 'Premium', count: data.plans.premium, color: 'bg-accent' },
                { label: 'Premium+', count: data.plans.premium_plus, color: 'bg-amber-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{label}</span>
                    <span className="text-muted">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: totalPlans ? `${(count / totalPlans) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

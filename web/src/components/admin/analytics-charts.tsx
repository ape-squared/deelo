'use client';

import { AdminCard } from '@/components/admin/ui';

export function AnalyticsCharts({
  growth,
  plans,
  modules,
}: {
  growth: { date: string; count: number }[];
  plans: { free: number; premium: number; premium_plus: number };
  modules: { label: string; count: number }[];
}) {
  const maxGrowth = Math.max(1, ...growth.map((g) => g.count));
  const maxModule = Math.max(1, ...modules.map((m) => m.count));
  const totalPlans = plans.free + plans.premium + plans.premium_plus;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <AdminCard title="Guild signups" desc="Last 7 days" className="lg:col-span-2">
        <div className="p-6">
          <div className="flex items-end gap-2 h-40">
            {growth.map((g) => (
              <div key={g.date} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] text-muted font-mono">{g.count}</span>
                <div
                  className="w-full rounded-t-lg bg-accent/80 transition-all duration-500 min-h-[4px]"
                  style={{ height: `${(g.count / maxGrowth) * 100}%` }}
                />
                <span className="text-[9px] text-muted">{g.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Module adoption" desc="Enabled / configured">
        <div className="p-5 space-y-3">
          {modules.map((m) => (
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">{m.label}</span>
                <span>{m.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent/70"
                  style={{ width: `${(m.count / maxModule) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Revenue mix" className="lg:col-span-3">
        <div className="p-6 flex flex-wrap gap-8 items-center justify-center">
          {[
            { label: 'Free', count: plans.free, color: '#71717a' },
            { label: 'Premium', count: plans.premium, color: '#5865f2' },
            { label: 'Premium+', count: plans.premium_plus, color: '#f59e0b' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center">
              <div
                className="mx-auto mb-2 rounded-full"
                style={{
                  width: 72,
                  height: 72,
                  background: `conic-gradient(${color} ${totalPlans ? (count / totalPlans) * 360 : 0}deg, rgba(255,255,255,0.06) 0deg)`,
                  mask: 'radial-gradient(farthest-side, transparent 58%, black 59%)',
                  WebkitMask: 'radial-gradient(farthest-side, transparent 58%, black 59%)',
                }}
              />
              <p className="font-semibold">{count}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}

import { createAdminClient } from '@/lib/supabase/admin';
import { needsPlanSync, resolveEffectivePlan } from '@/lib/plan-resolve';

type Db = ReturnType<typeof createAdminClient>;

export async function loadGuildWithPlan(db: Db, guildId: string) {
  let { data: guild } = await db.from('guilds').select('*').eq('id', guildId).maybeSingle();
  if (!guild) {
    await db.from('guilds').upsert({ id: guildId }, { onConflict: 'id', ignoreDuplicates: true });
    ({ data: guild } = await db.from('guilds').select('*').eq('id', guildId).single());
  }

  const { data: subscription } = await db
    .from('subscriptions')
    .select('plan, status, expires_at')
    .eq('guild_id', guildId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sync = needsPlanSync(guild!, subscription);
  if (sync) {
    await db.from('guilds').update({ plan: sync.plan, plan_expires_at: sync.plan_expires_at }).eq('id', guildId);
    guild = { ...guild!, plan: sync.plan, plan_expires_at: sync.plan_expires_at };
  } else {
    const effective = resolveEffectivePlan(guild!, subscription);
    guild = { ...guild!, plan: effective.plan, plan_expires_at: effective.plan_expires_at };
  }

  return { guild: guild!, subscription };
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireGuildAccess } from '@/lib/guild-access';
import type { ModuleId } from '@/lib/dashboard-modules';

type Handler = (
  req: NextRequest,
  ctx: { guildId: string; db: ReturnType<typeof createAdminClient>; access: import('@/lib/guild-access').GuildAccess },
) => Promise<NextResponse>;

export function guildRoute(handler: Handler, options: { module?: ModuleId; write?: boolean } = {}) {
  return async (req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) => {
    const { guildId } = await params;
    const write = options.write ?? ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
    const auth = await requireGuildAccess(guildId, { module: options.module, write });
    if ('error' in auth) return auth.error;
    const db = createAdminClient();
    return handler(req, { guildId, db, access: auth.access });
  };
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export function snowflake(value: unknown): string | null {
  if (value === null || value === '') return null;
  const s = String(value).trim();
  return /^\d{17,20}$/.test(s) ? s : null;
}

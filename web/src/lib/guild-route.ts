import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireGuildManager } from '@/lib/guild-auth';

type Handler = (req: NextRequest, ctx: { guildId: string; db: ReturnType<typeof createAdminClient> }) => Promise<NextResponse>;

export function guildRoute(handler: Handler) {
  return async (req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) => {
    const { guildId } = await params;
    const auth = await requireGuildManager(guildId);
    if (auth.error) return auth.error;
    const db = createAdminClient();
    return handler(req, { guildId, db });
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

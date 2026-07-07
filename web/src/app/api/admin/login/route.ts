import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { setAdminSession, verifySupabaseCredentials } from '@/lib/admin-session';

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 });
  }

  const auth = await verifySupabaseCredentials(email, password);
  if (!auth) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: admin, error } = await db.from('admin_users').select('role, email').eq('id', auth.userId).maybeSingle();
  if (error) {
    console.error('admin_users lookup:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!admin) {
    return NextResponse.json({
      error: 'Not authorized as admin. Your Supabase Auth account must also be added to deelo.admin_users. Run: node scripts/grant-admin.mjs <your-email>',
    }, { status: 403 });
  }

  await db.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', auth.userId);

  await setAdminSession({
    userId: auth.userId,
    email: admin.email,
    role: admin.role,
  });

  return NextResponse.json({ ok: true });
}

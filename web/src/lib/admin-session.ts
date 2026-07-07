import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getSessionSecret } from '@/lib/discord-config';

const COOKIE = 'deelo_admin_session';
const secret = () => new TextEncoder().encode(getSessionSecret());

export interface AdminSession {
  userId: string;
  email: string;
  role: string;
}

export async function setAdminSession(session: AdminSession) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

/** Verify credentials against Supabase Auth using service role (server-only). */
export async function verifySupabaseCredentials(email: string, password: string): Promise<{ userId: string; email: string } | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { user?: { id: string; email?: string } };
  if (!data.user?.id) return null;
  return { userId: data.user.id, email: data.user.email ?? email };
}

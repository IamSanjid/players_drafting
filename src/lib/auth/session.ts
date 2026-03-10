import { cookies } from 'next/headers';
import {
  AUTH_COOKIE_NAME,
  AuthSession,
  decodeAuthToken,
  encodeAuthToken,
} from '@/lib/auth/token';
export type { AuthRole, AuthSession } from '@/lib/auth/token';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export async function createAuthSession(session: AuthSession): Promise<void> {
  const cookieStore = await cookies();

  const token = await encodeAuthToken(session, SESSION_TTL_SECONDS);

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return decodeAuthToken(token);
}

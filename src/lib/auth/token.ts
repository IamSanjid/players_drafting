import { JWTPayload, SignJWT, jwtVerify } from 'jose';

export type AuthRole = 'admin' | 'team';

export type AuthSession = {
  role: AuthRole;
  teamId?: string;
};

type SessionJwtPayload = JWTPayload & AuthSession;

export const AUTH_COOKIE_NAME = 'draft_auth';

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    return new TextEncoder().encode(secret);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be configured in production');
  }

  return new TextEncoder().encode('dev-only-change-me');
}

export async function encodeAuthToken(
  session: AuthSession,
  ttlSeconds: number
): Promise<string> {
  return new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getAuthSecret());
}

export async function decodeAuthToken(
  token: string
): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const sessionPayload = payload as SessionJwtPayload;

    if (sessionPayload.role !== 'admin' && sessionPayload.role !== 'team') {
      return null;
    }

    if (sessionPayload.role === 'team' && !sessionPayload.teamId) {
      return null;
    }

    return {
      role: sessionPayload.role,
      teamId: sessionPayload.teamId,
    };
  } catch {
    return null;
  }
}

import { NextResponse } from "next/server";
import { AuthSession, getAuthSession } from "@/lib/auth/session";
export { TEAM_WRITE_ALLOWLIST } from "@/lib/auth/policy";

type AuthSuccess = {
  ok: true;
  session: AuthSession;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

export type AuthResult = AuthSuccess | AuthFailure;

function unauthorized(message: string): AuthFailure {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status: 401 }),
  };
}

function forbidden(message: string): AuthFailure {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status: 403 }),
  };
}

export async function requireAdmin(): Promise<AuthResult> {
  const session = await getAuthSession();
  if (!session) {
    return unauthorized("Authentication required");
  }
  if (session.role !== "admin") {
    return forbidden("Admin privileges required");
  }
  return { ok: true, session };
}

export async function requireTeam(): Promise<AuthResult> {
  const session = await getAuthSession();
  if (!session) {
    return unauthorized("Authentication required");
  }
  if (session.role !== "team" || !session.teamId) {
    return forbidden("Team privileges required");
  }
  return { ok: true, session };
}

export async function requireTeamAccess(teamId: string): Promise<AuthResult> {
  const teamAuth = await requireTeam();
  if (!teamAuth.ok) {
    return teamAuth;
  }

  if (teamAuth.session.teamId !== teamId) {
    return forbidden("You can only act for your own team");
  }

  return teamAuth;
}

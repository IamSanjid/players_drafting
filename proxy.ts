import { NextRequest, NextResponse } from "next/server";
import { isPublicApiWrite, isReadMethod, isTeamWritePath } from "@/lib/auth/policy";
import { AUTH_COOKIE_NAME, decodeAuthToken } from "@/lib/auth/token";

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return decodeAuthToken(token);
}

function hasValidOriginHeader(request: NextRequest): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    return true;
  }

  return originHeader === request.nextUrl.origin;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (isReadMethod(method) || isPublicApiWrite(pathname)) {
    return NextResponse.next();
  }

  // CSRF guard for browser-initiated unsafe methods.
  if (!hasValidOriginHeader(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);

  if (isTeamWritePath(pathname)) {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.role !== "team" || !session.teamId) {
      return NextResponse.json({ error: "Team privileges required" }, { status: 403 });
    }

    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};

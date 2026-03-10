export const TEAM_WRITE_ALLOWLIST = new Set<string>(["/api/draft/pick"]);

export function isTeamWritePath(pathname: string): boolean {
  return TEAM_WRITE_ALLOWLIST.has(pathname);
}

export function isPublicApiWrite(pathname: string): boolean {
  return pathname.startsWith("/api/auth/");
}

export function isReadMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

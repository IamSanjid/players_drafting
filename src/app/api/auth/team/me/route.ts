import { NextResponse } from "next/server";
import { requireTeam } from "@/lib/auth/authorize";

export async function GET() {
  const auth = await requireTeam();
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json({ role: auth.session.role, teamId: auth.session.teamId });
}

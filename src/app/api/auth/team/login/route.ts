import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createAuthSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const teamId = typeof body?.teamId === "string" ? body.teamId : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!teamId || !password) {
      return NextResponse.json({ error: "Team and password are required" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, password: true },
    });

    if (!team || !(await verifyPassword(password, team.password))) {
      return NextResponse.json({ error: "Invalid team credentials" }, { status: 401 });
    }

    await createAuthSession({ role: "team", teamId: team.id });
    return NextResponse.json({ success: true, teamId: team.id });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

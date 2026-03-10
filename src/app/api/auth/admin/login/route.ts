import { NextResponse } from "next/server";
import { createAuthSession } from "@/lib/auth/session";
import { verifyAdminPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!password || !(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
    }

    await createAuthSession({ role: "admin" });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

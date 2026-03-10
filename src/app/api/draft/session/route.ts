import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getErrorMessage, sessionPatchSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth/authorize";

export async function GET() {
  let session = await prisma.draftSession.findFirst();
  
  if (!session) {
    session = await prisma.draftSession.create({
      data: {
        isActive: false,
        draftStatus: "idle",
        allowedCategories: "Both",
        activeCategory: "Oversea",
      }
    });
  }
  
  return NextResponse.json(session);
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = sessionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const session = await prisma.draftSession.findFirst();
    
    if (!session) {
      return NextResponse.json({ error: "No session found" }, { status: 404 });
    }

    // Build the update payload
    const updateData: Prisma.DraftSessionUpdateInput = {};

    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.draftStatus !== undefined) updateData.draftStatus = data.draftStatus;
    if (data.allowedCategories !== undefined) updateData.allowedCategories = data.allowedCategories;
    if (data.activeCategory !== undefined) updateData.activeCategory = data.activeCategory;
    if (data.currentTurnTeamId !== undefined) updateData.currentTurnTeamId = data.currentTurnTeamId;
    if (data.draftOrder !== undefined) updateData.draftOrder = data.draftOrder;
    if (data.draftRound !== undefined) updateData.draftRound = data.draftRound;
    if (data.draftStartedAt !== undefined) {
      if (data.draftStartedAt === null) {
        updateData.draftStartedAt = null;
      } else {
        const parsedDate = new Date(data.draftStartedAt);
        if (Number.isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: "Invalid draftStartedAt date" }, { status: 400 });
        }
        updateData.draftStartedAt = parsedDate;
      }
    }

    const updatedSession = await prisma.draftSession.update({
      where: { id: session.id },
      data: updateData
    });

    return NextResponse.json(updatedSession);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

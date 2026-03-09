import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
  try {
    const data = await request.json();
    let session = await prisma.draftSession.findFirst();
    
    if (!session) {
      return NextResponse.json({ error: "No session found" }, { status: 404 });
    }

    // Build the update payload
    const updateData: any = {};

    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.draftStatus !== undefined) updateData.draftStatus = data.draftStatus;
    if (data.allowedCategories !== undefined) updateData.allowedCategories = data.allowedCategories;
    if (data.activeCategory !== undefined) updateData.activeCategory = data.activeCategory;
    if (data.currentTurnTeamId !== undefined) updateData.currentTurnTeamId = data.currentTurnTeamId;
    if (data.draftOrder !== undefined) updateData.draftOrder = data.draftOrder;
    if (data.draftRound !== undefined) updateData.draftRound = data.draftRound;
    if (data.draftStartedAt !== undefined) updateData.draftStartedAt = data.draftStartedAt ? new Date(data.draftStartedAt) : null;

    const updatedSession = await prisma.draftSession.update({
      where: { id: session.id },
      data: updateData
    });

    return NextResponse.json(updatedSession);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

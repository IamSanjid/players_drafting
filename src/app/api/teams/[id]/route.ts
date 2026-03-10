import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { jsonWithBigInt } from "@/lib/serialization";
import { getErrorMessage, idParamSchema, parseInteger, teamPatchSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth/authorize";
import { hashPassword } from "@/lib/auth/password";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const paramParse = idParamSchema.safeParse(await context.params);
    if (!paramParse.success) {
      return NextResponse.json(
        { error: "Invalid route params", details: paramParse.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = paramParse.data;
    const body = await request.json();
    const bodyParse = teamPatchSchema.safeParse(body);
    if (!bodyParse.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: bodyParse.error.flatten() },
        { status: 400 }
      );
    }

    const data = bodyParse.data;

    const allowedUpdates: Prisma.TeamUpdateInput = {};
    if (data.name !== undefined) allowedUpdates.name = data.name;
    if (data.budgetBDT !== undefined) allowedUpdates.budgetBDT = BigInt(data.budgetBDT);
    if (data.budgetUSD !== undefined) allowedUpdates.budgetUSD = BigInt(data.budgetUSD);
    if (data.password !== undefined) {
      allowedUpdates.password = await hashPassword(data.password);
    }
    if (data.logoUrl !== undefined) allowedUpdates.logoUrl = data.logoUrl;
    if (data.bannerUrl !== undefined) allowedUpdates.bannerUrl = data.bannerUrl;

    if (data.serialNumber !== undefined) {
      const newSerial = parseInteger(data.serialNumber);
      if (!Number.isInteger(newSerial)) {
        return NextResponse.json({ error: "serialNumber must be an integer" }, { status: 400 });
      }
      const targetTeam = await prisma.team.findUnique({ where: { id } });
      
      if (targetTeam && targetTeam.serialNumber !== newSerial) {
         // Check if another team holds the target serial
         const conflictingTeam = await prisma.team.findFirst({ where: { serialNumber: newSerial } });
         
         if (conflictingTeam && conflictingTeam.id !== id) {
           // Swap: give conflicting team the old serial
           await prisma.team.update({ 
              where: { id: conflictingTeam.id }, 
              data: { serialNumber: targetTeam.serialNumber } 
           });
         }
         allowedUpdates.serialNumber = newSerial;
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: allowedUpdates
    });

    return jsonWithBigInt(updatedTeam);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const paramParse = idParamSchema.safeParse(await context.params);
    if (!paramParse.success) {
      return NextResponse.json(
        { error: "Invalid route params", details: paramParse.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = paramParse.data;
    await prisma.pick.deleteMany({ where: { teamId: id }});
    await prisma.player.updateMany({ where: { teamId: id }, data: { teamId: null } });
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

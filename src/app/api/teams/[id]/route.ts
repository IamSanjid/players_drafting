import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const data = await request.json();

    const allowedUpdates: any = {};
    if (data.name !== undefined) allowedUpdates.name = data.name;
    if (data.budgetBDT !== undefined) allowedUpdates.budgetBDT = BigInt(data.budgetBDT);
    if (data.budgetUSD !== undefined) allowedUpdates.budgetUSD = BigInt(data.budgetUSD);
    if (data.password !== undefined) allowedUpdates.password = data.password;
    if (data.logoUrl !== undefined) allowedUpdates.logoUrl = data.logoUrl;
    if (data.bannerUrl !== undefined) allowedUpdates.bannerUrl = data.bannerUrl;

    if (data.serialNumber !== undefined) {
      const newSerial = parseInt(data.serialNumber);
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

    return new NextResponse(JSON.stringify(updatedTeam, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const { id } = await context.params;
    await prisma.pick.deleteMany({ where: { teamId: id }});
    await prisma.player.updateMany({ where: { teamId: id }, data: { teamId: null } });
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

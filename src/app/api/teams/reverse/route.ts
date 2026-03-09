import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { serialNumber: "asc" }
    });

    if (teams.length === 0) {
      return NextResponse.json({ error: "No teams found" }, { status: 400 });
    }

    // Get an array of serial numbers
    const serials = teams.map(t => t.serialNumber);
    
    // Reverse the serials array
    const reversedSerials = [...serials].reverse();

    // Update each team in a transaction
    await prisma.$transaction(
      teams.map((team, index) => {
        return prisma.team.update({
          where: { id: team.id },
          data: { serialNumber: reversedSerials[index] }
        })
      })
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

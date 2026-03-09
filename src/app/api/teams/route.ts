import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const teams = await prisma.team.findMany({
    include: {
      players: true,
      picks: {
        include: { player: true }
      }
    },
    orderBy: { serialNumber: "asc" }
  });
  return new NextResponse(JSON.stringify(teams, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newTeam = await prisma.team.create({
      data: {
        name: data.name,
        serialNumber: parseInt(data.serialNumber),
        budgetBDT: BigInt(data.budgetBDT || "0"),
        budgetUSD: BigInt(data.budgetUSD || "0"),
        password: data.password,
        logoUrl: data.logoUrl || null,
        bannerUrl: data.bannerUrl || null,
      }
    });
    return new NextResponse(JSON.stringify(newTeam, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonWithBigInt } from "@/lib/serialization";
import { getErrorMessage, parseInteger, teamCreateSchema, toNullableBigInt } from "@/lib/validation";

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
  return jsonWithBigInt(teams);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = teamCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const serialNumber = parseInteger(data.serialNumber);
    if (!Number.isInteger(serialNumber)) {
      return NextResponse.json({ error: "serialNumber must be an integer" }, { status: 400 });
    }

    const newTeam = await prisma.team.create({
      data: {
        name: data.name,
        serialNumber,
        budgetBDT: toNullableBigInt(data.budgetBDT) ?? BigInt(0),
        budgetUSD: toNullableBigInt(data.budgetUSD) ?? BigInt(0),
        password: data.password,
        logoUrl: data.logoUrl || null,
        bannerUrl: data.bannerUrl || null,
      }
    });
    return jsonWithBigInt(newTeam);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

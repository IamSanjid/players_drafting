import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { jsonWithBigInt } from "@/lib/serialization";
import { getErrorMessage, playerCreateSchema, toNullableBigInt } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const whereClause: Prisma.PlayerWhereInput = {};
  if (category) {
    whereClause.category = category;
  }
  if (search) {
    whereClause.name = { contains: search };
  }

  const players = await prisma.player.findMany({
    where: whereClause,
    include: { team: true },
    orderBy: [{ subCategory: "asc" }, { name: "asc" }]
  });

  return jsonWithBigInt(players);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = playerCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const newPlayer = await prisma.player.create({
      data: {
        name: data.name,
        category: data.category,
        subCategory: data.subCategory,
        position: data.position,
        priceBDT: toNullableBigInt(data.priceBDT) ?? null,
        priceUSD: toNullableBigInt(data.priceUSD) ?? null,
        country: data.country ?? null,
        availability: data.availability ?? null,
        imageUrl: data.imageUrl ?? null,
        isPreBought: data.isPreBought || false,
        teamId: data.teamId || null,
      }
    });

    if (data.isPreBought && data.teamId) {
       // Create a pick record for tracking, but DO NOT substract from budget
       await prisma.pick.create({
         data: {
           teamId: data.teamId,
           playerId: newPlayer.id,
         }
       })
    }

    return jsonWithBigInt(newPlayer);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

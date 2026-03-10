import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { jsonWithBigInt } from "@/lib/serialization";
import { getErrorMessage, playerCreateSchema, toNullableBigInt } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth/authorize";

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
    select: {
      id: true,
      name: true,
      category: true,
      subCategory: true,
      position: true,
      priceBDT: true,
      priceUSD: true,
      country: true,
      availability: true,
      imageUrl: true,
      isPreBought: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          serialNumber: true,
          budgetBDT: true,
          budgetUSD: true,
          logoUrl: true,
          bannerUrl: true,
        },
      },
    },
    orderBy: [{ subCategory: "asc" }, { name: "asc" }]
  });

  return jsonWithBigInt(players);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

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

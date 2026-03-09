import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let whereClause: any = {};
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

  return new NextResponse(JSON.stringify(players, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newPlayer = await prisma.player.create({
      data: {
        name: data.name,
        category: data.category,
        subCategory: data.subCategory,
        position: data.position,
        priceBDT: data.priceBDT ? BigInt(data.priceBDT) : null,
        priceUSD: data.priceUSD ? BigInt(data.priceUSD) : null,
        country: data.country,
        availability: data.availability,
        imageUrl: data.imageUrl,
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

    return new NextResponse(JSON.stringify(newPlayer, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

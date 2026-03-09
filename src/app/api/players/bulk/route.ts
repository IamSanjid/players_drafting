import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json(); // Expected to be an array of player objects
    
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "No players provided for import" }, { status: 400 });
    }

    const result = await prisma.$transaction(
      data.map((player: any) => {
        return prisma.player.create({
          data: {
            name: player.name,
            category: player.category, // "Oversea" | "Local"
            subCategory: player.subCategory,
            position: player.position,
            priceBDT: player.priceBDT ? BigInt(player.priceBDT) : null,
            priceUSD: player.priceUSD ? BigInt(player.priceUSD) : null,
            country: player.country || null,
            availability: player.availability || null,
            imageUrl: player.imageUrl || null,
            isPreBought: false, // Bulk uploads are not pre-bought by default
            teamId: null,
          }
        });
      })
    );

    return NextResponse.json({ success: true, count: result.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json({ error: "Category is required for bulk deletion" }, { status: 400 });
    }

    // Capture players to delete picks
    const playersToDelete = await prisma.player.findMany({
      where: { category },
      select: { id: true }
    });
    const playerIds = playersToDelete.map((p: any) => p.id);

    await prisma.$transaction([
      prisma.pick.deleteMany({ where: { playerId: { in: playerIds } } }),
      prisma.player.deleteMany({ where: { category } })
    ]);

    return NextResponse.json({ success: true, deletedCount: playerIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

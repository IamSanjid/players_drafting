import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  bulkPlayersSchema,
  categoryQuerySchema,
  getErrorMessage,
  toNullableBigInt,
} from '@/lib/validation';
import { requireAdmin } from '@/lib/auth/authorize';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = bulkPlayersSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = await prisma.$transaction(
      data.map((player) => {
        return prisma.player.create({
          data: {
            name: player.name,
            category: player.category, // "Oversea" | "Local"
            subCategory: player.subCategory,
            position: player.position,
            priceBDT: toNullableBigInt(player.priceBDT) ?? null,
            priceUSD: toNullableBigInt(player.priceUSD) ?? null,
            country: player.country || null,
            availability: player.availability || null,
            imageUrl: player.imageUrl || null,
            isPreBought: false, // Bulk uploads are not pre-bought by default
            teamId: null,
          },
        });
      })
    );

    return NextResponse.json({ success: true, count: result.length });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = categoryQuerySchema.safeParse({
      category: searchParams.get('category'),
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Category is required for bulk deletion',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { category } = parsed.data;

    // Capture players to delete picks
    const playersToDelete = await prisma.player.findMany({
      where: { category },
      select: { id: true },
    });
    const playerIds = playersToDelete.map((p) => p.id);

    await prisma.$transaction([
      prisma.pick.deleteMany({ where: { playerId: { in: playerIds } } }),
      prisma.player.deleteMany({ where: { category } }),
    ]);

    return NextResponse.json({ success: true, deletedCount: playerIds.length });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

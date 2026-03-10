import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { jsonWithBigInt } from '@/lib/serialization';
import {
  getErrorMessage,
  idParamSchema,
  playerPatchSchema,
  toNullableBigInt,
} from '@/lib/validation';
import { requireAdmin } from '@/lib/auth/authorize';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const paramParse = idParamSchema.safeParse(await context.params);
    if (!paramParse.success) {
      return NextResponse.json(
        { error: 'Invalid route params', details: paramParse.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = paramParse.data;
    const body = await request.json();
    const bodyParse = playerPatchSchema.safeParse(body);
    if (!bodyParse.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyParse.error.flatten() },
        { status: 400 }
      );
    }

    const data = bodyParse.data;

    // 1. Fetch current player state
    const currentPlayer = await prisma.player.findUnique({
      where: { id },
      include: { team: true },
    });

    if (!currentPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const updateData: Prisma.PlayerUncheckedUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subCategory !== undefined)
      updateData.subCategory = data.subCategory;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.priceBDT !== undefined)
      updateData.priceBDT = toNullableBigInt(data.priceBDT) ?? null;
    if (data.priceUSD !== undefined)
      updateData.priceUSD = toNullableBigInt(data.priceUSD) ?? null;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.availability !== undefined)
      updateData.availability = data.availability;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.isPreBought !== undefined)
      updateData.isPreBought = data.isPreBought;

    // Handle teamId changes (Unassign or Reassign)
    const newTeamId =
      data.teamId === undefined ? currentPlayer.teamId : data.teamId;
    const teamChanged = newTeamId !== currentPlayer.teamId;

    const resolvedPriceBDT =
      data.priceBDT !== undefined
        ? (toNullableBigInt(data.priceBDT) ?? null)
        : currentPlayer.priceBDT;
    const resolvedPriceUSD =
      data.priceUSD !== undefined
        ? (toNullableBigInt(data.priceUSD) ?? null)
        : currentPlayer.priceUSD;
    const priceBDT = resolvedPriceBDT ?? BigInt(0);
    const priceUSD = resolvedPriceUSD ?? BigInt(0);
    const isLocal = (data.category || currentPlayer.category) === 'Local';

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Logic for budget reversals/charges
        if (teamChanged) {
          const wasPreBought = currentPlayer.isPreBought;
          const willBePreBought =
            data.isPreBought !== undefined ? data.isPreBought : wasPreBought;

          // A. Refund old team if they weren't pre-bought
          if (currentPlayer.teamId && !wasPreBought) {
            await tx.team.update({
              where: { id: currentPlayer.teamId },
              data: {
                budgetBDT: isLocal ? { increment: priceBDT } : undefined,
                budgetUSD: !isLocal ? { increment: priceUSD } : undefined,
              },
            });
          }

          // B. Charge new team if not pre-bought
          if (newTeamId && !willBePreBought) {
            const targetTeam = await tx.team.findUnique({
              where: { id: newTeamId },
            });
            if (targetTeam) {
              // Basic checkout for target team
              if (isLocal && targetTeam.budgetBDT < priceBDT)
                throw new Error('Insufficient BDT budget');
              if (!isLocal && targetTeam.budgetUSD < priceUSD)
                throw new Error('Insufficient USD budget');

              await tx.team.update({
                where: { id: newTeamId },
                data: {
                  budgetBDT: isLocal ? { decrement: priceBDT } : undefined,
                  budgetUSD: !isLocal ? { decrement: priceUSD } : undefined,
                },
              });
            }
          }

          // C. Sync Pick Record
          if (!newTeamId) {
            await tx.pick.deleteMany({ where: { playerId: id } });
          } else {
            await tx.pick.upsert({
              where: { playerId: id },
              update: { teamId: newTeamId },
              create: { playerId: id, teamId: newTeamId },
            });
          }

          updateData.teamId = newTeamId;
        } else if (
          data.isPreBought !== undefined &&
          data.isPreBought !== currentPlayer.isPreBought
        ) {
          if (newTeamId) {
            if (currentPlayer.isPreBought) {
              const targetTeam = await tx.team.findUnique({
                where: { id: newTeamId },
              });
              if (targetTeam) {
                // Basic checkout for target team
                if (isLocal && targetTeam.budgetBDT < priceBDT)
                  throw new Error('Insufficient BDT budget');
                if (!isLocal && targetTeam.budgetUSD < priceUSD)
                  throw new Error('Insufficient USD budget');

                await tx.team.update({
                  where: { id: newTeamId },
                  data: {
                    budgetBDT: isLocal ? { decrement: priceBDT } : undefined,
                    budgetUSD: !isLocal ? { decrement: priceUSD } : undefined,
                  },
                });
              }
            } else {
              const targetTeam = await tx.team.findUnique({
                where: { id: newTeamId },
              });
              if (targetTeam) {
                await tx.team.update({
                  where: { id: newTeamId },
                  data: {
                    budgetBDT: isLocal ? { increment: priceBDT } : undefined,
                    budgetUSD: !isLocal ? { increment: priceUSD } : undefined,
                  },
                });
              }
            }
          } else {
            updateData.isPreBought = false;
          }
        }

        return await tx.player.update({
          where: { id },
          data: updateData,
          include: { team: true },
        });
      }
    );

    return jsonWithBigInt(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const paramParse = idParamSchema.safeParse(await context.params);
    if (!paramParse.success) {
      return NextResponse.json(
        { error: 'Invalid route params', details: paramParse.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = paramParse.data;

    // Cleanup picks before deleting the player
    await prisma.pick.deleteMany({ where: { playerId: id } });
    await prisma.player.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}

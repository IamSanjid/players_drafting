import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { jsonWithBigInt } from "@/lib/serialization";
import { idParamSchema, assignTeamSchema, getErrorMessage } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth/authorize";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const paramParse = idParamSchema.safeParse(await context.params);
    if (!paramParse.success) {
      return NextResponse.json(
        { error: "Invalid route params", details: paramParse.error.flatten() },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = assignTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const playerId = paramParse.data.id;
    const { teamId } = parsed.data;

    // 1. Fetch player and team
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true },
    });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!player || !team) {
      return NextResponse.json({ error: "Player or Team not found" }, { status: 404 });
    }

    if (player.teamId === teamId) {
      return NextResponse.json({ error: "Player already assigned to this team" }, { status: 400 });
    }

    const isLocal = player.category === "Local";
    const priceBDT = BigInt(player.priceBDT || 0);
    const priceUSD = BigInt(player.priceUSD || 0);

    // 2. Transaction Logic
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Fetch fresh team data within transaction
      const targetTeam = await tx.team.findUnique({ where: { id: teamId } });
      if (!targetTeam) throw new Error("Target team not found");

      // A. Reverse logic if player was previously assigned to a different team
      if (player.teamId) {
        const oldTeam = await tx.team.findUnique({ where: { id: player.teamId } });
        if (oldTeam && !player.isPreBought) {
          await tx.team.update({
            where: { id: player.teamId },
            data: {
              budgetBDT: isLocal ? { increment: priceBDT } : undefined,
              budgetUSD: !isLocal ? { increment: priceUSD } : undefined,
            }
          });
        }
      }

      // B. Budget Logic for new assignment (if not pre-bought)
      if (!player.isPreBought) {
        if (isLocal && targetTeam.budgetBDT < priceBDT) {
          throw new Error("Insufficient BDT budget in target franchise");
        }
        if (!isLocal && targetTeam.budgetUSD < priceUSD) {
          throw new Error("Insufficient USD budget in target franchise");
        }

        await tx.team.update({
          where: { id: teamId },
          data: {
            budgetBDT: isLocal ? { decrement: priceBDT } : undefined,
            budgetUSD: !isLocal ? { decrement: priceUSD } : undefined,
          }
        });
      }

      // C. Update Player
      const updatedPlayer = await tx.player.update({
        where: { id: playerId },
        data: { teamId: teamId },
        include: {
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
        }
      });

      // D. Upsert Pick Record
      await tx.pick.upsert({
        where: { playerId: playerId },
        update: { teamId: teamId },
        create: {
          playerId: playerId,
          teamId: teamId
        }
      });

      return {
        player: updatedPlayer,
        team: {
          id: targetTeam.id,
          name: targetTeam.name,
          serialNumber: targetTeam.serialNumber,
          budgetBDT: targetTeam.budgetBDT,
          budgetUSD: targetTeam.budgetUSD,
          logoUrl: targetTeam.logoUrl,
          bannerUrl: targetTeam.bannerUrl,
        },
      };
    });

    return jsonWithBigInt({ success: true, ...result }, { status: 200 });

  } catch (error: unknown) {
    console.error("Assignment error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { jsonWithBigInt } from "@/lib/serialization";
import { draftPickSchema, getErrorMessage } from "@/lib/validation";
import { requireTeamAccess } from "@/lib/auth/authorize";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = draftPickSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { teamId, playerId } = parsed.data;
    const auth = await requireTeamAccess(teamId);
    if (!auth.ok) {
      return auth.response;
    }

    // Wrap in a transaction to ensure integrity
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const session = await tx.draftSession.findFirst();
      if (!session) throw new Error("No active draft session");
      if (!session.isActive) throw new Error("Draft session is currently paused");

      if (session.currentTurnTeamId !== teamId) {
        throw new Error("It is not your turn to pick");
      }

      const player = await tx.player.findUnique({ where: { id: playerId } });
      if (!player) throw new Error("Player not found");
      if (player.teamId) throw new Error("Player is already drafted");

      if (session.allowedCategories !== "Both" && session.allowedCategories !== player.category) {
        throw new Error(`Only ${session.allowedCategories} players can be drafted currently.`);
      }
      
      if (session.activeCategory !== player.category) {
        throw new Error(`You must pick a player from the ${session.activeCategory} category right now.`);
      }

      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team) throw new Error("Team not found");

      // Budget logic
      if (player.category === "Local" && player.priceBDT != null) {
        if (team.budgetBDT < player.priceBDT) throw new Error("Not enough BDT budget");
        await tx.team.update({
          where: { id: team.id },
          data: { budgetBDT: team.budgetBDT - player.priceBDT }
        });
      } else if (player.category === "Oversea" && player.priceUSD != null) {
        if (team.budgetUSD < player.priceUSD) throw new Error("Not enough USD budget");
        await tx.team.update({
          where: { id: team.id },
          data: { budgetUSD: team.budgetUSD - player.priceUSD }
        });
      }

      // Mark the player as drafted
      await tx.player.update({
        where: { id: player.id },
        data: { teamId: team.id }
      });

      // Create pick record
      const pick = await tx.pick.create({
        data: {
          teamId: team.id,
          playerId: player.id,
        },
        include: {
          player: true,
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

      // Move turn to the next team
      const allTeams = await tx.team.findMany({ orderBy: { serialNumber: "asc" }});
      let nextTurnTeamId = session.currentTurnTeamId;

      if (allTeams.length > 0) {
        const currentIndex = allTeams.findIndex((t) => t.id === session.currentTurnTeamId);
        const nextIndex = (currentIndex + 1) % allTeams.length;
        nextTurnTeamId = allTeams[nextIndex].id;
      }

      // Check if every team has drafted at least once IN THIS SESSION — auto-end if so
      const picksPerTeam = await tx.pick.groupBy({
        by: ["teamId"],
        where: session.draftStartedAt
          ? { createdAt: { gte: session.draftStartedAt } }
          : {},
      });
      const allTeamsDrafted = picksPerTeam.length >= allTeams.length && allTeams.length > 0;

      await tx.draftSession.update({
        where: { id: session.id },
        data: allTeamsDrafted
          ? { isActive: false, draftStatus: "ended", currentTurnTeamId: null }
          : { currentTurnTeamId: nextTurnTeamId },
      });

      return { ...pick, draftAutoEnded: allTeamsDrafted };
    });

    return jsonWithBigInt(result);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

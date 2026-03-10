import { hash } from "bcryptjs";
import prisma from "../src/lib/prisma";

async function main() {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, password: true },
  });

  const plainTextTeams = teams.filter((team) => !team.password.startsWith("$2"));

  if (plainTextTeams.length === 0) {
    console.log("No plaintext team passwords found.");
    return;
  }

  for (const team of plainTextTeams) {
    const hashedPassword = await hash(team.password, 10);
    await prisma.team.update({
      where: { id: team.id },
      data: { password: hashedPassword },
    });
    console.log(`Hashed password for team: ${team.name}`);
  }

  console.log(`Done. Updated ${plainTextTeams.length} team password(s).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

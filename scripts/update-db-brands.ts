import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const r1 = await prisma.product.updateMany({
    where: { brand: "SGT Professional" },
    data: { brand: "Salon Care" },
  });
  const r2 = await prisma.product.updateMany({
    where: { brand: "Shree Gopi Professional" },
    data: { brand: "Pro Beauty" },
  });
  console.log(`Updated ${r1.count} + ${r2.count} product brands in PostgreSQL.`);

  const distinct = await prisma.product.groupBy({ by: ["brand"] });
  console.log("Distinct brands in database now:", distinct.map(d => d.brand));
}

main().catch(console.error).finally(() => prisma.$disconnect());

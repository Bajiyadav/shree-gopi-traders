import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING LATEST PRODUCTS AND IMAGE FILES ===");

  const skus = [
    "SGT-BRB-STATION-CLIPPER-TRIMMER-SET",
    "SGT-BRB-IONIC-BLOW-DRYER-GREY-STD",
    "SGT-BRB-SPRAY-NECK-DUSTER-SET"
  ];

  for (const sku of skus) {
    const p = await prisma.product.findFirst({ where: { sku } });
    if (!p) {
      console.log(`❌ Product not found for SKU: ${sku}`);
      continue;
    }

    console.log(`\nProduct: [${p.sku}] ${p.name}`);
    console.log(`DB images array:`, p.images);

    for (const imgUrl of p.images) {
      if (imgUrl.startsWith("/")) {
        const fullPath = path.join(process.cwd(), "public", imgUrl);
        const exists = fs.existsSync(fullPath);
        const stats = exists ? fs.statSync(fullPath) : null;
        console.log(`  File [${fullPath}] -> Exists: ${exists}, Size: ${stats ? stats.size : 0} bytes`);
      } else {
        console.log(`  External URL: ${imgUrl}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

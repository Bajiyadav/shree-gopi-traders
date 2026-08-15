import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const realProducts = [
  // L'OREAL
  { name: "L'Oreal Professionnel Serie Expert Absolut Repair Shampoo", brand: "L'OREAL", sku: "LOR-SERIE-ABS-SHAMP-300", category: "Hair Care", basePrice: 695 },
  { name: "L'Oreal Professionnel Serie Expert Absolut Repair Mask", brand: "L'OREAL", sku: "LOR-SERIE-ABS-MASK-250", category: "Hair Care", basePrice: 860 },
  { name: "L'Oreal Professionnel X-Tenso Care Pro-Keratin Shampoo", brand: "L'OREAL", sku: "LOR-XTENSO-SHAMP-250", category: "Hair Care", basePrice: 650 },
  { name: "L'Oreal Professionnel X-Tenso Care Masque", brand: "L'OREAL", sku: "LOR-XTENSO-MASK-196", category: "Hair Care", basePrice: 750 },
  { name: "L'Oreal Professionnel Tecni Art Web Design Sculpting Paste", brand: "L'OREAL", sku: "LOR-TECNI-WEB-150", category: "Hair Styling", basePrice: 700 },

  // MATRIX
  { name: "Matrix Opti Care Professional Smooth Straight Shampoo", brand: "MATRIX", sku: "MAT-OPTI-SHAMP-200", category: "Hair Care", basePrice: 335 },
  { name: "Matrix Opti Care Professional Smooth Straight Conditioner", brand: "MATRIX", sku: "MAT-OPTI-COND-98", category: "Hair Care", basePrice: 235 },
  { name: "Matrix Opti Care Professional Smooth Straight Masque", brand: "MATRIX", sku: "MAT-OPTI-MASK-490", category: "Hair Care", basePrice: 650 },
  { name: "Matrix Biolage Smoothproof Smoothing Serum", brand: "MATRIX", sku: "MAT-BIOL-SERUM-100", category: "Hair Care", basePrice: 300 },
  { name: "Matrix SoColor Beauty Permanent Hair Color", brand: "MATRIX", sku: "MAT-SOCOLOR-90", category: "Hair Color & Treatment", basePrice: 225 },

  // BIOLAGE
  { name: "Biolage Advanced Fiberstrong Shampoo", brand: "BIOLAGE", sku: "BIO-FIBER-SHAMP-200", category: "Hair Care", basePrice: 400 },
  { name: "Biolage Advanced Fiberstrong Conditioner", brand: "BIOLAGE", sku: "BIO-FIBER-COND-98", category: "Hair Care", basePrice: 300 },
  { name: "Biolage Scalppure Anti-Dandruff Shampoo", brand: "BIOLAGE", sku: "BIO-SCALP-SHAMP-200", category: "Hair Care", basePrice: 400 },
  { name: "Biolage Deep Smoothing Serum", brand: "BIOLAGE", sku: "BIO-SMOOTH-SERUM-100", category: "Hair Care", basePrice: 315 },
  { name: "Biolage Colorlast Color Protecting Shampoo", brand: "BIOLAGE", sku: "BIO-COLOR-SHAMP-200", category: "Hair Care", basePrice: 400 },

  // RAAGA
  { name: "Raaga Professional Pro Botanix Anti-Dandruff Shampoo", brand: "RAAGA", sku: "RAA-PRO-AD-SHAMP-200", category: "Hair Care", basePrice: 200 },
  { name: "Raaga Professional Express Facial Kit", brand: "RAAGA", sku: "RAA-EXP-FACIAL-1", category: "Facial Products", basePrice: 950 },
  { name: "Raaga Professional De-Tan Cream", brand: "RAAGA", sku: "RAA-DETAN-500", category: "Facial Products", basePrice: 1100 },
  { name: "Raaga Professional Liposoluble Wax - White Chocolate", brand: "RAAGA", sku: "RAA-WAX-WC-800", category: "Waxing", basePrice: 900 },
  { name: "Raaga Professional Fairness Facial Kit", brand: "RAAGA", sku: "RAA-FAIR-FACIAL-1", category: "Facial Products", basePrice: 1200 },

  // KRONE
  { name: "Krone Professional Keratin Infused Shampoo", brand: "KRONE", sku: "KRO-KER-SHAMP-250", category: "Hair Care", basePrice: 450 },
  { name: "Krone Professional Keratin Smooth Masque", brand: "KRONE", sku: "KRO-KER-MASK-200", category: "Hair Care", basePrice: 550 },
  { name: "Krone Professional Hair Styling Gel", brand: "KRONE", sku: "KRO-GEL-250", category: "Hair Styling", basePrice: 300 },
  { name: "Krone Professional Volume Hair Spray", brand: "KRONE", sku: "KRO-SPRAY-300", category: "Hair Styling", basePrice: 450 },
  { name: "Krone Professional Hair Clipper", brand: "KRONE", sku: "KRO-CLIPPER-1", category: "Hair Equipment", basePrice: 1200 },

  // DREAMRON
  { name: "Dreamron Professional Hair Color Cream", brand: "DREAMRON", sku: "DRE-COLOR-60", category: "Hair Color & Treatment", basePrice: 150 },
  { name: "Dreamron Developer Cream 20 Vol", brand: "DREAMRON", sku: "DRE-DEV-20-1000", category: "Hair Color & Treatment", basePrice: 250 },
  { name: "Dreamron Keratin Hair Treatment", brand: "DREAMRON", sku: "DRE-KER-TREAT-500", category: "Hair Color & Treatment", basePrice: 850 },
  { name: "Dreamron Spa Nourishing Conditioner", brand: "DREAMRON", sku: "DRE-SPA-COND-500", category: "Hair Care", basePrice: 450 },
  { name: "Dreamron Anti-Dandruff Shampoo", brand: "DREAMRON", sku: "DRE-AD-SHAMP-500", category: "Hair Care", basePrice: 450 },

  // BIO KERATIN
  { name: "Bio Keratin Luxury Shampoo", brand: "BIO KERATIN", sku: "BK-LUX-SHAMP-300", category: "Hair Care", basePrice: 600 },
  { name: "Bio Keratin Luxury Masque", brand: "BIO KERATIN", sku: "BK-LUX-MASK-250", category: "Hair Care", basePrice: 750 },
  { name: "Bio Keratin Hair Serum", brand: "BIO KERATIN", sku: "BK-SERUM-100", category: "Hair Care", basePrice: 500 },
  { name: "Bio Keratin Smoothening Treatment", brand: "BIO KERATIN", sku: "BK-SMOOTH-1000", category: "Hair Color & Treatment", basePrice: 3500 },
  { name: "Bio Keratin Color Protect Shampoo", brand: "BIO KERATIN", sku: "BK-COL-SHAMP-300", category: "Hair Care", basePrice: 600 },

  // ASTA BERRY
  { name: "Asta Berry Diamond Facial Kit", brand: "ASTA BERRY", sku: "AST-DIA-FACIAL-1", category: "Facial Products", basePrice: 850 },
  { name: "Asta Berry Gold Facial Kit", brand: "ASTA BERRY", sku: "AST-GOLD-FACIAL-1", category: "Facial Products", basePrice: 750 },
  { name: "Asta Berry Papaya Facial Kit", brand: "ASTA BERRY", sku: "AST-PAP-FACIAL-1", category: "Facial Products", basePrice: 650 },
  { name: "Asta Berry Wine Facial Kit", brand: "ASTA BERRY", sku: "AST-WINE-FACIAL-1", category: "Facial Products", basePrice: 900 },
  { name: "Asta Berry De-Tan Sun Block", brand: "ASTA BERRY", sku: "AST-DETAN-100", category: "Skin Care", basePrice: 250 },

  // LILIUM
  { name: "Lilium Fruit Facial Kit", brand: "LILIUM", sku: "LIL-FRUIT-FACIAL-1", category: "Facial Products", basePrice: 650 },
  { name: "Lilium Gold Facial Kit", brand: "LILIUM", sku: "LIL-GOLD-FACIAL-1", category: "Facial Products", basePrice: 750 },
  { name: "Lilium Papaya Facial Kit", brand: "LILIUM", sku: "LIL-PAP-FACIAL-1", category: "Facial Products", basePrice: 650 },
  { name: "Lilium Diamond Facial Kit", brand: "LILIUM", sku: "LIL-DIA-FACIAL-1", category: "Facial Products", basePrice: 850 },
  { name: "Lilium Pearl Facial Kit", brand: "LILIUM", sku: "LIL-PEARL-FACIAL-1", category: "Facial Products", basePrice: 800 },

  // AROMA MAGIC
  { name: "Aroma Magic Pearl Facial Kit", brand: "AROMA MAGIC", sku: "AM-PEARL-FACIAL-1", category: "Facial Products", basePrice: 1100 },
  { name: "Aroma Magic Bridal Glow Facial Kit", brand: "AROMA MAGIC", sku: "AM-BRIDAL-FACIAL-1", category: "Facial Products", basePrice: 1200 },
  { name: "Aroma Magic Skin Glow Facial Kit", brand: "AROMA MAGIC", sku: "AM-GLOW-FACIAL-1", category: "Facial Products", basePrice: 950 },
  { name: "Aroma Magic Silver Facial Kit", brand: "AROMA MAGIC", sku: "AM-SILVER-FACIAL-1", category: "Facial Products", basePrice: 1050 },
  { name: "Aroma Magic Gold Facial Kit", brand: "AROMA MAGIC", sku: "AM-GOLD-FACIAL-1", category: "Facial Products", basePrice: 1150 },
  { name: "Aroma Magic Diamond Facial Kit", brand: "AROMA MAGIC", sku: "AM-DIA-FACIAL-1", category: "Facial Products", basePrice: 1300 },

  // RICHLON
  { name: "Richelon White Chocolate Wax", brand: "RICHLON", sku: "RICH-WC-WAX-800", category: "Waxing", basePrice: 850 },
  { name: "Richelon Dark Chocolate Wax", brand: "RICHLON", sku: "RICH-DC-WAX-800", category: "Waxing", basePrice: 850 },
  { name: "Richelon Strawberry Wax", brand: "RICHLON", sku: "RICH-STR-WAX-800", category: "Waxing", basePrice: 850 },
  { name: "Richelon Aloe Vera Wax", brand: "RICHLON", sku: "RICH-ALOE-WAX-800", category: "Waxing", basePrice: 850 },
  { name: "Richelon Pre Wax Gel", brand: "RICHLON", sku: "RICH-PRE-WAX-500", category: "Waxing", basePrice: 450 },

  // RICA
  { name: "Rica White Chocolate Liposoluble Wax", brand: "RICA", sku: "RICA-WC-WAX-800", category: "Waxing", basePrice: 1050 },
  { name: "Rica Dark Chocolate Liposoluble Wax", brand: "RICA", sku: "RICA-DC-WAX-800", category: "Waxing", basePrice: 1050 },
  { name: "Rica Strawberry Liposoluble Wax", brand: "RICA", sku: "RICA-STR-WAX-800", category: "Waxing", basePrice: 1050 },
  { name: "Rica Aloe Vera Liposoluble Wax", brand: "RICA", sku: "RICA-ALOE-WAX-800", category: "Waxing", basePrice: 1050 },
  { name: "Rica Argan Oil Liposoluble Wax", brand: "RICA", sku: "RICA-ARGAN-WAX-800", category: "Waxing", basePrice: 1150 },
  { name: "Rica Cotton Milk Post Wax Lotion", brand: "RICA", sku: "RICA-POST-WAX-250", category: "Waxing", basePrice: 650 },

  // STREAX
  { name: "Streax Professional Vitariche Care Repair Max Shampoo", brand: "STREAX", sku: "STR-REPAIR-SHAMP-300", category: "Hair Care", basePrice: 350 },
  { name: "Streax Professional Vitariche Care Repair Max Masque", brand: "STREAX", sku: "STR-REPAIR-MASK-200", category: "Hair Care", basePrice: 450 },
  { name: "Streax Professional Argan Secret Hair Colour", brand: "STREAX", sku: "STR-ARGAN-COL-100", category: "Hair Color & Treatment", basePrice: 180 },
  { name: "Streax Professional Canvoline Straightening Cream", brand: "STREAX", sku: "STR-CANV-STR-500", category: "Hair Color & Treatment", basePrice: 950 },
  { name: "Streax Professional Vitariche Gloss Hair Serum", brand: "STREAX", sku: "STR-GLOSS-SERUM-100", category: "Hair Care", basePrice: 250 },

  // SCHWARZKOPF
  { name: "Schwarzkopf Professional Bonacure Peptide Repair Rescue Shampoo", brand: "SCHWARZKOPF", sku: "SCH-BC-REPAIR-SHAMP-250", category: "Hair Care", basePrice: 900 },
  { name: "Schwarzkopf Professional Bonacure Peptide Repair Rescue Treatment", brand: "SCHWARZKOPF", sku: "SCH-BC-REPAIR-MASK-200", category: "Hair Care", basePrice: 1050 },
  { name: "Schwarzkopf Professional Osis+ Session Extreme Hold Hairspray", brand: "SCHWARZKOPF", sku: "SCH-OSIS-SPRAY-500", category: "Hair Styling", basePrice: 850 },
  { name: "Schwarzkopf Professional Osis+ Dust It Mattifying Powder", brand: "SCHWARZKOPF", sku: "SCH-OSIS-DUST-10", category: "Hair Styling", basePrice: 750 },
  { name: "Schwarzkopf Professional Igora Royal Hair Color", brand: "SCHWARZKOPF", sku: "SCH-IGORA-ROYAL-60", category: "Hair Color & Treatment", basePrice: 350 },

  // WELLA
  { name: "Wella Professionals Invigo Nutri Enrich Deep Nourishing Shampoo", brand: "WELLA", sku: "WEL-INV-SHAMP-250", category: "Hair Care", basePrice: 650 },
  { name: "Wella Professionals Invigo Nutri Enrich Deep Nourishing Mask", brand: "WELLA", sku: "WEL-INV-MASK-150", category: "Hair Care", basePrice: 750 },
  { name: "Wella Professionals Elements Renewing Shampoo", brand: "WELLA", sku: "WEL-ELEM-SHAMP-250", category: "Hair Care", basePrice: 700 },
  { name: "Wella Professionals EIMI Thermal Image Heat Protection Spray", brand: "WELLA", sku: "WEL-EIMI-THERM-150", category: "Hair Styling", basePrice: 650 },
  { name: "Wella Professionals Koleston Perfect Me+ Hair Color", brand: "WELLA", sku: "WEL-KOL-PERF-60", category: "Hair Color & Treatment", basePrice: 400 },

  // SP
  { name: "Wella SP LuxeOil Reconstructive Elixir", brand: "SP", sku: "SP-LUXE-ELIXIR-100", category: "Hair Care", basePrice: 1100 },
  { name: "Wella SP Clear Scalp Shampoo", brand: "SP", sku: "SP-CLEAR-SHAMP-250", category: "Hair Care", basePrice: 1050 },
  { name: "Wella SP Hydrate Mask", brand: "SP", sku: "SP-HYD-MASK-200", category: "Hair Care", basePrice: 1250 },
  { name: "Wella SP Volumize Shampoo", brand: "SP", sku: "SP-VOL-SHAMP-250", category: "Hair Care", basePrice: 1050 },
  { name: "Wella SP Color Save Mask", brand: "SP", sku: "SP-COL-MASK-200", category: "Hair Care", basePrice: 1250 }
];

async function main() {
  const categories = await prisma.category.findMany();
  const categoryMap: Record<string, string> = {};
  categories.forEach(c => { categoryMap[c.name] = c.id; });
  
  // Fallback category if not matched
  const fallbackCat = categories[0].id;
  
  let added = 0;
  for (const p of realProducts) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    // Check if category exists
    let catId = categoryMap[p.category];
    if (!catId) {
      catId = fallbackCat;
      console.log(`Warning: Category ${p.category} not found. Using fallback.`);
    }

    try {
      await prisma.product.upsert({
        where: { sku: p.sku },
        update: {
          name: p.name,
          slug,
          brand: p.brand,
          basePrice: p.basePrice
        },
        create: {
          name: p.name,
          slug,
          sku: p.sku,
          brand: p.brand,
          basePrice: p.basePrice,
          categoryId: catId,
          description: `Genuine ${p.brand} product for professional salon use.`,
          images: [],
          isActive: true
        }
      });
      added++;
    } catch (e: any) {
      console.error(`Failed to upsert ${p.sku}:`, e.message);
    }
  }
  console.log(`Successfully processed ${added} real products.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

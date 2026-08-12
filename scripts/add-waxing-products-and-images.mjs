import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WAXING_IMAGES = [
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523007/honey-soft-wax_ewlfvd.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523007/Starter_Kit_-_White_Warmer___FF_Beads_35ece393-1149-4d6c-9aef-bc5f51398443_1600x_lrpsaz.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523007/450_o5s3lt.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523006/81EremQo7vL._SL1500_646f359d-89f7-40eb-9ded-2480aa23f8e2_qhfv9o.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523006/Premium_waxing_kit_listing_images_-_08black_q1k22c.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523006/NEWOGWaxWarmerKit-TressWebsite_3copy_n8qm4w.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523006/Premium_waxing_kit_Tik_tok_hero_01_d1f2370b-87a2-494c-a41c-8694820250d1_dkwz8k.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523005/screen_shot_2021-05-21_at_1-23-32_pm_iuergl.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523005/0632a95d28efaf75e5734ce8c1d9ecb1_pgdavr.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523004/81mUFe-zqoL._AC_UF1000_1000_QL80__ftz4hg.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523005/71FoiDlXsRL_amjzjx.jpg"
];

async function main() {
  console.log("=== INTEGRATING WAXING & WAX WARMER PRODUCTS + CLOUDINARY IMAGES ===");

  // Find Waxing category
  let waxingCategory = await prisma.category.findFirst({ where: { slug: "waxing" } });

  if (!waxingCategory) {
    waxingCategory = await prisma.category.create({
      data: {
        name: "Waxing & Hair Removal",
        slug: "waxing",
        description: "Professional hard wax beans, soft wax tins, digital wax warmers and waxing starter kits.",
        imageUrl: WAXING_IMAGES[0],
        sortOrder: 5,
        isActive: true
      }
    });
  } else {
    await prisma.category.update({
      where: { id: waxingCategory.id },
      data: { imageUrl: WAXING_IMAGES[0] }
    });
  }
  console.log(`✅ Waxing Category synced with cover image: ${WAXING_IMAGES[0]}`);

  // Products to assign/create
  const WAXING_ITEMS = [
    {
      sku: "SGT-WAX-HONEY-SOFT-600G",
      name: "Honey Natural Soft Liposoluble Wax Can (600g)",
      slug: "honey-natural-soft-liposoluble-wax-can-600g",
      brand: "RICA Professional",
      basePrice: 650,
      image: WAXING_IMAGES[0],
      description: "Organic honey enriched soft liposoluble waxing can for gentle hair removal on sensitive skin.",
      specs: { capacity: "600g", type: "Soft Wax Can", skinType: "Sensitive Skin" }
    },
    {
      sku: "SGT-WAX-STARTER-KIT-WHITE",
      name: "Professional Digital Wax Warmer Starter Kit with Hard Wax Beads",
      slug: "professional-digital-wax-warmer-starter-kit-white",
      brand: "ProWax",
      basePrice: 2450,
      image: WAXING_IMAGES[1],
      description: "Complete professional waxing starter kit including digital temperature control warmer, 400g hard wax beads, and wooden applicator sticks.",
      specs: { power: "100W Digital", includes: "Warmer + 400g Beads + 20 Sticks", warranty: "1 Year" }
    },
    {
      sku: "SGT-WAX-BEADS-ALMOND-500G",
      name: "Almond & Aloe Vera Stripless Hard Wax Beans (500g)",
      slug: "almond-aloe-vera-stripless-hard-wax-beans-500g",
      brand: "LipoWax",
      basePrice: 780,
      image: WAXING_IMAGES[2],
      description: "Low-melting point stripless hard wax beads for painless body and facial waxing.",
      specs: { weight: "500g Bag", scent: "Almond & Aloe", type: "Stripless Hard Wax" }
    },
    {
      sku: "SGT-WAX-SINGLE-CAN-WARMER-500ML",
      name: "Commercial Single Can Electric Wax Warmer Machine 500ml",
      slug: "commercial-single-can-electric-wax-warmer-500ml",
      brand: "ProWax",
      basePrice: 1650,
      image: WAXING_IMAGES[3],
      description: "Heavy-duty electric wax warmer with removable aluminum pot and adjustable thermostat knob.",
      specs: { capacity: "500ml", body: "Heat-Resistant ABS", pot: "Non-stick Aluminum" }
    },
    {
      sku: "SGT-WAX-PREMIUM-KIT-MATTE-BLACK",
      name: "Matte Black Executive Waxing Station Kit with Pre & Post Oil",
      slug: "executive-waxing-station-kit-matte-black",
      brand: "Tress Pro",
      basePrice: 3200,
      image: WAXING_IMAGES[4],
      description: "Premium matte black salon waxing kit featuring rapid heater, pre-wax spray, soothing post-wax lavender oil, and hard wax beads.",
      specs: { finish: "Matte Black", accessories: "Full 5-Piece Kit", capacity: "500cc" }
    },
    {
      sku: "SGT-WAX-RAPID-HEATER-KIT",
      name: "Rapid-Melt Double Pot Electric Wax Heater Station",
      slug: "rapid-melt-double-pot-electric-wax-heater-station",
      brand: "Tress Pro",
      basePrice: 2890,
      image: WAXING_IMAGES[5],
      description: "Dual aluminum pot wax heater allowing simultaneous heating of soft wax cans and hard wax beads.",
      specs: { pots: "2 Removable Aluminum Tins", tempRange: "45°C - 120°C" }
    },
    {
      sku: "SGT-WAX-SALON-HERO-KIT-PRO",
      name: "Complete Parlour Waxing Master Set with Silicone Pot Liner",
      slug: "parlour-waxing-master-set-silicone-liner",
      brand: "Tress Pro",
      basePrice: 3450,
      image: WAXING_IMAGES[6],
      description: "Commercial wax warmer kit with flexible easy-clean silicone pot insert and multi-scent wax beads.",
      specs: { liner: "Reusable Food-Grade Silicone", tempControl: "LED Screen Touch" }
    },
    {
      sku: "SGT-WAX-STRIPS-NONWOVEN-100PK",
      name: "Professional Non-Woven Hair Removal Waxing Strips (Pack of 100)",
      slug: "professional-nonwoven-waxing-strips-100pack",
      brand: "SGT Essentials",
      basePrice: 250,
      image: WAXING_IMAGES[7],
      description: "High-tensile strength thick non-woven paper strips for soft wax hair removal without tearing.",
      specs: { quantity: "100 Strips/Pack", material: "Pre-cut Non-woven Fabric" }
    },
    {
      sku: "SGT-WAX-SPATULA-WOODEN-100PK",
      name: "Smooth Birchwood Disposable Waxing Spatulas (Pack of 100)",
      slug: "smooth-birchwood-disposable-waxing-spatulas-100pack",
      brand: "SGT Essentials",
      basePrice: 180,
      image: WAXING_IMAGES[8],
      description: "Splinter-free natural birchwood wooden sticks for precise, hygienic wax application.",
      specs: { quantity: "100 Sticks/Pack", size: "6 Inch Standard Parlour" }
    },
    {
      sku: "SGT-WAX-PREPOST-CARE-SET",
      name: "Pre-Wax Sanitizing Spray & Post-Wax Soothing Oil Duo (2x 250ml)",
      slug: "pre-wax-sanitizing-spray-post-wax-soothing-oil-duo",
      brand: "RICA Professional",
      basePrice: 950,
      image: WAXING_IMAGES[9],
      description: "Skin preparation cleanser spray and tea tree post-wax residue remover oil for smooth finishing.",
      specs: { volume: "2x 250ml Spray Bottles", keyIngredients: "Tea Tree Oil & Chamomile" }
    },
    {
      sku: "SGT-WAX-ROLLON-CARTRIDGE-WARMER",
      name: "Trio Roll-on Wax Cartridge Heater Base Station",
      slug: "trio-rollon-wax-cartridge-heater-base-station",
      brand: "ProWax",
      basePrice: 2150,
      image: WAXING_IMAGES[10],
      description: "3-cartridge simultaneous heater dock for rapid roll-on wax application in busy salons.",
      specs: { docks: "3 Cartridge Heating Slots", compatibility: "Standard 100g Wax Roll-ons" }
    }
  ];

  for (const item of WAXING_ITEMS) {
    const existing = await prisma.product.findUnique({ where: { sku: item.sku } });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          images: [item.image],
          basePrice: item.basePrice,
          isActive: true
        }
      });
      console.log(`🔄 Updated Product [${item.sku}] -> ${item.name}`);
    } else {
      const created = await prisma.product.create({
        data: {
          sku: item.sku,
          name: item.name,
          slug: item.slug,
          brand: item.brand,
          description: item.description,
          specs: item.specs,
          basePrice: item.basePrice,
          moq: 1,
          images: [item.image],
          isActive: true,
          categoryId: waxingCategory.id,
          variants: {
            create: {
              sku: `${item.sku}-STD`,
              name: "Standard Unit",
              price: Math.round(item.basePrice * 1.25),
              salePrice: item.basePrice,
              isActive: true,
              inventory: {
                create: {
                  stock: 50,
                  lowStockThreshold: 5
                }
              }
            }
          }
        }
      });
      console.log(`✨ Created Product [${item.sku}] -> ${item.name}`);
    }
  }

  console.log("\n🎉 WAXING PRODUCTS & CLOUDINARY IMAGES INTEGRATION COMPLETE!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

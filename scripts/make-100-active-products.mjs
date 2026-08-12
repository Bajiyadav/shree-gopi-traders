import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_PRODUCT_IMAGES = [
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523431/keratin-repair-shampoo-1000ml_a1b2c3.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523432/biotin-collagen-hair-mask-500g_d4e5f6.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523433/moroccan-argan-elixir-oil-100ml_g7h8i9.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523434/pure-hyaluronic-acid-serum-50ml_j1k2l3.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523435/activated-charcoal-detox-mask-200g_m4n5o6.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523436/niacinamide-glow-day-cream-100g_p7q8r9.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523437/bond-rebuilder-plex-solution-500ml_s1t2u3.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523438/violet-anti-brass-bleach-powder-500g_v4w5x6.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523439/matte-makeup-setting-spray-100ml_y7z8a1.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523440/velvet-matte-lipstick-set-6shades_b2c3d4.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523441/charcoal-hard-wax-beans-1kg_e5f6g7.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523442/smart-touch-wax-warmer-700ml_h8i9j1.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523443/pro-cordless-hair-clipper-gold_k2l3m4.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523444/skeleton-tblade-detail-trimmer_n5o6p7.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523445/titanium-double-foil-shaver_q8r9s1.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523446/double-door-hot-towel-warmer-23l_t2u3v4.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523447/ultrasonic-skin-scrubber-spatula_w5x6y7.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523448/gold-accent-black-styling-chair_z8a1b2.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523449/glass-top-manicure-table-desk_c3d4e5.jpg"
];

const NEW_PRODUCTS_DATA = [
  {
    sku: "SGT-HC-KERATIN-SHAMPOO-1000ML",
    name: "Professional Keratin Repair Shampoo (1000ml Pump Bottle)",
    slug: "professional-keratin-repair-shampoo-1000ml",
    brand: "Schwarzkopf Professional",
    categorySlug: "hair-care",
    basePrice: 850,
    description: "Sulfate-free keratin infused deep cleansing shampoo for chemically treated and damaged hair.",
    specs: { volume: "1000ml", hairType: "Damaged / Color Treated", formula: "Sulfate-Free Keratin" }
  },
  {
    sku: "SGT-HC-BIOTIN-HAIR-MASK-500G",
    name: "Biotin & Collagen Hair Rebuilding Spa Mask (500g Jar)",
    slug: "biotin-collagen-hair-rebuilding-spa-mask-500g",
    brand: "L'Oreal Professionnel",
    basePrice: 920,
    description: "Deep conditioning intense hair repair spa cream enriched with Biotin B7 and hydrolysed marine collagen.",
    specs: { weight: "500g", keyIngredients: "Biotin B7 & Collagen", result: "Thicker Hair & Shine" }
  },
  {
    sku: "SGT-HC-ARGAN-SERUM-DROPPER",
    name: "Moroccan Argan Intensive Hair Elixir Oil (100ml Dropper)",
    slug: "moroccan-argan-intensive-hair-elixir-oil-100ml",
    brand: "Moroccanoil Pro",
    basePrice: 1250,
    description: "Pure cold-pressed Moroccan argan hair oil serum for weightless anti-frizz shine and heat protection.",
    specs: { volume: "100ml Glass Dropper", origin: "Moroccan Argan", use: "Post-Wash & Pre-Styling" }
  },
  {
    sku: "SGT-SKIN-HYALURONIC-SERUM-50ML",
    name: "Pure Hyaluronic Acid Hydrating Serum (50ml Glass Bottle)",
    slug: "pure-hyaluronic-acid-hydrating-serum-50ml",
    brand: "O3+ Professional",
    basePrice: 1100,
    description: "Multi-molecular hyaluronic acid serum providing 72-hour moisture lock and plump skin elasticity.",
    specs: { volume: "50ml", concentration: "2.5% Hyaluronic Acid", skinType: "All Skin Types" }
  },
  {
    sku: "SGT-SKIN-CHARCOAL-DETOX-MASK",
    name: "Activated Charcoal Deep Pore Detox Peel-Off Mask (200g Tube)",
    slug: "activated-charcoal-deep-pore-detox-peel-off-mask-200g",
    brand: "Cheryl's Cosmeceuticals",
    basePrice: 480,
    description: "Blackhead clearing activated bamboo charcoal peel-off facial mask with tea tree extract.",
    specs: { weight: "200g Tube", keyIngredient: "Bamboo Charcoal & Tea Tree", action: "Blackhead Removal" }
  },
  {
    sku: "SGT-SKIN-NIACINAMIDE-GLOW-CREAM",
    name: "10% Niacinamide Skin Brightening Day Cream (100g Jar)",
    slug: "10percent-niacinamide-skin-brightening-day-cream-100g",
    brand: "Raaga Professional",
    basePrice: 650,
    description: "Dermatologically tested 10% Niacinamide cream for fading dark spots and evening skin tone.",
    specs: { weight: "100g Jar", active: "10% Niacinamide + Zinc PCA", spf: "SPF 30 PA++" }
  },
  {
    sku: "SGT-HCT-BOND-PLEX-STEP1-500ML",
    name: "Professional Bond Rebuilder Plex Solution No. 1 (500ml)",
    slug: "professional-bond-rebuilder-plex-solution-no1-500ml",
    brand: "Olaplex Professional",
    basePrice: 3450,
    description: "Disulfide bond rebuilding treatment liquid added directly to hair color and lightener to prevent chemical breakage.",
    specs: { volume: "500ml", function: "Bond Multiplier", compatibility: "All Bleach & Color Lines" }
  },
  {
    sku: "SGT-HCT-COLOR-FREE-HIGHLIGHT-POWDER",
    name: "Violet Anti-Brass Dust-Free Bleaching Powder (500g)",
    slug: "violet-anti-brass-dust-free-bleaching-powder-500g",
    brand: "Matrix Professional",
    basePrice: 890,
    description: "Up to 9 levels of lift violet anti-yellow lightener powder for cool blonde highlights.",
    specs: { weight: "500g Tub", lift: "Up to 9 Tones", pigment: "Violet Anti-Brass" }
  },
  {
    sku: "SGT-MKP-MATTE-SETTING-SPRAY-100ML",
    name: "Ultra Longwear Professional Makeup Setting Spray (100ml)",
    slug: "ultra-longwear-professional-makeup-setting-spray-100ml",
    brand: "Kryolan Professional",
    basePrice: 750,
    description: "16-hour waterproof matte finish makeup fixer spray smudge-proof formula for bridal makeup.",
    specs: { volume: "100ml", finish: "Oil-Control Matte", wear: "16-Hour Waterproof" }
  },
  {
    sku: "SGT-MKP-VELVET-MATTE-LIPSTICK-SET",
    name: "Salon Bridal Velvet Matte Liquid Lipstick Set (6 Shades)",
    slug: "salon-bridal-velvet-matte-liquid-lipstick-set-6shades",
    brand: "PAC Cosmetics",
    basePrice: 1650,
    description: "6 iconic bridal red and nude shades non-drying transfer-proof liquid lipstick box set.",
    specs: { quantity: "6 Liquid Lipsticks x 5ml", finish: "Velvet Matte", feature: "Transfer-Proof" }
  },
  {
    sku: "SGT-WAX-CHARCOAL-HARD-BEANS-1KG",
    name: "Black Charcoal Detox Stripless Hard Wax Beans (1kg Bag)",
    slug: "black-charcoal-detox-stripless-hard-wax-beans-1kg",
    brand: "RICA Professional",
    basePrice: 1250,
    description: "Detoxifying activated charcoal stripless hard wax beads for stubborn coarse hair removal.",
    specs: { weight: "1kg Bag", ingredient: "Activated Charcoal", meltPoint: "Low Temp 42°C" }
  },
  {
    sku: "SGT-WAX-WARMER-DIGITAL-TOUCH-700ML",
    name: "Smart Touch Digital Screen Wax Heater Pot 700ml",
    slug: "smart-touch-digital-screen-wax-heater-pot-700ml",
    brand: "ProWax",
    basePrice: 2250,
    description: "700ml large capacity digital touchscreen wax warmer machine with memory preset temperatures.",
    specs: { capacity: "700ml", display: "Digital Touch LED", pot: "Teflon Non-stick" }
  },
  {
    sku: "SGT-BRB-PRO-CORDLESS-HAIR-CLIPPER",
    name: "High-Torque Rotary Motor Cordless Barber Hair Clipper Gold",
    slug: "high-torque-rotary-motor-cordless-barber-hair-clipper-gold",
    brand: "Wahl Professional",
    basePrice: 4200,
    description: "Heavy-duty all-metal cordless barber clipper with DLC titanium blade and 3-hour lithium-ion battery.",
    specs: { motor: "7200 RPM Rotary", runtime: "180 Mins", body: "Gold Plated Metal" }
  },
  {
    sku: "SGT-BRB-PRECISION-OUTLINE-TRIMMER",
    name: "Skeleton T-Blade Zero-Gap Detail Trimmer Bronze",
    slug: "skeleton-t-blade-zero-gap-detail-trimmer-bronze",
    brand: "BaBylissPRO",
    basePrice: 3800,
    description: "360-degree exposed skeleton T-blade zero-gap trimmer for crisp hairline edging and beard lining.",
    specs: { blade: "360° Exposed DLC T-Blade", battery: "Lithium-Ion 2 Hour", color: "Antique Bronze" }
  },
  {
    sku: "SGT-BRB-FOIL-SHAVER-DOUBLE-TITANIUM",
    name: "Pro Titanium Double Foil Cordless Barber Shaver",
    slug: "pro-titanium-double-foil-cordless-barber-shaver",
    brand: "Andis Professional",
    basePrice: 2950,
    description: "Hypoallergenic titanium gold dual foil shaver for bump-free ultra-close fade shaving.",
    specs: { foil: "Hypoallergenic Gold Titanium", RPM: "9000 RPM", battery: "Cord/Cordless Dual" }
  },
  {
    sku: "SGT-EQ-HOT-TOWEL-STERILIZER-23L",
    name: "Commercial Double Door Hot Towel Warmer UV Sterilizer 23L",
    slug: "commercial-double-door-hot-towel-warmer-uv-sterilizer-23l",
    brand: "ProLuxe Salon Equipment",
    basePrice: 9500,
    description: "Dual compartment 23L hot towel cabinet holding up to 60 facial towels with built-in UV germicidal sterilizer.",
    specs: { capacity: "23 Litres (60 Towels)", temp: "70°C Constant", uv: "Ozone UV Lamp" }
  },
  {
    sku: "SGT-EQ-ULTRASONIC-SKIN-SCRUBBER",
    name: "Professional Ultrasonic Facial Skin Scrubber Spatula",
    slug: "professional-ultrasonic-facial-skin-scrubber-spatula",
    brand: "O3+ Professional",
    basePrice: 2650,
    description: "28,000 Hz high-frequency ultrasonic skin peeling spatula for deep pore extraction and serum iontophoresis.",
    specs: { frequency: "28kHz Ultrasonic", modes: "Peeling, Ion+, Ion-, Lifting", power: "Rechargeable USB" }
  },
  {
    sku: "SGT-FUR-GOLD-HYDRAULIC-STYLING-CHAIR",
    name: "Executive Gold Accent Black Hydraulic Styling Chair",
    slug: "executive-gold-accent-black-hydraulic-styling-chair",
    brand: "Nordic Spa Furniture",
    basePrice: 19800,
    description: "Luxury salon cutting chair with brushed gold stainless steel base and thick memory foam black leatherette seat.",
    specs: { base: "Heavy Gold Round Base", pump: "Hydraulic Lockable", capacity: "200kg" }
  },
  {
    sku: "SGT-FUR-MANICURE-DESK-GLASS-TOP",
    name: "Professional Glass Top Manicure Table Desk with Dust Collector",
    slug: "professional-glass-top-manicure-table-desk-dust-collector",
    brand: "Nordic Spa Furniture",
    basePrice: 16500,
    description: "Tempered glass top nail station table featuring built-in electric vacuum dust extractor fan and 4 storage drawers.",
    specs: { top: "Tempered Safety Glass", extractor: "45W Built-in Fan", storage: "4 Side Drawers" }
  }
];

async function main() {
  console.log("=== EXPANDING CATALOGUE TO 100+ ACTIVE PRODUCTS ===");

  const categories = await prisma.category.findMany({ where: { isActive: true } });
  const catMap = new Map(categories.map(c => [c.slug, c.id]));

  let createdCount = 0;

  for (let i = 0; i < NEW_PRODUCTS_DATA.length; i++) {
    const item = NEW_PRODUCTS_DATA[i];
    const image = NEW_PRODUCT_IMAGES[i];
    const categoryId = catMap.get(item.categorySlug) || categories[0].id;

    const existing = await prisma.product.findUnique({ where: { sku: item.sku } });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          images: [image],
          basePrice: item.basePrice,
          isActive: true
        }
      });
      console.log(`🔄 Updated Product [${item.sku}] -> ${item.name}`);
    } else {
      await prisma.product.create({
        data: {
          sku: item.sku,
          name: item.name,
          slug: item.slug,
          brand: item.brand,
          description: item.description,
          specs: item.specs,
          basePrice: item.basePrice,
          moq: 1,
          images: [image],
          isActive: true,
          categoryId,
          variants: {
            create: {
              sku: `${item.sku}-STD`,
              name: "Standard Unit",
              price: Math.round(item.basePrice * 1.25),
              salePrice: item.basePrice,
              isActive: true,
              inventory: {
                create: {
                  stock: 45,
                  lowStockThreshold: 5
                }
              }
            }
          }
        }
      });
      createdCount++;
      console.log(`✨ Created New Product #${createdCount} [${item.sku}] -> ${item.name}`);
    }
  }

  // Check total active product count
  const totalActive = await prisma.product.count({ where: { isActive: true } });
  console.log(`\n📊 Total Active Products in DB: ${totalActive}`);

  console.log("\n🎉 CATALOGUE EXPANSION COMPLETE!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

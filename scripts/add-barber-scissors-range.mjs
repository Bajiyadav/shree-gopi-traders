import { PrismaClient, ReviewStatus, BusinessType } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    name: "MAYCREATE Professional 10-Piece Hair Cutting & Thinning Scissors Kit",
    slug: "maycreate-professional-10-piece-hair-cutting-scissors-kit",
    sku: "SGT-EQ-MAYCREATE-KIT10",
    brand: "Maycreate Professional",
    basePrice: 1495,
    description:
      "Complete 10-piece professional salon cutting & texturizing kit. Features Japanese stainless steel black & gold razor edge shears, 30-tooth thinning scissor, barber cape, neck duster brush, razor comb, sectioning clips, microfiber cleaning cloth, and leatherette zip pouch.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504620/shree-gopi-traders/products/barber-supplies/maycreate-professional-10-piece-hair-cutting-scissors-kit.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504621/shree-gopi-traders/products/barber-supplies/maycreate-professional-10-piece-hair-cutting-scissors-kit-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504622/shree-gopi-traders/products/barber-supplies/maycreate-professional-10-piece-hair-cutting-scissors-kit-3.png",
    ],
    specs: {
      "Kit Contents": "10-Piece Professional Barber Set",
      "Blade Material": "440C Japanese Stainless Steel",
      "Shear Types": "6.0\" Razor Edge Cutting Shear & 6.0\" 30-Tooth Thinning Scissor",
      "Accessories": "Barber Cape, Neck Duster, Razor Comb, Clips, Case",
      "Professional Use": "Salon Hair Cutting & Texturizing",
    },
    variants: [
      { name: "Standard 10-Piece Kit", sku: "SGT-EQ-MAYCREATE-KIT10-STD", price: 1495 },
      { name: "Deluxe Titanium 10-Piece Kit", sku: "SGT-EQ-MAYCREATE-KIT10-DLX", price: 1850 },
    ],
    reviews: [
      { rating: 5, comment: "Complete kit for barbers! The gold and black scissors look ultra-premium and cut sharp right out of the pouch." },
      { rating: 5, comment: "Outstanding value for salons. Includes cape, neck duster, clips, and pouch. Very high re-order demand." },
      { rating: 4, comment: "Thinning scissors blend hair smoothly without snagging. Very comfortable offset handles." },
      { rating: 5, comment: "Best B2B deal on salon kits! Delivered fast with GST invoice." },
    ],
  },
  {
    name: "Sanguine Ergonomic Pastel Titanium Barber Shears Series",
    slug: "sanguine-ergonomic-pastel-titanium-barber-shears",
    sku: "SGT-EQ-SANGUINE-PASTEL",
    brand: "Sanguine Professional",
    basePrice: 1850,
    description:
      "Ultra-lightweight Japanese stainless steel barber shears featuring ergonomic swivel thumb handles and durable anodized pastel titanium finish. Convex razor blades ensure buttery-smooth precision cutting.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504623/shree-gopi-traders/products/barber-supplies/sanguine-ergonomic-pastel-titanium-barber-shears.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504624/shree-gopi-traders/products/barber-supplies/sanguine-ergonomic-pastel-titanium-barber-shears-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504625/shree-gopi-traders/products/barber-supplies/sanguine-ergonomic-pastel-titanium-barber-shears-3.png",
    ],
    specs: {
      "Blade Material": "440C Stainless Steel with Anodized Titanium Coating",
      "Blade Type": "Convex Razor Edge Blade",
      "Ergonomics": "Ergonomic Crane Handle with Swivel Thumb Rest",
      "Tension System": "Gold Knurled Adjustment Screw",
      "Professional Use": "Precision Blunt & Slide Hair Cutting",
    },
    variants: [
      { name: "Matt Black (6.0\")", sku: "SGT-EQ-SANGUINE-BLK", price: 1850 },
      { name: "Champagne Gold (6.0\")", sku: "SGT-EQ-SANGUINE-GOLD", price: 1850 },
      { name: "Aqua Blue (6.0\")", sku: "SGT-EQ-SANGUINE-BLUE", price: 1850 },
      { name: "Rose Gold (6.0\")", sku: "SGT-EQ-SANGUINE-ROSE", price: 1850 },
      { name: "Mint Green (6.0\")", sku: "SGT-EQ-SANGUINE-MINT", price: 1850 },
    ],
    reviews: [
      { rating: 5, comment: "Gorgeous pastel colors! The ergonomic crane handles reduce hand fatigue during long haircutting shifts." },
      { rating: 5, comment: "Super sharp razor edges! Slips effortlessly through wet or dry hair." },
      { rating: 4, comment: "Unique colors look very stylish on salon stations. High quality tension screw adjustment." },
      { rating: 5, comment: "Excellent salon supply product. Shipped promptly by Shree Gopi Traders." },
    ],
  },
  {
    name: "Royal Antique Gold Floral Engraved Barber Shear",
    slug: "royal-antique-gold-floral-engraved-barber-shear",
    sku: "SGT-EQ-ROYAL-ANTIQUE-GOLD",
    brand: "Royal Craft",
    basePrice: 2250,
    description:
      "Luxury handcrafted barber cutting shear featuring intricate antique gold Victorian floral engraving on ergonomic handles with sharp black Japanese 440C cobalt stainless steel razor blades.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504626/shree-gopi-traders/products/barber-supplies/royal-antique-gold-floral-engraved-barber-shear.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504627/shree-gopi-traders/products/barber-supplies/royal-antique-gold-floral-engraved-barber-shear-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504628/shree-gopi-traders/products/barber-supplies/royal-antique-gold-floral-engraved-barber-shear-3.png",
    ],
    specs: {
      "Design": "Antique Gold Ornate Engraved Handle",
      "Blade Material": "Japanese 440C Cobalt Stainless Steel",
      "Blade Finish": "Matte Black PVD Coating",
      "Size": "6.0 Inches",
      "Professional Use": "Master Barber Precision & Point Cutting",
    },
    variants: [
      { name: "6.0 Inch Cutting Shear", sku: "SGT-EQ-ROYAL-ANTIQUE-60", price: 2250 },
      { name: "6.5 Inch Master Shear", sku: "SGT-EQ-ROYAL-ANTIQUE-65", price: 2450 },
    ],
    reviews: [
      { rating: 5, comment: "Masterpiece barber shear! Antique gold engraving looks royal, and the black razor blade is razor sharp." },
      { rating: 5, comment: "Every barber who visits our shop compliments these scissors. Super smooth action." },
      { rating: 4, comment: "Very solid weight and perfect balance for detail work and scissor-over-comb cuts." },
      { rating: 5, comment: "Premium craftsmanship! Great margin for luxury barber equipment counters." },
    ],
  },
  {
    name: "ProMaster Full Gold Titanium Professional Cutting Scissor",
    slug: "promaster-full-gold-titanium-cutting-scissor",
    sku: "SGT-EQ-PROMASTER-GOLD",
    brand: "ProMaster Barber",
    basePrice: 1650,
    description:
      "Premium 24K gold titanium plated hair cutting shear. Precision ground hollow convex razor edge delivers effortlessly smooth slice cutting and blunt line work for high-volume salons.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504629/shree-gopi-traders/products/barber-supplies/promaster-full-gold-titanium-cutting-scissor.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504630/shree-gopi-traders/products/barber-supplies/promaster-full-gold-titanium-cutting-scissor-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504631/shree-gopi-traders/products/barber-supplies/promaster-full-gold-titanium-cutting-scissor-3.png",
    ],
    specs: {
      "Finish": "24K Gold Titanium Plated",
      "Blade": "Convex Razor Blade with Rubber Silencer Stopper",
      "Finger Inserts": "Removable Soft Rubber Rings Included",
      "Size": "6.0 Inches",
      "Professional Use": "All-Round Salon Hair Cutting",
    },
    variants: [
      { name: "5.5 Inch Precision Shear", sku: "SGT-EQ-PROMASTER-GOLD-55", price: 1550 },
      { name: "6.0 Inch All-Rounder Shear", sku: "SGT-EQ-PROMASTER-GOLD-60", price: 1650 },
    ],
    reviews: [
      { rating: 5, comment: "Mirror gold finish looks stunning! Holds edge sharpness even after hundreds of haircuts." },
      { rating: 5, comment: "Silencer stopper makes cutting quiet and smooth. Very comfortable rubber finger rings." },
      { rating: 4, comment: "Great quality scissor for daily parlour work. Fast delivery." },
      { rating: 5, comment: "Original quality Barber tool. 100% recommended for professional stylists." },
    ],
  },
  {
    name: "MasterCraft Japanese Stainless Steel Barber Shears Collection",
    slug: "mastercraft-japanese-stainless-steel-barber-shears-collection",
    sku: "SGT-EQ-MASTERCRAFT-SHEARS-COLL",
    brand: "MasterCraft Barber",
    basePrice: 1295,
    description:
      "High-carbon Japanese stainless steel professional shears line. Includes straight razor edge cutting scissors, texturizing chunkers, and fine teeth thinning scissors for hair artists.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504632/shree-gopi-traders/products/barber-supplies/mastercraft-japanese-stainless-steel-barber-shears-collection.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504633/shree-gopi-traders/products/barber-supplies/mastercraft-japanese-stainless-steel-barber-shears-collection-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786504634/shree-gopi-traders/products/barber-supplies/mastercraft-japanese-stainless-steel-barber-shears-collection-3.png",
    ],
    specs: {
      "Material": "High-Carbon Japanese Stainless Steel (J2 420/440C)",
      "Hardness": "Rockwell 58-60 HRC",
      "Tension": "Adjustable Coin Tension Screw & Rubber Stopper",
      "Professional Use": "Professional Salon & Barber Hair Cutting",
    },
    variants: [
      { name: "Razor Edge Cutting Scissor (6.0\")", sku: "SGT-EQ-MASTERCRAFT-CUT", price: 1295 },
      { name: "Texturizing Chunkers (6.0\")", sku: "SGT-EQ-MASTERCRAFT-CHUNK", price: 1395 },
      { name: "Thinning Scissor (6.0\")", sku: "SGT-EQ-MASTERCRAFT-THIN", price: 1350 },
    ],
    reviews: [
      { rating: 5, comment: "Reliable daily workhorse shears! Durable Japanese steel stays sharp for months." },
      { rating: 5, comment: "The chunkers and thinning scissors remove weight effortlessly without pulling hair." },
      { rating: 4, comment: "Clean cuts and good balance. Excellent wholesale pricing for barber academies." },
      { rating: 5, comment: "Great wholesale deal for salon owners stocking multiple workstations." },
    ],
  },
];

const SAMPLE_CUSTOMERS = [
  { name: "Rajesh Kumar", email: "rajesh.barber@salonmail.com", phone: "9876543212", bName: "Royal Cuts Barber Shop", bType: BusinessType.BARBERSHOP },
  { name: "Deepak Joshi", email: "deepak.barber@salonmail.com", phone: "9876543219", bName: "Classic Barber Lounge", bType: BusinessType.BARBERSHOP },
  { name: "Sunita Verma", email: "sunita.glam@salonmail.com", phone: "9876543211", bName: "Sunita Glamour Studio", bType: BusinessType.SALON },
  { name: "Vikram Singh", email: "vikram.salon@salonmail.com", phone: "9876543215", bName: "Urban Style Unisex Salon", bType: BusinessType.SALON }
];

async function main() {
  console.log("=== FAST UPSERTING ALL 5 BARBER SCISSORS WITH 4 REVIEWS EACH ===");

  const customerIds = [];
  for (const cData of SAMPLE_CUSTOMERS) {
    let cust = await prisma.customer.findUnique({ where: { email: cData.email } });
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          name: cData.name,
          email: cData.email,
          phone: cData.phone,
          passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
          businessProfile: { create: { businessName: cData.bName, businessType: cData.bType } }
        }
      });
    }
    customerIds.push(cust.id);
  }

  let category = await prisma.category.findUnique({ where: { slug: "barber-supplies" } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Barber Supplies",
        slug: "barber-supplies",
        description: "Professional barber clippers, scissors, trimmers, razors, capes and grooming tools.",
        isActive: true,
      }
    });
  }

  for (const item of PRODUCTS) {
    console.log(`Processing ${item.name}...`);

    let product = await prisma.product.findFirst({
      where: { OR: [{ slug: item.slug }, { sku: item.sku }, { name: item.name }] },
    });

    if (product) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          name: item.name,
          brand: item.brand,
          sku: item.sku,
          description: item.description,
          specs: item.specs,
          images: item.images,
          basePrice: String(item.basePrice),
          isActive: true,
          categoryId: category.id,
          updatedAt: new Date(),
        },
      });
    } else {
      product = await prisma.product.create({
        data: {
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          brand: item.brand,
          description: item.description,
          specs: item.specs,
          images: item.images,
          basePrice: String(item.basePrice),
          isActive: true,
          categoryId: category.id,
        },
      });
    }

    for (const v of item.variants) {
      let variant = await prisma.productVariant.findFirst({ where: { sku: v.sku } });
      if (variant) {
        variant = await prisma.productVariant.update({
          where: { id: variant.id },
          data: { name: v.name, price: String(v.price), productId: product.id, isActive: true },
        });
      } else {
        variant = await prisma.productVariant.create({
          data: { sku: v.sku, name: v.name, price: String(v.price), productId: product.id, isActive: true },
        });
      }

      await prisma.inventory.upsert({
        where: { productVariantId: variant.id },
        update: { stock: 50, lowStockThreshold: 5 },
        create: { productVariantId: variant.id, stock: 50, lowStockThreshold: 5 },
      });

      const tier1Price = String(v.price);
      const tier5Price = String(Math.round(v.price * 0.95));
      const tier10Price = String(Math.round(v.price * 0.90));

      await prisma.wholesalePriceTier.deleteMany({ where: { productVariantId: variant.id } });
      await prisma.wholesalePriceTier.createMany({
        data: [
          { productVariantId: variant.id, minQty: 1, maxQty: 4, pricePerUnit: tier1Price },
          { productVariantId: variant.id, minQty: 5, maxQty: 9, pricePerUnit: tier5Price },
          { productVariantId: variant.id, minQty: 10, maxQty: null, pricePerUnit: tier10Price },
        ],
      });
    }

    await prisma.review.deleteMany({ where: { productId: product.id } });

    const now = new Date();
    for (let rIdx = 0; rIdx < item.reviews.length; rIdx++) {
      const rev = item.reviews[rIdx];
      const custId = customerIds[rIdx % customerIds.length];
      const randomDaysAgo = Math.floor(Math.random() * 30) + 1;
      const reviewDate = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);

      await prisma.review.create({
        data: {
          productId: product.id,
          customerId: custId,
          rating: rev.rating,
          comment: rev.comment,
          status: ReviewStatus.APPROVED,
          createdAt: reviewDate,
        },
      });
    }
  }

  console.log("✅ ALL 5 BARBER SCISSORS UPSERTED WITH 4 APPROVED REVIEWS EACH!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Shree Gopi Traders — demo seed.
 *
 * Wipes and rebuilds the catalogue plus 12 months of trading history so the
 * admin analytics have real data to compute from. Deterministic: it uses a
 * seeded PRNG, so re-running produces the same numbers.
 *
 * Run with: npm run seed
 */
import { PrismaClient, type BusinessType, type OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Deterministic RNG (mulberry32) ────────────────────────────
let seedState = 20260808;
function random() {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randomInt(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}
function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)];
}
function chance(p: number) {
  return random() < p;
}

const IMG = (slug: string) => `/images/categories/${slug}.svg`;

// ── Categories ────────────────────────────────────────────────
const CATEGORIES = [
  { name: "Hair Care", slug: "hair-care", description: "Shampoos, conditioners, serums, colour and treatments for professional use." },
  { name: "Hair Equipment", slug: "hair-equipment", description: "Dryers, straighteners, clippers, scissors and styling tools." },
  { name: "Skin & Facial", slug: "skin-facial", description: "Facial kits, creams, serums, cleansers, toners and masks." },
  { name: "Waxing", slug: "waxing", description: "Wax, heaters, strips, spatulas and pre/post-wax care." },
  { name: "Nails", slug: "nails", description: "Polish, gels, extensions, tools, lamps and manicure kits." },
  { name: "Makeup", slug: "makeup", description: "Professional makeup, brushes and studio accessories." },
  { name: "Consumables", slug: "consumables", description: "Towels, gloves, capes, cotton, foils and disposables." },
  { name: "Salon Furniture", slug: "salon-furniture", description: "Chairs, shampoo stations, beds, trolleys and storage." },
  { name: "Professional Equipment", slug: "professional-equipment", description: "Sterilizers, steamers and professional beauty machines." },
  { name: "Cleaning & Hygiene", slug: "cleaning-hygiene", description: "Disinfectants, sanitizers and salon cleaning supplies." },
];

const BRANDS = ["Lumiere Pro", "SalonEdge", "Craft & Co", "Verona", "PureLine", "Studio One"];

interface SeedProduct {
  name: string;
  variants: string[];
  price: number;
  /** Fraction off the list price, applied to every variant of this product. */
  sale?: number;
  specs?: Record<string, string>;
}

const PRODUCTS_BY_CATEGORY: Record<string, SeedProduct[]> = {
  "hair-care": [
    { name: "Professional Shampoo", variants: ["250ml", "500ml", "1L", "5L"], price: 350, specs: { Type: "Sulphate-free", "Hair Type": "All", Usage: "Salon & retail" } },
    { name: "Salon Conditioner", variants: ["250ml", "500ml", "1L"], price: 320, sale: 0.1 },
    { name: "Hair Serum", variants: ["100ml", "200ml"], price: 480 },
    { name: "Hair Oil", variants: ["200ml", "500ml"], price: 260 },
    { name: "Hair Color Cream", variants: ["Black", "Brown", "Natural Black"], price: 190 },
    { name: "Hair Bleach Powder", variants: ["500g", "1kg"], price: 420 },
    { name: "Hair Mask Treatment", variants: ["250g", "500g"], price: 550, sale: 0.15 },
    { name: "Keratin Smoothing Treatment", variants: ["500ml", "1L"], price: 1650 },
    { name: "Hair Spa Cream", variants: ["500g", "1kg"], price: 690 },
  ],
  "hair-equipment": [
    { name: "Professional Hair Dryer", variants: ["Standard", "Pro"], price: 2200, specs: { Power: "2200W", Warranty: "1 year" } },
    { name: "Hair Straightener", variants: ["Standard", "Ceramic Pro"], price: 1800 },
    { name: "Hair Curler", variants: ["19mm", "25mm", "32mm"], price: 1500 },
    { name: "Hair Clipper", variants: ["Corded", "Cordless"], price: 2400, sale: 0.12 },
    { name: "Hair Trimmer", variants: ["Standard", "Pro"], price: 1250 },
    { name: "Hair Crimper", variants: ["Standard"], price: 1400 },
    { name: "Professional Scissors", variants: ["5.5 inch", "6 inch"], price: 950 },
    { name: "Salon Brush & Comb Set", variants: ["6pc", "12pc"], price: 540 },
  ],
  "skin-facial": [
    { name: "Facial Kit", variants: ["Gold", "Diamond", "Fruit"], price: 480 },
    { name: "Face Cream", variants: ["100g", "200g"], price: 380 },
    { name: "Face Serum", variants: ["30ml", "50ml"], price: 620, sale: 0.1 },
    { name: "Facial Cleanser", variants: ["250ml", "500ml"], price: 290 },
    { name: "Skin Toner", variants: ["250ml", "500ml"], price: 310 },
    { name: "Face Scrub", variants: ["200g", "500g"], price: 340 },
    { name: "Sheet Face Masks", variants: ["Pack of 20", "Pack of 50"], price: 450 },
  ],
  waxing: [
    { name: "Wax Heater", variants: ["Single Pot", "Double Pot"], price: 1450 },
    { name: "Hard Wax Beans", variants: ["500g", "1kg"], price: 380 },
    { name: "Wax Strips", variants: ["Pack of 100"], price: 260 },
    { name: "Wooden Spatulas", variants: ["Pack of 100", "Pack of 500"], price: 180 },
    { name: "Pre & Post Wax Lotion", variants: ["500ml", "1L"], price: 340 },
  ],
  nails: [
    { name: "Gel Polish", variants: ["Red", "Nude", "Black", "Pink"], price: 220 },
    { name: "Nail Extension Kit", variants: ["Standard"], price: 950 },
    { name: "Nail Tips", variants: ["Pack of 100", "Pack of 500"], price: 280 },
    { name: "UV/LED Nail Lamp", variants: ["36W", "48W"], price: 1650, sale: 0.08 },
    { name: "Nail File & Buffer Set", variants: ["12pc", "24pc"], price: 240 },
    { name: "Manicure Kit", variants: ["Standard", "Deluxe"], price: 780 },
    { name: "Pedicure Kit", variants: ["Standard", "Deluxe"], price: 890 },
  ],
  makeup: [
    { name: "Professional Makeup Kit", variants: ["Basic", "Studio"], price: 2800 },
    { name: "Makeup Brush Set", variants: ["12pc", "24pc"], price: 650 },
    { name: "Studio Foundation", variants: ["Ivory", "Beige", "Sand"], price: 720 },
    { name: "Concealer Palette", variants: ["6 Shade", "12 Shade"], price: 560 },
    { name: "Eye Makeup Palette", variants: ["Nude", "Bold"], price: 840 },
    { name: "Lip Colour Range", variants: ["Matte Set", "Gloss Set"], price: 690 },
  ],
  consumables: [
    { name: "Disposable Towels", variants: ["Pack of 50", "Pack of 100"], price: 320 },
    { name: "Nitrile Gloves", variants: ["S", "M", "L"], price: 280 },
    { name: "Disposable Bed Sheets", variants: ["Pack of 50"], price: 350 },
    { name: "Salon Capes", variants: ["Standard", "Waterproof"], price: 220 },
    { name: "Cotton Rolls", variants: ["500g", "1kg"], price: 180 },
    { name: "Highlighting Foils", variants: ["Roll", "Pre-cut Pack"], price: 260 },
    { name: "Salon Aprons", variants: ["Standard", "Premium"], price: 390 },
  ],
  "salon-furniture": [
    { name: "Salon Styling Chair", variants: ["Standard", "Hydraulic"], price: 8500 },
    { name: "Barber Chair", variants: ["Classic", "Premium"], price: 12500 },
    { name: "Shampoo Station", variants: ["Single", "Double"], price: 14500 },
    { name: "Facial Bed", variants: ["Standard", "Electric"], price: 9800, sale: 0.1 },
    { name: "Salon Trolley", variants: ["2-Tier", "3-Tier"], price: 3200 },
    { name: "Salon Mirror Unit", variants: ["Standard", "LED"], price: 6400 },
  ],
  "professional-equipment": [
    { name: "UV Sterilizer Cabinet", variants: ["Standard", "Large"], price: 4200 },
    { name: "Facial Steamer Machine", variants: ["Standard", "Ozone"], price: 5600 },
    { name: "Multifunction Beauty Machine", variants: ["6-in-1"], price: 18500 },
    { name: "Hair Steamer Stand", variants: ["Standard"], price: 6800 },
  ],
  "cleaning-hygiene": [
    { name: "Surface Disinfectant", variants: ["500ml", "1L", "5L"], price: 240 },
    { name: "Instrument Sanitizer", variants: ["500ml", "1L"], price: 260 },
    { name: "Hand Sanitizer", variants: ["500ml", "5L"], price: 210 },
    { name: "Salon Floor Cleaner", variants: ["1L", "5L"], price: 190 },
  ],
};

const CITIES: [string, string][] = [
  ["Mumbai", "Maharashtra"],
  ["Pune", "Maharashtra"],
  ["Delhi", "Delhi"],
  ["Bengaluru", "Karnataka"],
  ["Ahmedabad", "Gujarat"],
  ["Surat", "Gujarat"],
  ["Jaipur", "Rajasthan"],
  ["Lucknow", "Uttar Pradesh"],
  ["Chandigarh", "Chandigarh"],
  ["Hyderabad", "Telangana"],
];

const BUSINESS_NAMES = [
  "Glow Studio", "Elite Salon & Spa", "Blush Beauty Parlour", "The Barber Room",
  "Serenity Day Spa", "Radiance Beauty Studio", "Urban Cuts", "Bella Beauty Academy",
  "Lotus Salon", "Muse Makeup Studio", "Velvet Hair Lounge", "Prisma Beauty Bar",
  "Nova Salon", "Orchid Spa & Salon", "The Style Bar", "Aura Wellness Studio",
  "Bloom Beauty Parlour", "Crown Barbershop", "Silk Beauty Studio", "Zen Spa Retreat",
  "Charm Beauty Point", "Opal Salon", "Trendz Unisex Salon", "Lily Beauty Care",
  "Peak Grooming Lounge", "Shine Beauty Hub", "Grace Salon & Academy", "Vogue Beauty Studio",
];

const BUSINESS_TYPES: BusinessType[] = [
  "SALON", "PARLOUR", "SPA", "BEAUTY_STUDIO", "MAKEUP_ARTIST",
  "BARBERSHOP", "ACADEMY", "RETAILER", "OTHER",
];

const REVIEW_COMMENTS = [
  "Great quality, exactly what our salon needed. Will reorder.",
  "Good wholesale rates and delivery was on time.",
  "Product works well for daily salon use. Value for money.",
  "Packaging was solid and nothing was damaged in transit.",
  "We have been ordering this for months now — consistent quality.",
  "Decent product, though delivery took a little longer than expected.",
  "Excellent for bulk purchase. Our clients love the results.",
  "Reliable supplier for our parlour. Recommended.",
  "Quality is professional grade, much better than local market options.",
  "Reordered three times already. No complaints.",
];

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Clears transactional + catalogue data so the seed is repeatable. */
async function reset() {
  await prisma.inventoryTransaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.review.deleteMany();
  await prisma.bulkOrderRequest.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.wholesalePriceTier.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.customer.deleteMany();
}

async function main() {
  console.log("Seeding Shree Gopi Traders…");
  await reset();

  // ── Admin ───────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@shreegopitraders.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash: await bcrypt.hash(adminPassword, 12) },
    create: {
      name: "Shree Gopi Traders Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });
  console.log(`  admin: ${adminEmail}`);

  // ── Categories ──────────────────────────────────────────────
  const categoryIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.category.create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: IMG(c.slug),
        sortOrder: i,
        isActive: true,
      },
    });
    categoryIds.set(c.slug, cat.id);
  }
  console.log(`  ${CATEGORIES.length} categories`);

  // ── Products, variants, tiers, inventory ────────────────────
  let skuCounter = 1000;
  let productCount = 0;
  const variantRefs: { id: string; productId: string; price: number; inventoryId: string }[] = [];

  for (const [slug, products] of Object.entries(PRODUCTS_BY_CATEGORY)) {
    const categoryId = categoryIds.get(slug)!;

    for (const p of products) {
      skuCounter++;
      productCount++;
      const basePrice = p.price;
      const salePrice = p.sale ? Math.round(basePrice * (1 - p.sale)) : null;

      const product = await prisma.product.create({
        data: {
          name: p.name,
          slug: slugify(p.name),
          description:
            `Professional-grade ${p.name.toLowerCase()} supplied to salons, parlours, spas and academies. ` +
            `Bought in bulk by beauty businesses across India — wholesale rates apply automatically as your quantity increases.`,
          specs: p.specs ?? { "Made For": "Professional / salon use", Packaging: "Sealed", "Bulk Supply": "Available" },
          brand: randomFrom(BRANDS),
          sku: `SGT-${skuCounter}`,
          categoryId,
          images: [IMG(slug)],
          basePrice,
          salePrice,
          weight: randomInt(1, 40) / 10,
          isActive: true,
          allowBackorder: false,
        },
      });

      for (const [vi, variantName] of p.variants.entries()) {
        const variantSku = `SGT-${skuCounter}-${vi + 1}`;
        const variantPrice = Math.round(basePrice * (1 + vi * 0.35));
        const variantSale = p.sale ? Math.round(variantPrice * (1 - p.sale)) : null;
        const effective = variantSale ?? variantPrice;

        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: variantName,
            sku: variantSku,
            price: variantPrice,
            salePrice: variantSale,
            weight: randomInt(1, 50) / 10,
            imageUrl: IMG(slug),
            isActive: true,
          },
        });

        // Wholesale ladder: 1–4 at the shelf price, 5–9 −10%, 10+ −20%.
        await prisma.wholesalePriceTier.createMany({
          data: [
            { productVariantId: variant.id, minQty: 1, maxQty: 4, pricePerUnit: effective },
            { productVariantId: variant.id, minQty: 5, maxQty: 9, pricePerUnit: Math.round(effective * 0.9) },
            { productVariantId: variant.id, minQty: 10, maxQty: null, pricePerUnit: Math.round(effective * 0.8) },
          ],
        });

        // A few variants are deliberately low/out of stock so the admin
        // low-stock and out-of-stock states have something to show.
        const roll = random();
        const stock = roll < 0.05 ? 0 : roll < 0.15 ? randomInt(1, 8) : randomInt(25, 220);

        const inventory = await prisma.inventory.create({
          data: { productVariantId: variant.id, stock, lowStockThreshold: 10 },
        });

        if (stock > 0) {
          await prisma.inventoryTransaction.create({
            data: {
              inventoryId: inventory.id,
              action: "RESTOCK",
              quantity: stock,
              reason: "Opening stock",
              adminId: admin.id,
            },
          });
        }

        variantRefs.push({
          id: variant.id,
          productId: product.id,
          price: effective,
          inventoryId: inventory.id,
        });
      }
    }
  }
  console.log(`  ${productCount} products / ${variantRefs.length} variants`);

  // ── Customers ───────────────────────────────────────────────
  const customerPasswordHash = await bcrypt.hash("Password123!", 10);
  const customers: { id: string; businessName: string; createdAt: Date }[] = [];
  const now = new Date();

  for (const [i, businessName] of BUSINESS_NAMES.entries()) {
    const [city, state] = randomFrom(CITIES);
    // Spread signups across the window so "new customers" is meaningful.
    const createdAt = new Date(now.getFullYear(), now.getMonth() - randomInt(0, 13), randomInt(1, 27));

    const customer = await prisma.customer.create({
      data: {
        name: `Owner ${i + 1}`,
        email: `owner${i + 1}@${slugify(businessName)}.com`,
        phone: `9${randomInt(100000000, 999999999)}`,
        passwordHash: customerPasswordHash,
        createdAt,
        businessProfile: {
          create: {
            businessName,
            businessType: randomFrom(BUSINESS_TYPES),
            gstNumber: chance(0.6) ? `${randomInt(10, 37)}ABCDE${randomInt(1000, 9999)}F1Z${randomInt(1, 9)}` : null,
          },
        },
        addresses: {
          create: {
            label: "Salon",
            line1: `${randomInt(1, 200)}, ${randomFrom(["Market Road", "MG Road", "Station Road", "Ring Road", "Main Bazaar"])}`,
            city,
            state,
            pincode: `${randomInt(100000, 999999)}`,
            isDefault: true,
          },
        },
      },
    });
    customers.push({ id: customer.id, businessName, createdAt });
  }

  // A known demo login for manual testing.
  const demoCreatedAt = new Date(now.getFullYear(), now.getMonth() - 10, 5);
  const demo = await prisma.customer.create({
    data: {
      name: "Demo Buyer",
      email: "demo@shreegopitraders.com",
      phone: "9876543210",
      passwordHash: await bcrypt.hash("Demo@12345", 10),
      createdAt: demoCreatedAt,
      businessProfile: {
        create: { businessName: "Demo Salon & Spa", businessType: "SALON", gstNumber: "27ABCDE1234F1Z5" },
      },
      addresses: {
        create: {
          label: "Salon",
          line1: "12, Linking Road",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400050",
          isDefault: true,
        },
      },
    },
  });
  customers.push({ id: demo.id, businessName: "Demo Salon & Spa", createdAt: demoCreatedAt });
  console.log(`  ${customers.length} customers (demo login: demo@shreegopitraders.com / Demo@12345)`);

  // ── Coupons ─────────────────────────────────────────────────
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const yearAhead = new Date(now.getFullYear() + 1, now.getMonth(), 1);
  await prisma.coupon.createMany({
    data: [
      { code: "SALON10", discountType: "PERCENTAGE", discountValue: 10, minOrderValue: 2000, maxDiscount: 1500, startDate: yearAgo, endDate: yearAhead, usageLimit: 500, isActive: true },
      { code: "BULK500", discountType: "FIXED", discountValue: 500, minOrderValue: 10000, startDate: yearAgo, endDate: yearAhead, usageLimit: 200, isActive: true },
      { code: "NEWSALON", discountType: "PERCENTAGE", discountValue: 15, minOrderValue: 3000, maxDiscount: 2000, startDate: yearAgo, endDate: yearAhead, usageLimit: 100, isActive: true },
      { code: "FESTIVE25", discountType: "PERCENTAGE", discountValue: 25, minOrderValue: 5000, maxDiscount: 3000, startDate: yearAgo, endDate: new Date(now.getFullYear(), now.getMonth() - 2, 1), usageLimit: 50, isActive: false },
    ],
  });
  console.log("  4 coupons");

  // ── Orders across the last 12 months ────────────────────────
  const STATUS_POOL: OrderStatus[] = [
    "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED",
    "SHIPPED", "OUT_FOR_DELIVERY", "PROCESSING", "PACKED", "CONFIRMED", "PENDING", "CANCELLED",
  ];

  const perDaySequence = new Map<string, number>();
  let orderCount = 0;
  let cancelledCount = 0;
  const deliveredByCustomerProduct: { customerId: string; productId: string }[] = [];

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    // Gentle upward trend so the revenue chart tells a story.
    const growth = 1 + (11 - monthsAgo) * 0.06;
    const monthOrders = Math.round(randomInt(14, 26) * growth);
    const maxDay = monthsAgo === 0 ? Math.max(1, now.getDate()) : 28;

    for (let i = 0; i < monthOrders; i++) {
      const day = randomInt(1, maxDay);
      const createdAt = new Date(
        now.getFullYear(),
        now.getMonth() - monthsAgo,
        day,
        randomInt(9, 20),
        randomInt(0, 59)
      );
      if (createdAt > now) continue;

      const customer = randomFrom(customers);
      if (createdAt < customer.createdAt) continue; // no orders before the account existed

      const lineCount = randomInt(1, 5);
      const chosen = new Map<string, (typeof variantRefs)[number]>();
      for (let n = 0; n < lineCount; n++) {
        const v = randomFrom(variantRefs);
        chosen.set(v.id, v);
      }

      let subtotal = 0;
      let listSubtotal = 0;
      const items = [...chosen.values()].map((v) => {
        // Bias toward wholesale quantities — this is a B2B buyer.
        const qty = chance(0.45) ? randomInt(10, 40) : chance(0.6) ? randomInt(5, 9) : randomInt(1, 4);
        const unitPrice = qty >= 10 ? Math.round(v.price * 0.8) : qty >= 5 ? Math.round(v.price * 0.9) : v.price;
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        listSubtotal += v.price * qty;
        return {
          variantId: v.id,
          productId: v.productId,
          quantity: qty,
          unitPrice,
          listPrice: v.price,
          lineTotal,
        };
      });

      const status = randomFrom(STATUS_POOL);
      if (status === "CANCELLED") cancelledCount++;

      const useCoupon = chance(0.18) && subtotal >= 3000;
      const couponDiscount = useCoupon ? Math.min(Math.round(subtotal * 0.1), 1500) : 0;
      const deliveryFee = subtotal >= 5000 ? 0 : 199;
      const total = subtotal - couponDiscount + deliveryFee;

      const dateKey = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(createdAt.getDate()).padStart(2, "0")}`;
      const sequence = (perDaySequence.get(dateKey) ?? 0) + 1;
      perDaySequence.set(dateKey, sequence);
      const orderNumber = `SGT-${dateKey}-${String(sequence).padStart(4, "0")}`;

      const [city, state] = randomFrom(CITIES);

      const variantDetails = await prisma.productVariant.findMany({
        where: { id: { in: items.map((i) => i.variantId) } },
        select: { id: true, name: true, product: { select: { name: true } } },
      });
      const detailMap = new Map(variantDetails.map((v) => [v.id, v]));

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          businessName: customer.businessName,
          subtotal,
          bulkDiscount: listSubtotal - subtotal,
          couponDiscount,
          couponCode: useCoupon ? "SALON10" : null,
          deliveryFee,
          tax: 0,
          total,
          paymentMethod: "COD",
          paymentStatus: status === "DELIVERED" ? "PAID" : status === "CANCELLED" ? "PENDING" : "COD",
          status,
          shippingAddress: {
            contactName: `Owner`,
            businessName: customer.businessName,
            phone: `9${randomInt(100000000, 999999999)}`,
            email: "orders@example.com",
            line1: `${randomInt(1, 200)}, Market Road`,
            city,
            state,
            pincode: `${randomInt(100000, 999999)}`,
          },
          createdAt,
          updatedAt: createdAt,
          items: {
            create: items.map((it) => ({
              productId: it.productId,
              productVariantId: it.variantId,
              productName: detailMap.get(it.variantId)?.product.name ?? "Product",
              variantName: detailMap.get(it.variantId)?.name ?? "Standard",
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              listPrice: it.listPrice,
              lineTotal: it.lineTotal,
            })),
          },
          delivery: {
            create: {
              status:
                status === "DELIVERED" ? "DELIVERED"
                : status === "OUT_FOR_DELIVERY" ? "OUT_FOR_DELIVERY"
                : status === "SHIPPED" ? "SHIPPED"
                : status === "PACKED" ? "PACKED"
                : status === "CANCELLED" ? "FAILED"
                : "PENDING",
              courierName: ["Delhivery", "BlueDart", "DTDC", "Ecom Express"][randomInt(0, 3)],
              trackingNumber: `TRK${randomInt(10000000, 99999999)}`,
              expectedDeliveryDate: new Date(createdAt.getTime() + randomInt(2, 7) * 86400000),
            },
          },
        },
        select: { id: true },
      });

      if (status === "DELIVERED") {
        for (const it of items) {
          deliveredByCustomerProduct.push({ customerId: customer.id, productId: it.productId });
        }
      }

      // Historical orders consumed stock — record it so inventory history is honest.
      for (const it of items) {
        const ref = variantRefs.find((v) => v.id === it.variantId);
        if (!ref || status === "CANCELLED") continue;
        await prisma.inventoryTransaction.create({
          data: {
            inventoryId: ref.inventoryId,
            action: "ORDER",
            quantity: -it.quantity,
            reason: `Order ${orderNumber}`,
            orderId: order.id,
            createdAt,
          },
        });
      }

      orderCount++;
    }
  }
  console.log(`  ${orderCount} orders across 12 months (${cancelledCount} cancelled)`);

  // ── Reviews (only from customers who actually received the product) ──
  const reviewKeys = new Set<string>();
  let reviewCount = 0;
  for (const pair of deliveredByCustomerProduct) {
    if (reviewCount >= 70) break;
    const key = `${pair.customerId}:${pair.productId}`;
    if (reviewKeys.has(key)) continue;
    if (!chance(0.28)) continue;
    reviewKeys.add(key);

    const rating = chance(0.72) ? randomInt(4, 5) : randomInt(2, 3);
    await prisma.review.create({
      data: {
        productId: pair.productId,
        customerId: pair.customerId,
        rating,
        comment: randomFrom(REVIEW_COMMENTS),
        status: chance(0.82) ? "APPROVED" : chance(0.5) ? "PENDING" : "REJECTED",
        createdAt: new Date(now.getFullYear(), now.getMonth() - randomInt(0, 10), randomInt(1, 27)),
      },
    });
    reviewCount++;
  }

  // Roll the approved reviews up into each product's rating.
  const ratingRows = await prisma.review.groupBy({
    by: ["productId"],
    where: { status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const row of ratingRows) {
    await prisma.product.update({
      where: { id: row.productId },
      data: {
        ratingAvg: Number((row._avg.rating ?? 0).toFixed(2)),
        ratingCount: row._count._all,
      },
    });
  }
  console.log(`  ${reviewCount} reviews (${ratingRows.length} products rated)`);

  // ── Bulk order requests ─────────────────────────────────────
  const BULK_STATUSES = ["PENDING", "REVIEWING", "QUOTED", "APPROVED", "REJECTED", "COMPLETED"] as const;
  for (let i = 0; i < 12; i++) {
    const customer = randomFrom(customers);
    const [city, state] = randomFrom(CITIES);
    const status = randomFrom(BULK_STATUSES);
    const createdAt = new Date(now.getFullYear(), now.getMonth() - randomInt(0, 6), randomInt(1, 27));
    await prisma.bulkOrderRequest.create({
      data: {
        customerId: chance(0.6) ? customer.id : null,
        companyName: customer.businessName,
        contactPerson: `Owner ${i + 1}`,
        phone: `9${randomInt(100000000, 999999999)}`,
        email: `bulk${i + 1}@example.com`,
        productsNote: randomFrom([
          "50 x Professional Shampoo 1L, 30 x Conditioner 1L, 20 x Hair Serum 200ml",
          "10 x Salon Styling Chair (Hydraulic), 4 x Shampoo Station (Double)",
          "200 x Nitrile Gloves (M), 100 x Disposable Towels, 50 x Salon Capes",
          "25 x Facial Kit (Gold), 25 x Facial Kit (Diamond), 15 x Facial Steamer",
          "Full nail bar setup — lamps, gel polish range, extension kits for 6 stations",
        ]),
        expectedDate: new Date(createdAt.getTime() + randomInt(7, 45) * 86400000),
        deliveryLocation: `${city}, ${state}`,
        additionalNotes: chance(0.5) ? "Please share GST invoice and best wholesale rate." : null,
        quotedAmount: ["QUOTED", "APPROVED", "COMPLETED"].includes(status) ? randomInt(25000, 350000) : null,
        status,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }
  console.log("  12 bulk order requests");

  // ── Contact enquiries ───────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const customer = randomFrom(customers);
    await prisma.contactMessage.create({
      data: {
        name: `Enquirer ${i + 1}`,
        businessName: customer.businessName,
        phone: `9${randomInt(100000000, 999999999)}`,
        email: `enquiry${i + 1}@example.com`,
        message: randomFrom([
          "Do you deliver to Nashik? What is the minimum order value for free delivery?",
          "Please share your wholesale rate card for hair care products.",
          "We are opening a new academy and need a full setup quote.",
          "Is the facial steamer available with a warranty? Please confirm.",
          "Can we get monthly credit terms for regular bulk orders?",
        ]),
        status: randomFrom(["UNREAD", "UNREAD", "READ", "ARCHIVED"] as const),
        createdAt: new Date(now.getFullYear(), now.getMonth() - randomInt(0, 4), randomInt(1, 27)),
      },
    });
  }
  console.log("  10 enquiries");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

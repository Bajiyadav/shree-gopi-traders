/**
 * Shree Gopi Traders — demo seed.
 *
 * Builds the full catalogue from `catalog-data.ts`, then generates 12 months
 * of trading history on top of it so the admin analytics have real data to
 * compute from. Deterministic: a seeded PRNG means re-running produces the
 * same numbers.
 *
 * DESTRUCTIVE — wipes catalogue, customers and order history before
 * rebuilding. Never run against a production database that holds real orders.
 *
 * Run with: npm run seed
 */
import { PrismaClient, type BusinessType, type OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  CATALOG,
  STOCK_PROFILES,
  TIER_PROFILES,
  type SeedCategory,
  type SeedProduct,
} from "./catalog-data";

const prisma = new PrismaClient();

// ── Deterministic RNG (mulberry32) ────────────────────────────
let seedState = 20260809;
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

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Image paths follow the folder layout produced by scripts/generate-product-images.mjs. */
function productImages(category: SeedCategory, product: SeedProduct) {
  const slug = slugify(product.name);
  return [
    `/products/${category.slug}/${slug}.svg`,
    `/products/${category.slug}/${slug}-2.svg`,
    `/products/${category.slug}/${slug}-3.svg`,
  ];
}

const CITIES: [string, string][] = [
  ["Mumbai", "Maharashtra"],
  ["Pune", "Maharashtra"],
  ["Nashik", "Maharashtra"],
  ["Delhi", "Delhi"],
  ["Bengaluru", "Karnataka"],
  ["Ahmedabad", "Gujarat"],
  ["Surat", "Gujarat"],
  ["Jaipur", "Rajasthan"],
  ["Lucknow", "Uttar Pradesh"],
  ["Chandigarh", "Chandigarh"],
  ["Hyderabad", "Telangana"],
  ["Indore", "Madhya Pradesh"],
];

const BUSINESS_NAMES = [
  "Glow Studio", "Elite Salon & Spa", "Blush Beauty Parlour", "The Barber Room",
  "Serenity Day Spa", "Radiance Beauty Studio", "Urban Cuts", "Bella Beauty Academy",
  "Lotus Salon", "Muse Makeup Studio", "Velvet Hair Lounge", "Prisma Beauty Bar",
  "Nova Salon", "Orchid Spa & Salon", "The Style Bar", "Aura Wellness Studio",
  "Bloom Beauty Parlour", "Crown Barbershop", "Silk Beauty Studio", "Zen Spa Retreat",
  "Charm Beauty Point", "Opal Salon", "Trendz Unisex Salon", "Lily Beauty Care",
  "Peak Grooming Lounge", "Shine Beauty Hub", "Grace Salon & Academy", "Vogue Beauty Studio",
  "Amber Hair Studio", "Petal Beauty Lounge", "Sculpt Barber Co", "Ivory Beauty Rooms",
];

const BUSINESS_TYPES: BusinessType[] = [
  "SALON", "PARLOUR", "SPA", "BEAUTY_STUDIO", "MAKEUP_ARTIST",
  "BARBERSHOP", "ACADEMY", "RETAILER", "OTHER",
];

/**
 * Demo review text. These are seeded placeholder content for the demo
 * catalogue — they are not real customer feedback, and are attributed to
 * seeded demo accounts rather than to any real person or business.
 */
const DEMO_REVIEW_TEXT = [
  "Good quality for the price, and the wholesale rate at 10+ units works well for us.",
  "Ordered for our salon, delivery was on time and packaging was intact.",
  "Consistent quality across repeat orders. We reorder this monthly.",
  "Works well for daily salon use. Sensible bulk pricing.",
  "Decent product overall, though delivery took slightly longer than expected.",
  "Professional grade and better value than our previous local supplier.",
  "We use this across all our stations. No complaints so far.",
  "Packaging could be sturdier, but the product itself is fine.",
  "Good bulk rates. Useful for a multi-chair setup like ours.",
  "Reordered three times now. Quality has stayed the same each time.",
];

// ── Reset ─────────────────────────────────────────────────────

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

interface VariantRef {
  id: string;
  productId: string;
  inventoryId: string;
  /** Effective single-unit price (sale price if marked down, else list). */
  price: number;
  listPrice: number;
  profile: keyof typeof TIER_PROFILES;
  categorySlug: string;
}

async function main() {
  const startedAt = Date.now();
  console.log("Seeding Shree Gopi Traders…");
  await reset();

  // ── Admin ───────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@shreegopitraders.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { name: "Shree Gopi Traders Admin", email: adminEmail, passwordHash },
  });
  console.log(`  admin: ${adminEmail}`);

  // ── Catalogue ───────────────────────────────────────────────
  const variantRefs: VariantRef[] = [];
  const tierRows: {
    productVariantId: string;
    minQty: number;
    maxQty: number | null;
    pricePerUnit: number;
  }[] = [];
  const openingStockRows: {
    inventoryId: string;
    action: "RESTOCK";
    quantity: number;
    reason: string;
    adminId: string;
  }[] = [];

  let productCount = 0;
  let variantCount = 0;

  for (const [categoryIndex, category] of CATALOG.entries()) {
    const dbCategory = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: `/products/${category.slug}/_category.svg`,
        sortOrder: categoryIndex,
        isActive: true,
      },
    });

    const [minStock, maxStock, lowStockThreshold] = STOCK_PROFILES[category.profile];
    const tiers = TIER_PROFILES[category.profile];

    for (const [productIndex, product] of category.products.entries()) {
      // SGT-HC-001 — the product SKU customers and admins search by.
      const productSku = `SGT-${category.skuCode}-${String(productIndex + 1).padStart(3, "0")}`;
      const images = productImages(category, product);

      const variantData = product.variants.map(([variantName, listPrice], variantIndex) => {
        const salePrice = product.sale ? Math.round(listPrice * (1 - product.sale)) : null;
        const stock = randomInt(minStock, maxStock);
        return {
          name: variantName,
          sku: `${productSku}-${variantIndex + 1}`,
          price: listPrice,
          salePrice,
          weight: randomInt(1, 60) / 10,
          imageUrl: images[0],
          isActive: true,
          inventory: { create: { stock, lowStockThreshold } },
        };
      });

      const listPrices = product.variants.map(([, price]) => price);
      const basePrice = Math.min(...listPrices);
      const saleBase = product.sale ? Math.round(basePrice * (1 - product.sale)) : null;

      const created = await prisma.product.create({
        data: {
          name: product.name,
          slug: slugify(product.name),
          description: product.description,
          specs: { ...product.specs, Brand: product.brand, Category: category.name },
          brand: product.brand,
          sku: productSku,
          categoryId: dbCategory.id,
          images,
          basePrice,
          salePrice: saleBase,
          weight: randomInt(1, 60) / 10,
          isActive: true,
          allowBackorder: false,
          variants: { create: variantData },
        },
        include: { variants: { include: { inventory: true } } },
      });

      productCount++;

      for (const variant of created.variants) {
        variantCount++;
        const listPrice = Number(variant.price);
        const effective = variant.salePrice === null ? listPrice : Number(variant.salePrice);

        // Build this variant's wholesale ladder from the category profile.
        for (const [minQty, maxQty, discount] of tiers) {
          tierRows.push({
            productVariantId: variant.id,
            minQty,
            maxQty,
            pricePerUnit: Math.round(effective * (1 - discount)),
          });
        }

        if (variant.inventory) {
          if (variant.inventory.stock > 0) {
            openingStockRows.push({
              inventoryId: variant.inventory.id,
              action: "RESTOCK",
              quantity: variant.inventory.stock,
              reason: "Opening stock",
              adminId: admin.id,
            });
          }
          variantRefs.push({
            id: variant.id,
            productId: created.id,
            inventoryId: variant.inventory.id,
            price: effective,
            listPrice,
            profile: category.profile,
            categorySlug: category.slug,
          });
        }
      }
    }
  }

  await prisma.wholesalePriceTier.createMany({ data: tierRows });
  await prisma.inventoryTransaction.createMany({ data: openingStockRows });

  console.log(
    `  ${CATALOG.length} categories / ${productCount} products / ${variantCount} variants / ${tierRows.length} wholesale tiers`
  );

  // ── Customers ───────────────────────────────────────────────
  const customerPasswordHash = await bcrypt.hash("Password123!", 10);
  const customers: { id: string; businessName: string; createdAt: Date }[] = [];
  const now = new Date();

  for (const [i, businessName] of BUSINESS_NAMES.entries()) {
    const [city, state] = randomFrom(CITIES);
    const createdAt = new Date(now.getFullYear(), now.getMonth() - randomInt(0, 17), randomInt(1, 27));

    const customer = await prisma.customer.create({
      data: {
        name: `Owner ${i + 1}`,
        email: `owner${i + 1}@${slugify(businessName)}.example`,
        phone: `9${randomInt(100000000, 999999999)}`,
        passwordHash: customerPasswordHash,
        createdAt,
        businessProfile: {
          create: {
            businessName,
            businessType: randomFrom(BUSINESS_TYPES),
            gstNumber: chance(0.6)
              ? `${randomInt(10, 37)}ABCDE${randomInt(1000, 9999)}F1Z${randomInt(1, 9)}`
              : null,
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

  /** Typical order quantity depends on what class of product it is. */
  function quantityFor(profile: VariantRef["profile"]) {
    switch (profile) {
      case "consumable":
        return chance(0.5) ? randomInt(25, 80) : chance(0.6) ? randomInt(10, 24) : randomInt(5, 9);
      case "product":
        return chance(0.4) ? randomInt(10, 30) : chance(0.6) ? randomInt(5, 9) : randomInt(1, 4);
      case "equipment":
        return chance(0.3) ? randomInt(5, 12) : randomInt(1, 4);
      case "furniture":
        return chance(0.25) ? randomInt(3, 6) : randomInt(1, 2);
      case "machine":
        return chance(0.2) ? randomInt(3, 5) : randomInt(1, 2);
    }
  }

  /** Resolve the tier price the same way the app's pricing engine does. */
  function tierPrice(ref: VariantRef, qty: number) {
    const bands = TIER_PROFILES[ref.profile];
    let best: (typeof bands)[number] | null = null;
    for (const band of bands) {
      const [minQty, maxQty] = band;
      if (qty >= minQty && (maxQty === null || qty <= maxQty)) {
        if (!best || minQty > best[0]) best = band;
      }
    }
    return Math.round(ref.price * (1 - (best ? best[2] : 0)));
  }

  const variantMeta = await prisma.productVariant.findMany({
    select: { id: true, name: true, product: { select: { name: true } } },
  });
  const metaById = new Map(variantMeta.map((v) => [v.id, v]));

  const perDaySequence = new Map<string, number>();
  const orderTransactions: {
    inventoryId: string;
    action: "ORDER";
    quantity: number;
    reason: string;
    orderId: string;
    createdAt: Date;
  }[] = [];
  const deliveredPairs: { customerId: string; productId: string }[] = [];

  let orderCount = 0;
  let cancelledCount = 0;
  let orderItemCount = 0;

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    // A gentle upward trend so the revenue chart tells a story.
    const growth = 1 + (11 - monthsAgo) * 0.06;
    const monthOrders = Math.round(randomInt(20, 32) * growth);
    const maxDay = monthsAgo === 0 ? Math.max(1, now.getDate()) : 28;

    for (let i = 0; i < monthOrders; i++) {
      const createdAt = new Date(
        now.getFullYear(),
        now.getMonth() - monthsAgo,
        randomInt(1, maxDay),
        randomInt(9, 20),
        randomInt(0, 59)
      );
      if (createdAt > now) continue;

      const customer = randomFrom(customers);
      if (createdAt < customer.createdAt) continue;

      const lineCount = randomInt(2, 6);
      const chosen = new Map<string, VariantRef>();
      for (let n = 0; n < lineCount; n++) {
        const ref = randomFrom(variantRefs);
        chosen.set(ref.id, ref);
      }

      let subtotal = 0;
      let listSubtotal = 0;
      const items = [...chosen.values()].map((ref) => {
        const quantity = quantityFor(ref.profile);
        const unitPrice = tierPrice(ref, quantity);
        const lineTotal = unitPrice * quantity;
        subtotal += lineTotal;
        listSubtotal += ref.listPrice * quantity;
        return { ref, quantity, unitPrice, lineTotal };
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
            contactName: "Owner",
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
            create: items.map((item) => ({
              productId: item.ref.productId,
              productVariantId: item.ref.id,
              productName: metaById.get(item.ref.id)?.product.name ?? "Product",
              variantName: metaById.get(item.ref.id)?.name ?? "Standard",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              listPrice: item.ref.listPrice,
              lineTotal: item.lineTotal,
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
              courierName: randomFrom(["Delhivery", "BlueDart", "DTDC", "Ecom Express"]),
              trackingNumber: `TRK${randomInt(10000000, 99999999)}`,
              expectedDeliveryDate: new Date(createdAt.getTime() + randomInt(2, 7) * 86400000),
            },
          },
        },
        select: { id: true },
      });

      orderItemCount += items.length;
      orderCount++;

      if (status === "DELIVERED") {
        for (const item of items) {
          deliveredPairs.push({ customerId: customer.id, productId: item.ref.productId });
        }
      }

      // Historical orders consumed stock — record it so the history is honest.
      if (status !== "CANCELLED") {
        for (const item of items) {
          orderTransactions.push({
            inventoryId: item.ref.inventoryId,
            action: "ORDER",
            quantity: -item.quantity,
            reason: `Order ${orderNumber}`,
            orderId: order.id,
            createdAt,
          });
        }
      }
    }
  }

  await prisma.inventoryTransaction.createMany({ data: orderTransactions });
  console.log(
    `  ${orderCount} orders / ${orderItemCount} order items across 12 months (${cancelledCount} cancelled)`
  );

  // ── Reviews (only from customers who actually received the product) ──
  const reviewKeys = new Set<string>();
  const reviewRows: {
    productId: string;
    customerId: string;
    rating: number;
    comment: string;
    status: "APPROVED" | "PENDING" | "REJECTED";
    createdAt: Date;
  }[] = [];

  for (const pair of deliveredPairs) {
    if (reviewRows.length >= 90) break;
    const key = `${pair.customerId}:${pair.productId}`;
    if (reviewKeys.has(key)) continue;
    if (!chance(0.4)) continue;
    reviewKeys.add(key);

    reviewRows.push({
      productId: pair.productId,
      customerId: pair.customerId,
      rating: chance(0.72) ? randomInt(4, 5) : randomInt(2, 3),
      comment: randomFrom(DEMO_REVIEW_TEXT),
      status: chance(0.82) ? "APPROVED" : chance(0.5) ? "PENDING" : "REJECTED",
      createdAt: new Date(now.getFullYear(), now.getMonth() - randomInt(0, 10), randomInt(1, 27)),
    });
  }
  await prisma.review.createMany({ data: reviewRows });

  // Roll approved reviews up into each product's rating.
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
  console.log(`  ${reviewRows.length} demo reviews (${ratingRows.length} products rated)`);

  // ── Bulk order requests ─────────────────────────────────────
  const BULK_STATUSES = ["PENDING", "REVIEWING", "QUOTED", "APPROVED", "REJECTED", "COMPLETED"] as const;
  const BULK_REQUIREMENTS = [
    "50 x Professional Shampoo 5L, 30 x Professional Conditioner 5L, 20 x Argan Hair Serum 200ml",
    "10 x Hydraulic Salon Styling Chair (Black), 4 x Salon Shampoo Station (Double Unit)",
    "500 x Nitrile Gloves (Medium), 200 x Disposable Salon Towels, 100 x Waterproof Salon Cape",
    "25 x Gold Facial Kit (Professional Pack), 25 x De-Tan Facial Kit, 10 x Professional Facial Steamer",
    "Full nail bar setup — 6 x UV/LED Nail Lamp 48W, 6 x Professional Nail Drill, full gel polish range",
    "Barbershop fit-out — 6 x Professional Barber Chair, 12 x Professional Hair Clipper, razor consumables",
    "Monthly consumables contract — gloves, towels, cotton, foils and disposables for 3 branches",
  ];

  for (let i = 0; i < 14; i++) {
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
        productsNote: randomFrom(BULK_REQUIREMENTS),
        expectedDate: new Date(createdAt.getTime() + randomInt(7, 45) * 86400000),
        deliveryLocation: `${city}, ${state}`,
        additionalNotes: chance(0.5) ? "Please share GST invoice and your best wholesale rate." : null,
        quotedAmount: ["QUOTED", "APPROVED", "COMPLETED"].includes(status)
          ? randomInt(25000, 350000)
          : null,
        status,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }
  console.log("  14 bulk order requests");

  // ── Contact enquiries ───────────────────────────────────────
  const ENQUIRIES = [
    "Do you deliver to Nashik? What is the minimum order value for free delivery?",
    "Please share your wholesale rate card for hair care and colour products.",
    "We are opening a new academy and need a full setup quote including furniture.",
    "Is the facial steamer supplied with a warranty? Please confirm the terms.",
    "Can we get monthly credit terms for regular bulk consumable orders?",
    "Do you stock larger pack sizes of nitrile gloves than what is listed?",
  ];
  for (let i = 0; i < 12; i++) {
    const customer = randomFrom(customers);
    await prisma.contactMessage.create({
      data: {
        name: `Enquirer ${i + 1}`,
        businessName: customer.businessName,
        phone: `9${randomInt(100000000, 999999999)}`,
        email: `enquiry${i + 1}@example.com`,
        message: randomFrom(ENQUIRIES),
        status: randomFrom(["UNREAD", "UNREAD", "READ", "ARCHIVED"] as const),
        createdAt: new Date(now.getFullYear(), now.getMonth() - randomInt(0, 4), randomInt(1, 27)),
      },
    });
  }
  console.log("  12 enquiries");

  console.log(`Seed complete in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

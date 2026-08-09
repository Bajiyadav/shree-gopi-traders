/**
 * DEMO TRADING HISTORY — 12 months of orders, customers and invoices.
 *
 *   npm run demo:orders                    # generate
 *   npm run demo:orders -- --clear         # remove everything it generated
 *   npm run demo:orders -- --fresh         # also clear the seed's own orders
 *   npm run demo:orders -- --remote-demo   # allow a remote *demo* database
 *
 * WHY THIS EXISTS
 * A new store's admin dashboard is all zeros, so there is no way to see what
 * the analytics, order list and billing screens actually look like in use.
 * This fills a LOCAL database with a plausible year of trading so those
 * screens can be reviewed and demonstrated.
 *
 * WHAT IT IS NOT
 * This is not real trading data and must never be presented as such. Every
 * customer is a fictional persona on a `.example` address — a domain reserved
 * by RFC 2606 precisely so it can never belong to anyone. That also makes the
 * data removable: `--clear` deletes exactly the accounts on that domain and
 * everything hanging off them.
 *
 * It refuses to run against Neon. Production has taken no orders, and the
 * revenue figures the owner sees there must stay the real ones.
 *
 * Only orders, order items, deliveries, invoices, customers, business profiles
 * and addresses are written. The catalogue — products, variants, prices,
 * wholesale tiers, stock — is read but never modified.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import type { BusinessType, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();
const CLEAR = process.argv.includes("--clear");
/** Also remove orders this script did not create — for a clean demo deployment. */
const FRESH = process.argv.includes("--fresh");

/**
 * RFC 2606 reserves `.example` so it can never belong to anyone. The `demo.`
 * label narrows it further to accounts THIS script created, so `--clear`
 * cannot reach the customers `npm run seed` makes on the same reserved domain.
 */
const DEMO_SUFFIX = "@demo.example";

// ── Guard ─────────────────────────────────────────────────────
/**
 * Writing fabricated revenue into the live store would leave the owner with
 * figures nobody can later separate from real sales. So a remote database is
 * refused unless BOTH of these hold:
 *
 *   1. the database is *named* as a demo database, and
 *   2. --remote-demo is passed explicitly.
 *
 * Two independent conditions, because either alone is too easy to trip by
 * accident. The production database is called `neondb`, so it fails the first
 * outright and no flag can override that.
 */
const url = process.env.DATABASE_URL ?? "";
const REMOTE_OK = process.argv.includes("--remote-demo");
const dbName = url.match(/\/([^/?]+)(\?|$)/)?.[1] ?? "";
const isRemote = /neon\.tech|amazonaws|supabase|render\.com/.test(url);

if (isRemote && !(/demo/i.test(dbName) && REMOTE_OK)) {
  console.error(`
  Refusing to write demo orders to a remote database.

  Target database : ${dbName || "(none)"}
  Named as demo   : ${/demo/i.test(dbName) ? "yes" : "NO"}
  --remote-demo   : ${REMOTE_OK ? "given" : "NOT GIVEN"}

  This script writes fabricated orders and revenue. In the live store those
  figures could never be told apart from real sales afterwards.

  Both conditions must hold to proceed against a remote database.
`);
  process.exit(1);
}

// ── Deterministic RNG (mulberry32) ────────────────────────────
// Same generator the seed uses, so a given run is reproducible.
let seedState = 20260809;
function random() {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randomInt = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const randomFrom = <T,>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)];
const chance = (p: number) => random() < p;

// ── Personas ──────────────────────────────────────────────────
// Fictional owners of fictional businesses. Common Indian given names and
// surnames combined at random; any resemblance to a real proprietor is
// coincidental, and none of these addresses can receive mail.
const FIRST_NAMES = [
  "Aarti", "Priya", "Sneha", "Kavita", "Meera", "Anjali", "Divya", "Pooja",
  "Ritu", "Shalini", "Neha", "Swati", "Rekha", "Nisha", "Farah", "Sunita",
  "Rahul", "Amit", "Vikram", "Imran", "Sandeep", "Rajesh", "Karan", "Manish",
  "Deepak", "Suresh", "Arun", "Vivek",
];
const LAST_NAMES = [
  "Sharma", "Patel", "Nair", "Reddy", "Iyer", "Desai", "Joshi", "Kulkarni",
  "Mehta", "Chauhan", "Gupta", "Bhatt", "Rao", "Pillai", "Shetty", "Khan",
  "Singh", "Verma", "Kapoor", "Menon", "Bose", "Malhotra",
];

const CITIES: [string, string, string][] = [
  ["Mumbai", "Maharashtra", "4000"], ["Pune", "Maharashtra", "4110"],
  ["Nashik", "Maharashtra", "4220"], ["Delhi", "Delhi", "1100"],
  ["Bengaluru", "Karnataka", "5600"], ["Ahmedabad", "Gujarat", "3800"],
  ["Surat", "Gujarat", "3950"], ["Jaipur", "Rajasthan", "3020"],
  ["Lucknow", "Uttar Pradesh", "2260"], ["Chandigarh", "Chandigarh", "1600"],
  ["Hyderabad", "Telangana", "5000"], ["Indore", "Madhya Pradesh", "4520"],
];

const BUSINESSES: [string, BusinessType][] = [
  ["Glow Studio", "BEAUTY_STUDIO"], ["Elite Salon & Spa", "SPA"],
  ["Blush Beauty Parlour", "PARLOUR"], ["The Barber Room", "BARBERSHOP"],
  ["Serenity Day Spa", "SPA"], ["Radiance Beauty Studio", "BEAUTY_STUDIO"],
  ["Urban Cuts", "BARBERSHOP"], ["Bella Beauty Academy", "ACADEMY"],
  ["Lotus Salon", "SALON"], ["Muse Makeup Studio", "MAKEUP_ARTIST"],
  ["Velvet Hair Lounge", "SALON"], ["Prisma Beauty Bar", "BEAUTY_STUDIO"],
  ["Nova Salon", "SALON"], ["Orchid Spa & Salon", "SPA"],
  ["The Style Bar", "SALON"], ["Aura Wellness Studio", "SPA"],
  ["Bloom Beauty Parlour", "PARLOUR"], ["Crown Barbershop", "BARBERSHOP"],
  ["Silk Beauty Studio", "BEAUTY_STUDIO"], ["Zen Spa Retreat", "SPA"],
  ["Charm Beauty Point", "PARLOUR"], ["Opal Salon", "SALON"],
  ["Trendz Unisex Salon", "SALON"], ["Lily Beauty Care", "PARLOUR"],
  ["Peak Grooming Lounge", "BARBERSHOP"], ["Shine Beauty Hub", "RETAILER"],
  ["Grace Salon & Academy", "ACADEMY"], ["Vogue Beauty Studio", "BEAUTY_STUDIO"],
  ["Amber Hair Studio", "SALON"], ["Petal Beauty Lounge", "PARLOUR"],
  ["Sculpt Barber Co", "BARBERSHOP"], ["Ivory Beauty Rooms", "BEAUTY_STUDIO"],
  ["Maya Bridal Studio", "MAKEUP_ARTIST"], ["Kesh Care Salon", "SALON"],
  ["Tulip Beauty Parlour", "PARLOUR"], ["Refine Grooming Studio", "BARBERSHOP"],
];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ── Clear ─────────────────────────────────────────────────────
async function clearDemo() {
  // --fresh also takes the seed's own customers and orders, so a demo
  // deployment shows one coherent trading history rather than two overlapping
  // ones. Without it, only accounts this script created are touched.
  const demoCustomers = await prisma.customer.findMany({
    where: FRESH ? {} : { email: { endsWith: DEMO_SUFFIX } },
    select: { id: true },
  });
  const ids = demoCustomers.map((c) => c.id);
  if (!ids.length) {
    console.log("  Nothing to clear — no demo customers found.");
    return;
  }

  const orders = await prisma.order.findMany({
    where: { customerId: { in: ids } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  // Invoices, order items, deliveries and carts cascade. Reviews and bulk
  // order requests do not — they only restrict — so they go first.
  await prisma.inventoryTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.review.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.bulkOrderRequest.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: ids } } });
  if (FRESH) {
    // Any order left behind belongs to no customer we kept; there should be none.
    const stragglers = await prisma.order.count();
    if (stragglers) console.log(`  Note: ${stragglers} order(s) remain from another source.`);
  }

  console.log(`  Removed ${orderIds.length} order(s) and ${ids.length} demo customer(s).`);
}

// ── Generate ──────────────────────────────────────────────────
async function generate() {
  const now = new Date();

  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, product: { isActive: true } },
    select: {
      id: true, name: true, price: true, salePrice: true, productId: true,
      product: { select: { name: true, moq: true } },
      wholesaleTiers: { select: { minQty: true, maxQty: true, pricePerUnit: true }, orderBy: { minQty: "asc" } },
      inventory: { select: { id: true } },
    },
  });

  if (!variants.length) {
    console.error("  No active products found. Run `npm run seed` first.");
    process.exitCode = 1;
    return;
  }

  /** Mirrors selectTier() in src/lib/pricing.ts: highest qualifying tier wins. */
  function priceAt(v: (typeof variants)[number], qty: number) {
    let best: (typeof v.wholesaleTiers)[number] | null = null;
    for (const t of v.wholesaleTiers) {
      const inRange = qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty);
      if (inRange && (!best || t.minQty > best.minQty)) best = t;
    }
    if (best) return Number(best.pricePerUnit);
    return Number(v.salePrice ?? v.price);
  }

  // ── Customers ───────────────────────────────────────────────
  // Most of the book is established before the reporting window opens; a
  // minority join during it. Spreading signups evenly across the year instead
  // would starve the early months of anyone eligible to order, and the revenue
  // chart would read as violent swings rather than a business with a history.
  const customers: {
    id: string; businessName: string; ownerName: string; phone: string;
    city: string; state: string; pincode: string; createdAt: Date;
  }[] = [];

  const usedNames = new Set<string>();
  for (const [i, [businessName, businessType]] of BUSINESSES.entries()) {
    let ownerName = "";
    do {
      ownerName = `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
    } while (usedNames.has(ownerName));
    usedNames.add(ownerName);

    const [city, state, pinPrefix] = randomFrom(CITIES);
    const pincode = `${pinPrefix}${String(randomInt(1, 99)).padStart(2, "0")}`;
    const phone = `9${randomInt(100000000, 999999999)}`;
    const monthsBack = chance(0.7) ? randomInt(12, 20) : randomInt(0, 11);
    const createdAt = new Date(
      now.getFullYear(), now.getMonth() - monthsBack, randomInt(1, 28),
      randomInt(9, 20), randomInt(0, 59)
    );

    const customer = await prisma.customer.create({
      data: {
        name: ownerName,
        email: `${slugify(businessName)}${DEMO_SUFFIX}`,
        phone,
        // Not a usable credential: these accounts exist only as order owners.
        passwordHash: "!demo-account-no-login",
        createdAt,
        updatedAt: createdAt,
        businessProfile: {
          create: {
            businessName,
            businessType,
            gstNumber: chance(0.55)
              ? `${randomInt(10, 36)}${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 7) % 26))}${randomInt(1000, 9999)}${String.fromCharCode(65 + ((i + 3) % 26))}1Z${randomInt(1, 9)}`
              : null,
            createdAt, updatedAt: createdAt,
          },
        },
        addresses: {
          create: {
            label: "Salon",
            line1: `${randomInt(1, 200)}, ${randomFrom(["Market Road", "MG Road", "Station Road", "Ring Road", "Main Bazaar", "Link Road"])}`,
            line2: randomFrom(["Shop No. 4", "1st Floor", "Ground Floor", "Unit B"]),
            city, state, pincode,
            isDefault: true,
            createdAt,
          },
        },
      },
      select: { id: true },
    });

    customers.push({ id: customer.id, businessName, ownerName, phone, city, state, pincode, createdAt });
  }

  // ── Orders ──────────────────────────────────────────────────
  /**
   * Status depends on how old the order is. Anything from a previous month has
   * resolved one way or the other; only the current month still has orders
   * moving through the pipeline. A flat random status across all 12 months
   * would show packages from ten months ago still "out for delivery".
   */
  const SETTLED: OrderStatus[] = [
    "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED",
    "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "CANCELLED",
  ];
  const IN_FLIGHT: OrderStatus[] = [
    "PENDING", "CONFIRMED", "CONFIRMED", "PROCESSING", "PROCESSING",
    "PACKED", "SHIPPED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED",
    "DELIVERED", "CANCELLED",
  ];

  /** Indian salon trade: festival restocking Sep–Nov, wedding season Nov–Feb. */
  const SEASON: Record<number, number> = {
    0: 1.10, 1: 1.05, 2: 0.95, 3: 0.90, 4: 0.92, 5: 0.88,
    6: 0.90, 7: 0.95, 8: 1.15, 9: 1.35, 10: 1.30, 11: 1.05,
  };

  // Order and invoice numbers are per-day and per-year sequences. The database
  // may already hold orders from `npm run seed`, so both counters start from
  // the highest number already issued rather than from zero.
  const perDaySequence = new Map<string, number>();
  for (const { orderNumber } of await prisma.order.findMany({ select: { orderNumber: true } })) {
    const [, dateKey, seq] = orderNumber.split("-");
    if (!dateKey || !seq) continue;
    perDaySequence.set(dateKey, Math.max(perDaySequence.get(dateKey) ?? 0, Number(seq) || 0));
  }

  const invoiceSequence = new Map<number, number>();
  for (const { invoiceNumber } of await prisma.invoice.findMany({ select: { invoiceNumber: true } })) {
    const [, , year, seq] = invoiceNumber.split("-");
    const y = Number(year);
    if (!y || !seq) continue;
    invoiceSequence.set(y, Math.max(invoiceSequence.get(y) ?? 0, Number(seq) || 0));
  }
  const transactions: Prisma.InventoryTransactionCreateManyInput[] = [];

  let orderCount = 0, itemCount = 0, cancelled = 0, invoiceCount = 0;
  let revenue = 0;

  const BILLABLE = new Set(["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]);

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const growth = 1 + (11 - monthsAgo) * 0.055;          // the business is growing
    const season = SEASON[monthDate.getMonth()] ?? 1;
    const isCurrentMonth = monthsAgo === 0;
    const monthOrders = Math.round(randomInt(26, 38) * growth * season);
    const maxDay = isCurrentMonth ? Math.max(1, now.getDate()) : 28;

    for (let i = 0; i < monthOrders; i++) {
      const createdAt = new Date(
        monthDate.getFullYear(), monthDate.getMonth(), randomInt(1, maxDay),
        randomInt(9, 20), randomInt(0, 59)
      );
      if (createdAt > now) continue;

      const customer = randomFrom(customers);
      if (createdAt < customer.createdAt) continue;

      // 2–7 distinct lines per order.
      const chosen = new Map<string, (typeof variants)[number]>();
      for (let n = 0, target = randomInt(2, 7); n < target; n++) {
        const v = randomFrom(variants);
        chosen.set(v.id, v);
      }

      let subtotal = 0, listSubtotal = 0;
      const items = [...chosen.values()].map((v) => {
        const moq = v.product.moq ?? 1;
        const listPrice = Number(v.price);
        /**
         * Quantity scales inversely with unit price, because that is how a
         * salon actually buys. Nobody orders sixty styling chairs; they order
         * two, and sixty bottles of shampoo. Drawing every line from one wide
         * range put big-ticket furniture into the 25+ band, which both misread
         * as a buying pattern and swung monthly revenue by over 100% on a
         * flat order count.
         */
        const quantity = Math.max(
          moq,
          listPrice > 10000 ? randomInt(1, 3)          // chairs, stations, beds
            : listPrice > 4000 ? randomInt(1, 5)       // dryers, steamers, trolleys
            : listPrice > 1500 ? randomInt(2, 10)      // clippers, kits, tools
            : listPrice > 400 ? randomInt(5, 30)       // salon-size bottles, colours
            : randomInt(12, 90)                        // consumables, gloves, cotton
        );
        const unitPrice = priceAt(v, quantity);
        const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
        subtotal += lineTotal;
        listSubtotal += listPrice * quantity;
        return { v, quantity, unitPrice, listPrice, lineTotal };
      });

      subtotal = Math.round(subtotal * 100) / 100;
      listSubtotal = Math.round(listSubtotal * 100) / 100;

      const status = randomFrom(isCurrentMonth ? IN_FLIGHT : SETTLED);
      if (status === "CANCELLED") cancelled++;

      const useCoupon = chance(0.16) && subtotal >= 3000;
      const couponDiscount = useCoupon ? Math.min(Math.round(subtotal * 0.1), 1500) : 0;
      const deliveryFee = subtotal >= 5000 ? 0 : 199;
      const total = Math.round((subtotal - couponDiscount + deliveryFee) * 100) / 100;

      const dateKey = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(createdAt.getDate()).padStart(2, "0")}`;
      const sequence = (perDaySequence.get(dateKey) ?? 0) + 1;
      perDaySequence.set(dateKey, sequence);
      const orderNumber = `SGT-${dateKey}-${String(sequence).padStart(4, "0")}`;

      const address = {
        contactName: customer.ownerName,
        businessName: customer.businessName,
        phone: customer.phone,
        email: `${slugify(customer.businessName)}${DEMO_SUFFIX}`,
        line1: `${randomInt(1, 200)}, Market Road`,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
      };

      // Invoices are issued when the order is confirmed, and numbered by the
      // year of issue — matching the SGT-INV-YYYY-NNNNNN scheme in invoice.ts.
      const billable = BILLABLE.has(status);
      let invoice: Prisma.InvoiceCreateWithoutOrderInput | undefined;
      if (billable) {
        const year = createdAt.getFullYear();
        const seq = (invoiceSequence.get(year) ?? 0) + 1;
        invoiceSequence.set(year, seq);
        invoice = {
          invoiceNumber: `SGT-INV-${year}-${String(seq).padStart(6, "0")}`,
          invoiceDate: createdAt,
          createdAt,
        };
        invoiceCount++;
      }

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          businessName: customer.businessName,
          subtotal,
          bulkDiscount: Math.round((listSubtotal - subtotal) * 100) / 100,
          couponDiscount,
          couponCode: useCoupon ? "SALON10" : null,
          deliveryFee,
          tax: 0,
          total,
          paymentMethod: "COD",
          paymentStatus: status === "DELIVERED" ? "PAID" : status === "CANCELLED" ? "PENDING" : "COD",
          status,
          shippingAddress: address,
          billingAddress: address,
          createdAt,
          updatedAt: createdAt,
          items: {
            create: items.map((it) => ({
              productId: it.v.productId,
              productVariantId: it.v.id,
              productName: it.v.product.name,
              variantName: it.v.name,
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
              courierName: randomFrom(["Delhivery", "BlueDart", "DTDC", "Ecom Express"]),
              trackingNumber: `TRK${randomInt(10000000, 99999999)}`,
              expectedDeliveryDate: new Date(createdAt.getTime() + randomInt(2, 7) * 86400000),
            },
          },
          ...(invoice ? { invoice: { create: invoice } } : {}),
        },
        select: { id: true },
      });

      orderCount++;
      itemCount += items.length;
      if (status !== "CANCELLED") {
        revenue += total;
        for (const it of items) {
          if (!it.v.inventory) continue;
          transactions.push({
            inventoryId: it.v.inventory.id,
            action: "ORDER",
            quantity: -it.quantity,
            reason: `Order ${orderNumber}`,
            orderId: order.id,
            createdAt,
          });
        }
      }
    }
  }

  await prisma.inventoryTransaction.createMany({ data: transactions });

  const money = (n: number) =>
    `Rs ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  console.log(`
  Customers   : ${customers.length}
  Orders      : ${orderCount}  (${cancelled} cancelled)
  Order items : ${itemCount}
  Invoices    : ${invoiceCount}
  Revenue     : ${money(revenue)} across 12 months
`);
}

async function main() {
  console.log(`\nDatabase: ${dbName || "local"}${isRemote ? "  (remote)" : ""}${FRESH ? "  [--fresh]" : ""}`);
  await clearDemo();
  if (!CLEAR) await generate();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

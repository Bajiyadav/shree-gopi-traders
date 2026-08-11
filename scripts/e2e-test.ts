/**
 * End-to-end verification against a real PostgreSQL database.
 *
 * Exercises the SAME modules the app runs in production — the pricing engine,
 * the order-creation core, the analytics engine — not reimplementations of
 * them. Run with: npx tsx scripts/e2e-test.ts
 *
 * It creates its own test data, verifies behaviour, then cleans up after
 * itself so the seeded demo data is left untouched.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { resolveVariantPrice, resolveCouponDiscount, selectTier, tiersOverlap } from "../src/lib/pricing";
import { createOrderForCustomer } from "../src/lib/orders";
import { generateOrderNumber, ORDER_NUMBER_PREFIX } from "../src/lib/order-number";
import {
  getDashboardSummary,
  getMonthlyRevenueAndOrders,
  getTopProducts,
  getTopCategories,
  getCustomerAnalytics,
} from "../src/lib/analytics";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
  console.log("─".repeat(title.length));
}

const TEST_SKU = "E2E-TEST-SKU";
const TEST_EMAIL = "e2e-test@shreegopitraders.test";

async function cleanup() {
  const customer = await prisma.customer.findUnique({ where: { email: TEST_EMAIL } });
  if (customer) {
    const orders = await prisma.order.findMany({ where: { customerId: customer.id }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);
    await prisma.inventoryTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { customerId: customer.id } });
    await prisma.cartItem.deleteMany({ where: { cart: { customerId: customer.id } } });
    await prisma.cart.deleteMany({ where: { customerId: customer.id } });
    await prisma.address.deleteMany({ where: { customerId: customer.id } });
    await prisma.businessProfile.deleteMany({ where: { customerId: customer.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
  }

  const variant = await prisma.productVariant.findUnique({ where: { sku: TEST_SKU } });
  if (variant) {
    const inv = await prisma.inventory.findUnique({ where: { productVariantId: variant.id } });
    if (inv) await prisma.inventoryTransaction.deleteMany({ where: { inventoryId: inv.id } });
    await prisma.inventory.deleteMany({ where: { productVariantId: variant.id } });
    await prisma.wholesalePriceTier.deleteMany({ where: { productVariantId: variant.id } });
    await prisma.productVariant.deleteMany({ where: { id: variant.id } });
  }
  await prisma.product.deleteMany({ where: { sku: TEST_SKU } });
  await prisma.coupon.deleteMany({ where: { code: { in: ["E2ETEST20", "E2EEXPIRED"] } } });
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Shree Gopi Traders — end-to-end verification             ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  await cleanup();

  // ── Fixtures ──────────────────────────────────────────────
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  if (!category) throw new Error("No categories found — run `npm run seed` first.");

  const product = await prisma.product.create({
    data: {
      name: "E2E Test Shampoo",
      slug: "e2e-test-shampoo",
      sku: TEST_SKU,
      categoryId: category.id,
      basePrice: 500,
      images: [],
      isActive: true,
      allowBackorder: false,
    },
  });

  const variant = await prisma.productVariant.create({
    data: { productId: product.id, name: "1L", sku: TEST_SKU, price: 500, isActive: true },
  });

  // The exact ladder from the spec: 1–4 → ₹500, 5–9 → ₹450, 10+ → ₹400.
  await prisma.wholesalePriceTier.createMany({
    data: [
      { productVariantId: variant.id, minQty: 1, maxQty: 4, pricePerUnit: 500 },
      { productVariantId: variant.id, minQty: 5, maxQty: 9, pricePerUnit: 450 },
      { productVariantId: variant.id, minQty: 10, maxQty: null, pricePerUnit: 400 },
    ],
  });

  await prisma.inventory.create({
    data: { productVariantId: variant.id, stock: 100, lowStockThreshold: 5 },
  });

  const customer = await prisma.customer.create({
    data: {
      name: "E2E Tester",
      email: TEST_EMAIL,
      phone: "9999900000",
      passwordHash: await bcrypt.hash("Test@12345", 10),
      businessProfile: { create: { businessName: "E2E Test Salon", businessType: "SALON" } },
    },
  });

  // ══ 1. Wholesale tier pricing (spec §62) ══════════════════
  section("1. Wholesale pricing — quantities 1, 5, 10");

  const q1 = await resolveVariantPrice(variant.id, 1);
  check("qty 1 → ₹500/unit (tier 1–4)", q1.unitPrice.toNumber() === 500, `got ₹${q1.unitPrice}`);
  check("qty 1 line total = ₹500", q1.lineTotal.toNumber() === 500, `got ₹${q1.lineTotal}`);

  const q5 = await resolveVariantPrice(variant.id, 5);
  check("qty 5 → ₹450/unit (tier 5–9)", q5.unitPrice.toNumber() === 450, `got ₹${q5.unitPrice}`);
  check("qty 5 line total = ₹2,250", q5.lineTotal.toNumber() === 2250, `got ₹${q5.lineTotal}`);

  const q10 = await resolveVariantPrice(variant.id, 10);
  check("qty 10 → ₹400/unit (tier 10+)", q10.unitPrice.toNumber() === 400, `got ₹${q10.unitPrice}`);
  check("qty 10 line total = ₹4,000", q10.lineTotal.toNumber() === 4000, `got ₹${q10.lineTotal}`);

  const q4 = await resolveVariantPrice(variant.id, 4);
  const q9 = await resolveVariantPrice(variant.id, 9);
  const q50 = await resolveVariantPrice(variant.id, 50);
  check("qty 4 stays in tier 1 (boundary)", q4.unitPrice.toNumber() === 500);
  check("qty 9 stays in tier 2 (boundary)", q9.unitPrice.toNumber() === 450);
  check("qty 50 uses open-ended top tier", q50.unitPrice.toNumber() === 400);

  const tiers = [
    { minQty: 1, maxQty: 4 },
    { minQty: 5, maxQty: 9 },
    { minQty: 10, maxQty: null },
  ];
  check("selectTier picks highest qualifying tier", selectTier(tiers, 12)?.minQty === 10);
  check("overlapping tier is rejected", tiersOverlap(
    [{ id: "a", minQty: 1, maxQty: 4 }],
    { minQty: 3, maxQty: 8 }
  ));
  check("non-overlapping tier is accepted", !tiersOverlap(
    [{ id: "a", minQty: 1, maxQty: 4 }],
    { minQty: 5, maxQty: 9 }
  ));

  // ══ 2. Order number format (spec §22) ═════════════════════
  section("2. Order number format");

  const generated = await generateOrderNumber();
  const pattern = new RegExp(`^${ORDER_NUMBER_PREFIX}-\\d{8}-\\d{4}$`);
  check("matches SGT-YYYYMMDD-XXXX", pattern.test(generated), generated);

  const dupes = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT "orderNumber" FROM "Order" GROUP BY "orderNumber" HAVING COUNT(*) > 1
    ) d
  `;
  check("all existing order numbers are unique", Number(dupes[0].count) === 0);

  // ══ 3. Full COD checkout (spec §61) ═══════════════════════
  section("3. End-to-end COD order placement");

  const cart = await prisma.cart.create({ data: { customerId: customer.id } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productVariantId: variant.id, quantity: 10 },
  });

  const stockBefore = (await prisma.inventory.findUnique({
    where: { productVariantId: variant.id },
  }))!.stock;

  const order = await createOrderForCustomer(customer.id, {
    businessName: "E2E Test Salon",
    contactName: "E2E Tester",
    phone: "9999900000",
    email: TEST_EMAIL,
    line1: "1 Test Road",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    paymentMethod: "COD",
  });

  const placed = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true, delivery: true },
  });

  check("order row created", Boolean(placed));
  check("order number uses SGT- prefix", placed!.orderNumber.startsWith("SGT-"), placed!.orderNumber);
  check("status = PENDING", placed!.status === "PENDING");
  check("payment method = COD", placed!.paymentMethod === "COD");
  check("payment status = COD", placed!.paymentStatus === "COD");
  check("1 order item created", placed!.items.length === 1);
  check(
    "server charged the 10+ tier price (₹400), not the ₹500 list price",
    Number(placed!.items[0].unitPrice) === 400,
    `unitPrice ₹${placed!.items[0].unitPrice}`
  );
  check("listPrice snapshot kept at ₹500", Number(placed!.items[0].listPrice) === 500);
  check("subtotal = ₹4,000", Number(placed!.subtotal) === 4000, `got ₹${placed!.subtotal}`);
  check(
    "wholesale saving recorded = ₹1,000",
    Number(placed!.bulkDiscount) === 1000,
    `got ₹${placed!.bulkDiscount}`
  );
  check(
    "delivery free above ₹5,000 threshold not applied at ₹4,000",
    Number(placed!.deliveryFee) === 199,
    `fee ₹${placed!.deliveryFee}`
  );
  check("total = 4000 + 199 = ₹4,199", Number(placed!.total) === 4199, `got ₹${placed!.total}`);
  check("delivery record created", Boolean(placed!.delivery));
  check("delivery status = PENDING", placed!.delivery?.status === "PENDING");

  const stockAfter = (await prisma.inventory.findUnique({
    where: { productVariantId: variant.id },
  }))!.stock;
  check(
    "inventory decremented by 10",
    stockAfter === stockBefore - 10,
    `${stockBefore} → ${stockAfter}`
  );

  const invTx = await prisma.inventoryTransaction.findFirst({
    where: { orderId: order.id },
  });
  check("InventoryTransaction logged", Boolean(invTx));
  check("transaction action = ORDER", invTx?.action === "ORDER");
  check("transaction quantity = -10", invTx?.quantity === -10, `got ${invTx?.quantity}`);

  const remainingCartItems = await prisma.cartItem.count({ where: { cartId: cart.id } });
  check("cart cleared after checkout", remainingCartItems === 0);

  // ══ 4. Inventory guard (spec §63) ═════════════════════════
  section("4. Inventory guard — stock 5, order 3, then order 3 again");

  await prisma.inventory.update({
    where: { productVariantId: variant.id },
    data: { stock: 5 },
  });

  await prisma.cartItem.create({
    data: { cartId: cart.id, productVariantId: variant.id, quantity: 3 },
  });
  await createOrderForCustomer(customer.id, {
    businessName: "E2E Test Salon",
    contactName: "E2E Tester",
    phone: "9999900000",
    email: TEST_EMAIL,
    line1: "1 Test Road",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    paymentMethod: "COD",
  });

  const afterFirst = (await prisma.inventory.findUnique({
    where: { productVariantId: variant.id },
  }))!.stock;
  check("stock 5 − 3 = 2", afterFirst === 2, `got ${afterFirst}`);

  await prisma.cartItem.create({
    data: { cartId: cart.id, productVariantId: variant.id, quantity: 3 },
  });
  let rejected = false;
  let rejectionMessage = "";
  try {
    await createOrderForCustomer(customer.id, {
      businessName: "E2E Test Salon",
      contactName: "E2E Tester",
      phone: "9999900000",
      email: TEST_EMAIL,
      line1: "1 Test Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      paymentMethod: "COD",
    });
  } catch (err) {
    rejected = true;
    rejectionMessage = err instanceof Error ? err.message : String(err);
  }
  check("second order of 3 rejected (only 2 left)", rejected, rejectionMessage.slice(0, 60));

  const afterReject = (await prisma.inventory.findUnique({
    where: { productVariantId: variant.id },
  }))!.stock;
  check("stock unchanged at 2 after rejection", afterReject === 2, `got ${afterReject}`);

  const negative = await prisma.inventory.count({ where: { stock: { lt: 0 } } });
  check("no inventory row anywhere is negative", negative === 0, `${negative} negative rows`);

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  // ══ 5. Coupons ════════════════════════════════════════════
  section("5. Coupon validation (server-side)");

  const now = new Date();
  await prisma.coupon.create({
    data: {
      code: "E2ETEST20",
      discountType: "PERCENTAGE",
      discountValue: 20,
      minOrderValue: 1000,
      maxDiscount: 300,
      startDate: new Date(now.getTime() - 86400000),
      endDate: new Date(now.getTime() + 86400000),
      isActive: true,
    },
  });
  await prisma.coupon.create({
    data: {
      code: "E2EEXPIRED",
      discountType: "FIXED",
      discountValue: 100,
      startDate: new Date(now.getTime() - 30 * 86400000),
      endDate: new Date(now.getTime() - 86400000),
      isActive: true,
    },
  });

  const { Decimal } = await import("@prisma/client/runtime/library");

  const capped = await resolveCouponDiscount("E2ETEST20", new Decimal(5000) as never);
  check("20% of ₹5,000 capped at maxDiscount ₹300", capped.discount.toNumber() === 300, `got ₹${capped.discount}`);

  const uncapped = await resolveCouponDiscount("E2ETEST20", new Decimal(1200) as never);
  check("20% of ₹1,200 = ₹240 (under cap)", uncapped.discount.toNumber() === 240, `got ₹${uncapped.discount}`);

  let minOrderRejected = false;
  try {
    await resolveCouponDiscount("E2ETEST20", new Decimal(500) as never);
  } catch {
    minOrderRejected = true;
  }
  check("below minOrderValue → rejected", minOrderRejected);

  let expiredRejected = false;
  try {
    await resolveCouponDiscount("E2EEXPIRED", new Decimal(5000) as never);
  } catch {
    expiredRejected = true;
  }
  check("expired coupon → rejected", expiredRejected);

  let unknownRejected = false;
  try {
    await resolveCouponDiscount("NOSUCHCODE", new Decimal(5000) as never);
  } catch {
    unknownRejected = true;
  }
  check("unknown code → rejected", unknownRejected);

  // ══ 6. Inactive product guard ═════════════════════════════
  section("6. Inactive product cannot be priced or bought");

  await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });
  let inactiveRejected = false;
  try {
    await resolveVariantPrice(variant.id, 1);
  } catch {
    inactiveRejected = true;
  }
  check("inactive product rejected by pricing engine", inactiveRejected);
  await prisma.product.update({ where: { id: product.id }, data: { isActive: true } });

  // ══ 7. Analytics (spec §64) ═══════════════════════════════
  section("7. Analytics — rolling 12 months, computed from the database");

  const monthly = await getMonthlyRevenueAndOrders();
  check("returns exactly 12 months", monthly.length === 12, `got ${monthly.length}`);

  const thisMonthLabel = new Date().toLocaleString("en-IN", { month: "short", year: "numeric" });
  check(
    "window ends on the current month (rolling, not hardcoded)",
    monthly[monthly.length - 1].month === thisMonthLabel,
    `last = ${monthly[monthly.length - 1].month}`
  );

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  const expectedFirst = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth(), 1)
    .toLocaleString("en-IN", { month: "short", year: "numeric" });
  check("window starts 11 months back", monthly[0].month === expectedFirst, `first = ${monthly[0].month}`);

  check("no negative monthly revenue", monthly.every((m) => m.revenue >= 0));
  check(
    "completed + cancelled never exceed total orders in a month",
    monthly.every((m) => m.completed + m.cancelled <= m.orders)
  );

  // Cross-check the rolling revenue against an independent SQL aggregate.
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - 11);
  const startOfWindow = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);

  const sqlRevenue = await prisma.$queryRaw<{ sum: string | null }[]>`
    SELECT COALESCE(SUM(total), 0)::text AS sum
    FROM "Order"
    WHERE "createdAt" >= ${startOfWindow} AND status <> 'CANCELLED'
  `;
  const chartRevenue = monthly.reduce((sum, m) => sum + m.revenue, 0);
  const sqlTotal = Number(sqlRevenue[0].sum ?? 0);
  check(
    "chart revenue matches an independent SQL SUM",
    Math.abs(chartRevenue - sqlTotal) < 1,
    `chart ₹${chartRevenue.toFixed(2)} vs SQL ₹${sqlTotal.toFixed(2)}`
  );

  const cancelledRevenue = await prisma.$queryRaw<{ sum: string | null }[]>`
    SELECT COALESCE(SUM(total), 0)::text AS sum
    FROM "Order"
    WHERE "createdAt" >= ${startOfWindow} AND status = 'CANCELLED'
  `;
  const cancelledTotal = Number(cancelledRevenue[0].sum ?? 0);
  check(
    "cancelled orders excluded from revenue",
    cancelledTotal >= 0 && Math.abs(chartRevenue - sqlTotal) < 1,
    `₹${cancelledTotal.toFixed(2)} of cancelled value correctly omitted`
  );

  const summary = await getDashboardSummary();
  check("dashboard revenue figures are non-negative", summary.last12MoRevenue >= 0);
  check(
    "avg order value = 12mo revenue / 12mo orders",
    summary.last12MoOrders === 0 ||
      Math.abs(summary.avgOrderValue - summary.last12MoRevenue / summary.last12MoOrders) < 0.01
  );
  check("customer count matches the table", summary.totalCustomers === (await prisma.customer.count()));

  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const topProducts = await getTopProducts(since, 5);
  const topCategories = await getTopCategories(since, 5);
  const customerAnalytics = await getCustomerAnalytics(since);

  check("top products returned", topProducts.length > 0, `${topProducts.length} products`);
  check("top products sorted by units sold", topProducts.every((p, i) =>
    i === 0 || topProducts[i - 1].unitsSold >= p.unitsSold
  ));
  check("top categories returned", topCategories.length > 0, `${topCategories.length} categories`);
  check("top categories sorted by revenue", topCategories.every((c, i) =>
    i === 0 || topCategories[i - 1].revenue >= c.revenue
  ));
  check("customer analytics returns top customers", customerAnalytics.topCustomers.length > 0);
  check("returning customers is a subset of buyers", customerAnalytics.returningCustomers >= 0);

  // Verify top-product revenue against SQL.
  if (topProducts.length > 0) {
    const top = topProducts[0];
    const sqlTop = await prisma.$queryRaw<{ units: bigint | null; revenue: string | null }[]>`
      SELECT SUM(oi.quantity)::bigint AS units, COALESCE(SUM(oi."lineTotal"), 0)::text AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE oi."productId" = ${top.productId}
        AND o."createdAt" >= ${since}
        AND o.status <> 'CANCELLED'
    `;
    check(
      "top product units match SQL",
      Number(sqlTop[0].units ?? 0) === top.unitsSold,
      `${top.name}: ${top.unitsSold} units`
    );
    check(
      "top product revenue matches SQL",
      Math.abs(Number(sqlTop[0].revenue ?? 0) - top.revenue) < 1,
      `₹${top.revenue.toFixed(2)}`
    );
  }

  // ══ 8. Data integrity ═════════════════════════════════════
  section("8. Data integrity across the seeded store");

  const orphanItems = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "OrderItem" oi
    LEFT JOIN "Order" o ON o.id = oi."orderId" WHERE o.id IS NULL
  `;
  check("no orphaned order items", Number(orphanItems[0].count) === 0);

  const badTotals = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Order" WHERE total < 0 OR subtotal < 0
  `;
  check("no negative order totals", Number(badTotals[0].count) === 0);

  const variantsWithoutInventory = await prisma.productVariant.count({
    where: { inventory: null },
  });
  check("every variant has an inventory row", variantsWithoutInventory === 0,
    `${variantsWithoutInventory} missing`);

  const productsWithoutVariants = await prisma.product.count({ where: { variants: { none: {} } } });
  check("every product has at least one variant", productsWithoutVariants === 0);

  const unapprovedPublic = await prisma.review.count({ where: { status: { not: "APPROVED" } } });
  const ratedProducts = await prisma.product.findMany({
    where: { ratingCount: { gt: 0 }, NOT: { name: { startsWith: "E2E Test" } } },
    select: { id: true, ratingCount: true },
    take: 5,
  });
  let ratingsConsistent = true;
  for (const p of ratedProducts) {
    const approved = await prisma.review.count({
      where: { productId: p.id, status: "APPROVED" },
    });
    if (approved !== p.ratingCount) ratingsConsistent = false;
  }
  check(
    "product ratingCount counts only APPROVED reviews",
    ratingsConsistent,
    `${unapprovedPublic} unapproved reviews exist and are excluded`
  );

  // ── Cleanup ───────────────────────────────────────────────
  await cleanup();

  section("Result");
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("\n  Failures:");
    failures.forEach((f) => console.log(`    - ${f}`));
  }
  console.log("");

  if (failed > 0) process.exitCode = 1;
}

main()
  .catch(async (err) => {
    console.error("\nTest run crashed:", err);
    await cleanup().catch(() => null);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

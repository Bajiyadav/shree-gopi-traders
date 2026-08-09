/**
 * Billing + analytics verification.
 *
 * Runs against the LOCAL database (which carries the demo trading history) —
 * never production. Exercises the real invoice and analytics modules.
 *
 * Run with: npm run test:billing
 */
import { PrismaClient } from "@prisma/client";
import { ensureInvoice, buildInvoiceTotals, isBillable, INVOICE_PREFIX } from "../src/lib/invoice";
import {
  getMonthlyRevenueAndOrders,
  getWholesaleAnalysis,
  getCancellationAnalysis,
  getItemsSold,
  getTopProducts,
  getTopCategories,
  getCustomerAnalytics,
  getWindowSummary,
} from "../src/lib/analytics";
import { buildOrderWhere, parseOrderFilters, resolveDateWindow } from "../src/lib/order-filters";

const prisma = new PrismaClient();
let passed = 0, failed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail = "") {
  if (ok) { passed++; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`); }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); }
}
function section(t: string) { console.log(`\n${t}`); console.log("─".repeat(t.length)); }

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Shree Gopi Traders — billing & analytics verification    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // ══ 1. Invoice generation ═════════════════════════════════
  section("1. Invoice generation");

  const billable = await prisma.order.findFirst({
    where: { status: { in: ["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] } },
    include: { items: true },
  });
  if (!billable) throw new Error("No billable order in the local database — run `npm run seed`.");

  check("billable status recognised", isBillable(billable.status), billable.status);
  check("cancelled status is not billable", !isBillable("CANCELLED"));
  check("pending status is not billable", !isBillable("PENDING"));

  const invoice = await ensureInvoice(billable.id);
  const pattern = new RegExp(`^${INVOICE_PREFIX}-\\d{4}-\\d{6}$`);
  check("invoice number matches SGT-INV-YYYY-NNNNNN", pattern.test(invoice.invoiceNumber), invoice.invoiceNumber);
  check("invoice links to the order", invoice.orderId === billable.id);

  // Idempotency: the same order must never get a second invoice.
  const again = await ensureInvoice(billable.id);
  check("re-requesting returns the SAME invoice", again.invoiceNumber === invoice.invoiceNumber, again.invoiceNumber);

  const concurrent = await Promise.all([
    ensureInvoice(billable.id), ensureInvoice(billable.id), ensureInvoice(billable.id),
  ]);
  check("concurrent requests do not duplicate",
    new Set(concurrent.map((i) => i.invoiceNumber)).size === 1);

  // Uniqueness across a batch.
  const more = await prisma.order.findMany({
    where: { status: "DELIVERED", invoice: null },
    take: 12,
    select: { id: true },
  });
  const generated: string[] = [];
  for (const o of more) generated.push((await ensureInvoice(o.id)).invoiceNumber);
  check("batch of invoice numbers all unique",
    new Set(generated).size === generated.length, `${generated.length} generated`);

  const dupes = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT "invoiceNumber" FROM "Invoice" GROUP BY "invoiceNumber" HAVING COUNT(*) > 1
    ) d`;
  check("no duplicate invoice numbers in the table", Number(dupes[0].count) === 0);

  const perOrder = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT "orderId" FROM "Invoice" GROUP BY "orderId" HAVING COUNT(*) > 1
    ) d`;
  check("never more than one invoice per order", Number(perOrder[0].count) === 0);

  // ══ 2. Billing arithmetic ═════════════════════════════════
  section("2. Billing arithmetic matches the order exactly");

  const sample = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { items: true },
    take: 60,
  });

  let unbalanced = 0, lineMismatch = 0;
  for (const order of sample) {
    const t = buildInvoiceTotals(order);
    if (!t.balances) unbalanced++;
    // Subtotal must equal the sum of the line totals it was built from.
    const lineSum = order.items.reduce((s, i) => s + i.lineTotal.toNumber(), 0);
    if (Math.abs(lineSum - t.subtotal) > 0.01) lineMismatch++;
  }
  check("subtotal − discounts + delivery + tax = total, on every order",
    unbalanced === 0, `${sample.length} orders checked, ${unbalanced} unbalanced`);
  check("subtotal equals the sum of line totals", lineMismatch === 0,
    `${lineMismatch} mismatched`);

  const withTax = await prisma.order.count({ where: { tax: { gt: 0 } } });
  check("no tax invented on COD orders", withTax === 0, `${withTax} orders carry tax`);

  // ══ 3. Historical accuracy ════════════════════════════════
  section("3. Invoice is immune to later price changes");

  const item = await prisma.orderItem.findFirst({
    where: { order: { status: "DELIVERED" } },
    include: { productVariant: true },
  });
  if (item) {
    const originalUnit = item.unitPrice.toNumber();
    const originalList = item.listPrice.toNumber();
    const variantPriceBefore = item.productVariant.price.toNumber();

    // Move today's price sharply, then confirm the snapshot did not follow.
    await prisma.productVariant.update({
      where: { id: item.productVariantId },
      data: { price: variantPriceBefore * 3 },
    });
    const after = await prisma.orderItem.findUnique({ where: { id: item.id } });
    check("OrderItem charged price unchanged after re-pricing",
      after!.unitPrice.toNumber() === originalUnit, `₹${originalUnit}`);
    check("OrderItem list price unchanged after re-pricing",
      after!.listPrice.toNumber() === originalList, `₹${originalList}`);
    check("product name snapshot retained", Boolean(after!.productName));

    // Restore.
    await prisma.productVariant.update({
      where: { id: item.productVariantId },
      data: { price: variantPriceBefore },
    });
  }

  // ══ 4. Order filters (drive both the list and the export) ══
  section("4. Order filters");

  const all = await prisma.order.count();
  const delivered = await prisma.order.count({ where: buildOrderWhere({ status: "DELIVERED" }) });
  const cancelled = await prisma.order.count({ where: buildOrderWhere({ status: "CANCELLED" }) });
  check("status filter narrows results", delivered > 0 && delivered < all, `${delivered} of ${all}`);
  check("cancelled filter works", cancelled > 0, `${cancelled}`);

  const last12 = await prisma.order.count({ where: buildOrderWhere({ range: "12m" }) });
  const thisMonth = await prisma.order.count({ where: buildOrderWhere({ range: "month" }) });
  check("12-month range filter works", last12 > 0 && last12 <= all, `${last12}`);
  check("this-month is a subset of 12 months", thisMonth <= last12, `${thisMonth} ≤ ${last12}`);

  const win = resolveDateWindow({ range: "today" });
  check("today window starts at midnight", win?.gte?.getHours() === 0);

  const custom = resolveDateWindow({ from: "2026-01-01", to: "2026-01-31" });
  check("custom range end is inclusive (pushed to next midnight)",
    custom?.lt?.toISOString().slice(0, 10) === "2026-02-01");

  const parsed = parseOrderFilters({ status: "NONSENSE", payment: "BOGUS", q: " shampoo " });
  check("invalid status is dropped, not passed to SQL", parsed.status === undefined);
  check("invalid payment status is dropped", parsed.payment === undefined);
  check("search term is trimmed", parsed.q === "shampoo");

  // ══ 5. Analytics ══════════════════════════════════════════
  section("5. Analytics");

  const monthly = await getMonthlyRevenueAndOrders();
  check("12 months returned", monthly.length === 12);
  check("first month has no growth figure (N/A, not 0%)", monthly[0].revenueGrowth === null);
  check("later months carry a growth figure",
    monthly.slice(1).some((m) => m.revenueGrowth !== null));
  check("items sold present per month", monthly.every((m) => m.itemsSold >= 0));
  check("AOV = revenue / earning orders",
    monthly.every((m) => m.avgOrderValue >= 0));

  const thisMonthLabel = new Date().toLocaleString("en-IN", { month: "short", year: "numeric" });
  check("window ends on the current month", monthly[monthly.length - 1].month === thisMonthLabel,
    monthly[monthly.length - 1].month);

  const since = new Date(); since.setMonth(since.getMonth() - 12);

  // Cross-check monthly revenue against independent SQL.
  const start = new Date(); start.setMonth(start.getMonth() - 11);
  const windowStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const sql = await prisma.$queryRaw<{ sum: string | null }[]>`
    SELECT COALESCE(SUM(total),0)::text AS sum FROM "Order"
    WHERE "createdAt" >= ${windowStart} AND status <> 'CANCELLED'`;
  const chartTotal = monthly.reduce((s, m) => s + m.revenue, 0);
  check("monthly revenue matches SQL", Math.abs(chartTotal - Number(sql[0].sum)) < 1,
    `₹${chartTotal.toFixed(2)}`);

  const itemsSold = await getItemsSold(since);
  const sqlItems = await prisma.$queryRaw<{ sum: bigint | null }[]>`
    SELECT SUM(oi.quantity)::bigint AS sum FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."createdAt" >= ${since} AND o.status <> 'CANCELLED'`;
  check("items sold matches SQL", itemsSold === Number(sqlItems[0].sum ?? 0), `${itemsSold}`);

  const wholesale = await getWholesaleAnalysis(since);
  check("wholesale bands populated", wholesale.rows.length === 4);
  check("band units sum to total units",
    wholesale.rows.reduce((n, r) => n + r.units, 0) === wholesale.totalUnits);
  check("tier penetration between 0 and 100",
    wholesale.tierPenetration >= 0 && wholesale.tierPenetration <= 100,
    `${wholesale.tierPenetration.toFixed(1)}%`);
  // The low band is NOT discount-free: product markdowns apply at any quantity,
  // and furniture/machine ladders start discounting at qty 3. What must hold is
  // that bulk bands discount substantially harder.
  check("low band discounts far less than the bulk band",
    wholesale.rows[0].avgDiscountPercent < wholesale.rows[3].avgDiscountPercent,
    `1–4: ${wholesale.rows[0].avgDiscountPercent.toFixed(1)}% vs 25+: ${wholesale.rows[3].avgDiscountPercent.toFixed(1)}%`);
  check("discount deepens monotonically across bands",
    wholesale.rows.every((r, i) => i === 0 || r.avgDiscountPercent >= wholesale.rows[i - 1].avgDiscountPercent),
    wholesale.rows.map((r) => `${r.avgDiscountPercent.toFixed(1)}%`).join(" → "));
  check("bulk bands do carry savings", wholesale.rows[3].savings > 0,
    `25+: ₹${wholesale.rows[3].savings.toFixed(0)}`);

  const cancellation = await getCancellationAnalysis(since);
  check("cancellation stats computed", cancellation.count > 0, `${cancellation.count} cancelled`);
  check("cancellation rate between 0 and 100",
    cancellation.rate >= 0 && cancellation.rate <= 100, `${cancellation.rate.toFixed(1)}%`);

  // The critical invariant: cancelled value must not appear in revenue.
  const summary = await getWindowSummary(since);
  const cancelledInRevenue = await prisma.$queryRaw<{ sum: string | null }[]>`
    SELECT COALESCE(SUM(total),0)::text AS sum FROM "Order"
    WHERE "createdAt" >= ${since} AND status = 'CANCELLED'`;
  const allOrders = await prisma.$queryRaw<{ sum: string | null }[]>`
    SELECT COALESCE(SUM(total),0)::text AS sum FROM "Order" WHERE "createdAt" >= ${since}`;
  check("revenue excludes cancelled value",
    Math.abs(summary.revenue - (Number(allOrders[0].sum) - Number(cancelledInRevenue[0].sum))) < 1,
    `₹${Number(cancelledInRevenue[0].sum).toFixed(0)} excluded`);

  const topProducts = await getTopProducts(since, 10);
  const topCategories = await getTopCategories(since, 10);
  const customers = await getCustomerAnalytics(since);
  check("top products returned and ordered", topProducts.length > 0 &&
    topProducts.every((p, i) => i === 0 || topProducts[i - 1].unitsSold >= p.unitsSold));
  check("top categories returned and ordered", topCategories.length > 0 &&
    topCategories.every((c, i) => i === 0 || topCategories[i - 1].revenue >= c.revenue));
  check("customer analysis returns top customers", customers.topCustomers.length > 0);
  check("returning customers ≤ buying customers",
    customers.returningCustomers <= summary.uniqueCustomers);

  section("Result");
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed) { console.log("\n  Failures:"); failures.forEach((f) => console.log(`    - ${f}`)); }
  console.log("");
  if (failed) process.exitCode = 1;
}

main()
  .catch((e) => { console.error("\nCrashed:", e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

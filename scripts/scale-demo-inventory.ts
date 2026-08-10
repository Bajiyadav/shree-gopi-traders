/**
 * SCALE DEMO STOCK TO A TARGET UNIT COUNT
 *
 *   npm run demo:inventory -- --target=4575                  # dry run
 *   npm run demo:inventory -- --target=4575 --apply
 *   npm run demo:inventory -- --target=4575 --remote-demo --apply
 *
 * Rewrites Inventory.stock so the catalogue holds a given number of units,
 * keeping each variant's share of the total. Nothing in the UI is touched —
 * every figure the admin shows is read from these rows, so the dashboard,
 * inventory page and stock deduction all move together.
 *
 * The same two-condition guard as demo:orders: a remote database is refused
 * unless it is *named* as a demo database AND --remote-demo is passed.
 * Production is `neondb`, so it fails the first outright.
 *
 * Only Inventory.stock is written. Orders, order items, invoices, customers,
 * products, variants and wholesale tiers are never touched.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const REMOTE_OK = args.includes("--remote-demo");
const TARGET = Number(args.find((a) => a.startsWith("--target="))?.split("=")[1] ?? NaN);

const url = process.env.DATABASE_URL ?? "";
const dbName = url.match(/\/([^/?]+)(\?|$)/)?.[1] ?? "";
const isRemote = /neon\.tech|amazonaws|supabase|render\.com/.test(url);

if (!Number.isFinite(TARGET) || TARGET <= 0) {
  console.error("  Usage: npm run demo:inventory -- --target=<units> [--remote-demo] [--apply]");
  process.exit(1);
}

if (isRemote && !(/demo/i.test(dbName) && REMOTE_OK)) {
  console.error(`
  Refusing to rewrite stock on a remote database.

  Target database : ${dbName || "(none)"}
  Named as demo   : ${/demo/i.test(dbName) ? "yes" : "NO"}
  --remote-demo   : ${REMOTE_OK ? "given" : "NOT GIVEN"}

  Both conditions must hold. Production stock is a real figure.
`);
  process.exit(1);
}

async function main() {
  const rows = await prisma.inventory.findMany({
    select: {
      id: true, stock: true,
      productVariant: { select: { price: true, salePrice: true, sku: true } },
    },
    orderBy: { id: "asc" },
  });

  const before = rows.reduce((s, r) => s + r.stock, 0);
  if (before <= 0) {
    console.error("  Current stock is zero — nothing to scale from.");
    process.exitCode = 1;
    return;
  }

  const factor = TARGET / before;

  // Scale proportionally, then hand out the rounding remainder one unit at a
  // time to the largest lines, so the total lands exactly on the target rather
  // than a few units either side of it.
  const scaled = rows.map((r) => ({
    id: r.id,
    from: r.stock,
    exact: r.stock * factor,
    to: Math.max(1, Math.round(r.stock * factor)),
    unit: Number(r.productVariant.salePrice ?? r.productVariant.price),
  }));

  let drift = TARGET - scaled.reduce((s, r) => s + r.to, 0);
  const order = [...scaled].sort((a, b) => b.exact - a.exact);
  for (let i = 0; drift !== 0 && i < order.length * 4; i++) {
    const row = order[i % order.length];
    if (drift > 0) { row.to++; drift--; }
    else if (row.to > 1) { row.to--; drift++; }
  }

  const after = scaled.reduce((s, r) => s + r.to, 0);
  const valueBefore = scaled.reduce((s, r) => s + r.from * r.unit, 0);
  const valueAfter = scaled.reduce((s, r) => s + r.to * r.unit, 0);
  const changed = scaled.filter((r) => r.to !== r.from);

  const inr = (n: number) => "Rs " + Math.round(n).toLocaleString("en-IN");
  console.log(`
  Database   : ${dbName || "local"}${isRemote ? " (remote)" : ""}
  SKUs       : ${rows.length}
  Units      : ${before.toLocaleString("en-IN")} → ${after.toLocaleString("en-IN")}   (target ${TARGET.toLocaleString("en-IN")}, factor ${factor.toFixed(3)})
  Stock value: ${inr(valueBefore)} → ${inr(valueAfter)}
  Rows to change: ${changed.length}`);

  console.log(`\n  Examples:`);
  changed.slice(0, 6).forEach((r) =>
    console.log(`    ${r.id.slice(0, 10)}…  ${String(r.from).padStart(4)} → ${String(r.to).padStart(4)} units`)
  );

  if (after !== TARGET) {
    console.error(`\n  Could not land exactly on ${TARGET} (got ${after}). Not writing.`);
    process.exitCode = 1;
    return;
  }

  if (!APPLY) {
    console.log(`\n  DRY RUN — nothing written. Re-run with --apply.\n`);
    await prisma.$disconnect();
    return;
  }

  for (const r of changed) {
    await prisma.inventory.update({ where: { id: r.id }, data: { stock: r.to } });
  }

  const verify = await prisma.inventory.aggregate({ _sum: { stock: true }, _count: { _all: true } });
  console.log(`\n  Written. Database now reports ${verify._sum.stock?.toLocaleString("en-IN")} units across ${verify._count._all} SKUs.`);
  console.log(`  Only Inventory.stock changed — orders, invoices and the catalogue are untouched.\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

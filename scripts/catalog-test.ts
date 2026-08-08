/**
 * Catalogue verification — checks the seeded product catalogue is complete,
 * correctly related, searchable, and priced correctly by the real server-side
 * pricing engine.
 *
 * Run with: npm run test:catalog
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { resolveVariantPrice } from "../src/lib/pricing";
import { searchProducts, getProductBySlug, getRelatedProducts } from "../src/lib/catalog";
import { createOrderForCustomer } from "../src/lib/orders";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
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

const TEST_EMAIL = "catalog-test@shreegopitraders.test";

async function cleanup() {
  const customer = await prisma.customer.findUnique({ where: { email: TEST_EMAIL } });
  if (!customer) return;
  const orders = await prisma.order.findMany({ where: { customerId: customer.id }, select: { id: true } });
  const ids = orders.map((o) => o.id);
  await prisma.inventoryTransaction.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.delivery.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { customerId: customer.id } });
  await prisma.cartItem.deleteMany({ where: { cart: { customerId: customer.id } } });
  await prisma.cart.deleteMany({ where: { customerId: customer.id } });
  await prisma.address.deleteMany({ where: { customerId: customer.id } });
  await prisma.businessProfile.deleteMany({ where: { customerId: customer.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Shree Gopi Traders — catalogue verification              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  await cleanup();

  // ══ 1. Catalogue completeness ═════════════════════════════
  section("1. Catalogue size and completeness");

  const [categories, products, variants, tiers, inventory] = await Promise.all([
    prisma.category.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productVariant.count({ where: { isActive: true } }),
    prisma.wholesalePriceTier.count(),
    prisma.inventory.count(),
  ]);

  check("15 categories", categories === 15, `${categories} categories`);
  check("100+ products", products >= 100, `${products} products`);
  check("150+ variants", variants >= 150, `${variants} variants`);
  check("300+ wholesale tiers", tiers >= 300, `${tiers} tiers`);
  check("every variant has inventory", inventory === variants, `${inventory} inventory rows`);

  const noImages = await prisma.product.count({ where: { images: { isEmpty: true } } });
  check("every product has at least one image", noImages === 0, `${noImages} without images`);

  const noDesc = await prisma.product.count({ where: { OR: [{ description: null }, { description: "" }] } });
  check("every product has a description", noDesc === 0, `${noDesc} without description`);

  const shortDesc = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Product" WHERE LENGTH(description) < 80
  `;
  check("descriptions are substantive (80+ chars)", Number(shortDesc[0].count) === 0,
    `${Number(shortDesc[0].count)} too short`);

  const noSpecs = await prisma.product.count({ where: { specs: { equals: {} } } });
  check("every product has specifications", noSpecs === 0, `${noSpecs} without specs`);

  const noBrand = await prisma.product.count({ where: { OR: [{ brand: null }, { brand: "" }] } });
  check("every product has a brand", noBrand === 0);

  // ══ 2. SKU integrity ══════════════════════════════════════
  section("2. SKU uniqueness and format");

  const dupProductSku = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (SELECT sku FROM "Product" GROUP BY sku HAVING COUNT(*) > 1) d
  `;
  const dupVariantSku = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (SELECT sku FROM "ProductVariant" GROUP BY sku HAVING COUNT(*) > 1) d
  `;
  check("no duplicate product SKUs", Number(dupProductSku[0].count) === 0);
  check("no duplicate variant SKUs", Number(dupVariantSku[0].count) === 0);

  const badFormat = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Product" WHERE sku !~ '^SGT-[A-Z]{2}-[0-9]{3}$'
  `;
  check("product SKUs match SGT-XX-000", Number(badFormat[0].count) === 0,
    `${Number(badFormat[0].count)} malformed`);

  // ══ 3. Representative products across departments ═════════
  section("3. Representative products across departments");

  const samples: { label: string; slug: string; categorySlug: string }[] = [
    { label: "Hair Care", slug: "professional-shampoo", categorySlug: "hair-care" },
    { label: "Hair Equipment", slug: "professional-hair-clipper", categorySlug: "hair-equipment" },
    { label: "Waxing", slug: "hard-wax-beans", categorySlug: "waxing" },
    { label: "Nail Products", slug: "uv-led-nail-lamp", categorySlug: "nails" },
    { label: "Salon Furniture", slug: "hydraulic-salon-styling-chair", categorySlug: "salon-furniture" },
    { label: "Consumables", slug: "nitrile-examination-gloves", categorySlug: "consumables" },
  ];

  for (const sample of samples) {
    const product = await getProductBySlug(sample.slug);
    if (!product) {
      check(`${sample.label}: product page loads`, false, sample.slug);
      continue;
    }
    const inCategory = product.category.slug === sample.categorySlug;
    const hasVariants = product.variants.length > 0;
    const hasTiers = product.variants.every((v) => v.wholesaleTiers.length > 0);
    const hasStock = product.variants.some((v) => (v.inventory?.stock ?? 0) > 0);
    const related = await getRelatedProducts(product.categoryId, product.id, 4);

    check(
      `${sample.label}: "${product.name}"`,
      inCategory && hasVariants && hasTiers && hasStock,
      `${product.variants.length} variants · category ${product.category.name} · related ${related.length}`
    );
  }

  // ══ 4. Search ═════════════════════════════════════════════
  section("4. Search across name, brand, SKU and category");

  const searches: { term: string; expect: string }[] = [
    { term: "shampoo", expect: "shampoo products" },
    { term: "clipper", expect: "clippers" },
    { term: "wax", expect: "wax products" },
    { term: "gloves", expect: "gloves" },
    { term: "facial kit", expect: "facial kits" },
    { term: "chair", expect: "chairs" },
  ];
  for (const s of searches) {
    const result = await searchProducts({ q: s.term, pageSize: 50 });
    check(`search "${s.term}" returns ${s.expect}`, result.total > 0, `${result.total} results`);
  }

  const skuHit = await searchProducts({ q: "SGT-HC-001", pageSize: 10 });
  check("search by exact SKU returns the product", skuHit.total === 1,
    skuHit.items[0]?.name ?? "no match");

  const brandHit = await searchProducts({ q: "SGT Professional", pageSize: 100 });
  check("search by brand returns products", brandHit.total > 0, `${brandHit.total} results`);

  const nonsense = await searchProducts({ q: "zzzznotaproduct", pageSize: 10 });
  check("nonsense search returns nothing", nonsense.total === 0);

  // ══ 5. Filters ════════════════════════════════════════════
  section("5. Filters against live PostgreSQL data");

  const all = await searchProducts({ pageSize: 200 });
  const byCategory = await searchProducts({ category: "waxing", pageSize: 100 });
  const inStock = await searchProducts({ inStockOnly: true, pageSize: 200 });
  const wholesale = await searchProducts({ wholesaleOnly: true, pageSize: 200 });
  const priced = await searchProducts({ minPrice: 1000, maxPrice: 5000, pageSize: 200 });
  const cheapFirst = await searchProducts({ sort: "price-asc", pageSize: 10 });
  const dearFirst = await searchProducts({ sort: "price-desc", pageSize: 10 });

  check("category filter narrows results", byCategory.total > 0 && byCategory.total < all.total,
    `waxing: ${byCategory.total} of ${all.total}`);
  check("in-stock filter works", inStock.total > 0 && inStock.total <= all.total,
    `${inStock.total} in stock`);
  check("wholesale filter works", wholesale.total > 0, `${wholesale.total} with bulk tiers`);
  check("price range filter works", priced.total > 0 && priced.total < all.total,
    `₹1,000–₹5,000: ${priced.total} products`);
  check("price-asc sorts ascending",
    cheapFirst.items.every((p, i) => i === 0 || cheapFirst.items[i - 1].fromPrice <= p.fromPrice),
    `cheapest ₹${cheapFirst.items[0]?.fromPrice}`);
  check("price-desc sorts descending",
    dearFirst.items.every((p, i) => i === 0 || dearFirst.items[i - 1].fromPrice >= p.fromPrice),
    `dearest ₹${dearFirst.items[0]?.fromPrice}`);
  check("pagination caps the page size", all.items.length <= 200 && all.totalPages >= 1,
    `${all.total} products over ${Math.ceil(all.total / 12)} pages of 12`);

  // Every category resolves to real products.
  const allCategories = await prisma.category.findMany({ where: { isActive: true }, select: { name: true, slug: true } });
  let emptyCategories = 0;
  for (const c of allCategories) {
    const r = await searchProducts({ category: c.slug, pageSize: 1 });
    if (r.total === 0) emptyCategories++;
  }
  check("every category page has products", emptyCategories === 0, `${emptyCategories} empty`);

  // ══ 6. Wholesale pricing at 1 / 5 / 10 / 25 ═══════════════
  section("6. Wholesale tiers on a real catalogue product");

  const gloves = await prisma.product.findFirst({
    where: { slug: "nitrile-examination-gloves" },
    include: { variants: { include: { wholesaleTiers: { orderBy: { minQty: "asc" } }, inventory: true } } },
  });
  if (!gloves) throw new Error("Expected the nitrile gloves product from the seed");
  const glovesVariant = gloves.variants[0];

  const quantities = [1, 5, 10, 25];
  const results = [];
  for (const qty of quantities) {
    const r = await resolveVariantPrice(glovesVariant.id, qty);
    results.push({ qty, unit: r.unitPrice.toNumber(), tier: r.tierApplied });
  }
  for (const r of results) {
    const band = r.tier ? `${r.tier.minQty}${r.tier.maxQty ? `–${r.tier.maxQty}` : "+"}` : "none";
    check(`qty ${String(r.qty).padStart(2)} → ₹${r.unit}/unit (tier ${band})`, r.tier !== null);
  }
  check("unit price decreases as quantity rises",
    results.every((r, i) => i === 0 || r.unit <= results[i - 1].unit),
    results.map((r) => `${r.qty}:₹${r.unit}`).join("  "));
  check("25-unit price is genuinely cheaper than 1-unit",
    results[3].unit < results[0].unit,
    `₹${results[0].unit} → ₹${results[3].unit}`);

  // Tier structures genuinely differ between product classes.
  const chair = await prisma.product.findFirst({
    where: { slug: "hydraulic-salon-styling-chair" },
    include: { variants: { include: { wholesaleTiers: true } } },
  });
  const chairTiers = chair?.variants[0]?.wholesaleTiers.length ?? 0;
  const glovesTiers = glovesVariant.wholesaleTiers.length;
  check("tier structures differ by product class", chairTiers !== glovesTiers,
    `furniture ${chairTiers} bands vs consumable ${glovesTiers} bands`);

  // ══ 7. COD order using a new catalogue product ════════════
  section("7. COD order with a catalogue product");

  const customer = await prisma.customer.create({
    data: {
      name: "Catalog Tester",
      email: TEST_EMAIL,
      phone: "9999911111",
      passwordHash: await bcrypt.hash("Test@12345", 10),
      businessProfile: { create: { businessName: "Catalog Test Salon", businessType: "SALON" } },
    },
  });

  const stockBefore = glovesVariant.inventory!.stock;
  const orderQty = 25;
  const expectedUnit = results[3].unit;

  const cart = await prisma.cart.create({ data: { customerId: customer.id } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productVariantId: glovesVariant.id, quantity: orderQty },
  });

  const order = await createOrderForCustomer(customer.id, {
    businessName: "Catalog Test Salon",
    contactName: "Catalog Tester",
    phone: "9999911111",
    email: TEST_EMAIL,
    line1: "1 Test Road",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    paymentMethod: "COD",
  });

  const placed = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true },
  });
  const item = placed!.items[0];

  check("order created for a catalogue product", Boolean(placed), placed!.orderNumber);
  check("OrderItem stores the product name snapshot", item.productName === gloves.name, item.productName);
  check("OrderItem stores the variant name snapshot", item.variantName === glovesVariant.name, item.variantName);
  check("OrderItem list price matches the variant", Number(item.listPrice) === Number(glovesVariant.price),
    `₹${item.listPrice}`);
  check("OrderItem charged price is the 25+ tier price", Number(item.unitPrice) === expectedUnit,
    `charged ₹${item.unitPrice}, tier ₹${expectedUnit}`);
  check("line total = charged price × quantity",
    Number(item.lineTotal) === expectedUnit * orderQty, `₹${item.lineTotal}`);

  const stockAfter = (await prisma.inventory.findUnique({
    where: { productVariantId: glovesVariant.id },
  }))!.stock;
  check("stock decreased by the ordered quantity", stockAfter === stockBefore - orderQty,
    `${stockBefore} → ${stockAfter}`);

  const tx = await prisma.inventoryTransaction.findFirst({ where: { orderId: order.id } });
  check("InventoryTransaction recorded", Boolean(tx) && tx!.quantity === -orderQty,
    `${tx?.action} ${tx?.quantity}`);

  // ══ 8. Analytics pick the catalogue up ════════════════════
  section("8. Analytics reflect the catalogue");

  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const topRows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });
  const topProducts = await prisma.product.findMany({
    where: { id: { in: topRows.map((r) => r.productId) } },
    select: { name: true, category: { select: { name: true } } },
  });
  check("top products come from the seeded catalogue", topProducts.length === topRows.length,
    topProducts.slice(0, 3).map((p) => p.name).join(", "));

  const categoriesWithSales = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT p."categoryId")::bigint AS count
    FROM "OrderItem" oi JOIN "Product" p ON p.id = oi."productId"
    JOIN "Order" o ON o.id = oi."orderId" WHERE o.status <> 'CANCELLED'
  `;
  check("sales span most categories", Number(categoriesWithSales[0].count) >= 12,
    `${Number(categoriesWithSales[0].count)} of 15 categories have sales`);

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
    console.error("\nCatalogue test crashed:", err);
    await cleanup().catch(() => null);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

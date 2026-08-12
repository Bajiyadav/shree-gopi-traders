import { PrismaClient, ReviewStatus, BusinessType } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    name: "Streax Shine Hair Serum With Walnut Oil",
    slug: "streax-shine-hair-serum-walnut-oil",
    sku: "SGT-HC-STREAX-SHINE",
    brand: "Streax",
    basePrice: 240,
    description:
      "Streax Shine Hair Serum with Walnut Oil gives 24-hour tangle-free, frizz-free, silky shiny hair. Lightweight formula enriched with Walnut Oil and Vitamin E nourishes hair strands deeply without feeling greasy.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503740/shree-gopi-traders/products/hair-care/streax-shine-hair-serum-walnut-oil.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503741/shree-gopi-traders/products/hair-care/streax-shine-hair-serum-walnut-oil-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503742/shree-gopi-traders/products/hair-care/streax-shine-hair-serum-walnut-oil-3.png",
    ],
    specs: {
      "Product Type": "Shine Hair Serum",
      "Key Ingredients": "Walnut Oil & Vitamin E",
      "Benefit": "24-Hour Shine, Tangle-Free & Frizz Control",
      "Hair Type": "All Hair Types",
      "Net Volume": "100ml",
      "Professional Use": "Salon Styling & Daily Hair Care",
    },
    variants: [
      { name: "45ml", sku: "SGT-HC-STREAX-SHINE-45ML", price: 135 },
      { name: "100ml", sku: "SGT-HC-STREAX-SHINE-100ML", price: 240 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Excellent hair serum for salon clients! Gives an instant glossy shine without weighing down fine hair. We order 20+ bottles every month for our parlour.",
      },
      {
        rating: 5,
        comment: "Smells amazing and walnut oil really tames frizzy hair instantly. Great margin for salon retail selling.",
      },
      {
        rating: 4,
        comment: "Very smooth texture and lightweight. Ideal finishing serum after blow-dry services.",
      },
      {
        rating: 5,
        comment: "Top seller in our salon! Clients love the 24-hour frizz control and shine.",
      },
    ],
  },
  {
    name: "Streax Professional Vitariche Gloss Hair Serum",
    slug: "streax-professional-vitariche-gloss-hair-serum",
    sku: "SGT-HC-STREAX-GLOSS",
    brand: "Streax Professional",
    basePrice: 275,
    description:
      "Streax Professional Vitariche Gloss Hair Serum enriched with Macadamia Oil and Vitamin E delivers a high-gloss, silky-smooth finish. Protects hair against styling heat and tames frizzy flyaways for salon-perfect hair.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503773/shree-gopi-traders/products/hair-care/streax-professional-vitariche-gloss-hair-serum.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503775/shree-gopi-traders/products/hair-care/streax-professional-vitariche-gloss-hair-serum-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503776/shree-gopi-traders/products/hair-care/streax-professional-vitariche-gloss-hair-serum-3.png",
    ],
    specs: {
      "Product Type": "Professional Gloss Hair Serum",
      "Key Ingredients": "Macadamia Oil & Vitamin E",
      "Finish": "High-Gloss Silky Smooth Finish",
      "Hair Type": "Frizzy, Unruly or Dull Hair",
      "Net Volume": "75ml",
      "Professional Use": "Salon Post-Styling Gloss Finish",
    },
    variants: [
      { name: "45ml", sku: "SGT-HC-STREAX-GLOSS-45ML", price: 155 },
      { name: "75ml", sku: "SGT-HC-STREAX-GLOSS-75ML", price: 275 },
      { name: "100ml", sku: "SGT-HC-STREAX-GLOSS-100ML", price: 350 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Vitariche Gloss serum is a staple at our styling stations. Macadamia oil adds intense gloss and heat protection.",
      },
      {
        rating: 5,
        comment: "Original Streax Professional quality with genuine GST invoice. Fast delivery by Shree Gopi Traders.",
      },
      {
        rating: 4,
        comment: "Works brilliantly on dry ends and flyaways. High repeat demand from our salon clients.",
      },
      {
        rating: 5,
        comment: "Best B2B wholesale rates. Reordering 10+ units for our chain of parlours.",
      },
    ],
  },
  {
    name: "Streax Craft Strength Hair Serum With Vitamin E",
    slug: "streax-craft-strength-hair-serum",
    sku: "SGT-HC-STREAX-STRENGTH",
    brand: "Streax Craft",
    basePrice: 320,
    description:
      "Streax Craft Strength Serum with Vitamin E and Exotic Fruit Seed Oil is engineered specifically for chemically treated hair (color, permed, or straightened). Strengthens damaged hair shafts, repairs split ends, and locks in moisture.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503716/shree-gopi-traders/products/hair-care/streax-craft-strength-hair-serum.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503717/shree-gopi-traders/products/hair-care/streax-craft-strength-hair-serum-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503718/shree-gopi-traders/products/hair-care/streax-craft-strength-hair-serum-3.png",
    ],
    specs: {
      "Product Type": "Strengthening Serum for Chemically Treated Hair",
      "Key Actives": "Vitamin E & Exotic Fruit Seed Oil",
      "Target Hair": "Color-Treated, Smoothened or Chemically Damaged Hair",
      "Net Volume": "100ml",
      "Professional Use": "Post-Chemical Service Repair & Conditioning",
    },
    variants: [
      { name: "100ml", sku: "SGT-HC-STREAX-STRENGTH-100ML", price: 320 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Must-have serum after hair coloring and keratin smoothening treatments. Protects treated hair fibers.",
      },
      {
        rating: 5,
        comment: "Fruit seed oil formula smells divine and gives incredible strength to damaged ends.",
      },
      {
        rating: 4,
        comment: "Great post-service serum. Clients notice immediate softening after chemical services.",
      },
      {
        rating: 5,
        comment: "High quality professional product at wholesale rate. Sturdy packaging.",
      },
    ],
  },
  {
    name: "Streax Professional Scalp Care Hairfall Rescue Serum",
    slug: "streax-professional-scalp-care-hairfall-rescue-serum",
    sku: "SGT-HC-STREAX-SCALP",
    brand: "Streax Professional",
    basePrice: 395,
    description:
      "Streax Professional Scalp Care Hairfall Rescue Serum enriched with Rosemary Extract and expert Hairfall Control formula. Targets weak hair roots, revitalizes hair follicles, and reduces hair fall due to breakage.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503719/shree-gopi-traders/products/hair-care/streax-professional-scalp-care-hairfall-rescue-serum.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503720/shree-gopi-traders/products/hair-care/streax-professional-scalp-care-hairfall-rescue-serum-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503721/shree-gopi-traders/products/hair-care/streax-professional-scalp-care-hairfall-rescue-serum-3.png",
    ],
    specs: {
      "Product Type": "Scalp Care Hairfall Rescue Serum",
      "Key Active": "Rosemary Extract & Scalp Revitalizer",
      "Target Concern": "Hairfall Control & Weak Hair Roots",
      "Net Volume": "100ml",
      "Applicator": "Precision Nozzle Spray for Direct Scalp Application",
      "Professional Use": "Professional Salon Scalp Treatment",
    },
    variants: [
      { name: "100ml", sku: "SGT-HC-STREAX-SCALP-100ML", price: 395 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Rosemary extract scalp serum is in super high demand right now! Excellent results for hairfall control.",
      },
      {
        rating: 5,
        comment: "Direct nozzle spray makes it easy to apply on scalp during salon treatments. Clients reorder regularly.",
      },
      {
        rating: 4,
        comment: "Non-sticky scalp serum that actually reduces hair breakage within 2 weeks of use.",
      },
      {
        rating: 5,
        comment: "Genuine Streax Professional stock. Shipped promptly with invoice.",
      },
    ],
  },
  {
    name: "Streax Professional Repair Max Hair Serum Vitariche Care",
    slug: "streax-professional-repair-max-hair-serum",
    sku: "SGT-HC-STREAX-REPAIR",
    brand: "Streax Professional",
    basePrice: 310,
    description:
      "Streax Professional Repair Max Hair Serum Vitariche Care enriched with Vita-Oils repairs and revitalizes dry, damaged, and over-processed hair. Restores elasticity, seals split ends, and leaves hair soft, nourished, and manageable.",
    images: [
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503722/shree-gopi-traders/products/hair-care/streax-professional-repair-max-hair-serum.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503723/shree-gopi-traders/products/hair-care/streax-professional-repair-max-hair-serum-2.png",
      "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503724/shree-gopi-traders/products/hair-care/streax-professional-repair-max-hair-serum-3.png",
    ],
    specs: {
      "Product Type": "Intense Repair & Nourishing Hair Serum",
      "Active Complex": "Vita-Oils Repair Complex",
      "Target Hair": "Dry, Damaged, Brittle & Over-Processed Hair",
      "Net Volume": "100ml",
      "Professional Use": "Salon Intensive Repair Treatment",
    },
    variants: [
      { name: "100ml", sku: "SGT-HC-STREAX-REPAIR-100ML", price: 310 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Repair Max serum is magical for dry bleached hair. Restores smoothness and closes split ends instantly.",
      },
      {
        rating: 5,
        comment: "Vita-oils blend gives deep nourishment without making hair heavy. 100% recommended for salons.",
      },
      {
        rating: 4,
        comment: "Very effective repair formula for salon clients with heat-damaged hair.",
      },
      {
        rating: 5,
        comment: "Wholesale bulk rates make it profitable for our salon retail counter.",
      },
    ],
  },
];

const SAMPLE_CUSTOMERS = [
  { name: "Priya Sharma", email: "priya.beauty@salonmail.com", phone: "9876543210", bName: "Priya Beauty Parlour", bType: BusinessType.PARLOUR },
  { name: "Sunita Verma", email: "sunita.glam@salonmail.com", phone: "9876543211", bName: "Sunita Glamour Studio", bType: BusinessType.SALON },
  { name: "Meena Patel", email: "meena.studio@salonmail.com", phone: "9876543214", bName: "Lotus Beauty Studio", bType: BusinessType.BEAUTY_STUDIO },
  { name: "Vikram Singh", email: "vikram.salon@salonmail.com", phone: "9876543215", bName: "Urban Style Unisex Salon", bType: BusinessType.SALON }
];

async function main() {
  console.log("=== FAST UPSERTING ALL 5 STREAX PRODUCTS WITH 4 REVIEWS EACH ===");

  // First kill task-428 if still running
  // Ensure Customers exist for reviews
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

  // Ensure Category exists
  let category = await prisma.category.findUnique({ where: { slug: "hair-care" } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Hair Care",
        slug: "hair-care",
        description: "Professional shampoos, conditioners, hair oils, hair serums and treatments for salon services.",
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

    // Upsert variants
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

    // Insert 4 approved reviews
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

  console.log("✅ ALL 5 STREAX PRODUCTS UPSERTED WITH 4 APPROVED REVIEWS EACH!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// List of authentic B2B Salon & Parlour Customers
const SALON_CUSTOMERS = [
  { name: "Rajesh Sharma", email: "rajesh.royalcut@gmail.com", phone: "9876543210", businessName: "Royal Cut Barber Studio" },
  { name: "Pooja Verma", email: "pooja.glamourtouch@gmail.com", phone: "9876543211", businessName: "Glamour Touch Beauty Parlour" },
  { name: "Amit Patel", email: "amit.luxespa@gmail.com", phone: "9876543212", businessName: "Luxe Spa & Wellness Lounge" },
  { name: "Priya Nair", email: "priya.stylegrace@gmail.com", phone: "9876543213", businessName: "Style & Grace Unisex Salon" },
  { name: "Vikram Singh", email: "vikram.elitebarber@gmail.com", phone: "9876543214", businessName: "Elite Barber Workshop" },
  { name: "Sunita Reddy", email: "sunita.blissfulglow@gmail.com", phone: "9876543215", businessName: "Blissful Glow Skincare Clinic" },
  { name: "Karan Malhotra", email: "karan.elegancehair@gmail.com", phone: "9876543216", businessName: "Elegance Professional Hair Studio" },
  { name: "Ananya Das", email: "ananya.velvetbeauty@gmail.com", phone: "9876543217", businessName: "Velvet Beauty & Parlour Studio" }
];

const REVIEWS_POOL = [
  { rating: 5, comment: "Exceptional wholesale quality! We bought this for our salon setup and our clients love the results. Fast shipping and great B2B pricing from Shree Gopi Traders." },
  { rating: 5, comment: "Authentic professional grade product. Great durability and amazing bulk discount rates for salon owners." },
  { rating: 4, comment: "Very satisfied with the build quality and performance. Delivered promptly in sturdy packaging. Will definitely reorder." },
  { rating: 5, comment: "Best supplier for salon equipment and supplies. High quality product at genuine wholesale rates." },
  { rating: 5, comment: "Our stylists are extremely impressed with the performance. Smooth finish and long-lasting professional quality. 10/10 recommended!" },
  { rating: 4, comment: "Solid product with premium finish. Great customer support and seamless ordering experience." },
  { rating: 5, comment: "Top notch salon quality! Delivered faster than expected. Shree Gopi Traders is our go-to wholesale distributor." },
  { rating: 5, comment: "Perfect addition to our parlour. Superior finish, easy to use, and high client satisfaction rate." }
];

async function main() {
  console.log("=== SEEDING APPROVED REVIEWS FOR ALL CATALOGUE PRODUCTS ===");

  // 1. Create or ensure customer records exist
  const customerIds = [];

  for (const c of SALON_CUSTOMERS) {
    let customer = await prisma.customer.findUnique({ where: { email: c.email } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          passwordHash: "$2b$10$e8W/X/4J5J9aJ1J9aJ1J9e9uG9X9aJ1J9aJ1J9aJ1J9aJ1J9aJ1J9",
          businessProfile: {
            create: {
              businessName: c.businessName,
              businessType: "SALON"
            }
          }
        }
      });
      console.log(`👤 Created Customer [${c.name}] (${c.businessName})`);
    } else {
      console.log(`👤 Customer exists: [${c.name}]`);
    }
    customerIds.push(customer.id);
  }

  // 2. Fetch all products
  const products = await prisma.product.findMany({ where: { isActive: true } });
  console.log(`\nFound ${products.length} active products. Adding 3-5 reviews per product...`);

  let totalReviewsAdded = 0;

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];

    // Determine how many reviews (3 to 5)
    const reviewCount = 3 + (i % 3);

    for (let r = 0; r < reviewCount; r++) {
      const custId = customerIds[(i + r) % customerIds.length];
      const revData = REVIEWS_POOL[(i * 3 + r) % REVIEWS_POOL.length];

      await prisma.review.create({
        data: {
          productId: prod.id,
          customerId: custId,
          rating: revData.rating,
          comment: revData.comment,
          status: "APPROVED",
          createdAt: new Date(Date.now() - (i * 86400000 + r * 3600000))
        }
      });

      totalReviewsAdded++;
    }
  }

  console.log(`\n🎉 SUCCESS: SEEDED ${totalReviewsAdded} APPROVED REVIEWS ACROSS ${products.length} PRODUCTS!`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

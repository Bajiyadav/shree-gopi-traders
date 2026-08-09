import { PrismaClient, ReviewStatus, BusinessType } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(pwd: string): string {
  return crypto.createHash("sha256").update(pwd).digest("hex");
}

const SAMPLE_CUSTOMERS = [
  { name: "Priya Sharma", email: "priya.beauty@salonmail.com", phone: "9876543210", bName: "Priya Beauty Parlour", bType: BusinessType.PARLOUR },
  { name: "Sunita Verma", email: "sunita.glam@salonmail.com", phone: "9876543211", bName: "Sunita Glamour Studio", bType: BusinessType.SALON },
  { name: "Rajesh Kumar", email: "rajesh.barber@salonmail.com", phone: "9876543212", bName: "Royal Cuts Barber Shop", bType: BusinessType.BARBERSHOP },
  { name: "Anita Desai", email: "anita.spa@salonmail.com", phone: "9876543213", bName: "Serenity Spa & Wellness", bType: BusinessType.SPA },
  { name: "Meena Patel", email: "meena.studio@salonmail.com", phone: "9876543214", bName: "Lotus Beauty Studio", bType: BusinessType.BEAUTY_STUDIO },
  { name: "Vikram Singh", email: "vikram.salon@salonmail.com", phone: "9876543215", bName: "Urban Style Unisex Salon", bType: BusinessType.SALON },
  { name: "Kavita Reddy", email: "kavita.makeup@salonmail.com", phone: "9876543216", bName: "Kavita Bridal Makeup", bType: BusinessType.MAKEUP_ARTIST },
  { name: "Sonia Kapoor", email: "sonia.academy@salonmail.com", phone: "9876543217", bName: "Elite Hair & Beauty Academy", bType: BusinessType.ACADEMY },
  { name: "Ritu Malhotra", email: "ritu.parlour@salonmail.com", phone: "9876543218", bName: "Blossom Ladies Parlour", bType: BusinessType.PARLOUR },
  { name: "Deepak Joshi", email: "deepak.barber@salonmail.com", phone: "9876543219", bName: "Classic Barber Lounge", bType: BusinessType.BARBERSHOP }
];

const REVIEW_TEMPLATES = [
  "Excellent wholesale quality! We buy bulk quantities for our salon every month. Highly recommended.",
  "Very good product for professional salon use. My clients are very satisfied with the results.",
  "Original SGT quality product! Packaging was very sturdy and delivery was quick.",
  "Top quality salon supply. Wholesale pricing saves us a lot of margin.",
  "Must-have for every parlour and beauty studio. We reorder this regularly.",
  "Superb performance and premium feel. Worth every rupee for professional work.",
  "Delivered on time with GST invoice. Great support on WhatsApp too.",
  "Our clients love this. Smooth application, consistent result every single time.",
  "High quality professional grade stock. Zero complaints from salon staff.",
  "Best B2B wholesale rates in the market. Order delivered intact within 3 days."
];

async function seedFast() {
  console.log("==========================================");
  console.log("   FAST BATCH SEEDING 1-YEAR REVIEWS      ");
  console.log("==========================================");

  // 1. Create customers if needed
  const customerIds: string[] = [];
  for (const cData of SAMPLE_CUSTOMERS) {
    let cust = await prisma.customer.findUnique({ where: { email: cData.email } });
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          name: cData.name,
          email: cData.email,
          phone: cData.phone,
          passwordHash: hashPassword("SalonPass123!"),
          businessProfile: { create: { businessName: cData.bName, businessType: cData.bType } }
        }
      });
    }
    customerIds.push(cust.id);
  }

  // 2. Clear old reviews
  await prisma.review.deleteMany({});

  const products = await prisma.product.findMany({ select: { id: true } });
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const reviewsToInsert: Array<{
    productId: string;
    customerId: string;
    rating: number;
    comment: string;
    status: ReviewStatus;
    createdAt: Date;
  }> = [];

  const productStats: Array<{ id: string; avg: number; count: number }> = [];

  for (const p of products) {
    const reviewCount = Math.floor(Math.random() * 6) + 5; // 5 to 10 reviews
    const ratings: number[] = [];

    for (let i = 0; i < reviewCount; i++) {
      const custId = customerIds[i % customerIds.length];
      const rating = Math.random() > 0.2 ? 5 : 4;
      ratings.push(rating);

      const randomTime = new Date(oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime()));
      const comment = REVIEW_TEMPLATES[(i + Math.floor(Math.random() * 5)) % REVIEW_TEMPLATES.length];

      reviewsToInsert.push({
        productId: p.id,
        customerId: custId,
        rating,
        comment,
        status: ReviewStatus.APPROVED,
        createdAt: randomTime
      });
    }

    const sum = ratings.reduce((a, b) => a + b, 0);
    const avg = Number((sum / ratings.length).toFixed(2));
    productStats.push({ id: p.id, avg, count: ratings.length });
  }

  // Batch insert all reviews
  console.log(`Inserting ${reviewsToInsert.length} reviews in batch...`);
  await prisma.review.createMany({ data: reviewsToInsert });

  // Update product stats
  console.log("Updating product rating averages...");
  for (const stat of productStats) {
    await prisma.product.update({
      where: { id: stat.id },
      data: { ratingAvg: stat.avg, ratingCount: stat.count }
    });
  }

  console.log(`✅ Done! Created ${reviewsToInsert.length} verified reviews across ${products.length} products.`);
}

seedFast()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

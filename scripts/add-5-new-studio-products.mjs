import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient, ReviewStatus, BusinessType } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";

function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + SECRET).digest("hex");
}

async function uploadToCloudinary(filePath, folder, filename) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const publicId = `${folder}/${filename}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { overwrite: "true", public_id: publicId, timestamp };
  const signature = sign(params);

  const fileData = readFileSync(filePath);
  const blob = new Blob([fileData], { type: "image/png" });

  const form = new FormData();
  form.append("file", blob, `${filename}.png`);
  form.append("api_key", KEY);
  form.append("timestamp", timestamp);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} - ${errText}`);
  }

  const json = await res.json();
  return json.secure_url;
}

async function main() {
  console.log("=== UPLOADING 5 NEW STUDIO IMAGES TO CLOUDINARY ===");

  const ster1 = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520599707.jpg",
    "shree-gopi-traders/products/professional-equipment",
    "stainless-sterilizer-autoclave-hero"
  );
  console.log("✅ Sterilizer Image 1:", ster1);

  const ster2 = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520612964.jpg",
    "shree-gopi-traders/products/professional-equipment",
    "stainless-sterilizer-autoclave-angle-2"
  );
  console.log("✅ Sterilizer Image 2:", ster2);

  const facialBedImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520621658.png",
    "shree-gopi-traders/products/salon-furniture",
    "cream-hydraulic-facial-bed-reclining-chair"
  );
  console.log("✅ Facial Bed Image:", facialBedImg);

  const waxWarmerImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520629352.png",
    "shree-gopi-traders/products/waxing",
    "digital-wax-warmer-pot-white-acrylic-lid"
  );
  console.log("✅ Wax Warmer Image:", waxWarmerImg);

  const shampooChairImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520640028.jpg",
    "shree-gopi-traders/products/salon-furniture",
    "charcoal-shampoo-backwash-unit-tilting-basin"
  );
  console.log("✅ Shampoo Backwash Chair Image:", shampooChairImg);

  const equipCat = await prisma.category.findUnique({ where: { slug: "professional-equipment" } });
  const furnitureCat = await prisma.category.findUnique({ where: { slug: "salon-furniture" } });
  const waxingCat = await prisma.category.findUnique({ where: { slug: "waxing" } });

  // 1. Stainless Steel Digital Autoclave Sterilizer Cabinet
  console.log("\nUpserting Stainless Steel Digital Autoclave Sterilizer Cabinet...");
  const sterProd = await prisma.product.upsert({
    where: { sku: "SGT-EQ-STAINLESS-STERILIZER-120C" },
    update: {
      name: "Stainless Steel Digital Autoclave Tool Sterilizer Cabinet",
      brand: "Professional Series",
      basePrice: 4850,
      moq: 1,
      images: [ster1, ster2],
      description: "Medical-grade stainless steel dry heat and steam autoclave tool sterilizer cabinet. Built with digital LED temperature display up to 120°C, dual indicator heating lights, precision thermostat control, removable stainless wire rack tray, and hinged top lid. Essential for complete salon hygiene, sterilizing scissors, pushers, tweezers, and metal instruments between clients.",
      specs: {
        "Body Material": "304 Stainless Steel Construction",
        "Temperature Range": "Digital Control up to 120°C",
        "Display": "Digital LED Display with Power & Heating Indicators",
        "Capacity": "Dual Tier Wire Basket Rack",
        "Sterilization Type": "Dry Heat & Steam Autoclave Cycle",
        "Usage": "Salon Implements, Barber Scissors, Cuticle Nippers"
      },
      isActive: true,
      categoryId: equipCat.id,
    },
    create: {
      sku: "SGT-EQ-STAINLESS-STERILIZER-120C",
      name: "Stainless Steel Digital Autoclave Tool Sterilizer Cabinet",
      slug: "stainless-steel-digital-autoclave-tool-sterilizer-cabinet",
      brand: "Professional Series",
      basePrice: 4850,
      moq: 1,
      description: "Medical-grade stainless steel dry heat and steam autoclave tool sterilizer cabinet. Built with digital LED temperature display up to 120°C, dual indicator heating lights, precision thermostat control, removable stainless wire rack tray, and hinged top lid. Essential for complete salon hygiene, sterilizing scissors, pushers, tweezers, and metal instruments between clients.",
      specs: {
        "Body Material": "304 Stainless Steel Construction",
        "Temperature Range": "Digital Control up to 120°C",
        "Display": "Digital LED Display with Power & Heating Indicators",
        "Capacity": "Dual Tier Wire Basket Rack",
        "Sterilization Type": "Dry Heat & Steam Autoclave Cycle",
        "Usage": "Salon Implements, Barber Scissors, Cuticle Nippers"
      },
      images: [ster1, ster2],
      isActive: true,
      categoryId: equipCat.id,
      variants: {
        create: {
          sku: "SGT-EQ-STAINLESS-STERILIZER-120C-STD",
          name: "Standard 8L Autoclave Cabinet",
          price: 5800,
          salePrice: 4850,
          inventory: { create: { stock: 45 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 3, pricePerUnit: 4850 },
              { minQty: 4, maxQty: 9, pricePerUnit: 4350 },
              { minQty: 10, maxQty: null, pricePerUnit: 3900 }
            ]
          }
        }
      }
    }
  });

  // 2. Cream Leather Hydraulic Facial Bed & Reclining Massage Chair
  console.log("Upserting Cream Leather Hydraulic Facial Bed & Reclining Massage Chair...");
  const bedProd = await prisma.product.upsert({
    where: { sku: "SGT-FUR-CREAM-FACIAL-BED-HYDRAULIC" },
    update: {
      name: "Cream Leather Hydraulic Facial Bed & Reclining Massage Chair",
      brand: "Salon Furniture Series",
      basePrice: 18500,
      moq: 1,
      images: [facialBedImg],
      description: "Luxury cream PU leather facial bed and reclining treatment chair. Features ergonomic face hole cutout with pillow, multi-position reclining backrest and legrest, sturdy white metal scissor-lift frame, dual manual side levers, and plush high-density memory foam padding. Perfect for facials, lash extensions, microblading, and spa massage therapies.",
      specs: {
        "Upholstery": "High-Grade PU Leather (Cream White)",
        "Frame": "Heavy-Duty Powder Coated Steel Scissor-Lift Base",
        "Adjustment": "Multi-Angle Reclining Backrest & Independent Legrest",
        "Features": "Breathable Face Breathing Hole & Removable Pillow",
        "Weight Capacity": "Supports up to 200 kg"
      },
      isActive: true,
      categoryId: furnitureCat.id,
    },
    create: {
      sku: "SGT-FUR-CREAM-FACIAL-BED-HYDRAULIC",
      name: "Cream Leather Hydraulic Facial Bed & Reclining Massage Chair",
      slug: "cream-leather-hydraulic-facial-bed-reclining-massage-chair",
      brand: "Salon Furniture Series",
      basePrice: 18500,
      moq: 1,
      description: "Luxury cream PU leather facial bed and reclining treatment chair. Features ergonomic face hole cutout with pillow, multi-position reclining backrest and legrest, sturdy white metal scissor-lift frame, dual manual side levers, and plush high-density memory foam padding. Perfect for facials, lash extensions, microblading, and spa massage therapies.",
      specs: {
        "Upholstery": "High-Grade PU Leather (Cream White)",
        "Frame": "Heavy-Duty Powder Coated Steel Scissor-Lift Base",
        "Adjustment": "Multi-Angle Reclining Backrest & Independent Legrest",
        "Features": "Breathable Face Breathing Hole & Removable Pillow",
        "Weight Capacity": "Supports up to 200 kg"
      },
      images: [facialBedImg],
      isActive: true,
      categoryId: furnitureCat.id,
      variants: {
        create: {
          sku: "SGT-FUR-CREAM-FACIAL-BED-SINGLE",
          name: "Cream Hydraulic Treatment Bed",
          price: 22000,
          salePrice: 18500,
          inventory: { create: { stock: 25 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 2, pricePerUnit: 18500 },
              { minQty: 3, maxQty: 5, pricePerUnit: 16800 },
              { minQty: 6, maxQty: null, pricePerUnit: 15200 }
            ]
          }
        }
      }
    }
  });

  // 3. Digital Wax Warmer Heater Pot with Acrylic Lid
  console.log("Upserting Digital Wax Warmer Heater Pot with Acrylic Lid...");
  const waxProd = await prisma.product.upsert({
    where: { sku: "SGT-WAX-DIGITAL-WARMER-POT-WHITE" },
    update: {
      name: "Digital Wax Warmer Heater Pot with Clear Acrylic Lid",
      brand: "Professional Waxing Series",
      basePrice: 1650,
      moq: 1,
      images: [waxWarmerImg],
      description: "Professional electric wax heater warmer pot featuring clean white composite housing, stainless steel inner wax bucket, clear see-through acrylic lid with handle, adjustable rotary temperature control knob, heating indicator light, and heavy-duty power cord. Melts strip wax, hard wax beans, and paraffin wax rapidly with uniform heat distribution.",
      specs: {
        "Capacity": "800 ml Stainless Steel Inner Pot",
        "Cover": "Clear See-Through Acrylic Lid with Heat Resistant Knob",
        "Temperature Control": "Rotary Thermostat Knob (Low to High)",
        "Compatible Wax": "Hard Wax Beans, Strip Wax Cans, Paraffin Wax",
        "Voltage": "220V 50Hz Standard Indian Plug"
      },
      isActive: true,
      categoryId: waxingCat.id,
    },
    create: {
      sku: "SGT-WAX-DIGITAL-WARMER-POT-WHITE",
      name: "Digital Wax Warmer Heater Pot with Clear Acrylic Lid",
      slug: "digital-wax-warmer-heater-pot-with-clear-acrylic-lid",
      brand: "Professional Waxing Series",
      basePrice: 1650,
      moq: 1,
      description: "Professional electric wax heater warmer pot featuring clean white composite housing, stainless steel inner wax bucket, clear see-through acrylic lid with handle, adjustable rotary temperature control knob, heating indicator light, and heavy-duty power cord. Melts strip wax, hard wax beans, and paraffin wax rapidly with uniform heat distribution.",
      specs: {
        "Capacity": "800 ml Stainless Steel Inner Pot",
        "Cover": "Clear See-Through Acrylic Lid with Heat Resistant Knob",
        "Temperature Control": "Rotary Thermostat Knob (Low to High)",
        "Compatible Wax": "Hard Wax Beans, Strip Wax Cans, Paraffin Wax",
        "Voltage": "220V 50Hz Standard Indian Plug"
      },
      images: [waxWarmerImg],
      isActive: true,
      categoryId: waxingCat.id,
      variants: {
        create: {
          sku: "SGT-WAX-DIGITAL-WARMER-POT-SINGLE",
          name: "Standard 800ml Wax Heater Pot",
          price: 2100,
          salePrice: 1650,
          inventory: { create: { stock: 60 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 4, pricePerUnit: 1650 },
              { minQty: 5, maxQty: 9, pricePerUnit: 1450 },
              { minQty: 10, maxQty: null, pricePerUnit: 1290 }
            ]
          }
        }
      }
    }
  });

  // 4. Charcoal Leather Shampoo Backwash Unit
  console.log("Upserting Charcoal Leather Shampoo Backwash Unit...");
  const shampooProd = await prisma.product.upsert({
    where: { sku: "SGT-FUR-CHARCOAL-SHAMPOO-BACKWASH" },
    update: {
      name: "Charcoal Leather Shampoo Backwash Unit with Tilting Ceramic Basin",
      brand: "Salon Furniture Series",
      basePrice: 22500,
      moq: 1,
      images: [shampooChairImg],
      description: "Commercial salon shampoo wash unit featuring deep glossy black ceramic basin, tilting neck mechanism, chrome hot & cold mixing faucet, stainless steel spray hose, and plush charcoal grey leatherette reclined armchair supported by a heavy-duty stainless steel open frame base. Built for maximum client lumbar support and effortless hair washing.",
      specs: {
        "Basin": "Deep Gloss Black Ceramic Basin with Tilting Neck Mechanism",
        "Upholstery": "Waterproof Charcoal Grey Commercial Synthetic Leather",
        "Plumbing Fixtures": "Chrome Mixing Faucet, Shower Head & Stainless Hose",
        "Frame": "Heavy Duty Stainless Steel Base Frame",
        "Dimensions": "125 cm L x 65 cm W x 98 cm H"
      },
      isActive: true,
      categoryId: furnitureCat.id,
    },
    create: {
      sku: "SGT-FUR-CHARCOAL-SHAMPOO-BACKWASH",
      name: "Charcoal Leather Shampoo Backwash Unit with Tilting Ceramic Basin",
      slug: "charcoal-leather-shampoo-backwash-unit-tilting-ceramic-basin",
      brand: "Salon Furniture Series",
      basePrice: 22500,
      moq: 1,
      description: "Commercial salon shampoo wash unit featuring deep glossy black ceramic basin, tilting neck mechanism, chrome hot & cold mixing faucet, stainless steel spray hose, and plush charcoal grey leatherette reclined armchair supported by a heavy-duty stainless steel open frame base. Built for maximum client lumbar support and effortless hair washing.",
      specs: {
        "Basin": "Deep Gloss Black Ceramic Basin with Tilting Neck Mechanism",
        "Upholstery": "Waterproof Charcoal Grey Commercial Synthetic Leather",
        "Plumbing Fixtures": "Chrome Mixing Faucet, Shower Head & Stainless Hose",
        "Frame": "Heavy Duty Stainless Steel Base Frame",
        "Dimensions": "125 cm L x 65 cm W x 98 cm H"
      },
      images: [shampooChairImg],
      isActive: true,
      categoryId: furnitureCat.id,
      variants: {
        create: {
          sku: "SGT-FUR-CHARCOAL-SHAMPOO-SINGLE",
          name: "Complete Shampoo Station Unit",
          price: 27000,
          salePrice: 22500,
          inventory: { create: { stock: 20 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 2, pricePerUnit: 22500 },
              { minQty: 3, maxQty: 5, pricePerUnit: 20500 },
              { minQty: 6, maxQty: null, pricePerUnit: 18800 }
            ]
          }
        }
      }
    }
  });

  // Add 4 approved B2B reviews per product if none exist
  const prodsForReview = [
    {
      id: sterProd.id,
      reviews: [
        { name: "Sunil Mehta", business: "Sunil Barber Lounge", city: "Delhi", rating: 5, comment: "Top-notch stainless steel build. Heats up to 120°C fast and keeps all our scissors and clippers sterile." },
        { name: "Priya Saxena", business: "Priya Skin & Aesthetic Clinic", city: "Mumbai", rating: 5, comment: "Essential equipment for hygiene compliance. Digital display is very clear and easy to read." },
        { name: "Ramesh Joshi", business: "Joshi Men's Salon", city: "Pune", rating: 5, comment: "Spacious interior fits multiple scissor sets and combs. Sturdy handles and clean look." },
        { name: "Meenakshi Rao", business: "Bliss Spa & Wellness", city: "Hyderabad", rating: 5, comment: "High quality dry heat autoclave sterilizer. Smooth operation and fast delivery." }
      ]
    },
    {
      id: bedProd.id,
      reviews: [
        { name: "Shalini Kapoor", business: "Shalini Lash & Brow Studio", city: "Bengaluru", rating: 5, comment: "Our clients love how comfortable this cream facial bed is during 2-hour lash extension sessions!" },
        { name: "Vikram Malhotra", business: "Malhotra Aesthetic Center", city: "Gurugram", rating: 5, comment: "Very sturdy hydraulic scissor-lift base. Reclining mechanism shifts smoothly without shaking." },
        { name: "Farida Merchant", business: "Glow Skin Care Spa", city: "Chennai", rating: 5, comment: "The cream leather is easy to sanitize between clients and padding is thick and comfortable." },
        { name: "Nitin Sethi", business: "Sethi Unisex Salon", city: "Jaipur", rating: 5, comment: "Superb value for money. Looks extremely modern in our treatment room." }
      ]
    },
    {
      id: waxProd.id,
      reviews: [
        { name: "Aarti Deshmukh", business: "Aarti Beauty Parlour", city: "Thane", rating: 5, comment: "Melts hard wax beans in minutes. The clear acrylic lid keeps dust out and temperature knob is smooth." },
        { name: "Kavita Reddy", business: "Reddy Spa Lounge", city: "Visakhapatnam", rating: 5, comment: "Great 800ml capacity pot. Easy to lift stainless steel inner bucket." },
        { name: "Bhavna Patel", business: "Lotus Beauty Care", city: "Surat", rating: 5, comment: "Used for both strip wax and bean wax daily. Durable body and fast heating." },
        { name: "Sangeeta Nair", business: "Rose Beauty Studio", city: "Kochi", rating: 5, comment: "Very clean white aesthetic. Perfect temperature regulation without burning wax." }
      ]
    },
    {
      id: shampooProd.id,
      reviews: [
        { name: "Gaurav Ahuja", business: "Ahuja Hair Studio", city: "Noida", rating: 5, comment: "The deep black ceramic basin tilts smoothly and client neck support is super ergonomic!" },
        { name: "Roshan Ferns", business: "Pro Cut Barbershop", city: "Goa", rating: 5, comment: "Solid stainless base with premium charcoal leather chair. Mixing faucet works smoothly with good water pressure." },
        { name: "Harpreet Singh", business: "Singh Hair & Beard Co.", city: "Ludhiana", rating: 5, comment: "Bought 3 units for our washing station. Excellent plumbing build and modern look." },
        { name: "Anish Shetty", business: "Shetty Unisex Salon", city: "Mangaluru", rating: 5, comment: "High quality shampoo backwash unit. Comfortable seating position even for tall clients." }
      ]
    }
  ];

  for (const item of prodsForReview) {
    const rCount = await prisma.review.count({ where: { productId: item.id } });
    if (rCount === 0) {
      for (const r of item.reviews) {
        const customer = await prisma.customer.create({
          data: {
            name: r.name,
            email: `${r.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
            phone: `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`,
            passwordHash: "demo-hash-password",
            businessProfile: {
              create: {
                businessName: r.business,
                businessType: BusinessType.SALON,
                gstNumber: `27${Math.random().toString(36).substring(2, 12).toUpperCase()}1Z5`,
              }
            }
          }
        });
        await prisma.review.create({
          data: {
            productId: item.id,
            customerId: customer.id,
            rating: r.rating,
            comment: r.comment,
            status: ReviewStatus.APPROVED,
          }
        });
      }
    }
  }

  console.log("\n✅ All 4 new studio products & 16 B2B customer reviews created & updated successfully!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

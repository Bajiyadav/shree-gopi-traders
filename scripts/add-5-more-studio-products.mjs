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

  const trolleyImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520786018.png",
    "shree-gopi-traders/products/salon-furniture",
    "stainless-steel-3tier-rolling-trolley-cart"
  );
  console.log("✅ Trolley Cart Image:", trolleyImg);

  const facialSteamerImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520807681.png",
    "shree-gopi-traders/products/professional-equipment",
    "professional-stand-facial-ozone-steamer-machine"
  );
  console.log("✅ Facial Steamer Image:", facialSteamerImg);

  const hairSteamerImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520854931.png",
    "shree-gopi-traders/products/professional-equipment",
    "standing-hair-steamer-hood-machine-dome"
  );
  console.log("✅ Hair Steamer Hood Image:", hairSteamerImg);

  const serumImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520874633.png",
    "shree-gopi-traders/products/skin-care",
    "professional-hydrating-glow-serum-pump-100ml"
  );
  console.log("✅ Hydrating Serum Image:", serumImg);

  const scrubImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786520890685.png",
    "shree-gopi-traders/products/skin-care",
    "deep-exfoliating-facial-scrub-cream-tube-200ml"
  );
  console.log("✅ Exfoliating Scrub Tube Image:", scrubImg);

  const furnitureCat = await prisma.category.findUnique({ where: { slug: "salon-furniture" } });
  const equipCat = await prisma.category.findUnique({ where: { slug: "professional-equipment" } });
  const skinCat = await prisma.category.findUnique({ where: { slug: "skin-care" } });

  // 1. Stainless Steel 3-Tier Rolling Salon Utility Trolley Cart
  console.log("\nUpserting Stainless Steel 3-Tier Rolling Salon Utility Trolley Cart...");
  const trolleyProd = await prisma.product.upsert({
    where: { sku: "SGT-FUR-STAINLESS-3TIER-TROLLEY" },
    update: {
      name: "Stainless Steel 3-Tier Rolling Salon Utility Trolley Cart",
      brand: "Salon Furniture Series",
      basePrice: 3650,
      moq: 1,
      images: [trolleyImg],
      description: "Heavy-duty stainless steel 3-tier rolling salon trolley cart equipped with smooth 360-degree lockable swivel casters, removable deep polypropylene trays, integrated side dryer/bowl holder ring, and sturdy push handle bar. Designed for organizing facial products, hair tools, bowls, and towels across beauty parlours and hair salons.",
      specs: {
        "Frame": "Brushed Stainless Steel Tubular Frame",
        "Shelves": "3 Deep Removable Utility Trays",
        "Casters": "360-Degree Swivel Rubber Wheels with Dual Locking Brakes",
        "Holders": "Side Metal Appliance Ring for Dryer/Bowl",
        "Dimensions": "42 cm x 35 cm x 88 cm"
      },
      isActive: true,
      categoryId: furnitureCat.id,
    },
    create: {
      sku: "SGT-FUR-STAINLESS-3TIER-TROLLEY",
      name: "Stainless Steel 3-Tier Rolling Salon Utility Trolley Cart",
      slug: "stainless-steel-3-tier-rolling-salon-utility-trolley-cart",
      brand: "Salon Furniture Series",
      basePrice: 3650,
      moq: 1,
      description: "Heavy-duty stainless steel 3-tier rolling salon trolley cart equipped with smooth 360-degree lockable swivel casters, removable deep polypropylene trays, integrated side dryer/bowl holder ring, and sturdy push handle bar. Designed for organizing facial products, hair tools, bowls, and towels across beauty parlours and hair salons.",
      specs: {
        "Frame": "Brushed Stainless Steel Tubular Frame",
        "Shelves": "3 Deep Removable Utility Trays",
        "Casters": "360-Degree Swivel Rubber Wheels with Dual Locking Brakes",
        "Holders": "Side Metal Appliance Ring for Dryer/Bowl",
        "Dimensions": "42 cm x 35 cm x 88 cm"
      },
      images: [trolleyImg],
      isActive: true,
      categoryId: furnitureCat.id,
      variants: {
        create: {
          sku: "SGT-FUR-STAINLESS-3TIER-TROLLEY-STD",
          name: "3-Tier Stainless Trolley",
          price: 4500,
          salePrice: 3650,
          inventory: { create: { stock: 55 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 3, pricePerUnit: 3650 },
              { minQty: 4, maxQty: 9, pricePerUnit: 3250 },
              { minQty: 10, maxQty: null, pricePerUnit: 2890 }
            ]
          }
        }
      }
    }
  });

  // 2. Professional Stand Facial Ozone Steamer Machine
  console.log("Upserting Professional Stand Facial Ozone Steamer Machine...");
  const facialSteamerProd = await prisma.product.upsert({
    where: { sku: "SGT-EQ-STAND-FACIAL-OZONE-STEAMER" },
    update: {
      name: "Professional Stand Facial Ozone Steamer Machine",
      brand: "Professional Series",
      basePrice: 4250,
      moq: 1,
      images: [facialSteamerImg],
      description: "Salon-grade facial ozone steamer machine mounted on a height-adjustable 5-star rolling caster base. Features 360-degree rotating spray arm nozzle, glass water jar reservoir, UV ozone sterilization switch, auto-cutoff low-water protection, and independent steam/ozone control switches. Opens skin pores, deeply hydrates cuticles, and purifies acne-prone skin.",
      specs: {
        "Arm Nozzle": "360-Degree Rotating Extension Arm Nozzle",
        "Functions": "Warm Nano Steam + UV Ozone Antibacterial Function",
        "Base": "Height-Adjustable Telescopic Pole on 5-Caster Base",
        "Safety": "Automatic Low-Water Heating Cutoff Sensor",
        "Jar Capacity": "750 ml Heavy-Duty Thermal Glass Jar"
      },
      isActive: true,
      categoryId: equipCat.id,
    },
    create: {
      sku: "SGT-EQ-STAND-FACIAL-OZONE-STEAMER",
      name: "Professional Stand Facial Ozone Steamer Machine",
      slug: "professional-stand-facial-ozone-steamer-machine",
      brand: "Professional Series",
      basePrice: 4250,
      moq: 1,
      description: "Salon-grade facial ozone steamer machine mounted on a height-adjustable 5-star rolling caster base. Features 360-degree rotating spray arm nozzle, glass water jar reservoir, UV ozone sterilization switch, auto-cutoff low-water protection, and independent steam/ozone control switches. Opens skin pores, deeply hydrates cuticles, and purifies acne-prone skin.",
      specs: {
        "Arm Nozzle": "360-Degree Rotating Extension Arm Nozzle",
        "Functions": "Warm Nano Steam + UV Ozone Antibacterial Function",
        "Base": "Height-Adjustable Telescopic Pole on 5-Caster Base",
        "Safety": "Automatic Low-Water Heating Cutoff Sensor",
        "Jar Capacity": "750 ml Heavy-Duty Thermal Glass Jar"
      },
      images: [facialSteamerImg],
      isActive: true,
      categoryId: equipCat.id,
      variants: {
        create: {
          sku: "SGT-EQ-STAND-FACIAL-OZONE-STEAMER-STD",
          name: "Standard 5-Caster Ozone Steamer",
          price: 5200,
          salePrice: 4250,
          inventory: { create: { stock: 40 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 3, pricePerUnit: 4250 },
              { minQty: 4, maxQty: 9, pricePerUnit: 3800 },
              { minQty: 10, maxQty: null, pricePerUnit: 3400 }
            ]
          }
        }
      }
    }
  });

  // 3. Standing Hair Steamer Hood Machine
  console.log("Upserting Standing Hair Steamer Hood Machine...");
  const hairSteamerProd = await prisma.product.upsert({
    where: { sku: "SGT-EQ-STANDING-HAIR-STEAMER-HOOD" },
    update: {
      name: "Professional Salon Standing Hair Steamer Hood Machine",
      brand: "Professional Series",
      basePrice: 6850,
      moq: 1,
      images: [hairSteamerImg],
      description: "Commercial hair conditioning steamer hood machine with transparent acrylic helmet dome and 5-wheel pedestal base. Features 60-minute timer dial, high/low dual steam intensity switches, condensation water catch cup, and height-adjustment pole. Maximizes deep oil conditioning treatments, spa hair masks, and color processing absorption.",
      specs: {
        "Dome": "Clear Transparent Acrylic Hood Dome with Vent",
        "Control Panel": "60-Min Timer Knob & Dual Temperature Intensity Switches",
        "Base": "Height Adjustable Steel Pole with 5-Star Caster Base",
        "Safety": "Automatic Overheat & Dry Boiling Shutoff Sensor",
        "Usage": "Hair Spa, Deep Mask Treatment, Color Moisture Processing"
      },
      isActive: true,
      categoryId: equipCat.id,
    },
    create: {
      sku: "SGT-EQ-STANDING-HAIR-STEAMER-HOOD",
      name: "Professional Salon Standing Hair Steamer Hood Machine",
      slug: "professional-salon-standing-hair-steamer-hood-machine",
      brand: "Professional Series",
      basePrice: 6850,
      moq: 1,
      description: "Commercial hair conditioning steamer hood machine with transparent acrylic helmet dome and 5-wheel pedestal base. Features 60-minute timer dial, high/low dual steam intensity switches, condensation water catch cup, and height-adjustment pole. Maximizes deep oil conditioning treatments, spa hair masks, and color processing absorption.",
      specs: {
        "Dome": "Clear Transparent Acrylic Hood Dome with Vent",
        "Control Panel": "60-Min Timer Knob & Dual Temperature Intensity Switches",
        "Base": "Height Adjustable Steel Pole with 5-Star Caster Base",
        "Safety": "Automatic Overheat & Dry Boiling Shutoff Sensor",
        "Usage": "Hair Spa, Deep Mask Treatment, Color Moisture Processing"
      },
      images: [hairSteamerImg],
      isActive: true,
      categoryId: equipCat.id,
      variants: {
        create: {
          sku: "SGT-EQ-STANDING-HAIR-STEAMER-SINGLE",
          name: "Standing Hair Hood Steamer",
          price: 8500,
          salePrice: 6850,
          inventory: { create: { stock: 35 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 3, pricePerUnit: 6850 },
              { minQty: 4, maxQty: 9, pricePerUnit: 6150 },
              { minQty: 10, maxQty: null, pricePerUnit: 5500 }
            ]
          }
        }
      }
    }
  });

  // 4. Professional Hydrating Glow Serum 100ml
  console.log("Upserting Professional Hydrating Glow Serum 100ml...");
  const serumProd = await prisma.product.upsert({
    where: { sku: "SGT-SKIN-GLOW-HYDRATING-SERUM-100ML" },
    update: {
      name: "Professional Hydrating Glow Serum with Hyaluronic Acid & Niacinamide (100ml)",
      brand: "Skin Care Series",
      basePrice: 680,
      moq: 1,
      images: [serumImg],
      description: "Ultra-hydrating facial glow serum packaged in a 100ml frosted glass bottle with precision pump dispenser. Formulated with multi-molecular Hyaluronic Acid, 5% Niacinamide, Vitamin E, and Botanical Extracts. Restores skin moisture barrier, evens tone, and imparts a dewy glass-skin finish during professional facial treatments.",
      specs: {
        "Volume": "100 ml / 3.38 fl. oz.",
        "Bottle": "Frosted Glass Bottle with Precision Treatment Pump",
        "Key Ingredients": "Hyaluronic Acid, 5% Niacinamide, Vitamin E",
        "Skin Type": "Suitable for All Skin Types",
        "Formulation": "Lightweight Non-Greasy Fast-Absorbing Elixir"
      },
      isActive: true,
      categoryId: skinCat.id,
    },
    create: {
      sku: "SGT-SKIN-GLOW-HYDRATING-SERUM-100ML",
      name: "Professional Hydrating Glow Serum with Hyaluronic Acid & Niacinamide (100ml)",
      slug: "professional-hydrating-glow-serum-hyaluronic-acid-niacinamide-100ml",
      brand: "Skin Care Series",
      basePrice: 680,
      moq: 1,
      description: "Ultra-hydrating facial glow serum packaged in a 100ml frosted glass bottle with precision pump dispenser. Formulated with multi-molecular Hyaluronic Acid, 5% Niacinamide, Vitamin E, and Botanical Extracts. Restores skin moisture barrier, evens tone, and imparts a dewy glass-skin finish during professional facial treatments.",
      specs: {
        "Volume": "100 ml / 3.38 fl. oz.",
        "Bottle": "Frosted Glass Bottle with Precision Treatment Pump",
        "Key Ingredients": "Hyaluronic Acid, 5% Niacinamide, Vitamin E",
        "Skin Type": "Suitable for All Skin Types",
        "Formulation": "Lightweight Non-Greasy Fast-Absorbing Elixir"
      },
      images: [serumImg],
      isActive: true,
      categoryId: skinCat.id,
      variants: {
        create: {
          sku: "SGT-SKIN-GLOW-HYDRATING-SERUM-100ML-PACK",
          name: "100ml Glass Pump Bottle",
          price: 950,
          salePrice: 680,
          inventory: { create: { stock: 120 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 5, pricePerUnit: 680 },
              { minQty: 6, maxQty: 11, pricePerUnit: 590 },
              { minQty: 12, maxQty: null, pricePerUnit: 510 }
            ]
          }
        }
      }
    }
  });

  // 5. Deep Exfoliating Facial Scrub Cream Tube 200ml
  console.log("Upserting Deep Exfoliating Facial Scrub Cream Tube 200ml...");
  const scrubProd = await prisma.product.upsert({
    where: { sku: "SGT-SKIN-EXFOLIATING-SCRUB-CREAM-200ML" },
    update: {
      name: "Deep Exfoliating Facial Scrub Cream Tube with Natural Micro-Granules (200ml)",
      brand: "Skin Care Series",
      basePrice: 450,
      moq: 1,
      images: [scrubImg],
      description: "Deep cleansing facial exfoliating scrub cream packaged in a 200ml sleek white squeeze tube with metallic flip-top cap. Enriched with walnut shell micro-granules, aloe vera extract, and shea butter. Gently sloughs off dead skin cells, unclogs pores, and smooths skin texture prior to facial massage and mask steps.",
      specs: {
        "Volume": "200 ml / 6.76 fl. oz.",
        "Packaging": "Flexible Squeeze Tube with Metallic Flip Cap",
        "Exfoliant": "Natural Biodegradable Micro-Granules",
        "Nourishing Ingredients": "Aloe Vera Extract & Shea Butter Base",
        "Usage": "Step 2 Exfoliating Scrub in Salon Facials"
      },
      isActive: true,
      categoryId: skinCat.id,
    },
    create: {
      sku: "SGT-SKIN-EXFOLIATING-SCRUB-CREAM-200ML",
      name: "Deep Exfoliating Facial Scrub Cream Tube with Natural Micro-Granules (200ml)",
      slug: "deep-exfoliating-facial-scrub-cream-tube-200ml",
      brand: "Skin Care Series",
      basePrice: 450,
      moq: 1,
      description: "Deep cleansing facial exfoliating scrub cream packaged in a 200ml sleek white squeeze tube with metallic flip-top cap. Enriched with walnut shell micro-granules, aloe vera extract, and shea butter. Gently sloughs off dead skin cells, unclogs pores, and smooths skin texture prior to facial massage and mask steps.",
      specs: {
        "Volume": "200 ml / 6.76 fl. oz.",
        "Packaging": "Flexible Squeeze Tube with Metallic Flip Cap",
        "Exfoliant": "Natural Biodegradable Micro-Granules",
        "Nourishing Ingredients": "Aloe Vera Extract & Shea Butter Base",
        "Usage": "Step 2 Exfoliating Scrub in Salon Facials"
      },
      images: [scrubImg],
      isActive: true,
      categoryId: skinCat.id,
      variants: {
        create: {
          sku: "SGT-SKIN-EXFOLIATING-SCRUB-CREAM-200ML-PACK",
          name: "200ml Tube Pack",
          price: 650,
          salePrice: 450,
          inventory: { create: { stock: 150 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 5, pricePerUnit: 450 },
              { minQty: 6, maxQty: 11, pricePerUnit: 390 },
              { minQty: 12, maxQty: null, pricePerUnit: 340 }
            ]
          }
        }
      }
    }
  });

  // Add 4 approved B2B reviews per product if none exist
  const reviewGroups = [
    {
      id: trolleyProd.id,
      reviews: [
        { name: "Rahul Deshmukh", business: "Rahul Hair & Barber Lounge", city: "Nagpur", rating: 5, comment: "Super sturdy stainless steel frame! The wheels roll smoothly across tile floors and locking brakes work well." },
        { name: "Suman Lata", business: "Suman Beauty Care", city: "Indore", rating: 5, comment: "The 3 deep trays hold all our facial bowls, towels, and wax pots easily. Very clean professional design." },
        { name: "Deepak Chawla", business: "Chawla Unisex Salon", city: "Delhi", rating: 5, comment: "Great wholesale pricing for 5 units. Side dryer ring is a very thoughtful addition." },
        { name: "Nisha Varma", business: "Nisha Spa Studio", city: "Bhopal", rating: 5, comment: "Rust-proof stainless steel cart that wipes down easily between clients." }
      ]
    },
    {
      id: facialSteamerProd.id,
      reviews: [
        { name: "Pooja Hegde", business: "Pooja Skin Clinic", city: "Bengaluru", rating: 5, comment: "Continuous dense warm steam output. The 360-degree rotating arm makes positioning over facial bed effortless." },
        { name: "Kunal Mehra", business: "Mehra Wellness Salon", city: "Faridabad", rating: 5, comment: "The UV ozone antibacterial mode gives client complete confidence. Glass jar is thick and heavy-duty." },
        { name: "Anusuya Ray", business: "Ray Beauty Lounge", city: "Kolkata", rating: 5, comment: "Auto low-water shutoff sensor works perfectly. Highly recommended stand steamer!" },
        { name: "Tushar Merchant", business: "Glow & Tone Studio", city: "Surat", rating: 5, comment: "Stable 5-star base and smooth height adjustment." }
      ]
    },
    {
      id: hairSteamerProd.id,
      reviews: [
        { name: "Gita Patel", business: "Gita Hair Spa", city: "Ahmedabad", rating: 5, comment: "Transformed our hair spa services! Deep oil conditioning treatments absorb 2x faster with this hood steamer." },
        { name: "Manish Solanki", business: "Solanki Cutz Studio", city: "Rajkot", rating: 5, comment: "Clear transparent hood dome allows clients to look through easily. Solid timer dial and high steam output." },
        { name: "Ritu Mathur", business: "Ritu Beauty Parlour", city: "Varanasi", rating: 5, comment: "Water catch cup handles condensation nicely. Sturdy base wheels." },
        { name: "Arjun Rampal", business: "Arjun Hair Art", city: "Dehradun", rating: 5, comment: "Best hair steamer hood at this price point. Easy to assemble and operation is silent." }
      ]
    },
    {
      id: serumProd.id,
      reviews: [
        { name: "Shruti Kulkarni", business: "Shruti Aesthetic Clinic", city: "Pune", rating: 5, comment: "Our clients love the instant glass-skin glow! 5% Niacinamide and Hyaluronic Acid leave skin deeply hydrated." },
        { name: "Divya Shah", business: "Divya Beauty Lounge", city: "Mumbai", rating: 5, comment: "Heavy frosted glass bottle looks very high-end on our treatment trolley. Non-sticky formula." },
        { name: "Rajeshwari Nair", business: "Nair Skin Spa", city: "Thiruvananthapuram", rating: 5, comment: "Smooth pump dispenser and fast absorption. Great wholesale bulk price." },
        { name: "Karan Johar", business: "Karan Glamour Salon", city: "Chandigarh", rating: 5, comment: "Perfect finishing serum after hydra-facial treatments." }
      ]
    },
    {
      id: scrubProd.id,
      reviews: [
        { name: "Preeti Kashyap", business: "Preeti Beauty Care", city: "Kanpur", rating: 5, comment: "Gentle natural walnut micro-granules exfoliate dead skin without causing redness. Smells refreshing!" },
        { name: "Madhavi Rao", business: "Madhavi Herbal Salon", city: "Vijayawada", rating: 5, comment: "200ml tube is very economical for salon facial packages. Cleanses pores deeply." },
        { name: "Sunita Reddy", business: "Sunita Spa Center", city: "Hyderabad", rating: 5, comment: "Metallic flip cap prevents leakage and keeps scrub fresh. Aloe vera base keeps skin hydrated." },
        { name: "Tarun Gill", business: "Gill Grooming Studio", city: "Amritsar", rating: 5, comment: "Smooth texture with fine scrubbing granules. Excellent B2B quality!" }
      ]
    }
  ];

  for (const item of reviewGroups) {
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

  console.log("\n✅ All 5 new studio products & 20 B2B customer reviews created & updated successfully!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

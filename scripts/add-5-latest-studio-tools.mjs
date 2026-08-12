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

  const flatIronImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786521941927.png",
    "shree-gopi-traders/products/barber-supplies",
    "professional-titanium-ceramic-hair-straightener-flat-iron"
  );
  console.log("✅ Flat Iron Image:", flatIronImg);

  const dryerImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786521949094.png",
    "shree-gopi-traders/products/barber-supplies",
    "high-speed-ac-motor-ionic-hair-dryer-grey"
  );
  console.log("✅ Hair Dryer Image:", dryerImg);

  const tabletopSteamerImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786521957006.png",
    "shree-gopi-traders/products/professional-equipment",
    "tabletop-compact-facial-ozone-steamer-flex-arm"
  );
  console.log("✅ Tabletop Steamer Image:", tabletopSteamerImg);

  const rebondingImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786521964930.png",
    "shree-gopi-traders/products/hair-color-treatment",
    "pro-genesis-hair-rebonding-cream-step-1-1000ml"
  );
  console.log("✅ Rebonding Cream Image:", rebondingImg);

  const permingLotionImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786521973984.png",
    "shree-gopi-traders/products/hair-color-treatment",
    "professional-hair-perming-lotion-wave-activator-800ml"
  );
  console.log("✅ Perming Lotion Image:", permingLotionImg);

  const barberCat = await prisma.category.findUnique({ where: { slug: "barber-supplies" } });
  const equipCat = await prisma.category.findUnique({ where: { slug: "professional-equipment" } });
  const hctCat = await prisma.category.findUnique({ where: { slug: "hair-color-treatment" } });

  // 1. Titanium Ceramic Flat Iron
  console.log("\nUpserting Professional Titanium Ceramic Hair Straightener Flat Iron...");
  const flatIronProd = await prisma.product.upsert({
    where: { sku: "SGT-BRB-TITANIUM-FLAT-IRON-365F" },
    update: {
      name: "Professional Titanium Ceramic Hair Straightener Flat Iron with Digital LCD",
      brand: "Salon Pro Series",
      basePrice: 2850,
      moq: 1,
      images: [flatIronImg],
      description: "Commercial salon hair straightener featuring 1-inch floating titanium ceramic heating plates, digital LCD screen display (up to 450°F / 230°C), 30-second rapid PTC heating, and 360-degree tangle-free swivel cord. Ideal for keratin smoothing treatments, rebonding, and daily hair straightening.",
      specs: {
        "Plates": "1-Inch Floating Titanium Ceramic Coated Plates",
        "Temperature": "Adjustable 250°F to 450°F with Digital LCD Display",
        "Heating": "Rapid PTC Heater (Reaches Max Temp in 30 Sec)",
        "Cord": "2.8 Meter Heavy-Duty 360° Swivel Power Cord"
      },
      isActive: true,
      categoryId: barberCat.id,
    },
    create: {
      sku: "SGT-BRB-TITANIUM-FLAT-IRON-365F",
      name: "Professional Titanium Ceramic Hair Straightener Flat Iron with Digital LCD",
      slug: "professional-titanium-ceramic-hair-straightener-flat-iron-with-digital-lcd",
      brand: "Salon Pro Series",
      basePrice: 2850,
      moq: 1,
      description: "Commercial salon hair straightener featuring 1-inch floating titanium ceramic heating plates, digital LCD screen display (up to 450°F / 230°C), 30-second rapid PTC heating, and 360-degree tangle-free swivel cord. Ideal for keratin smoothing treatments, rebonding, and daily hair straightening.",
      specs: {
        "Plates": "1-Inch Floating Titanium Ceramic Coated Plates",
        "Temperature": "Adjustable 250°F to 450°F with Digital LCD Display",
        "Heating": "Rapid PTC Heater (Reaches Max Temp in 30 Sec)",
        "Cord": "2.8 Meter Heavy-Duty 360° Swivel Power Cord"
      },
      images: [flatIronImg],
      isActive: true,
      categoryId: barberCat.id,
      variants: {
        create: {
          sku: "SGT-BRB-TITANIUM-FLAT-IRON-365F-STD",
          name: "Titanium Flat Iron",
          price: 3600,
          salePrice: 2850,
          inventory: { create: { stock: 65 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 3, pricePerUnit: 2850 },
              { minQty: 4, maxQty: 9, pricePerUnit: 2450 },
              { minQty: 10, maxQty: null, pricePerUnit: 2100 }
            ]
          }
        }
      }
    }
  });

  // 2. High-Speed AC Motor Ionic Blow Dryer
  console.log("Upserting High-Speed AC Motor Ionic Blow Dryer...");
  const dryerProd = await prisma.product.upsert({
    where: { sku: "SGT-BRB-IONIC-BLOW-DRYER-GREY" },
    update: {
      name: "Professional High-Speed AC Motor Ionic Hair Blow Dryer Grey",
      brand: "Salon Pro Series",
      basePrice: 2450,
      moq: 1,
      images: [dryerImg],
      description: "Professional 2200W high-speed AC motor hair blow dryer in matte charcoal grey. Features negative ion tourmaline conditioning technology to lock in moisture, 2 speed settings, 3 heat control switches, cold shot button, and removable narrow concentrator nozzle attachment.",
      specs: {
        "Motor": "2200W Heavy-Duty Long-Life AC Motor",
        "Technology": "Negative Ion Generator & Tourmaline Ceramic",
        "Controls": "2 Speed & 3 Heat Settings + Cool Shot Button",
        "Attachments": "Professional Concentrator Air Nozzle"
      },
      isActive: true,
      categoryId: barberCat.id,
    },
    create: {
      sku: "SGT-BRB-IONIC-BLOW-DRYER-GREY",
      name: "Professional High-Speed AC Motor Ionic Hair Blow Dryer Grey",
      slug: "professional-high-speed-ac-motor-ionic-hair-blow-dryer-grey",
      brand: "Salon Pro Series",
      basePrice: 2450,
      moq: 1,
      description: "Professional 2200W high-speed AC motor hair blow dryer in matte charcoal grey. Features negative ion tourmaline conditioning technology to lock in moisture, 2 speed settings, 3 heat control switches, cold shot button, and removable narrow concentrator nozzle attachment.",
      specs: {
        "Motor": "2200W Heavy-Duty Long-Life AC Motor",
        "Technology": "Negative Ion Generator & Tourmaline Ceramic",
        "Controls": "2 Speed & 3 Heat Settings + Cool Shot Button",
        "Attachments": "Professional Concentrator Air Nozzle"
      },
      images: [dryerImg],
      isActive: true,
      categoryId: barberCat.id,
      variants: {
        create: {
          sku: "SGT-BRB-IONIC-BLOW-DRYER-GREY-STD",
          name: "2200W Ionic Dryer",
          price: 3200,
          salePrice: 2450,
          inventory: { create: { stock: 70 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 3, pricePerUnit: 2450 },
              { minQty: 4, maxQty: 9, pricePerUnit: 2150 },
              { minQty: 10, maxQty: null, pricePerUnit: 1850 }
            ]
          }
        }
      }
    }
  });

  // 3. Tabletop Compact Facial Ozone Steamer
  console.log("Upserting Tabletop Compact Facial Ozone Steamer...");
  const tabletopSteamerProd = await prisma.product.upsert({
    where: { sku: "SGT-EQ-TABLETOP-FACIAL-OZONE-STEAMER" },
    update: {
      name: "Tabletop Compact Facial Ozone Steamer Machine with Flexible Arm",
      brand: "Professional Series",
      basePrice: 2950,
      moq: 1,
      images: [tabletopSteamerImg],
      description: "Compact desktop facial ozone steamer designed for aesthetic salons and spa treatment rooms. Equipped with a flexible goose-neck extension arm, thermal glass water cup, independent steam and UV ozone sterilizing switches, and auto safety shutoff.",
      specs: { "Design": "Compact Countertop / Tabletop Base", "Arm": "360-Degree Flexible Goose-Neck Arm", "Sanitization": "Independent UV Ozone Germicidal Lamp", "Capacity": "500 ml Heat-Resistant Glass Jar" },
      isActive: true,
      categoryId: equipCat.id,
    },
    create: {
      sku: "SGT-EQ-TABLETOP-FACIAL-OZONE-STEAMER",
      name: "Tabletop Compact Facial Ozone Steamer Machine with Flexible Arm",
      slug: "tabletop-compact-facial-ozone-steamer-machine-with-flexible-arm",
      brand: "Professional Series",
      basePrice: 2950,
      moq: 1,
      description: "Compact desktop facial ozone steamer designed for aesthetic salons and spa treatment rooms. Equipped with a flexible goose-neck extension arm, thermal glass water cup, independent steam and UV ozone sterilizing switches, and auto safety shutoff.",
      specs: { "Design": "Compact Countertop / Tabletop Base", "Arm": "360-Degree Flexible Goose-Neck Arm", "Sanitization": "Independent UV Ozone Germicidal Lamp", "Capacity": "500 ml Heat-Resistant Glass Jar" },
      images: [tabletopSteamerImg],
      isActive: true,
      categoryId: equipCat.id,
      variants: {
        create: {
          sku: "SGT-EQ-TABLETOP-FACIAL-OZONE-STEAMER-STD",
          name: "Tabletop Steamer Machine",
          price: 3800,
          salePrice: 2950,
          inventory: { create: { stock: 50 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 3, pricePerUnit: 2950 },
              { minQty: 4, maxQty: 9, pricePerUnit: 2550 },
              { minQty: 10, maxQty: null, pricePerUnit: 2200 }
            ]
          }
        }
      }
    }
  });

  // 4. Pro-Genesis Hair Rebonding Cream Step 1
  console.log("Upserting Pro-Genesis Hair Rebonding Cream Step 1...");
  const rebondingProd = await prisma.product.upsert({
    where: { sku: "SGT-HCT-PRO-GENESIS-REBONDING-CREAM-1000ML" },
    update: {
      name: "Pro-Genesis Professional Hair Rebonding Straightening Cream Step 1 (1000ml)",
      brand: "Pro-Genesis Salon Solutions",
      basePrice: 1250,
      moq: 1,
      images: [rebondingImg],
      description: "Professional permanent hair straightening and restructuring cream Step 1 packaged in a 1000ml jar. Formulated with Advanced Keramide Complex to break disulfide bonds cleanly while preserving cortex moisture during hair rebonding services.",
      specs: { "Volume": "1000 ml / 33.8 fl. oz.", "Step": "Step 1 Intense Straightening Cream", "Technology": "Advanced Keramide Complex", "Target": "Coarse, Curly & Wavy Resistant Hair" },
      isActive: true,
      categoryId: hctCat.id,
    },
    create: {
      sku: "SGT-HCT-PRO-GENESIS-REBONDING-CREAM-1000ML",
      name: "Pro-Genesis Professional Hair Rebonding Straightening Cream Step 1 (1000ml)",
      slug: "pro-genesis-professional-hair-rebonding-straightening-cream-step-1-1000ml",
      brand: "Pro-Genesis Salon Solutions",
      basePrice: 1250,
      moq: 1,
      description: "Professional permanent hair straightening and restructuring cream Step 1 packaged in a 1000ml jar. Formulated with Advanced Keramide Complex to break disulfide bonds cleanly while preserving cortex moisture during hair rebonding services.",
      specs: { "Volume": "1000 ml / 33.8 fl. oz.", "Step": "Step 1 Intense Straightening Cream", "Technology": "Advanced Keramide Complex", "Target": "Coarse, Curly & Wavy Resistant Hair" },
      images: [rebondingImg],
      isActive: true,
      categoryId: hctCat.id,
      variants: {
        create: {
          sku: "SGT-HCT-PRO-GENESIS-REBONDING-CREAM-1000ML-STD",
          name: "1000ml Jar Step 1",
          price: 1650,
          salePrice: 1250,
          inventory: { create: { stock: 90 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 5, pricePerUnit: 1250 },
              { minQty: 6, maxQty: 11, pricePerUnit: 1080 },
              { minQty: 12, maxQty: null, pricePerUnit: 920 }
            ]
          }
        }
      }
    }
  });

  // 5. Professional Hair Perming Lotion Wave Activator
  console.log("Upserting Professional Hair Perming Lotion Wave Activator...");
  const permingProd = await prisma.product.upsert({
    where: { sku: "SGT-HCT-HAIR-PERMING-LOTION-800ML" },
    update: {
      name: "Professional Hair Perming Lotion Wave Activator Formula (800ml)",
      brand: "Salon Pro Series",
      basePrice: 850,
      moq: 1,
      images: [permingLotionImg],
      description: "Saloon-exclusive wave activator perming lotion packaged in an 800ml amber bottle. Formulated for long-lasting elastic curls, bouncy waves, and root volume boost in hair perm treatments.",
      specs: { "Volume": "800 ml / 16.9 fl. oz.", "Formula": "Wave Activator & Curl Locking Complex", "Effect": "Long-Lasting Bouncy Curls & Volume" },
      isActive: true,
      categoryId: hctCat.id,
    },
    create: {
      sku: "SGT-HCT-HAIR-PERMING-LOTION-800ML",
      name: "Professional Hair Perming Lotion Wave Activator Formula (800ml)",
      slug: "professional-hair-perming-lotion-wave-activator-formula-800ml",
      brand: "Salon Pro Series",
      basePrice: 850,
      moq: 1,
      description: "Saloon-exclusive wave activator perming lotion packaged in an 800ml amber bottle. Formulated for long-lasting elastic curls, bouncy waves, and root volume boost in hair perm treatments.",
      specs: { "Volume": "800 ml / 16.9 fl. oz.", "Formula": "Wave Activator & Curl Locking Complex", "Effect": "Long-Lasting Bouncy Curls & Volume" },
      images: [permingLotionImg],
      isActive: true,
      categoryId: hctCat.id,
      variants: {
        create: {
          sku: "SGT-HCT-HAIR-PERMING-LOTION-800ML-STD",
          name: "800ml Amber Bottle",
          price: 1150,
          salePrice: 850,
          inventory: { create: { stock: 80 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 5, pricePerUnit: 850 },
              { minQty: 6, maxQty: 11, pricePerUnit: 730 },
              { minQty: 12, maxQty: null, pricePerUnit: 620 }
            ]
          }
        }
      }
    }
  });

  let counter = Date.now();

  const reviewsToAdd = [
    {
      productId: flatIronProd.id,
      items: [
        { name: "Rahul Saxena", business: "Saxena Hair Lounge", city: "Delhi", comment: "Titanium plates heat up to 450F in seconds. Essential for our keratin treatments!" },
        { name: "Deepika Padukone", business: "Deepika Style Studio", city: "Mumbai", comment: "Glides through hair smoothly without snagging. LCD temperature display is accurate." },
        { name: "Vikram Rathore", business: "Rathore Salon", city: "Jaipur", comment: "Long swivel cord gives great reach around client chair." },
        { name: "Suman Joshi", business: "Joshi Parlour", city: "Surat", comment: "Top quality professional straightener." }
      ]
    },
    {
      productId: dryerProd.id,
      items: [
        { name: "Kunal Merchant", business: "Merchant Fades", city: "Bengaluru", comment: "Powerful 2200W airflow dries thick hair in half the time. Cool shot button locks styles instantly." },
        { name: "Farah Ali", business: "Farah Hair Spa", city: "Hyderabad", comment: "Matte grey finish looks ultra modern and stylish." },
        { name: "Rohan Deshmukh", business: "Deshmukh Cutz", city: "Pune", comment: "Quiet AC motor and solid grip." },
        { name: "Meenakshi Sundaram", business: "Sundaram Salon", city: "Chennai", comment: "Great wholesale rate for 5 units." }
      ]
    },
    {
      productId: tabletopSteamerProd.id,
      items: [
        { name: "Anjali Gupta", business: "Anjali Beauty Care", city: "Noida", comment: "Compact design saves desktop space. The flexible goose-neck arm adjusts easily over facial bed." },
        { name: "Pooja Varma", business: "Pooja Aesthetic Clinic", city: "Lucknow", comment: "Dense warm steam output with ozone purification." },
        { name: "Siddharth Sen", business: "Sen Unisex Salon", city: "Kolkata", comment: "Thick glass jar and simple operation switches." },
        { name: "Reena Patel", business: "Reena Parlour", city: "Ahmedabad", rating: 5, comment: "High client satisfaction for mini facials." }
      ]
    },
    {
      productId: rebondingProd.id,
      items: [
        { name: "Gita Sharma", business: "Gita Straightening Studio", city: "Chandigarh", rating: 5, comment: "Delivers sleek pin-straight rebonding results without drying hair ends. 1000ml jar is very economical." },
        { name: "Ashok Verma", business: "Verma Hair Care", city: "Patna", rating: 5, comment: "Professional strength Keramide complex works on thick Indian hair textures." },
        { name: "Nisha Kapoor", business: "Nisha Glam Lounge", city: "Bhopal", rating: 5, comment: "Clean formula with consistent processing time." },
        { name: "Tushar Sethi", business: "Sethi Salon", city: "Ludhiana", rating: 5, comment: "Must-have rebonding cream for chemical treatments." }
      ]
    },
    {
      productId: permingProd.id,
      items: [
        { name: "Sunil Nair", business: "Nair Hair Art", city: "Kochi", rating: 5, comment: "Creates springy, elastic curls that last for months. Smells pleasant compared to cheap perms." },
        { name: "Madhuri Rao", business: "Madhuri Beauty Care", city: "Indore", rating: 5, comment: "800ml amber bottle stays fresh. Great wave activation!" },
        { name: "Ketan Shah", business: "Shah Salon", city: "Rajkot", rating: 5, comment: "Consistent curl formation every time." },
        { name: "Preeti Gill", business: "Gill Hair Studio", city: "Amritsar", rating: 5, comment: "Excellent B2B pricing." }
      ]
    }
  ];

  for (const grp of reviewsToAdd) {
    const rCount = await prisma.review.count({ where: { productId: grp.productId } });
    if (rCount === 0) {
      for (const r of grp.items) {
        counter++;
        const customer = await prisma.customer.create({
          data: {
            name: r.name,
            email: `${r.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.${counter}@b2bsalon.example.com`,
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
            productId: grp.productId,
            customerId: customer.id,
            rating: 5,
            comment: r.comment,
            status: ReviewStatus.APPROVED,
          }
        });
      }
    }
  }

  const activeCount = await prisma.product.count({ where: { isActive: true } });
  const reviewCount = await prisma.review.count();

  console.log(`\n✅ 5 LATEST STUDIO PRODUCTS ADDED SUCCESSFULLY!`);
  console.log(`📊 Total Active Products: ${activeCount}`);
  console.log(`⭐ Total Reviews Count: ${reviewCount}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

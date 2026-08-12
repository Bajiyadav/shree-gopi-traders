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
  console.log("=== UPLOADING NEW STUDIO IMAGES TO CLOUDINARY ===");

  const maskStudioImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786521368522.png",
    "shree-gopi-traders/products/hair-care",
    "intensive-repair-hair-spa-treatment-cream-500g-jar"
  );
  console.log("✅ Hair Spa Mask Image:", maskStudioImg);

  const conditionerStudioImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786521377536.png",
    "shree-gopi-traders/products/hair-care",
    "intensive-hydrating-conditioner-1000ml-pump-bottle"
  );
  console.log("✅ Hydrating Conditioner Image:", conditionerStudioImg);

  const newProducts = [
    // 1. Hair Care - Keratin Serum
    {
      sku: "SGT-HC-KERATIN-SERUM-100ML",
      name: "Professional Keratin Smooth Hair Treatment Serum (100ml)",
      slug: "professional-keratin-smooth-hair-treatment-serum-100ml",
      brand: "Hair Care Series",
      categorySlug: "hair-care",
      basePrice: 450,
      regularPrice: 580,
      moq: 1,
      stock: 100,
      images: ["https://images.unsplash.com/photo-1608248597263-00079e965306?w=800&auto=format&fit=crop&q=80"],
      description: "Enriched with hydrolysed keratin protein and argan oil. Controls frizz, seals split ends, and adds high gloss shine without weighing hair down. Ideal for post-smoothing and color maintenance in professional salons.",
      specs: { "Volume": "100 ml", "Key Ingredient": "Hydrolysed Keratin & Argan Oil", "Hair Type": "Frizzy, Chemically Treated", "Finish": "Non-Greasy High Shine" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 450 },
        { minQty: 6, maxQty: 11, pricePerUnit: 390 },
        { minQty: 12, maxQty: null, pricePerUnit: 330 }
      ],
      reviews: [
        { name: "Pooja Sharma", business: "Pooja Hair Studio", city: "Mumbai", rating: 5, comment: "Clients love how silky their hair feels right after styling. Great retail item as well!" },
        { name: "Vikram Rathi", business: "Rathi Salon", city: "Delhi", rating: 5, comment: "Instant frizz control. Doesn’t leave any greasy buildup." },
        { name: "Sneha Nair", business: "Glow & Style Studio", city: "Kochi", rating: 5, comment: "Awesome wholesale discount for 12+ bottles." },
        { name: "Karan Johar", business: "Karan Hair Lounge", city: "Jaipur", rating: 5, comment: "High quality serum, smells subtle and premium." }
      ]
    },
    // 2. Hair Care - Argan Hair Spa Treatment Cream 500g
    {
      sku: "SGT-HC-ARGAN-REPAIR-MASK-500G",
      name: "Professional Intensive Repair Hair Spa Treatment Cream (500g Jar)",
      slug: "professional-intensive-repair-hair-spa-treatment-cream-500g-jar",
      brand: "Professional Series",
      categorySlug: "hair-care",
      basePrice: 690,
      regularPrice: 850,
      moq: 1,
      stock: 85,
      images: [maskStudioImg],
      description: "Salon-exclusive intensive repair hair spa treatment cream packaged in a 500g frosted amber jar. Formulated with pure Argan Oil, Shea Butter, and Biotin. Deeply revitalizes over-processed, chemically colored, and heat-damaged hair fibers.",
      specs: { "Weight": "500 g / 16.9 fl. oz.", "Container": "Heavy Amber Jar with Black Twist Lid", "Active Ingredients": "Argan Oil, Shea Butter & Biotin", "Formulation": "Deep Conditioning Revitalizing Cream" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 690 },
        { minQty: 6, maxQty: 11, pricePerUnit: 590 },
        { minQty: 12, maxQty: null, pricePerUnit: 490 }
      ],
      reviews: [
        { name: "Ananya Roy", business: "Ananya Beauty Spa", city: "Kolkata", rating: 5, comment: "Essential for our hair spa services. Deeply nourishes rough damaged hair under steamer." },
        { name: "Ramesh Gupta", business: "Gupta Hair Care", city: "Lucknow", rating: 5, comment: "The 500g tub lasts for multiple spa treatments. High client satisfaction." },
        { name: "Meera Sen", business: "Sensational Cuts", city: "Chandigarh", rating: 5, comment: "Leaves hair manageable, silky, and super soft." },
        { name: "Amitabh Shah", business: "Shah Unisex Salon", city: "Ahmedabad", rating: 5, comment: "Great rich cream texture and soothing aroma." }
      ]
    },
    // 3. Hair Care - Intensive Hydrating Conditioner 1000ml
    {
      sku: "SGT-HC-HYDRATING-CONDITIONER-1000ML",
      name: "Professional Intensive Hydrating Conditioner with Argan Oil (1000ml Pump Bottle)",
      slug: "professional-intensive-hydrating-conditioner-with-argan-oil-1000ml-pump-bottle",
      brand: "Professional Series",
      categorySlug: "hair-care",
      basePrice: 780,
      regularPrice: 950,
      moq: 1,
      stock: 110,
      images: [conditionerStudioImg],
      description: "Saloon-exclusive intensive hydrating hair conditioner packaged in a 1000ml salon pump bottle. Formulated with Argan Oil & Keratin Complex to detangle, smooth cuticle layers, and lock in moisture for all hair types.",
      specs: { "Volume": "1000 ml / 33.8 fl. oz.", "Bottle": "Large Salon Backwash Pump Bottle", "Active Ingredients": "Argan Oil & Keratin Complex", "Hair Type": "Suitable for All Hair Types" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 780 },
        { minQty: 6, maxQty: 11, pricePerUnit: 680 },
        { minQty: 12, maxQty: null, pricePerUnit: 580 }
      ],
      reviews: [
        { name: "Farah Khan", business: "Farah Hair Studio", city: "Mumbai", rating: 5, comment: "Large 1L pump bottle is perfect at our shampoo backwash station!" },
        { name: "Jagdish Patel", business: "Patel Barber Shop", city: "Surat", rating: 5, comment: "Detangles thick coarse hair instantly." },
        { name: "Deepika Sen", business: "Deepika Beauty Lounge", city: "Bengaluru", rating: 5, comment: "Leaves zero greasy residue." },
        { name: "Rajiv Singhania", business: "Singhania Salon", city: "Nagpur", rating: 5, comment: "Awesome wholesale price for 1L conditioner." }
      ]
    },
    // 4. Hair Color & Treatment - Developer 20 Vol
    {
      sku: "SGT-HCT-DEVELOPER-20VOL-1000ML",
      name: "Professional Hair Color Developer Cream 20 Vol / 6% (1000ml)",
      slug: "professional-hair-color-developer-cream-20-vol-1000ml",
      brand: "Salon Pro Series",
      categorySlug: "hair-color-treatment",
      basePrice: 320,
      regularPrice: 420,
      moq: 1,
      stock: 120,
      images: ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80"],
      description: "Stabilized rich oxidizing developer cream 20 Volume (6%). Ensures uniform gray coverage and optimal lift when mixed with professional hair color creams or bleaching powders.",
      specs: { "Volume": "1000 ml", "Concentration": "20 Vol (6% H2O2)", "Consistency": "Rich Creamy Emulsion", "Compatibility": "All Professional Color Brands" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 320 },
        { minQty: 6, maxQty: 11, pricePerUnit: 270 },
        { minQty: 12, maxQty: null, pricePerUnit: 230 }
      ],
      reviews: [
        { name: "Sunil Verma", business: "Verma Color Studio", city: "Delhi", rating: 5, comment: "Consistent 20 vol concentration. Gives rich color penetration and gray coverage." },
        { name: "Priya Das", business: "Priya Unisex Salon", city: "Patna", rating: 5, comment: "Non-drip creamy texture makes mixing color very smooth." },
        { name: "Rajiv Malhotra", business: "Malhotra Hair Art", city: "Amritsar", rating: 5, comment: "Unbeatable wholesale price for 1 Liter bottle." },
        { name: "Swati Joshi", business: "Swati Parlour", city: "Indore", rating: 5, comment: "Always stock up on this developer in our salon." }
      ]
    },
    // 5. Hair Color & Treatment - Bleaching Powder
    {
      sku: "SGT-HCT-BLEACH-POWDER-500G",
      name: "High-Lift Dust-Free Bleaching Powder White (500g)",
      slug: "high-lift-dust-free-bleaching-powder-white-500g",
      brand: "Salon Pro Series",
      categorySlug: "hair-color-treatment",
      basePrice: 780,
      regularPrice: 980,
      moq: 1,
      stock: 90,
      images: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80"],
      description: "Dust-free high lift lightening powder capable of lifting up to 7-8 levels while preserving hair fiber integrity. Formulated with anti-yellow pigments for clean balayage and highlights.",
      specs: { "Weight": "500 g Tub", "Lift Level": "Up to 8 Levels", "Formula": "Dust-Free White Powder", "Protection": "Conditioning Anti-Breakage Polymer" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 780 },
        { minQty: 6, maxQty: 11, pricePerUnit: 680 },
        { minQty: 12, maxQty: null, pricePerUnit: 580 }
      ],
      reviews: [
        { name: "Kavita Sethi", business: "Kavita Hair & Beauty", city: "Pune", rating: 5, comment: "Lifts rapidly to level 9 without damaging client hair. Minimal swelling." },
        { name: "Gaurav Bajaj", business: "Bajaj Salon Studio", city: "Ludhiana", rating: 5, comment: "Dust-free powder is great for salon air quality." },
        { name: "Nandini Patel", business: "Nandini Glamour", city: "Vadodara", rating: 5, comment: "Mixes evenly with 20 and 30 vol developers." },
        { name: "Rohit Khanna", business: "Khanna Cutz", city: "Noida", rating: 5, comment: "Top tier lightener!" }
      ]
    },
    // 6. Makeup - Setting Powder
    {
      sku: "SGT-MKP-TRANSLUCENT-SETTING-POWDER",
      name: "Professional Translucent HD Loose Setting Powder (50g)",
      slug: "professional-translucent-hd-loose-setting-powder-50g",
      brand: "Pro Makeup Series",
      categorySlug: "makeup",
      basePrice: 490,
      regularPrice: 650,
      moq: 1,
      stock: 110,
      images: ["https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&auto=format&fit=crop&q=80"],
      description: "Micro-milled translucent loose powder that sets makeup for up to 16 hours. Blurs fine lines and pores with zero flashback in HD photography and video lighting.",
      specs: { "Weight": "50 g Jar", "Shade": "Universal Translucent", "Finish": "Soft Matte Blur", "Feature": "Zero Flashback, Oil-Control" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 490 },
        { minQty: 6, maxQty: 11, pricePerUnit: 420 },
        { minQty: 12, maxQty: null, pricePerUnit: 360 }
      ],
      reviews: [
        { name: "Radhika Merchant", business: "Radhika Bridal Makeup", city: "Mumbai", rating: 5, comment: "A must-have in every bridal kit! Locks in foundation all day without flashback." },
        { name: "Siddharth Rao", business: "Rao Studio Makeup", city: "Hyderabad", rating: 5, comment: "Super finely milled texture. Blurs pores instantly." },
        { name: "Bhavna Patel", business: "Bhavna Beauty Art", city: "Surat", rating: 5, comment: "Affordable wholesale pricing for bridal academies." },
        { name: "Reena Kaur", business: "Kaur Makeup Lounge", city: "Jalandhar", rating: 5, comment: "Controls oil shine under studio lights." }
      ]
    },
    // 7. Makeup - Liquid Foundation
    {
      sku: "SGT-MKP-FLUID-FOUNDATION-30ML",
      name: "Ultra HD Liquid Foundation Glass Bottle with Pump (30ml)",
      slug: "ultra-hd-liquid-foundation-glass-bottle-with-pump-30ml",
      brand: "Pro Makeup Series",
      categorySlug: "makeup",
      basePrice: 720,
      regularPrice: 890,
      moq: 1,
      stock: 95,
      images: ["https://images.unsplash.com/photo-1599733589046-10c005739ef9?w=800&auto=format&fit=crop&q=80"],
      description: "Full coverage water-resistant fluid foundation packaged in a 30ml glass pump bottle. Formulated with hyaluronic acid for weightless, natural skin-like finish.",
      specs: { "Volume": "30 ml Glass Bottle", "Coverage": "Medium-to-Full Buildable", "Finish": "Natural Satin Glow", "Longevity": "24-Hour Sweatproof" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 720 },
        { minQty: 6, maxQty: 11, pricePerUnit: 620 },
        { minQty: 12, maxQty: null, pricePerUnit: 520 }
      ],
      reviews: [
        { name: "Tanuja Saxena", business: "Tanuja Makeovers", city: "Lucknow", rating: 5, comment: "Blends seamlessly into skin. Looks incredible in HD photography!" },
        { name: "Manit Kapoor", business: "Kapoor Glam Studio", city: "Delhi", rating: 5, comment: "Glass pump packaging feels premium. High client satisfaction." },
        { name: "Geeta Sen", business: "Geeta Beauty Academy", city: "Kolkata", rating: 5, comment: "Does not crease or settle into lines." },
        { name: "Varun Nair", business: "Nair Makeover Studio", city: "Chennai", rating: 5, comment: "Great color range and buildable coverage." }
      ]
    },
    // 8. Salon Furniture - Barber Chair Brown
    {
      sku: "SGT-FUR-RECLINING-BARBER-CHAIR-BROWN",
      name: "Luxury Heavy-Duty Reclining Barber Chair Dark Brown Leather",
      slug: "luxury-heavy-duty-reclining-barber-chair-dark-brown-leather",
      brand: "Salon Furniture Series",
      categorySlug: "salon-furniture",
      basePrice: 24200,
      regularPrice: 28500,
      moq: 1,
      stock: 15,
      images: ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80"],
      description: "Vintage-styled heavy duty barber chair upholstered in waterproof dark brown PU leather. Features 360-degree rotation, hydraulic pump height adjustment, 150-degree reclining backrest, and padded footrest.",
      specs: { "Upholstery": "Premium Dark Brown PU Leather", "Base": "Heavy Chrome Circular Hydraulic Base", "Recline": "150-Degree Gas Spring Recline", "Capacity": "Up to 250 kg" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 2, pricePerUnit: 24200 },
        { minQty: 3, maxQty: 5, pricePerUnit: 21500 },
        { minQty: 6, maxQty: null, pricePerUnit: 19200 }
      ],
      reviews: [
        { name: "Jasprit Singh", business: "Singh Barber Lounge", city: "Chandigarh", rating: 5, comment: "Extremely comfortable chair! Hydraulic pump is smooth and recline mechanism works effortlessly." },
        { name: "Alok Kumar", business: "Royal Gents Parlour", city: "Patna", rating: 5, comment: "Gives our barbershop a premium vintage feel. Customers love it!" },
        { name: "Firoz Khan", business: "Khan Barber Art", city: "Mumbai", rating: 5, comment: "Heavy chrome base prevents tipping during shaves." },
        { name: "Santosh Yadav", business: "Yadav Hair Salon", city: "Varanasi", rating: 5, comment: "Solid construction and easy to clean leather." }
      ]
    },
    // 9. Salon Furniture - Rolling Tool Cart
    {
      sku: "SGT-FUR-ROLLING-TOOL-CART-BLACK",
      name: "Professional 4-Drawer Locking Salon Storage Trolley Cart Black",
      slug: "professional-4-drawer-locking-salon-storage-trolley-cart-black",
      brand: "Salon Furniture Series",
      categorySlug: "salon-furniture",
      basePrice: 3950,
      regularPrice: 4800,
      moq: 1,
      stock: 45,
      images: ["https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80"],
      description: "Multi-functional salon trolley cart with 4 sliding drawers, side appliance holders, lockable top tray, and heavy-duty caster wheels. Keeps all tools, clippers, and color bowls secure and organized.",
      specs: { "Drawers": "4 Slide-Out Drawers with Top Lock", "Holders": "Dual Side Appliance Holders for Hair Dryers & Irons", "Wheels": "Anti-Hair Wrap Caster Wheels", "Color": "Matte Black ABS Body" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 3, pricePerUnit: 3950 },
        { minQty: 4, maxQty: 9, pricePerUnit: 3450 },
        { minQty: 10, maxQty: null, pricePerUnit: 2980 }
      ],
      reviews: [
        { name: "Deepak Sharma", business: "Sharma Salon Equipment", city: "Delhi", rating: 5, comment: "Lockable top drawer is great for security. Smooth rolling wheels." },
        { name: "Seema Rani", business: "Seema Beauty Hub", city: "Hisar", rating: 5, comment: "Spacious 4 drawers hold all our curling irons, brushes, and tint bowls easily." },
        { name: "Nitin Gadkari", business: "Gadkari Hair Care", city: "Nagpur", rating: 5, comment: "Sturdy matte black finish." },
        { name: "Rina Das", business: "Rina Style Studio", city: "Guwahati", rating: 5, comment: "Very useful salon organizer!" }
      ]
    },
    // 10. Professional Equipment - Ring Light
    {
      sku: "SGT-EQ-RING-LIGHT-18INCH-KIT",
      name: "18-Inch Dimmable LED Ring Light Stand Kit with Smartphone Holder",
      slug: "18-inch-dimmable-led-ring-light-stand-kit-with-smartphone-holder",
      brand: "Professional Series",
      categorySlug: "professional-equipment",
      basePrice: 2950,
      regularPrice: 3800,
      moq: 1,
      stock: 60,
      images: ["https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&auto=format&fit=crop&q=80"],
      description: "High-luminance 18-inch bi-color LED ring light with adjustable color temperature (3200K - 5600K) and stepless dimming dial. Includes 2-meter extendable tripod stand, flexible phone mount, and wireless remote control for salon photography.",
      specs: { "Diameter": "18 Inch / 48 cm Ring", "Color Temp": "3200K - 5600K Bi-Color Dial", "Stand": "6.5 Feet Aluminum Light Stand", "Accessories": "Phone Holder + Bluetooth Shutter Remote" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 3, pricePerUnit: 2950 },
        { minQty: 4, maxQty: 9, pricePerUnit: 2550 },
        { minQty: 10, maxQty: null, pricePerUnit: 2190 }
      ],
      reviews: [
        { name: "Priyanka Roy", business: "Priyanka Glam Studio", city: "Kolkata", rating: 5, comment: "Perfect lighting for social media client before-and-after photos! Super bright and dimmable." },
        { name: "Aakash Mehta", business: "Mehta Academy", city: "Surat", rating: 5, comment: "Sturdy stand and clean white light." },
        { name: "Smita Deshmukh", business: "Smita Makeup Art", city: "Nashik", rating: 5, comment: "Remote control makes taking client reels effortless." },
        { name: "Harsh Vardhan", business: "Vardhan Salon", city: "Jaipur", rating: 5, comment: "Great wholesale deal." }
      ]
    },
    // 11. Professional Equipment - Towel Warmer
    {
      sku: "SGT-EQ-TOWEL-WARMER-STERILIZER-18L",
      name: "Commercial Hot Towel Warmer Cabinet & UV Sterilizer 18L",
      slug: "commercial-hot-towel-warmer-cabinet-uv-sterilizer-18l",
      brand: "Professional Series",
      categorySlug: "professional-equipment",
      basePrice: 5200,
      regularPrice: 6500,
      moq: 1,
      stock: 35,
      images: ["https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80"],
      description: "Dual-function hot towel warmer cabinet with UV light disinfection lamp. Maintains steady 70°C-80°C internal temperature for warming facial towels, compresses, and massage stones.",
      specs: { "Capacity": "18 Liters (20-30 Facial Towels)", "Temp Control": "70°C - 80°C Automatic Thermostat", "Sterilization": "Built-In UV Germicidal Lamp", "Drip Tray": "Removable Water Drip Tray" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 3, pricePerUnit: 5200 },
        { minQty: 4, maxQty: 9, pricePerUnit: 4600 },
        { minQty: 10, maxQty: null, pricePerUnit: 4100 }
      ],
      reviews: [
        { name: "Bhaskar Rao", business: "Rao Spa & Massage", city: "Bengaluru", rating: 5, comment: "Holds up to 30 facial towels warm all day long. Essential for spa facials and hot shaves." },
        { name: "Lata Nair", business: "Lata Skin Care", city: "Kollam", rating: 5, comment: "UV disinfection ensures total hygiene." },
        { name: "Suresh Pillai", business: "Pillai Salon", city: "Madurai", rating: 5, comment: "Heats up fast and maintains temperature cleanly." },
        { name: "Neeta Gupta", business: "Neeta Parlour", city: "Agra", rating: 5, comment: "Quiet operation and sturdy stainless wire shelves." }
      ]
    },
    // 12. Barber Supplies - Straight Razor
    {
      sku: "SGT-BRB-STRAIGHT-RAZOR-SET",
      name: "Professional Barber Folding Straight Razor with Wooden Handle",
      slug: "professional-barber-folding-straight-razor-with-wooden-handle",
      brand: "Barber Pro Series",
      categorySlug: "barber-supplies",
      basePrice: 480,
      regularPrice: 650,
      moq: 1,
      stock: 150,
      images: ["https://images.unsplash.com/photo-1621607512214-68297480165e?w=800&auto=format&fit=crop&q=80"],
      description: "Classic folding barber straight razor featuring a Japanese stainless steel blade arm and ergonomic natural rosewood handle. Fits standard single edge razor blades securely for precision line-ups.",
      specs: { "Material": "Stainless Steel Blade Arm + Rosewood Handle", "Mechanism": "Swing Lock Blade Guard Holder", "Weight": "65 g Ergonomic Balance", "Compatibility": "Standard Double/Single Edge Razor Blades" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 480 },
        { minQty: 6, maxQty: 11, pricePerUnit: 390 },
        { minQty: 12, maxQty: null, pricePerUnit: 320 }
      ],
      reviews: [
        { name: "Imran Qureshi", business: "Qureshi Barber Shop", city: "Hyderabad", rating: 5, comment: "Excellent weight balance in hand! Swing lock holds blade firm during beard lining." },
        { name: "Devendra Joshi", business: "Dev Barber Cutz", city: "Jodhpur", rating: 5, comment: "Real wooden handle looks classy." },
        { name: "Gurpreet Singh", business: "Singh & Sons Barber", city: "Patiala", rating: 5, comment: "High quality steel body." },
        { name: "Rajesh Soni", business: "Soni Unisex Salon", city: "Udaipur", rating: 5, comment: "Great wholesale deal for bulk ordering." }
      ]
    },
    // 13. Barber Supplies - Clipper Guards
    {
      sku: "SGT-BRB-CLIPPER-GUARD-HOLDER-SET",
      name: "Professional Barber Hair Clipper Color Guard Set with Acrylic Caddy",
      slug: "professional-barber-hair-clipper-color-guard-set-with-acrylic-caddy",
      brand: "Barber Pro Series",
      categorySlug: "barber-supplies",
      basePrice: 550,
      regularPrice: 750,
      moq: 1,
      stock: 110,
      images: ["https://images.unsplash.com/photo-1593702295094-aea22597a6b9?w=800&auto=format&fit=crop&q=80"],
      description: "10-piece color-coded cutting guard attachment guide set ranging from #1/16” to #1”. Includes clear organizer storage caddy rack for fast identification during haircutting.",
      specs: { "Set": "10 Guard Sizes (#0.5 to #8)", "Holder": "Transparent Acrylic Caddy Rack", "Clip": "Metal Latch Attachment Clip", "Compatibility": "Wahl, Andis & Most Full-Sized Clippers" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 550 },
        { minQty: 6, maxQty: 11, pricePerUnit: 460 },
        { minQty: 12, maxQty: null, pricePerUnit: 380 }
      ],
      reviews: [
        { name: "Salim Sheikh", business: "Sheikh Fades Barbershop", city: "Mumbai", rating: 5, comment: "Color-coded guards save so much time during busy fade haircuts! Metal clips snap tightly onto clippers." },
        { name: "Vijay Thapa", business: "Thapa Cuts", city: "Siliguri", rating: 5, comment: "Clear caddy rack keeps barber workstation organized." },
        { name: "Nitin Shinde", business: "Shinde Barber Art", city: "Thane", rating: 5, comment: "Sturdy plastic guards that don’t flex or bend." },
        { name: "Mohit Bansal", business: "Bansal Salon", city: "Meerut", rating: 5, comment: "Very good quality." }
      ]
    },
    // 14. Skin Care - Vitamin C Glow Cream
    {
      sku: "SGT-SKIN-VITAMIN-C-GLOW-CREAM-200G",
      name: "Vitamin C Radiant Facial Glow Massage Cream Jar (200g)",
      slug: "vitamin-c-radiant-facial-glow-massage-cream-jar-200g",
      brand: "Skin Care Series",
      categorySlug: "skin-care",
      basePrice: 390,
      regularPrice: 520,
      moq: 1,
      stock: 140,
      images: ["https://images.unsplash.com/photo-1608248597263-00079e965306?w=800&auto=format&fit=crop&q=80"],
      description: "Nourishing facial massage cream infused with stable Vitamin C, Orange Extract, and Vitamin E. Imparts instant brightness, hydrates dull skin, and improves facial elasticity.",
      specs: { "Weight": "200 g Jar", "Active Ingredient": "Vitamin C & Vitamin E", "Application": "Facial Massage Step 3", "Skin Finish": "Radiant Brightening Hydration" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 390 },
        { minQty: 6, maxQty: 11, pricePerUnit: 330 },
        { minQty: 12, maxQty: null, pricePerUnit: 280 }
      ],
      reviews: [
        { name: "Bhavana Chhabra", business: "Bhavana Skin Spa", city: "Delhi", rating: 5, comment: "Smooth slip for 15-minute facial massage. Clients love the citrus aroma!" },
        { name: "Komal Ahuja", business: "Komal Glow Clinic", city: "Faridabad", rating: 5, comment: "Non-comedogenic cream that leaves skin bright and supple." },
        { name: "Nisha Patel", business: "Nisha Beauty Care", city: "Surat", rating: 5, comment: "Economical 200g jar size for daily salon facials." },
        { name: "Alka Sen", business: "Alka Parlour", city: "Gwalior", rating: 5, comment: "Great skin brightening cream." }
      ]
    },
    // 15. Skin Care - Gold Peel-Off Mask
    {
      sku: "SGT-SKIN-GOLD-PEELOFF-MASK-250G",
      name: "24K Gold Luxury Peel-off Facial Mask Jar (250g)",
      slug: "24k-gold-luxury-peel-off-facial-mask-jar-250g",
      brand: "Skin Care Series",
      categorySlug: "skin-care",
      basePrice: 590,
      regularPrice: 780,
      moq: 1,
      stock: 105,
      images: ["https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80"],
      description: "Premium anti-aging 24K gold peel-off mask jar. Removes blackheads, tightens skin pores, and promotes skin cell regeneration for bride facial packages.",
      specs: { "Weight": "250 g Jar", "Key Component": "Colloidal 24K Gold Foil Particles", "Application": "15-20 Min Peel-Off Facial", "Benefit": "Pore Tightening & Firming" },
      wholesaleTiers: [
        { minQty: 1, maxQty: 5, pricePerUnit: 590 },
        { minQty: 6, maxQty: 11, pricePerUnit: 510 },
        { minQty: 12, maxQty: null, pricePerUnit: 440 }
      ],
      reviews: [
        { name: "Rekha Sharma", business: "Rekha Bridal Studio", city: "Jaipur", rating: 5, comment: "Peels off in one clean piece without tearing! Leaves a golden radiant glow." },
        { name: "Shalini Varma", business: "Shalini Beauty Care", city: "Kanpur", rating: 5, comment: "Very popular item in our gold facial packages." },
        { name: "Poonam Kaur", business: "Poonam Glam Studio", city: "Ambala", rating: 5, comment: "Luxurious texture and appearance." },
        { name: "Sarita Rao", business: "Sarita Skin Lounge", city: "Hubli", rating: 5, comment: "Clients always request this gold mask." }
      ]
    }
  ];

  console.log("\n=== UPSERTING 15 NEW SALON PRODUCTS INTO DATABASE ===");

  let uniqueCounter = Date.now();

  for (const item of newProducts) {
    const cat = await prisma.category.findUnique({ where: { slug: item.categorySlug } });
    if (!cat) {
      console.error(`Category not found for slug: ${item.categorySlug}`);
      continue;
    }

    console.log(`Upserting Product: ${item.name} (${item.sku})...`);
    const prod = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        brand: item.brand,
        basePrice: item.basePrice,
        moq: item.moq,
        images: item.images,
        description: item.description,
        specs: item.specs,
        isActive: true,
        categoryId: cat.id,
      },
      create: {
        sku: item.sku,
        name: item.name,
        slug: item.slug,
        brand: item.brand,
        basePrice: item.basePrice,
        moq: item.moq,
        description: item.description,
        specs: item.specs,
        images: item.images,
        isActive: true,
        categoryId: cat.id,
        variants: {
          create: {
            sku: `${item.sku}-STD`,
            name: `${item.name} Standard`,
            price: item.regularPrice,
            salePrice: item.basePrice,
            inventory: { create: { stock: item.stock } },
            wholesaleTiers: {
              create: item.wholesaleTiers
            }
          }
        }
      }
    });

    // Check & insert 4 B2B reviews per product
    const rCount = await prisma.review.count({ where: { productId: prod.id } });
    if (rCount === 0) {
      for (const r of item.reviews) {
        uniqueCounter++;
        const customerEmail = `${r.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.${uniqueCounter}@b2bsalon.example.com`;
        
        const customer = await prisma.customer.create({
          data: {
            name: r.name,
            email: customerEmail,
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
            productId: prod.id,
            customerId: customer.id,
            rating: r.rating,
            comment: r.comment,
            status: ReviewStatus.APPROVED,
          }
        });
      }
    }
  }

  const finalProdCount = await prisma.product.count({ where: { isActive: true } });
  const finalReviewCount = await prisma.review.count();

  console.log(`\n✅ ALL 15 NEW PRODUCTS SUCCESSFULLY ADDED!`);
  console.log(`📊 Active Products Count: ${finalProdCount}`);
  console.log(`⭐ Total Reviews Count: ${finalReviewCount}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

/**
 * Shree Gopi Traders — product catalogue definition.
 *
 * The single source of truth for the seeded catalogue. Kept separate from
 * seed.ts so the data can be reviewed and extended without touching the
 * seeding logic. Nothing here is referenced by the app at runtime — the
 * storefront and admin read the catalogue from PostgreSQL.
 *
 * Pricing note: prices are indicative wholesale-trade values in INR for a
 * B2B salon-supplies business. Brands are deliberately generic house names
 * (see BRANDS) — no real manufacturer is named or implied.
 */

// ── Tier structures ───────────────────────────────────────────
// Different product classes discount differently: consumables move in bulk
// and discount hard; furniture and machines are low-volume, high-value and
// discount gently. Each entry is [minQty, maxQty | null, discountFraction].

export type TierBand = [number, number | null, number];

export const TIER_PROFILES = {
  /** Fast-moving consumables — bought by the carton. */
  consumable: [
    [1, 4, 0],
    [5, 9, 0.08],
    [10, 24, 0.15],
    [25, null, 0.22],
  ],
  /** Salon-use liquids, creams and colour. */
  product: [
    [1, 4, 0],
    [5, 9, 0.07],
    [10, 24, 0.13],
    [25, null, 0.2],
  ],
  /** Hand tools and small electricals. */
  equipment: [
    [1, 4, 0],
    [5, 9, 0.06],
    [10, null, 0.11],
  ],
  /** Salon furniture — heavy, low volume. */
  furniture: [
    [1, 2, 0],
    [3, 5, 0.05],
    [6, null, 0.09],
  ],
  /** Professional machines — high value, low volume. */
  machine: [
    [1, 2, 0],
    [3, 5, 0.06],
    [6, null, 0.1],
  ],
} satisfies Record<string, TierBand[]>;

export type TierProfile = keyof typeof TIER_PROFILES;

// ── Stock profiles ────────────────────────────────────────────
// [minStock, maxStock, lowStockThreshold]

export const STOCK_PROFILES = {
  consumable: [100, 1000, 20],
  product: [20, 200, 15],
  equipment: [5, 50, 5],
  furniture: [2, 20, 2],
  machine: [2, 15, 2],
} satisfies Record<TierProfile, [number, number, number]>;

// ── Brands (generic house brands — no real manufacturers) ─────

export const BRANDS = [
  "SGT Professional",
  "Shree Gopi Professional",
  "Salon Pro",
  "Beauty Professional",
  "Generic Professional",
] as const;

// ── Types ─────────────────────────────────────────────────────

/** [variantName, priceInINR] */
export type VariantSpec = [string, number];

export interface SeedProduct {
  name: string;
  brand: string;
  /** Full sentences describing what it is, its use, and who uses it. */
  description: string;
  specs: Record<string, string>;
  variants: VariantSpec[];
  /** Optional markdown, as a fraction (0.1 = 10% off). */
  sale?: number;
}

export interface SeedCategory {
  name: string;
  slug: string;
  /** SKU segment, e.g. "HC" → SGT-HC-001. */
  skuCode: string;
  description: string;
  profile: TierProfile;
  products: SeedProduct[];
}

const PRO_USE = "Professional / salon use";

// ── Catalogue ─────────────────────────────────────────────────

export const CATALOG: SeedCategory[] = [
  // ═══════════════════════════════════════════════════════════
  {
    name: "Hair Care",
    slug: "hair-care",
    skuCode: "HC",
    description:
      "Shampoos, conditioners, serums, oils and treatment masks in salon-size packs for daily professional use.",
    profile: "product",
    products: [
      {
        name: "Professional Shampoo",
        brand: "SGT Professional",
        description:
          "A daily-use salon shampoo formulated for back-to-back client washing. Cleans without stripping colour, rinses clear and lathers economically so a single litre covers more heads. Supplied in salon sizes up to 5L for wash-station refills. Used by salons, parlours and academies for routine wash-and-blow-dry services.",
        specs: { "Product Type": "Shampoo", Formulation: "Sulphate-free", "Hair Type": "All types", Usage: "Daily salon washing", "Professional Use": PRO_USE },
        variants: [["250ml", 195], ["500ml", 340], ["1L", 590], ["5L", 2450]],
      },
      {
        name: "Anti-Dandruff Shampoo",
        brand: "SGT Professional",
        description:
          "An anti-dandruff cleansing shampoo for clients presenting with flaking and scalp irritation. Suitable for use as part of a scalp treatment service or as a retail add-on. Salon sizes reduce cost per wash for high-footfall parlours.",
        specs: { "Product Type": "Medicated shampoo", Concern: "Dandruff / flaky scalp", "Hair Type": "All types", Usage: "2–3 washes per week", "Professional Use": PRO_USE },
        variants: [["250ml", 225], ["500ml", 395], ["1L", 690]],
      },
      {
        name: "Keratin Smooth Shampoo",
        brand: "Salon Pro",
        description:
          "A sulphate-free maintenance shampoo for clients who have had keratin or smoothening services. Helps extend treatment life between salon visits. Stocked by salons offering smoothening as an aftercare retail line.",
        specs: { "Product Type": "Shampoo", Formulation: "Sulphate-free", Concern: "Post-treatment care", "Hair Type": "Treated / smoothened", "Professional Use": PRO_USE },
        variants: [["250ml", 265], ["500ml", 465], ["1L", 820]],
        sale: 0.1,
      },
      {
        name: "Hair Fall Control Shampoo",
        brand: "Beauty Professional",
        description:
          "A strengthening shampoo aimed at clients with thinning or shedding hair. Formulated to cleanse gently while reducing breakage during washing and detangling. Commonly used in salon hair-fall treatment packages.",
        specs: { "Product Type": "Shampoo", Concern: "Hair fall / breakage", "Hair Type": "Thinning / weak", Usage: "Salon and home care", "Professional Use": PRO_USE },
        variants: [["250ml", 245], ["500ml", 425], ["1L", 750]],
      },
      {
        name: "Moisturizing Shampoo",
        brand: "SGT Professional",
        description:
          "A hydrating shampoo for dry, coarse or chemically processed hair. Leaves hair easier to comb through before blow-dry, reducing chair time. A staple for salons handling frequent colour and chemical work.",
        specs: { "Product Type": "Shampoo", Concern: "Dryness", "Hair Type": "Dry / coarse / processed", Usage: "Daily salon washing", "Professional Use": PRO_USE },
        variants: [["500ml", 355], ["1L", 615], ["5L", 2590]],
      },
      {
        name: "Professional Conditioner",
        brand: "SGT Professional",
        description:
          "A salon conditioner for post-wash detangling and slip. Rinses clean without weighing hair down, keeping blow-dries light. Salon-size packs are intended for wash-station use rather than retail.",
        specs: { "Product Type": "Conditioner", "Hair Type": "All types", Usage: "Post-shampoo, rinse out", "Contact Time": "2–3 minutes", "Professional Use": PRO_USE },
        variants: [["250ml", 210], ["500ml", 365], ["1L", 640], ["5L", 2690]],
      },
      {
        name: "Keratin Repair Conditioner",
        brand: "Salon Pro",
        description:
          "A rich repair conditioner for chemically treated and heat-stressed hair. Used as the second step after a keratin shampoo, or as a mid-service conditioning step before styling.",
        specs: { "Product Type": "Conditioner", Concern: "Damage repair", "Hair Type": "Treated / damaged", "Contact Time": "3–5 minutes", "Professional Use": PRO_USE },
        variants: [["250ml", 285], ["500ml", 495], ["1L", 875]],
      },
      {
        name: "Argan Hair Serum",
        brand: "Beauty Professional",
        description:
          "A lightweight finishing serum used after blow-dry to add shine and control flyaways. A small quantity treats a full head, so a single bottle lasts across many services. Also sold at the counter as an aftercare product.",
        specs: { "Product Type": "Hair serum", "Key Ingredient": "Argan oil", Finish: "Non-greasy shine", Usage: "Apply to damp or dry mid-lengths and ends", "Professional Use": PRO_USE },
        variants: [["50ml", 245], ["100ml", 425], ["200ml", 760]],
      },
      {
        name: "Hair Growth Oil",
        brand: "Shree Gopi Professional",
        description:
          "A scalp oil used in salon head-massage and hair-fall treatment services. Formulated to spread easily for massage without leaving the scalp greasy after washing. Bulk sizes suit parlours running regular champi services.",
        specs: { "Product Type": "Hair oil", Concern: "Hair fall / thinning", Usage: "Scalp massage, pre-wash", "Massage Time": "10–15 minutes", "Professional Use": PRO_USE },
        variants: [["200ml", 235], ["500ml", 520], ["1L", 950]],
      },
      {
        name: "Professional Hair Spa Cream",
        brand: "SGT Professional",
        description:
          "A deep-conditioning spa cream for salon hair-spa services, used with or without steam. Designed for a single-tub-per-service workflow, with jar sizes matched to salon throughput.",
        specs: { "Product Type": "Hair spa cream", Usage: "Salon hair spa service", "With Steam": "5–10 minutes", "Hair Type": "Dry / damaged", "Professional Use": PRO_USE },
        variants: [["500g", 545], ["1kg", 950]],
        sale: 0.12,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Hair Styling",
    slug: "hair-styling",
    skuCode: "HS",
    description:
      "Waxes, gels, sprays, mousses and heat protection for finishing and holding professional styles.",
    profile: "product",
    products: [
      {
        name: "Matte Hair Wax",
        brand: "Salon Pro",
        description:
          "A matte-finish styling wax with firm, re-workable hold. Used for men's cuts, textured crops and short styles. Non-flaking and washes out with a single shampoo, which matters for barbershop turnaround.",
        specs: { "Product Type": "Styling wax", Finish: "Matte", Hold: "Firm", "Hair Type": "Short / textured", "Professional Use": PRO_USE },
        variants: [["100g", 185], ["150g", 265], ["500g", 780]],
      },
      {
        name: "Professional Hair Gel",
        brand: "SGT Professional",
        description:
          "A wet-look styling gel with strong hold for slick-back and structured looks. Non-sticky once set and brushes out cleanly. Bulk tubs are intended for barber and salon station use.",
        specs: { "Product Type": "Styling gel", Finish: "Wet look / glossy", Hold: "Strong", Usage: "Apply to damp hair and style", "Professional Use": PRO_USE },
        variants: [["250g", 165], ["500g", 285], ["1kg", 495]],
      },
      {
        name: "Barber Hair Pomade",
        brand: "Generic Professional",
        description:
          "A classic water-based pomade for barbering — pompadours, side parts and comb-through finishes. Water-based so it rinses out without repeated washing, unlike oil pomades.",
        specs: { "Product Type": "Pomade", Base: "Water-based", Finish: "Medium shine", Hold: "Medium-firm", "Professional Use": PRO_USE },
        variants: [["100g", 225], ["200g", 395]],
      },
      {
        name: "Professional Hair Spray",
        brand: "SGT Professional",
        description:
          "A fine-mist finishing spray that holds a set without stiffness. Used at the end of blow-dries, bridal styling and updos. Brushes out without residue, so it suits repeat styling on the same client.",
        specs: { "Product Type": "Hair spray", Hold: "Strong", Finish: "Natural", Usage: "Spray 25–30cm from finished style", "Professional Use": PRO_USE },
        variants: [["200ml", 245], ["400ml", 425]],
      },
      {
        name: "Volumizing Hair Mousse",
        brand: "Beauty Professional",
        description:
          "A lightweight styling mousse worked through damp roots before blow-drying to build volume and body. A staple for fine-hair clients and for blow-dry bar services.",
        specs: { "Product Type": "Styling mousse", Effect: "Volume / body", "Hair Type": "Fine / limp", Usage: "Apply to damp roots before blow-dry", "Professional Use": PRO_USE },
        variants: [["200ml", 265], ["400ml", 465]],
      },
      {
        name: "Heat Protection Spray",
        brand: "Salon Pro",
        description:
          "A pre-styling spray applied before straightening, curling or blow-drying to reduce heat damage. Essential where irons run all day — protects both the client's hair and the salon's reputation for condition.",
        specs: { "Product Type": "Heat protectant", "Heat Protection": "Up to 220°C", Usage: "Spray on damp or dry hair before heat styling", "Hair Type": "All types", "Professional Use": PRO_USE },
        variants: [["150ml", 285], ["300ml", 495]],
      },
      {
        name: "Hair Volumizing Powder",
        brand: "Generic Professional",
        description:
          "A texturising root powder that lifts flat hair instantly at the roots. Used for photo-shoot styling, bridal work and fine-hair finishing where mousse alone is not enough.",
        specs: { "Product Type": "Texturising powder", Effect: "Root lift / texture", Finish: "Matte", Usage: "Sprinkle at roots and massage in", "Professional Use": PRO_USE },
        variants: [["10g", 195], ["20g", 340]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Hair Color & Treatment",
    slug: "hair-color-treatment",
    skuCode: "HT",
    description:
      "Professional colour, bleach, developers and chemical treatments for salon colour and smoothening services.",
    profile: "product",
    products: [
      {
        name: "Professional Hair Color Cream",
        brand: "SGT Professional",
        description:
          "A permanent cream colour for salon application, mixed with developer at the standard ratio. Delivers consistent coverage on grey and holds tone between services. Stocked by shade so colourists can build a working shade wall.",
        specs: { "Product Type": "Permanent hair colour", "Mixing Ratio": "1:1.5 with developer", "Grey Coverage": "Up to 100%", "Processing Time": "30–35 minutes", "Professional Use": PRO_USE },
        variants: [["Black", 145], ["Natural Black", 145], ["Dark Brown", 155], ["Brown", 155], ["Burgundy", 165], ["Mahogany", 165], ["Ash Brown", 175]],
      },
      {
        name: "Hair Bleach Powder",
        brand: "Salon Pro",
        description:
          "A dust-reduced lightening powder for highlights, balayage and global lift. Mixes smoothly without clumping and holds a workable consistency for the length of the application.",
        specs: { "Product Type": "Bleach powder", "Lift Levels": "Up to 7 levels", "Mixing Ratio": "1:2 with developer", "Dust Reduced": "Yes", "Professional Use": PRO_USE },
        variants: [["500g", 425], ["1kg", 780]],
      },
      {
        name: "Developer Cream",
        brand: "SGT Professional",
        description:
          "A stabilised cream developer for use with permanent colour and bleach. Available across the standard volume range so colourists can control lift precisely. Salon litre bottles keep cost per service down.",
        specs: { "Product Type": "Cream developer", Consistency: "Stabilised cream", Usage: "Mix with colour or bleach", Storage: "Cool, dark, sealed", "Professional Use": PRO_USE },
        variants: [["10 Vol - 1L", 320], ["20 Vol - 1L", 320], ["30 Vol - 1L", 340], ["40 Vol - 1L", 340]],
      },
      {
        name: "Hair Color Remover",
        brand: "Beauty Professional",
        description:
          "A colour-reducing treatment for correcting over-deposited or unwanted tone before recolouring. Used by colourists during correction services rather than as a routine product.",
        specs: { "Product Type": "Colour remover", Usage: "Colour correction service", "Processing Time": "20 minutes", "Ammonia Free": "Yes", "Professional Use": PRO_USE },
        variants: [["100ml", 385], ["250ml", 795]],
      },
      {
        name: "Keratin Treatment",
        brand: "Salon Pro",
        description:
          "A professional keratin smoothing treatment applied section by section and sealed with a flat iron. Reduces frizz and cuts client blow-dry time for several weeks. One of the highest-margin services a salon can offer.",
        specs: { "Product Type": "Keratin treatment", "Service Time": "2–3 hours", "Sealing Temperature": "200–230°C", "Results Last": "3–5 months", "Professional Use": PRO_USE },
        variants: [["500ml", 1650], ["1L", 2950]],
        sale: 0.08,
      },
      {
        name: "Hair Smoothening Cream",
        brand: "SGT Professional",
        description:
          "A cream relaxer system for salon smoothening services on wavy and curly hair. Supplied for professional application only — processing must be timed and monitored by a trained stylist.",
        specs: { "Product Type": "Smoothening cream", Strength: "Medium", "Processing Time": "20–30 minutes, monitored", Usage: "Professional application only", "Professional Use": PRO_USE },
        variants: [["500ml", 1250], ["1L", 2250]],
      },
      {
        name: "Hair Botox Treatment",
        brand: "Beauty Professional",
        description:
          "A deep-conditioning smoothing treatment that fills and rebuilds the hair shaft without harsh relaxing chemicals. Popular as a gentler alternative to keratin for damaged or fine hair.",
        specs: { "Product Type": "Rebuilding treatment", "Formaldehyde Free": "Yes", "Service Time": "60–90 minutes", "Results Last": "2–3 months", "Professional Use": PRO_USE },
        variants: [["500ml", 1450], ["1L", 2650]],
      },
      {
        name: "Hair Perm Lotion & Neutralizer",
        brand: "Generic Professional",
        description:
          "A two-part perming system — waving lotion plus neutraliser — for salon curl and body-wave services. Sold as a matched set so the neutralising step is never mismatched to the lotion strength.",
        specs: { "Product Type": "Perm system", Includes: "Waving lotion + neutraliser", "Processing Time": "10–20 minutes, test curl", Usage: "Professional application only", "Professional Use": PRO_USE },
        variants: [["Regular Set", 495], ["Resistant Hair Set", 545]],
      },
      {
        name: "Post-Color Treatment Cream",
        brand: "SGT Professional",
        description:
          "A pH-balancing mask applied straight after colour rinsing to close the cuticle and lock in tone. Used as the final chair step on every colour service to protect the result.",
        specs: { "Product Type": "Post-colour mask", Usage: "Apply after colour rinse", "Contact Time": "5 minutes", Effect: "pH balance / colour lock", "Professional Use": PRO_USE },
        variants: [["500g", 495], ["1kg", 895]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Hair Equipment",
    slug: "hair-equipment",
    skuCode: "HE",
    description:
      "Dryers, straighteners, clippers, scissors, brushes and combs built for continuous salon use.",
    profile: "equipment",
    products: [
      {
        name: "Professional Hair Dryer",
        brand: "SGT Professional",
        description:
          "A salon-grade dryer with an AC motor rated for continuous daily use, unlike domestic units that overheat under salon load. Multiple heat and speed settings plus a cool shot for setting the finish. Supplied with concentrator nozzles.",
        specs: { "Product Type": "Hair dryer", Power: "2200W", "Motor Type": "AC professional", Voltage: "220–240V", Settings: "3 heat / 2 speed + cool shot", "Cord Length": "2.7m", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Standard - Black", 2250], ["Professional - Black", 3450]],
      },
      {
        name: "Professional Hair Straightener",
        brand: "Salon Pro",
        description:
          "A floating-plate flat iron with fast heat recovery for back-to-back straightening and keratin sealing. Adjustable temperature lets stylists drop the heat for fine hair and raise it for coarse or treatment work.",
        specs: { "Product Type": "Hair straightener", "Plate Material": "Ceramic tourmaline", "Plate Width": "32mm", "Temperature Range": "150–230°C", "Heat-Up Time": "30 seconds", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Standard - Black", 1850], ["Professional - Black", 2950]],
        sale: 0.1,
      },
      {
        name: "Professional Hair Curler",
        brand: "SGT Professional",
        description:
          "A ceramic-barrel curling tong for salon curls, waves and bridal sets. Barrel sizes cover tight curls through loose waves, so a salon can stock the range and match the look to the client.",
        specs: { "Product Type": "Curling tong", "Barrel Material": "Ceramic", "Temperature Range": "120–210°C", Voltage: "220–240V", "Cool Tip": "Yes", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["19mm - Black", 1450], ["25mm - Black", 1550], ["32mm - Black", 1650]],
      },
      {
        name: "Professional Hair Clipper",
        brand: "Salon Pro",
        description:
          "A professional corded/cordless hair clipper designed for salon and barber use. Suitable for precision cutting, fading, trimming and finishing, with a taper lever for on-the-fly length changes. Built for repeated professional use with a detachable, washable blade.",
        specs: { "Product Type": "Hair clipper", "Blade Material": "Stainless steel, detachable", Operation: "Corded / cordless", "Runtime (cordless)": "Up to 120 minutes", "Guard Combs": "6 included", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Corded - Black", 2450], ["Cordless - Black", 3650]],
      },
      {
        name: "Professional Hair Trimmer",
        brand: "SGT Professional",
        description:
          "A close-cutting detail trimmer for necklines, edges, beard outlines and finishing work. Narrow blade gives the control a full-size clipper cannot, so most barber stations carry both.",
        specs: { "Product Type": "Detail trimmer", "Blade Width": "32mm T-blade", Operation: "Cordless rechargeable", Runtime: "Up to 90 minutes", "Charge Time": "2 hours", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Standard - Black", 1650], ["Professional - Black", 2450]],
      },
      {
        name: "Professional Hair Scissors",
        brand: "Generic Professional",
        description:
          "Japanese stainless steel cutting shears with a convex edge for clean slice and point cutting. Adjustable tension screw and removable finger rest. A stylist's primary tool — sold by blade length to suit cutting style.",
        specs: { "Product Type": "Cutting scissors", Material: "Japanese stainless steel", "Edge Type": "Convex", "Tension System": "Adjustable screw", Includes: "Case and cleaning cloth", "Professional Use": PRO_USE },
        variants: [['5.5 inch', 1250], ['6 inch', 1450], ['6.5 inch', 1650]],
      },
      {
        name: "Thinning Scissors",
        brand: "Generic Professional",
        description:
          "Texturising shears for removing weight and blending without shortening the overall length. Used to soften blunt lines and reduce bulk in thick hair.",
        specs: { "Product Type": "Thinning scissors", Material: "Japanese stainless steel", "Teeth Count": "28 teeth", "Removal Rate": "Approx. 30%", "Professional Use": PRO_USE },
        variants: [['6 inch - 28 Teeth', 1350]],
      },
      {
        name: "Professional Hair Brush Set",
        brand: "SGT Professional",
        description:
          "A working set of salon brushes covering round-brush blow-drying, paddle detangling and vent drying. Heat-resistant barrels and anti-static bristles for daily station use.",
        specs: { "Product Type": "Brush set", Includes: "Round, paddle and vent brushes", "Bristle Type": "Anti-static nylon", "Barrel Material": "Heat-resistant", "Professional Use": PRO_USE },
        variants: [["4-Piece Set", 745], ["8-Piece Set", 1290]],
      },
      {
        name: "Professional Comb Set",
        brand: "Generic Professional",
        description:
          "A carbon comb set covering cutting, tail sectioning, wide-tooth detangling and barber work. Carbon combs resist heat and chemicals, so they survive colour service and blow-dry heat.",
        specs: { "Product Type": "Comb set", Material: "Carbon fibre", "Heat Resistant": "Yes", "Chemical Resistant": "Yes", "Anti-Static": "Yes", "Professional Use": PRO_USE },
        variants: [["6-Piece Set", 425], ["12-Piece Set", 745]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Skin Care",
    slug: "skin-care",
    skuCode: "SK",
    description:
      "Cleansers, serums, toners, moisturisers and body care in professional sizes for treatment rooms.",
    profile: "product",
    products: [
      {
        name: "Professional Face Cleanser",
        brand: "SGT Professional",
        description:
          "A gentle gel cleanser used as the first step of every facial service. Removes makeup, sunscreen and surface oil without stripping the barrier, leaving skin ready for exfoliation. Litre pumps suit busy treatment rooms.",
        specs: { "Product Type": "Face cleanser", "Skin Type": "All types", "pH Balanced": "Yes", Usage: "Step 1 of facial protocol", "Professional Use": PRO_USE },
        variants: [["250ml", 285], ["500ml", 495], ["1L", 875]],
      },
      {
        name: "Vitamin C Face Serum",
        brand: "Beauty Professional",
        description:
          "A brightening serum used in de-tan and glow facial protocols, and retailed as aftercare. Targets dullness and uneven tone. Supplied in amber packaging as the active is light-sensitive.",
        specs: { "Product Type": "Face serum", "Key Ingredient": "Vitamin C", Concentration: "10%", Concern: "Dullness / pigmentation", Packaging: "Amber, light-protected", "Professional Use": PRO_USE },
        variants: [["30ml", 545], ["50ml", 845]],
      },
      {
        name: "Hyaluronic Acid Serum",
        brand: "Beauty Professional",
        description:
          "A hydrating serum layered under moisturiser during facials to plump and hold water in the skin. Suits all skin types including oily, where hydration is often the missing step.",
        specs: { "Product Type": "Face serum", "Key Ingredient": "Hyaluronic acid", Concern: "Dehydration / fine lines", "Skin Type": "All types", "Professional Use": PRO_USE },
        variants: [["30ml", 595], ["50ml", 925]],
      },
      {
        name: "Face Toner",
        brand: "SGT Professional",
        description:
          "An alcohol-free toner that rebalances skin pH after cleansing and preps for serum. Used between cleansing and treatment in every standard facial protocol.",
        specs: { "Product Type": "Toner", "Alcohol Free": "Yes", Usage: "Step 2 of facial protocol", "Skin Type": "All types", "Professional Use": PRO_USE },
        variants: [["250ml", 245], ["500ml", 425], ["1L", 750]],
      },
      {
        name: "Professional Moisturizer",
        brand: "SGT Professional",
        description:
          "A non-greasy finishing moisturiser applied at the end of a facial to seal treatment and settle the skin. Absorbs quickly so clients can leave without a residue.",
        specs: { "Product Type": "Moisturiser", Finish: "Non-greasy", Usage: "Final step of facial protocol", "Skin Type": "All types", "Professional Use": PRO_USE },
        variants: [["200g", 385], ["500g", 745]],
      },
      {
        name: "Aloe Vera Gel",
        brand: "Generic Professional",
        description:
          "A soothing aloe gel used after waxing, threading, de-tan and any service that leaves skin reactive. A high-turnover treatment-room staple — most parlours go through litre tubs.",
        specs: { "Product Type": "Soothing gel", "Key Ingredient": "Aloe vera", Usage: "Post-wax, post-threading, after-sun", "Skin Type": "All including sensitive", "Professional Use": PRO_USE },
        variants: [["250g", 145], ["500g", 245], ["1kg", 425]],
      },
      {
        name: "Rose Water Toner",
        brand: "Generic Professional",
        description:
          "A steam-distilled rose water used for compresses, mask mixing and cooling the skin between facial steps. Bulk cans are the economical option for parlours using it daily.",
        specs: { "Product Type": "Floral water", Source: "Steam distilled", Usage: "Compress / mask mixing / toning", "Skin Type": "All types", "Professional Use": PRO_USE },
        variants: [["500ml", 165], ["1L", 285], ["5L", 1150]],
      },
      {
        name: "Face Scrub",
        brand: "Beauty Professional",
        description:
          "A fine-grain exfoliating scrub for the manual exfoliation step of a facial. Grains are rounded to lift dead cells without micro-tearing sensitive skin.",
        specs: { "Product Type": "Face scrub", "Grain Type": "Fine, rounded", Usage: "Step 3 of facial protocol", Frequency: "1–2 times per week", "Professional Use": PRO_USE },
        variants: [["200g", 265], ["500g", 545], ["1kg", 975]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Facial Products",
    slug: "facial-products",
    skuCode: "FP",
    description:
      "Complete facial kits, massage creams, packs and masks for salon facial services.",
    profile: "product",
    products: [
      {
        name: "Gold Facial Kit",
        brand: "SGT Professional",
        description:
          "A complete single-service gold facial kit containing cleanser, scrub, gel, cream and pack in pre-measured sachets. Removes the guesswork and waste of decanting from bulk jars, which is why most parlours price facials off kits.",
        specs: { "Product Type": "Facial kit", Variant: "Gold", Includes: "Cleanser, scrub, gel, massage cream, pack", "Service Time": "45–60 minutes", "Skin Type": "All types", "Professional Use": PRO_USE },
        variants: [["Single Kit", 285], ["Pack of 5", 1290], ["Professional Pack (10)", 2450]],
      },
      {
        name: "Diamond Facial Kit",
        brand: "SGT Professional",
        description:
          "A brightening diamond facial kit for pre-event and bridal prep services. Positioned above the gold kit on most salon menus and priced accordingly.",
        specs: { "Product Type": "Facial kit", Variant: "Diamond", Includes: "Cleanser, scrub, gel, massage cream, pack", "Service Time": "45–60 minutes", Concern: "Dullness / pre-event glow", "Professional Use": PRO_USE },
        variants: [["Single Kit", 345], ["Pack of 5", 1590], ["Professional Pack (10)", 2990]],
      },
      {
        name: "Bridal Facial Kit",
        brand: "Beauty Professional",
        description:
          "An extended-protocol bridal facial kit for the higher-value services salons run in the run-up to a wedding. Larger sachets support a longer massage phase than a standard kit.",
        specs: { "Product Type": "Facial kit", Variant: "Bridal", Includes: "6-step protocol", "Service Time": "75–90 minutes", Usage: "Pre-wedding service", "Professional Use": PRO_USE },
        variants: [["Single Kit", 495], ["Pack of 5", 2290]],
      },
      {
        name: "De-Tan Facial Kit",
        brand: "Salon Pro",
        description:
          "A tan-removal facial kit for sun-exposed skin — one of the highest-volume services in Indian salons through summer. Includes a dedicated de-tan pack step.",
        specs: { "Product Type": "Facial kit", Variant: "De-Tan", Concern: "Tanning / uneven tone", "Service Time": "40–50 minutes", Includes: "Cleanser, scrub, de-tan pack, cream", "Professional Use": PRO_USE },
        variants: [["Single Kit", 265], ["Pack of 5", 1190], ["Professional Pack (10)", 2250]],
        sale: 0.1,
      },
      {
        name: "Fruit Facial Kit",
        brand: "Generic Professional",
        description:
          "An entry-level fruit facial kit for routine monthly clean-up clients. The value option on most salon menus, bought in volume by high-footfall parlours.",
        specs: { "Product Type": "Facial kit", Variant: "Fruit", "Service Time": "30–40 minutes", "Skin Type": "Normal / combination", "Professional Use": PRO_USE },
        variants: [["Single Kit", 195], ["Pack of 5", 875], ["Professional Pack (10)", 1650]],
      },
      {
        name: "Facial Massage Cream",
        brand: "SGT Professional",
        description:
          "A high-slip massage cream that stays workable through a full 15–20 minute facial massage without dragging or absorbing too fast. Bought in bulk tubs rather than kits.",
        specs: { "Product Type": "Massage cream", "Slip Duration": "15–20 minutes", Usage: "Facial massage phase", "Skin Type": "All types", "Professional Use": PRO_USE },
        variants: [["500g", 345], ["1kg", 595]],
      },
      {
        name: "Professional Face Pack",
        brand: "Salon Pro",
        description:
          "A setting clay pack applied as the final treatment step to tighten and refine pores. Mixes smoothly with rose water and peels away cleanly.",
        specs: { "Product Type": "Face pack", Base: "Clay", Usage: "Final treatment step", "Setting Time": "10–15 minutes", "Mix With": "Rose water", "Professional Use": PRO_USE },
        variants: [["500g", 295], ["1kg", 525]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Waxing",
    slug: "waxing",
    skuCode: "WX",
    description:
      "Wax, heaters, strips, spatulas and pre/post care for salon hair-removal services.",
    profile: "product",
    products: [
      {
        name: "Professional Wax Heater",
        brand: "SGT Professional",
        description:
          "A thermostat-controlled wax heater sized for salon tubs, holding an even working temperature through a full day of appointments. Single and double-pot versions let a parlour run two wax types at once.",
        specs: { "Product Type": "Wax heater", Capacity: "500ml per pot", "Temperature Range": "35–100°C, thermostatic", Power: "180W", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Single Pot", 1450], ["Double Pot", 2450]],
      },
      {
        name: "Roll-On Wax Heater",
        brand: "Salon Pro",
        description:
          "A cartridge roll-on heater for fast, even wax application on arms and legs. Cuts service time compared with spatula application and reduces wax wastage per client.",
        specs: { "Product Type": "Roll-on wax heater", "Cartridge Type": "100ml standard roll-on", "Heat-Up Time": "20–25 minutes", Power: "40W", Voltage: "220–240V", "Professional Use": PRO_USE },
        variants: [["Single Cartridge", 895], ["Triple Cartridge", 1950]],
      },
      {
        name: "Hard Wax Beans",
        brand: "SGT Professional",
        description:
          "Stripless hard wax beans that shrink-wrap the hair and peel off without fabric strips. Preferred for underarm, bikini and facial waxing where skin is sensitive. Melts fast and stays pliable at working temperature.",
        specs: { "Product Type": "Hard wax beans", "Strip Required": "No", "Melting Point": "60–65°C", "Best For": "Underarm, bikini, facial", "Professional Use": PRO_USE },
        variants: [["100g", 145], ["500g", 425], ["1kg", 750]],
      },
      {
        name: "Chocolate Wax",
        brand: "Beauty Professional",
        description:
          "A low-temperature chocolate wax that is gentler on sensitive skin and leaves less redness than standard soft wax. A high-demand parlour line, particularly for full-arm and full-leg services.",
        specs: { "Product Type": "Chocolate soft wax", "Strip Required": "Yes", "Working Temperature": "40–45°C", "Best For": "Arms, legs, full body", "Skin Type": "Sensitive friendly", "Professional Use": PRO_USE },
        variants: [["500g", 385], ["1kg", 685], ["5kg", 3150]],
      },
      {
        name: "Rica Style Liposoluble Wax",
        brand: "Salon Pro",
        description:
          "An oil-based liposoluble wax that adheres to hair rather than skin, reducing pulling and post-wax irritation. Used with strips for large-area waxing.",
        specs: { "Product Type": "Liposoluble wax", Base: "Oil-based", "Strip Required": "Yes", "Best For": "Large areas", "Skin Type": "Sensitive friendly", "Professional Use": PRO_USE },
        variants: [["400ml", 345], ["800ml", 625]],
      },
      {
        name: "Aloe Vera Soft Wax",
        brand: "Generic Professional",
        description:
          "An aloe-infused soft wax for routine arm and leg waxing, formulated to calm the skin during removal. The everyday workhorse wax for most parlours.",
        specs: { "Product Type": "Soft wax", "Key Ingredient": "Aloe vera", "Strip Required": "Yes", "Working Temperature": "45–50°C", "Professional Use": PRO_USE },
        variants: [["500g", 275], ["1kg", 495], ["5kg", 2250]],
      },
      {
        name: "Non-Woven Wax Strips",
        brand: "SGT Professional",
        description:
          "Pre-cut non-woven waxing strips that grip soft wax firmly and tear cleanly. Sold in bulk packs because a busy parlour goes through them by the hundred each week.",
        specs: { "Product Type": "Wax strips", Material: "Non-woven fabric", "Pre-Cut": "Yes", Reusable: "No — single use", "Professional Use": PRO_USE },
        variants: [["Small - Pack of 100", 165], ["Large - Pack of 100", 245], ["Large - Pack of 500", 1050]],
      },
      {
        name: "Disposable Wax Spatulas",
        brand: "Generic Professional",
        description:
          "Single-use wooden wax applicators in body and facial sizes. Single-use only — never double-dipped — which is both a hygiene requirement and a visible reassurance to clients.",
        specs: { "Product Type": "Wax spatula", Material: "Birch wood", "Single Use": "Yes", Sizes: "Body and facial", "Professional Use": PRO_USE },
        variants: [["Body - Pack of 100", 125], ["Facial - Pack of 100", 95], ["Body - Pack of 500", 545]],
      },
      {
        name: "Pre & Post Wax Lotion Set",
        brand: "SGT Professional",
        description:
          "A matched pre-wax cleansing lotion and post-wax soothing oil. The pre-wax step degreases so wax grips properly; the post-wax step lifts residue and calms the skin before the client leaves.",
        specs: { "Product Type": "Pre/post wax care", Includes: "Pre-wax cleanser + post-wax oil", Usage: "Before and after every wax service", "Skin Type": "All types", "Professional Use": PRO_USE },
        variants: [["500ml Set", 345], ["1L Set", 595]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Manicure & Pedicure",
    slug: "manicure-pedicure",
    skuCode: "MP",
    description:
      "Kits, implements, bowls and foot-care tools for salon manicure and pedicure services.",
    profile: "equipment",
    products: [
      {
        name: "Professional Manicure Kit",
        brand: "SGT Professional",
        description:
          "A complete stainless steel manicure implement set in a roll case — cutters, pushers, scissors and files. Autoclave-safe so implements can be sterilised between clients, which is the baseline hygiene expectation.",
        specs: { "Product Type": "Manicure kit", Material: "Stainless steel", "Autoclave Safe": "Yes", "Piece Count": "See variant", Includes: "Storage case", "Professional Use": PRO_USE },
        variants: [["10-Piece", 745], ["16-Piece", 1250]],
      },
      {
        name: "Professional Pedicure Kit",
        brand: "SGT Professional",
        description:
          "A pedicure implement set including foot file, callus tools, toenail cutters and cuticle instruments. Heavier-gauge tools than a manicure set, since toenail work needs more leverage.",
        specs: { "Product Type": "Pedicure kit", Material: "Stainless steel", "Autoclave Safe": "Yes", Includes: "Foot file, callus tools, cutters, case", "Professional Use": PRO_USE },
        variants: [["12-Piece", 895], ["18-Piece", 1450]],
      },
      {
        name: "Professional Nail Cutter Set",
        brand: "Generic Professional",
        description:
          "Heavy-duty stainless nail cutters in fingernail and toenail sizes. Sharpened for clean cuts that do not split the nail plate — important when clients return every few weeks.",
        specs: { "Product Type": "Nail cutter", Material: "Stainless steel", Sizes: "Fingernail and toenail", "Autoclave Safe": "Yes", "Professional Use": PRO_USE },
        variants: [["Standard Pair", 285], ["Professional Pair", 445]],
      },
      {
        name: "Cuticle Pusher & Cutter Set",
        brand: "Generic Professional",
        description:
          "A matched cuticle pusher and nipper for prepping the nail plate before polish or extensions. Correct cuticle work is what makes gel and acrylic adhere and last.",
        specs: { "Product Type": "Cuticle tools", Material: "Stainless steel", Includes: "Pusher + nipper", "Autoclave Safe": "Yes", "Professional Use": PRO_USE },
        variants: [["2-Piece Set", 345]],
      },
      {
        name: "Professional Foot File",
        brand: "Salon Pro",
        description:
          "A dual-grit foot file for callus reduction during pedicure. Coarse side for heavy build-up, fine side for smoothing before massage and polish.",
        specs: { "Product Type": "Foot file", Grit: "Dual — coarse / fine", Material: "Stainless steel with replaceable pads", Usage: "Callus reduction step", "Professional Use": PRO_USE },
        variants: [["Standard", 245], ["Professional", 395]],
      },
      {
        name: "Pedicure Bowl",
        brand: "Generic Professional",
        description:
          "A moulded soaking bowl sized for a comfortable foot soak at the start of a pedicure. Smooth interior wipes down and disinfects quickly between clients.",
        specs: { "Product Type": "Pedicure bowl", Material: "ABS plastic", Capacity: "6 litres", Color: "White", "Professional Use": PRO_USE },
        variants: [["Standard - White", 545], ["Deluxe - White", 895]],
      },
      {
        name: "Electric Foot Spa Tub",
        brand: "SGT Professional",
        description:
          "A heated foot spa with vibration massage and bubble jets for premium pedicure services. Lets a salon charge a spa-pedicure rate rather than a basic one.",
        specs: { "Product Type": "Foot spa", Functions: "Heating, bubble, vibration massage", Capacity: "8 litres", Power: "500W", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Standard", 3450], ["Deluxe with Rollers", 5450]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Nail Products",
    slug: "nails",
    skuCode: "NL",
    description:
      "Polish, gels, extensions, acrylics, art supplies, drills and curing lamps for nail services.",
    profile: "product",
    products: [
      {
        name: "Professional Gel Nail Polish",
        brand: "SGT Professional",
        description:
          "A soak-off gel polish that cures under UV or LED and wears for two to three weeks without chipping. Sold by shade so nail technicians can build a working colour wall. High-margin, high-repeat product.",
        specs: { "Product Type": "Gel nail polish", "Cure Type": "UV / LED", "Cure Time": "30–60 seconds LED", Wear: "2–3 weeks", "Soak Off": "Yes", "Professional Use": PRO_USE },
        variants: [["Classic Red - 15ml", 285], ["Nude - 15ml", 285], ["Blush Pink - 15ml", 285], ["Jet Black - 15ml", 285], ["French White - 15ml", 285]],
      },
      {
        name: "Base & Top Coat Set",
        brand: "SGT Professional",
        description:
          "A matched gel base and no-wipe top coat. The base grips the natural nail and the top coat seals with a high-gloss finish that does not need cleansing after cure.",
        specs: { "Product Type": "Base and top coat", Includes: "Base coat + no-wipe top coat", "Cure Type": "UV / LED", Finish: "High gloss", "Professional Use": PRO_USE },
        variants: [["15ml Set", 495], ["30ml Set", 845]],
      },
      {
        name: "Nail Primer & Dehydrator",
        brand: "Salon Pro",
        description:
          "A prep pair that removes surface oil and moisture so gel and acrylic bond properly. Skipping this step is the usual cause of premature lifting.",
        specs: { "Product Type": "Nail prep", Includes: "Dehydrator + primer", Usage: "Before gel or acrylic application", "Acid Free": "Yes", "Professional Use": PRO_USE },
        variants: [["15ml Set", 345]],
      },
      {
        name: "Professional Nail Tips",
        brand: "Generic Professional",
        description:
          "Pre-shaped extension tips in assorted sizes for building length before acrylic or gel overlay. Assorted boxes cover the full size range so a technician can fit any nail bed.",
        specs: { "Product Type": "Nail tips", Material: "ABS plastic", Shape: "Natural / coffin / stiletto", Sizes: "Assorted 0–9", "Professional Use": PRO_USE },
        variants: [["Natural - Pack of 500", 425], ["Coffin - Pack of 500", 465], ["Stiletto - Pack of 500", 465]],
      },
      {
        name: "Acrylic Powder & Liquid Set",
        brand: "SGT Professional",
        description:
          "A professional acrylic system — polymer powder plus monomer liquid — for sculpted extensions and overlays. Sets to a workable bead and files smoothly once cured.",
        specs: { "Product Type": "Acrylic system", Includes: "Polymer powder + monomer liquid", Colors: "Clear / pink / white", "Set Time": "60–90 seconds", "Professional Use": PRO_USE },
        variants: [["Clear - 100g + 100ml", 895], ["Pink - 100g + 100ml", 895], ["White - 100g + 100ml", 895]],
      },
      {
        name: "Nail Art Brush & Tool Kit",
        brand: "Beauty Professional",
        description:
          "A nail art set with liner, detail and dotting tools for freehand designs. Fine synthetic bristles hold their point through repeated cleaning with acetone.",
        specs: { "Product Type": "Nail art tools", Includes: "Liner, detail, fan brushes + dotting tools", "Bristle Type": "Synthetic", "Acetone Resistant": "Yes", "Professional Use": PRO_USE },
        variants: [["10-Piece Kit", 425], ["20-Piece Kit", 745]],
      },
      {
        name: "Professional Nail Drill",
        brand: "Salon Pro",
        description:
          "An electric nail file for gel removal, cuticle prep and shaping extensions. Variable speed with forward and reverse so it suits both left- and right-handed technicians. Cuts removal time dramatically versus hand filing.",
        specs: { "Product Type": "Electric nail drill", Speed: "0–30,000 RPM variable", Direction: "Forward / reverse", Includes: "6 bits and handpiece stand", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Standard - White", 2450], ["Professional - Black", 3950]],
      },
      {
        name: "UV/LED Nail Lamp",
        brand: "SGT Professional",
        description:
          "A dual-source curing lamp that works with both UV and LED gels, with a motion sensor and preset timers. Wide chamber cures a full hand in one pass rather than finger by finger.",
        specs: { "Product Type": "Curing lamp", "Light Source": "Dual UV + LED", Timers: "10s / 30s / 60s / 99s", "Motion Sensor": "Yes", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["36W - White", 1650], ["48W - White", 2450], ["80W - Black", 3450]],
        sale: 0.08,
      },
      {
        name: "Nail Files & Buffer Pack",
        brand: "Generic Professional",
        description:
          "Assorted-grit files and buffing blocks for shaping and finishing. Consumable — files are replaced regularly for hygiene, so salons buy them in bulk packs.",
        specs: { "Product Type": "Nail files and buffers", Grits: "80 / 100 / 180 / 240", "Single Client Use": "Recommended", "Professional Use": PRO_USE },
        variants: [["Pack of 25", 245], ["Pack of 50", 425], ["Pack of 100", 750]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Makeup",
    slug: "makeup",
    skuCode: "MU",
    description:
      "Professional foundation, palettes, lip and eye products, primers and brushes for makeup artists.",
    profile: "product",
    products: [
      {
        name: "Professional HD Foundation",
        brand: "SGT Professional",
        description:
          "A buildable, camera-ready foundation with a natural matte finish that holds under studio and event lighting. Shade range covers light through deep so a makeup artist can work across clients from one kit.",
        specs: { "Product Type": "Foundation", Coverage: "Medium to full, buildable", Finish: "Natural matte", "HD Ready": "Yes", "Wear Time": "Up to 12 hours", "Professional Use": PRO_USE },
        variants: [["Light - 30ml", 545], ["Medium - 30ml", 545], ["Deep - 30ml", 545]],
      },
      {
        name: "Professional Concealer",
        brand: "SGT Professional",
        description:
          "A high-coverage creamy concealer for under-eye, blemish and colour correction. Blends without creasing over a full day of wear, which matters for bridal and event work.",
        specs: { "Product Type": "Concealer", Coverage: "High", Finish: "Natural", Usage: "Under-eye and spot correction", "Professional Use": PRO_USE },
        variants: [["Light - 10ml", 345], ["Medium - 10ml", 345], ["Deep - 10ml", 345]],
      },
      {
        name: "Compact Powder",
        brand: "Beauty Professional",
        description:
          "A pressed setting powder for locking foundation and controlling shine through the day. Standard finishing step in every salon makeup service.",
        specs: { "Product Type": "Pressed powder", Finish: "Matte", Usage: "Set foundation, control shine", "Professional Use": PRO_USE },
        variants: [["Light - 12g", 285], ["Medium - 12g", 285], ["Deep - 12g", 285]],
      },
      {
        name: "Professional Eyeshadow Palette",
        brand: "Salon Pro",
        description:
          "A pigmented eyeshadow palette combining matte and shimmer finishes in a coordinated range. Built for artists working across many clients — one palette covers day, party and bridal looks.",
        specs: { "Product Type": "Eyeshadow palette", "Shade Count": "See variant", Finishes: "Matte + shimmer", Pigmentation: "High", "Professional Use": PRO_USE },
        variants: [["18 Shade - Nude", 745], ["35 Shade - Bold", 1250]],
      },
      {
        name: "Liquid Matte Lipstick",
        brand: "Beauty Professional",
        description:
          "A transfer-resistant liquid lipstick with a full-coverage matte finish. Holds through eating and drinking at events, which is exactly what bridal clients ask for.",
        specs: { "Product Type": "Liquid lipstick", Finish: "Matte", "Transfer Resistant": "Yes", "Wear Time": "Up to 8 hours", "Professional Use": PRO_USE },
        variants: [["Classic Red", 285], ["Nude Rose", 285], ["Deep Maroon", 285], ["Coral Pink", 285]],
      },
      {
        name: "Waterproof Eyeliner",
        brand: "SGT Professional",
        description:
          "A precision liquid eyeliner with a fine felt tip for sharp wings and tightlining. Waterproof formula holds through emotional occasions and humid conditions.",
        specs: { "Product Type": "Liquid eyeliner", "Tip Type": "Fine felt", Waterproof: "Yes", Color: "Intense black", "Professional Use": PRO_USE },
        variants: [["Black - 3ml", 225], ["Brown - 3ml", 225]],
      },
      {
        name: "Volumizing Mascara",
        brand: "Beauty Professional",
        description:
          "A volumising mascara with a shaped brush that separates while building thickness. Smudge-resistant so it survives a full event.",
        specs: { "Product Type": "Mascara", Effect: "Volume + length", "Smudge Resistant": "Yes", "Brush Type": "Shaped fibre", "Professional Use": PRO_USE },
        variants: [["Black - 10ml", 295]],
      },
      {
        name: "Makeup Primer",
        brand: "Salon Pro",
        description:
          "A silicone-based smoothing primer that fills texture and extends foundation wear. The step that separates a makeup that lasts two hours from one that lasts ten.",
        specs: { "Product Type": "Face primer", Base: "Silicone", Effect: "Smoothing, pore blurring", Usage: "Before foundation", "Professional Use": PRO_USE },
        variants: [["30ml", 425], ["50ml", 645]],
      },
      {
        name: "Professional Makeup Brush Set",
        brand: "SGT Professional",
        description:
          "A synthetic-bristle brush set covering face and eye application. Synthetic bristles work with both cream and powder products and wash clean between clients, which natural hair does not do as well.",
        specs: { "Product Type": "Makeup brush set", "Bristle Type": "Synthetic, cruelty free", Includes: "Face and eye brushes + roll case", Washable: "Yes", "Professional Use": PRO_USE },
        variants: [["12-Piece Set", 895], ["24-Piece Set", 1650]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Beauty Consumables",
    slug: "consumables",
    skuCode: "BC",
    description:
      "Gloves, towels, capes, cotton, foils, tissues and disposables — the everyday running stock of a salon.",
    profile: "consumable",
    products: [
      {
        name: "Nitrile Examination Gloves",
        brand: "Generic Professional",
        description:
          "Powder-free nitrile gloves for colour application, waxing and any service involving chemicals. Nitrile resists salon chemicals better than latex and avoids latex allergy issues for both staff and clients.",
        specs: { "Product Type": "Disposable gloves", Material: "Nitrile", "Powder Free": "Yes", "Latex Free": "Yes", Sizes: "S / M / L", "Professional Use": PRO_USE },
        variants: [["Small - Pack of 100", 545], ["Medium - Pack of 100", 545], ["Large - Pack of 100", 545], ["Medium - Pack of 500", 2450]],
      },
      {
        name: "Disposable Latex Gloves",
        brand: "Generic Professional",
        description:
          "Economical latex gloves for general salon use where chemical exposure is limited. The lower-cost option for routine tasks like shampooing and cleaning.",
        specs: { "Product Type": "Disposable gloves", Material: "Latex", "Powder Free": "Yes", Sizes: "S / M / L", "Professional Use": PRO_USE },
        variants: [["Medium - Pack of 100", 385], ["Large - Pack of 100", 385]],
      },
      {
        name: "Salon Cotton Towels",
        brand: "SGT Professional",
        description:
          "Absorbent cotton salon towels sized for wash-station and treatment-room use. Colour-fast so they survive repeated hot washes and bleach-based laundering without going grey.",
        specs: { "Product Type": "Salon towel", Material: "100% cotton", GSM: "400 GSM", Size: "40 x 70 cm", "Colour Fast": "Yes", "Professional Use": PRO_USE },
        variants: [["Pack of 5", 545], ["Pack of 10", 995], ["Pack of 25", 2350]],
      },
      {
        name: "Disposable Salon Towels",
        brand: "Generic Professional",
        description:
          "Single-use absorbent towels that remove laundry load entirely. Increasingly used for high-turnover services and by salons without in-house washing.",
        specs: { "Product Type": "Disposable towel", Material: "Non-woven", "Single Use": "Yes", Size: "40 x 80 cm", "Professional Use": PRO_USE },
        variants: [["Pack of 50", 425], ["Pack of 100", 795]],
      },
      {
        name: "Waterproof Salon Cape",
        brand: "SGT Professional",
        description:
          "A waterproof cutting and colouring cape with a snap closure. Repels colour and water so it protects client clothing through chemical services.",
        specs: { "Product Type": "Salon cape", Material: "Waterproof polyester", Closure: "Snap button", Reusable: "Yes", Color: "Black", "Professional Use": PRO_USE },
        variants: [["Standard - Black", 345], ["Pack of 5 - Black", 1495]],
      },
      {
        name: "Disposable Hair Caps",
        brand: "Generic Professional",
        description:
          "Elasticated single-use caps used during treatments, steaming and colour processing. A hygiene basic bought by the hundred.",
        specs: { "Product Type": "Disposable cap", Material: "Non-woven with elastic", "Single Use": "Yes", "Professional Use": PRO_USE },
        variants: [["Pack of 100", 285], ["Pack of 500", 1250]],
      },
      {
        name: "Cotton Rolls & Pads",
        brand: "Generic Professional",
        description:
          "Absorbent cotton for cleansing, toner application, colour barrier at the hairline and general treatment-room use. One of the highest-turnover consumables in any parlour.",
        specs: { "Product Type": "Cotton consumable", Material: "100% absorbent cotton", Bleached: "Yes", Usage: "Cleansing, toning, barrier", "Professional Use": PRO_USE },
        variants: [["Roll - 500g", 245], ["Roll - 1kg", 445], ["Pads - Pack of 500", 325]],
      },
      {
        name: "Hair Coloring Aluminium Foil",
        brand: "SGT Professional",
        description:
          "Salon-weight aluminium foil for highlights, balayage and colour separation. Embossed so it grips hair and holds a fold rather than sliding open mid-processing.",
        specs: { "Product Type": "Colouring foil", Material: "Embossed aluminium", Width: "100mm", Format: "Roll / pre-cut sheets", "Professional Use": PRO_USE },
        variants: [["Roll - 100m", 425], ["Pre-Cut - Pack of 500", 545]],
      },
      {
        name: "Disposable Bed Sheets",
        brand: "Generic Professional",
        description:
          "Single-use non-woven sheets for facial and massage beds. Changed between every client — the visible hygiene signal clients notice most in a treatment room.",
        specs: { "Product Type": "Disposable bed sheet", Material: "Non-woven", Size: "180 x 80 cm", "Single Use": "Yes", "Professional Use": PRO_USE },
        variants: [["Pack of 10", 285], ["Pack of 50", 1250], ["Pack of 100", 2350]],
      },
      {
        name: "Colour Mixing Bowl & Brush Set",
        brand: "Generic Professional",
        description:
          "Colour mixing bowls with measurement markings and application brushes. Marked bowls make developer ratios repeatable, which keeps colour results consistent between stylists.",
        specs: { "Product Type": "Colour application tools", Material: "Chemical-resistant plastic", Includes: "Bowls + application brushes", "Measurement Marked": "Yes", "Professional Use": PRO_USE },
        variants: [["4-Piece Set", 245], ["10-Piece Set", 495]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Salon Furniture",
    slug: "salon-furniture",
    skuCode: "FR",
    description:
      "Chairs, stations, shampoo units, trolleys, beds and storage built for commercial salon floors.",
    profile: "furniture",
    products: [
      {
        name: "Hydraulic Salon Styling Chair",
        brand: "SGT Professional",
        description:
          "A hydraulic styling chair with a heavy-duty pump and a 360° swivel base. Padded PU upholstery wipes clean of colour and is rated for continuous commercial use rather than occasional home use.",
        specs: { "Product Type": "Styling chair", Material: "PU leather over steel frame", "Base Type": "Hydraulic pump, 360° swivel", "Height Range": "50–65 cm adjustable", "Weight Capacity": "150 kg", Dimensions: "60 x 60 x 90-105 cm", Weight: "24 kg", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Black", 8950], ["Brown", 8950], ["White", 9450]],
      },
      {
        name: "Professional Barber Chair",
        brand: "SGT Professional",
        description:
          "A reclining barber chair with a headrest and footrest for shaving and beard services. Heavier frame and deeper recline than a styling chair, because barbering needs the client laid back.",
        specs: { "Product Type": "Barber chair", Material: "PU leather over steel", Recline: "Reclining with headrest", Footrest: "Integrated steel", "Weight Capacity": "180 kg", Dimensions: "65 x 120 x 95-115 cm", Weight: "42 kg", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Classic - Black", 13500], ["Premium - Brown", 16500]],
      },
      {
        name: "Salon Shampoo Station",
        brand: "Shree Gopi Professional",
        description:
          "A backwash unit with a ceramic basin, mixer tap and reclining chair. Neck rest is contoured so clients can sit through a full wash-and-massage without discomfort.",
        specs: { "Product Type": "Shampoo station", "Basin Material": "Ceramic", Includes: "Basin, mixer tap, hose, reclining chair", Plumbing: "Standard inlet/outlet", Dimensions: "120 x 65 x 95 cm", Weight: "55 kg", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Single Unit - Black", 15500], ["Double Unit - Black", 28500]],
      },
      {
        name: "Salon Styling Station Mirror Unit",
        brand: "SGT Professional",
        description:
          "A wall-mounted styling station combining mirror, worktop and tool storage. Keeps dryers and irons off the floor and gives each stylist a defined working position.",
        specs: { "Product Type": "Styling station", Material: "Laminated MDF with glass mirror", Storage: "Drawers and appliance holders", Mounting: "Wall mounted", Dimensions: "110 x 45 x 180 cm", Weight: "38 kg", "Professional Use": PRO_USE },
        variants: [["Single Station - White", 11500], ["Double Station - White", 19500]],
      },
      {
        name: "Salon Trolley",
        brand: "Generic Professional",
        description:
          "A rolling tool trolley with lockable castors for colour bowls, tools and appliances. Moves between chairs so a stylist works with everything to hand.",
        specs: { "Product Type": "Salon trolley", Material: "ABS plastic with steel frame", Castors: "4 lockable swivel", Tiers: "See variant", Dimensions: "40 x 35 x 80 cm", Weight: "8 kg", "Professional Use": PRO_USE },
        variants: [["3-Tier - Black", 2850], ["5-Tier - Black", 4250], ["5-Tier - White", 4250]],
      },
      {
        name: "Professional Facial Bed",
        brand: "SGT Professional",
        description:
          "A padded treatment couch with adjustable backrest for facials, threading and massage. Wipe-clean upholstery and a face cradle for prone treatments.",
        specs: { "Product Type": "Facial bed", Material: "PU leather over steel frame", Adjustment: "Multi-position backrest", "Weight Capacity": "200 kg", Dimensions: "185 x 70 x 65 cm", Weight: "32 kg", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Manual - White", 9850], ["Hydraulic - White", 14500], ["Electric - White", 24500]],
        sale: 0.08,
      },
      {
        name: "Manicure Table",
        brand: "Generic Professional",
        description:
          "A nail technician's work table with a padded hand rest, drawers and space for a lamp and drill. Sized so technician and client sit comfortably across from each other.",
        specs: { "Product Type": "Manicure table", Material: "Laminated MDF", Includes: "Hand rest, drawers, wrist cushion", Dimensions: "90 x 50 x 75 cm", Weight: "22 kg", "Professional Use": PRO_USE },
        variants: [["Standard - White", 6450], ["With Dust Collector - White", 9450]],
      },
      {
        name: "Salon Stool",
        brand: "Generic Professional",
        description:
          "A height-adjustable rolling stool for stylists and technicians. Gas-lift adjustment and smooth castors so staff can work seated through long services without back strain.",
        specs: { "Product Type": "Salon stool", Material: "PU seat, chrome base", Adjustment: "Gas lift", "Height Range": "45–60 cm", Castors: "5 swivel", Weight: "5 kg", "Professional Use": PRO_USE },
        variants: [["Round - Black", 1650], ["With Backrest - Black", 2450], ["Round - White", 1650]],
      },
      {
        name: "Salon Storage Cabinet",
        brand: "Shree Gopi Professional",
        description:
          "A lockable storage cabinet for stock, colour and tools. Keeps chemicals secured and off the salon floor, which matters for both safety and stock control.",
        specs: { "Product Type": "Storage cabinet", Material: "Laminated MDF", Lockable: "Yes", Shelves: "4 adjustable", Dimensions: "80 x 40 x 180 cm", Weight: "45 kg", "Professional Use": PRO_USE },
        variants: [["4-Shelf - White", 8450], ["4-Shelf - Brown", 8450]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Professional Equipment",
    slug: "professional-equipment",
    skuCode: "PE",
    description:
      "Steamers, sterilisers, facial machines and salon appliances for advanced treatment services.",
    profile: "machine",
    products: [
      {
        name: "Professional Facial Steamer",
        brand: "SGT Professional",
        description:
          "An ozone facial steamer on an adjustable arm, used to soften skin and open pores before extraction. The step that makes a clean-up service effective rather than superficial.",
        specs: { "Product Type": "Facial steamer", Ozone: "Yes, switchable", "Tank Capacity": "700ml", "Heat-Up Time": "3–5 minutes", Power: "650W", Voltage: "220–240V", Mounting: "Rolling floor stand", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Standard - White", 5450], ["With Magnifying Lamp - White", 8450]],
      },
      {
        name: "UV Tool Sterilizer Cabinet",
        brand: "SGT Professional",
        description:
          "A UV sterilising cabinet for combs, scissors, nail implements and brushes. Running tools through a steriliser between clients is a basic hygiene requirement and something clients increasingly look for.",
        specs: { "Product Type": "UV steriliser", Capacity: "See variant", "UV Lamp": "Germicidal UV-C", "Cycle Time": "15–20 minutes", Power: "20W", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Standard 9L - White", 4250], ["Large 18L - White", 6850]],
      },
      {
        name: "High Frequency Facial Machine",
        brand: "Salon Pro",
        description:
          "A high-frequency device with glass electrodes used in acne and post-extraction facial protocols. Supplied with multiple electrode shapes for face, neck and scalp work.",
        specs: { "Product Type": "High frequency machine", Electrodes: "4 glass electrodes included", Usage: "Acne / post-extraction protocols", Power: "15W", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["4-Electrode Set", 3450]],
      },
      {
        name: "Magnifying Lamp",
        brand: "Generic Professional",
        description:
          "An LED-lit magnifying lamp on an adjustable arm for extraction, threading and detailed nail work. Reduces eye strain on close work through a long shift.",
        specs: { "Product Type": "Magnifying lamp", Magnification: "5 dioptre", Lighting: "LED ring", Mounting: "Clamp / rolling stand", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Clamp Mount - White", 2650], ["Floor Stand - White", 4250]],
      },
      {
        name: "Hot Towel Cabinet",
        brand: "SGT Professional",
        description:
          "A heated cabinet that keeps towels at service temperature for facials, shaving and massage. Removes the microwave-and-wait step from the treatment flow.",
        specs: { "Product Type": "Towel warmer", Capacity: "See variant", "Temperature Range": "Up to 80°C", Power: "230W", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["9L - White", 3850], ["18L - White", 5850]],
      },
      {
        name: "Multifunction Beauty Machine",
        brand: "Shree Gopi Professional",
        description:
          "A combined facial platform bringing several treatment modalities into one trolley-mounted unit. Suits salons that want to offer advanced facials without buying separate machines.",
        specs: { "Product Type": "Multifunction facial machine", Functions: "Steam, vacuum, spray, high frequency, galvanic, brush", "Function Count": "6-in-1", Power: "800W", Voltage: "220–240V", Mounting: "Rolling trolley", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["6-in-1 Trolley Unit", 18500]],
      },
      {
        name: "Professional Hair Steamer",
        brand: "SGT Professional",
        description:
          "A stand-mounted hood steamer for hair spa, deep conditioning and colour processing. Even heat distribution opens the cuticle so treatments penetrate rather than sitting on the surface.",
        specs: { "Product Type": "Hair steamer", Mounting: "Rolling floor stand", "Timer Range": "0–60 minutes", "Height Adjustable": "Yes", Power: "650W", Voltage: "220–240V", Warranty: "12 months", "Professional Use": PRO_USE },
        variants: [["Standard Stand - White", 6850], ["Digital Stand - White", 9450]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Barber Supplies",
    slug: "barber-supplies",
    skuCode: "BS",
    description:
      "Razors, shaving products, beard care, capes and barber-specific tools for men's grooming.",
    profile: "equipment",
    products: [
      {
        name: "Professional Straight Razor",
        brand: "Generic Professional",
        description:
          "A shavette-style straight razor taking replaceable blades, so a fresh blade is used for every client. Stainless handle wipes down and sterilises between services.",
        specs: { "Product Type": "Straight razor", "Blade Type": "Replaceable single-edge", "Handle Material": "Stainless steel", Hygiene: "New blade per client", "Autoclave Safe": "Yes", "Professional Use": PRO_USE },
        variants: [["Standard - Steel", 445], ["Professional - Black", 745]],
      },
      {
        name: "Replacement Razor Blades",
        brand: "Generic Professional",
        description:
          "Single-edge replacement blades for shavette razors. A pure consumable — one blade per client, so barbershops order these in bulk.",
        specs: { "Product Type": "Razor blades", Material: "Stainless steel", "Single Use": "Yes", Compatibility: "Standard shavette razors", "Professional Use": PRO_USE },
        variants: [["Pack of 100", 285], ["Pack of 500", 1250]],
      },
      {
        name: "Professional Barber Scissors",
        brand: "Salon Pro",
        description:
          "Barbering shears with an offset handle to reduce wrist fatigue over a long cutting day. Sharpened for scissor-over-comb work on short men's cuts.",
        specs: { "Product Type": "Barber scissors", Material: "Japanese stainless steel", "Handle Type": "Offset ergonomic", Length: "6.5 inch", Includes: "Case and oil", "Professional Use": PRO_USE },
        variants: [["6.5 inch - Silver", 1550]],
      },
      {
        name: "Professional Shaving Cream",
        brand: "SGT Professional",
        description:
          "A rich lathering shaving cream that holds its foam through a full straight-razor shave without collapsing. Bulk tubs suit barbershops running shaves all day.",
        specs: { "Product Type": "Shaving cream", "Lather Type": "Rich, stable", Usage: "Brush or hand application", "Skin Type": "All including sensitive", "Professional Use": PRO_USE },
        variants: [["500g", 285], ["1kg", 495]],
      },
      {
        name: "After Shave Lotion",
        brand: "SGT Professional",
        description:
          "A cooling after-shave applied at the end of a shave to close pores and calm razor irritation. The finishing step clients associate with a proper barbershop shave.",
        specs: { "Product Type": "After shave", Effect: "Cooling, antiseptic", Usage: "Apply after shaving", "Alcohol Content": "Low", "Professional Use": PRO_USE },
        variants: [["500ml", 265], ["1L", 465]],
      },
      {
        name: "Beard Oil",
        brand: "Beauty Professional",
        description:
          "A conditioning beard oil applied after trimming to soften coarse hair and reduce itch. Sold both for in-chair use and as a counter retail line.",
        specs: { "Product Type": "Beard oil", "Key Ingredients": "Argan and jojoba oils", Usage: "Post-trim conditioning", Finish: "Non-greasy", "Professional Use": PRO_USE },
        variants: [["50ml", 285], ["100ml", 465]],
      },
      {
        name: "Barber Neck Strips",
        brand: "Generic Professional",
        description:
          "Disposable neck strips placed under the cape to stop hair clippings reaching the client's collar. A consumable used on every single haircut.",
        specs: { "Product Type": "Neck strips", Material: "Stretchable tissue", "Single Use": "Yes", Format: "Roll dispenser", "Professional Use": PRO_USE },
        variants: [["Roll of 100", 145], ["Pack of 500", 645]],
      },
      {
        name: "Barber Spray Bottle",
        brand: "Generic Professional",
        description:
          "A fine-mist spray bottle for damping hair during cutting. Continuous-mist trigger gives even coverage instead of the wet patches a cheap bottle produces.",
        specs: { "Product Type": "Spray bottle", Material: "PET plastic", Capacity: "300ml", "Spray Type": "Fine continuous mist", "Professional Use": PRO_USE },
        variants: [["300ml - Black", 185], ["Pack of 5 - Black", 795]],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  {
    name: "Cleaning & Hygiene",
    slug: "cleaning-hygiene",
    skuCode: "CH",
    description:
      "Disinfectants, sanitisers, sterilisation solutions and salon cleaning supplies.",
    profile: "consumable",
    products: [
      {
        name: "Salon Surface Disinfectant",
        brand: "SGT Professional",
        description:
          "A broad-spectrum disinfectant for stations, chairs, beds and trolleys. Used between clients on any surface that has been touched during a service.",
        specs: { "Product Type": "Surface disinfectant", Spectrum: "Bactericidal, virucidal, fungicidal", "Contact Time": "1–2 minutes", Usage: "Wipe or spray, between clients", "Professional Use": PRO_USE },
        variants: [["500ml", 165], ["1L", 285], ["5L", 1150]],
      },
      {
        name: "Instrument Disinfectant Solution",
        brand: "SGT Professional",
        description:
          "A concentrated soak solution for scissors, combs, nail implements and razors before sterilisation. Dilutes down, so a 5L container covers a long period of daily use.",
        specs: { "Product Type": "Instrument disinfectant", Format: "Concentrate", "Dilution Ratio": "1:20", "Soak Time": "10–15 minutes", "Corrosion Inhibited": "Yes", "Professional Use": PRO_USE },
        variants: [["1L Concentrate", 385], ["5L Concentrate", 1650]],
      },
      {
        name: "Hand Sanitizer Gel",
        brand: "Generic Professional",
        description:
          "An alcohol-based hand sanitiser for staff and reception use. Placed at each station and the front desk, so salons buy the 5L refill alongside pump bottles.",
        specs: { "Product Type": "Hand sanitiser", "Alcohol Content": "70% v/v", Format: "Gel", Usage: "Staff and client hand hygiene", "Professional Use": PRO_USE },
        variants: [["500ml Pump", 145], ["5L Refill", 985]],
      },
      {
        name: "Salon Floor Cleaner",
        brand: "Generic Professional",
        description:
          "A concentrated floor cleaner that lifts hair, product residue and colour spills. Formulated not to leave a slippery film, which matters on a wet salon floor.",
        specs: { "Product Type": "Floor cleaner", Format: "Concentrate", "Dilution Ratio": "1:40", "Anti-Slip Residue": "No film", "Professional Use": PRO_USE },
        variants: [["1L", 165], ["5L", 685]],
      },
      {
        name: "Equipment Cleaning Brush Set",
        brand: "Generic Professional",
        description:
          "Stiff-bristle brushes for cleaning clipper blades, combs and implements before disinfection. Removes hair and product build-up that a soak alone will not shift.",
        specs: { "Product Type": "Cleaning brushes", "Bristle Type": "Stiff nylon", Includes: "Clipper, comb and detail brushes", "Professional Use": PRO_USE },
        variants: [["5-Piece Set", 195], ["10-Piece Set", 345]],
      },
      {
        name: "Disposable Cleaning Cloths",
        brand: "Generic Professional",
        description:
          "Lint-free single-use cloths for wiping down mirrors, stations and equipment. Avoids the cross-contamination risk of reusing a cloth across stations.",
        specs: { "Product Type": "Cleaning cloth", Material: "Non-woven, lint free", "Single Use": "Yes", "Professional Use": PRO_USE },
        variants: [["Pack of 50", 245], ["Pack of 100", 445]],
      },
      {
        name: "Salon Dustbin Liners",
        brand: "Generic Professional",
        description:
          "Heavy-duty bin liners sized for salon waste bins, strong enough to hold wet towels, wax residue and hair clippings without tearing.",
        specs: { "Product Type": "Bin liners", Material: "HDPE", Thickness: "50 micron", Size: "60 x 80 cm", "Professional Use": PRO_USE },
        variants: [["Pack of 50", 165], ["Pack of 100", 295]],
      },
    ],
  },
];

/** Total product count, used by the seed for its summary output. */
export const PRODUCT_COUNT = CATALOG.reduce((n, c) => n + c.products.length, 0);
export const VARIANT_COUNT = CATALOG.reduce(
  (n, c) => n + c.products.reduce((m, p) => m + p.variants.length, 0),
  0
);

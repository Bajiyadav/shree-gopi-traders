import { z } from "zod";

/**
 * Every server action validates its input through one of these schemas.
 * Nothing that reaches the database is trusted straight from the client.
 */

const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{8,15}$/, "Enter a valid phone number");

const pincode = z.string().trim().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode");

/**
 * GSTIN — always optional.
 *
 * GST registration is compulsory only above the turnover thresholds set under
 * the CGST Act (₹40 lakh for goods, ₹20 lakh for services; ₹20 lakh / ₹10 lakh
 * in special category states). Plenty of single-chair salons and home parlours
 * sit below that and hold no GSTIN at all. Requiring one would turn a tax
 * registration threshold into a condition of doing business with us.
 *
 * A buyer supplies it so their invoice carries it and they can claim input tax
 * credit. That is worth prompting for, and worth validating — but never worth
 * blocking a sale over.
 *
 * Structure, per the GSTIN specification:
 *   27          state code
 *     AAPFU0939F  the holder's PAN (5 letters, 4 digits, 1 letter)
 *               1 entity number for that PAN in that state
 *                Z fixed
 *                 V check digit
 *
 * The check digit is NOT verified. The algorithm is published, but a bug in
 * our implementation would reject a customer's genuine GSTIN at registration
 * and cost a sale, whereas an unverified digit only means an invoice may need
 * correcting later. Structure alone catches wrong length, transposed sections
 * and typed-in nonsense, which is nearly every real mistake.
 */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

/** 01–38 are the states and union territories; 97 is "other territory" and
 *  99 is centre jurisdiction. Anything else is not a real state code. */
function validStateCode(gstin: string) {
  const code = Number(gstin.slice(0, 2));
  return (code >= 1 && code <= 38) || code === 97 || code === 99;
}

const gstNumber = z
  .string()
  // Normalise before validating. The input is styled `uppercase`, which only
  // changes how it looks — a GSTIN typed in lower case still submitted in
  // lower case and failed with "must be 15 characters", which it plainly was.
  .transform((v) => v.trim().toUpperCase().replace(/[\s-]/g, ""))
  .refine((v) => v === "" || v.length === 15, "A GST number is 15 characters")
  .refine((v) => v === "" || GSTIN_PATTERN.test(v), "That does not look like a valid GST number")
  .refine((v) => v === "" || validStateCode(v), "The first two digits are not a valid state code")
  .optional();

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long");

// ── Auth ──

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone,
  password,
  businessName: z.string().trim().min(2, "Business name is required").max(120),
  businessType: z.enum([
    "SALON",
    "PARLOUR",
    "SPA",
    "BEAUTY_STUDIO",
    "MAKEUP_ARTIST",
    "BARBERSHOP",
    "ACADEMY",
    "RETAILER",
    "OTHER",
  ]),
  gstNumber,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const adminLoginSchema = loginSchema;

// ── Profile / address ──

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone,
  businessName: z.string().trim().min(2).max(120),
  businessType: registerSchema.shape.businessType,
  gstNumber,
});

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional().or(z.literal("")),
  line1: z.string().trim().min(3, "Address is required").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().min(2, "State is required").max(80),
  pincode,
  isDefault: z.coerce.boolean().optional(),
});

// ── Cart / checkout ──

export const cartAddSchema = z.object({
  productVariantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(9999),
});

export const cartUpdateSchema = z.object({
  cartItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(9999),
});

export const checkoutSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(120),
  contactName: z.string().trim().min(2, "Contact name is required").max(80),
  phone,
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  gstNumber,
  line1: z.string().trim().min(3, "Address is required").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().min(2, "State is required").max(80),
  pincode,
  deliveryInstructions: z.string().trim().max(500).optional().or(z.literal("")),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  paymentMethod: z.literal("COD"),
});

// ── Bulk orders / contact / reviews ──

export const bulkOrderSchema = z.object({
  companyName: z.string().trim().min(2, "Business name is required").max(120),
  contactPerson: z.string().trim().min(2, "Contact person is required").max(80),
  phone,
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  productsNote: z.string().trim().min(5, "Tell us which products and quantities").max(2000),
  expectedDate: z.string().trim().optional().or(z.literal("")),
  deliveryLocation: z.string().trim().min(2, "Delivery location is required").max(200),
  additionalNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  businessName: z.string().trim().max(120).optional().or(z.literal("")),
  phone,
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  message: z.string().trim().min(5, "Message is required").max(2000),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Select a rating").max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

// ── Admin: catalog ──

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, "Slug may contain a-z, 0-9 and dashes"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  imageUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(150),
  slug: z.string().trim().min(2).max(150).regex(/^[a-z0-9-]+$/, "Slug may contain a-z, 0-9 and dashes"),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  brand: z.string().trim().max(80).optional().or(z.literal("")),
  sku: z.string().trim().min(2, "SKU is required").max(60),
  categoryId: z.string().min(1, "Category is required"),
  images: z.string().trim().optional().or(z.literal("")), // newline/comma separated URLs
  basePrice: z.coerce.number().min(0, "Price cannot be negative").max(10000000),
  salePrice: z.coerce.number().min(0).max(10000000).optional().nullable(),
  weight: z.coerce.number().min(0).max(100000).optional().nullable(),
  isActive: z.coerce.boolean().default(true),
  allowBackorder: z.coerce.boolean().default(false),
});

export const variantSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1, "Variant name is required").max(80),
  sku: z.string().trim().min(2, "SKU is required").max(60),
  price: z.coerce.number().min(0, "Price cannot be negative").max(10000000),
  weight: z.coerce.number().min(0).max(100000).optional().nullable(),
  imageUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
  stock: z.coerce.number().int().min(0).max(1000000).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(100000).default(5),
});

export const wholesaleTierSchema = z
  .object({
    productVariantId: z.string().min(1),
    minQty: z.coerce.number().int().min(1, "Minimum quantity must be at least 1").max(100000),
    maxQty: z.coerce.number().int().min(1).max(100000).optional().nullable(),
    pricePerUnit: z.coerce.number().min(0, "Price cannot be negative").max(10000000),
  })
  .refine((v) => v.maxQty === null || v.maxQty === undefined || v.maxQty >= v.minQty, {
    message: "Maximum quantity must be greater than or equal to minimum quantity",
    path: ["maxQty"],
  });

// ── Admin: inventory / orders / delivery / coupons ──

export const inventoryAdjustSchema = z.object({
  productVariantId: z.string().min(1),
  action: z.enum(["RESTOCK", "ADJUSTMENT", "RETURN", "DAMAGE"]),
  quantity: z.coerce.number().int().refine((n) => n !== 0, "Quantity cannot be zero"),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

export const lowStockThresholdSchema = z.object({
  productVariantId: z.string().min(1),
  lowStockThreshold: z.coerce.number().int().min(0).max(100000),
});

export const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export const paymentStatusSchema = z.object({
  orderId: z.string().min(1),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "COD"]),
});

export const deliverySchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["PENDING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"]),
  courierName: z.string().trim().max(80).optional().or(z.literal("")),
  trackingNumber: z.string().trim().max(80).optional().or(z.literal("")),
  expectedDeliveryDate: z.string().trim().optional().or(z.literal("")),
  deliveryNotes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "Code must be at least 3 characters")
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, "Code may contain A-Z, 0-9, dashes and underscores"),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.coerce.number().min(0.01, "Discount must be greater than zero").max(1000000),
    minOrderValue: z.coerce.number().min(0).max(10000000).optional().nullable(),
    maxDiscount: z.coerce.number().min(0).max(10000000).optional().nullable(),
    startDate: z.string().trim().min(1, "Start date is required"),
    endDate: z.string().trim().min(1, "End date is required"),
    usageLimit: z.coerce.number().int().min(1).max(1000000).optional().nullable(),
    isActive: z.coerce.boolean().default(true),
  })
  .refine((v) => new Date(v.endDate) > new Date(v.startDate), {
    message: "End date must be after the start date",
    path: ["endDate"],
  })
  .refine((v) => v.discountType !== "PERCENTAGE" || v.discountValue <= 100, {
    message: "Percentage discount cannot exceed 100%",
    path: ["discountValue"],
  });

export const bulkOrderUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "REVIEWING", "QUOTED", "APPROVED", "REJECTED", "COMPLETED"]),
  quotedAmount: z.coerce.number().min(0).max(100000000).optional().nullable(),
  additionalNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const adminPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: password,
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Flattens a ZodError into a { field: message } map for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

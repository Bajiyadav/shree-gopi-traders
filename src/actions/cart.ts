"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateDeliveryFee,
  resolveCartPricing,
  safeCouponDiscount,
} from "@/lib/pricing";
import { getCurrentCustomerId } from "@/lib/auth";
import { cartAddSchema, cartUpdateSchema, fieldErrors } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

/**
 * Cart mutations report expected problems by returning, never by throwing.
 *
 * Next.js masks Server Action exceptions in production: the message becomes
 * "An error occurred in the Server Components render…", so a shopper who is
 * simply signed out, or one unit below the MOQ, sees an internal-looking
 * error instead of being told what to do. Only genuine bugs should throw —
 * those SHOULD be masked.
 */
export type CartResult<T = unknown> =
  | ({ ok: true } & (unknown extends T ? object : T))
  | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

async function getOrCreateCart(customerId: string) {
  return prisma.cart.upsert({
    where: { customerId },
    update: {},
    create: { customerId },
  });
}

/**
 * Loads a cart item ONLY if it belongs to the signed-in customer.
 * Every mutation routes through here — a cart item id from the client is
 * an untrusted identifier, so ownership is proven before it is touched.
 */
async function getOwnedCartItem(cartItemId: string, customerId: string) {
  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: { select: { customerId: true } } },
  });
  if (!item || item.cart.customerId !== customerId) return null;
  return item;
}

export async function addToCart(
  productVariantId: string,
  quantity: number
): Promise<CartResult<{ quantity: number }>> {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return fail("Please sign in to add items to your cart.");

  const parsed = cartAddSchema.safeParse({ productVariantId, quantity });
  if (!parsed.success) return fail("Please enter a valid quantity.");

  const variant = await prisma.productVariant.findUnique({
    where: { id: parsed.data.productVariantId },
    include: { product: { select: { isActive: true, moq: true, name: true } }, inventory: true },
  });
  if (!variant || !variant.isActive || !variant.product.isActive) {
    return fail("This product is no longer available.");
  }

  const cart = await getOrCreateCart(customerId);

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productVariantId: { cartId: cart.id, productVariantId: variant.id } },
  });
  const nextQuantity = (existing?.quantity ?? 0) + parsed.data.quantity;

  // MOQ is a business rule, so it is enforced here rather than trusted from
  // the form. The cart total, not the single request, has to clear it.
  if (nextQuantity < variant.product.moq) {
    return fail(
      `${variant.product.name} has a minimum order quantity of ${variant.product.moq}.`
    );
  }

  await prisma.cartItem.upsert({
    where: { cartId_productVariantId: { cartId: cart.id, productVariantId: variant.id } },
    update: { quantity: nextQuantity },
    create: { cartId: cart.id, productVariantId: variant.id, quantity: parsed.data.quantity },
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true as const, quantity: nextQuantity };
}

/** Form-action wrapper used by the product page's add-to-cart form. */
export async function addToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cartAddSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const result = await addToCart(parsed.data.productVariantId, parsed.data.quantity);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, message: "Added to cart" };
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
): Promise<CartResult> {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return fail("Please sign in.");

  const parsed = cartUpdateSchema.safeParse({ cartItemId, quantity });
  if (!parsed.success) return fail("Please enter a valid quantity.");

  const item = await getOwnedCartItem(parsed.data.cartItemId, customerId);
  if (!item) return fail("That item is no longer in your cart.");

  if (parsed.data.quantity >= 1) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.productVariantId },
      select: { product: { select: { moq: true, name: true } } },
    });
    const moq = variant?.product.moq ?? 1;
    if (parsed.data.quantity < moq) {
      return fail(
        `${variant?.product.name ?? "This product"} has a minimum order quantity of ${moq}.`
      );
    }
  }

  if (parsed.data.quantity < 1) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: parsed.data.quantity },
    });
  }
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function removeCartItem(cartItemId: string): Promise<CartResult> {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return fail("Please sign in.");
  const item = await getOwnedCartItem(cartItemId, customerId);
  if (!item) return fail("That item is no longer in your cart.");
  await prisma.cartItem.delete({ where: { id: item.id } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function clearCart(): Promise<CartResult> {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return fail("Please sign in.");
  const cart = await prisma.cart.findUnique({ where: { customerId } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  }
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true };
}

/** Applies a coupon to the cart after validating it against the live subtotal. */
export async function applyCouponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return { ok: false, error: "Please sign in" };

  const code = String(formData.get("couponCode") ?? "").trim().toUpperCase();
  const cart = await prisma.cart.findUnique({ where: { customerId }, include: { items: true } });
  if (!cart || cart.items.length === 0) return { ok: false, error: "Your cart is empty" };

  if (!code) {
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    revalidatePath("/cart");
    return { ok: true, message: "Coupon removed" };
  }

  const { subtotal } = await resolveCartPricing(
    cart.items.map((i) => ({ productVariantId: i.productVariantId, quantity: i.quantity }))
  );
  const result = await safeCouponDiscount(code, subtotal);
  if (result.error) return { ok: false, error: result.error };

  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true, message: `Coupon ${code} applied` };
}

export async function removeCouponAction() {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return;
  await prisma.cart.updateMany({ where: { customerId }, data: { couponCode: null } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export interface CartLine {
  cartItemId: string;
  productVariantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  listPrice: number;
  lineTotal: number;
  savings: number;
  tierApplied: { minQty: number; maxQty: number | null } | null;
  inStock: boolean;
  availableStock: number;
}

export interface CartSummary {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  bulkDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  couponError: string | null;
  deliveryFee: number;
  total: number;
  hasStockIssue: boolean;
}

// Not exported: a "use server" module may only export async functions.
const EMPTY_CART: CartSummary = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  bulkDiscount: 0,
  couponCode: null,
  couponDiscount: 0,
  couponError: null,
  deliveryFee: 0,
  total: 0,
  hasStockIssue: false,
};

/**
 * Returns the cart with EVERY price recalculated server-side right now —
 * this is what /cart and /checkout render, never client-cached prices.
 */
export async function getCartWithPricing(): Promise<CartSummary | null> {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return null;

  const cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          productVariant: {
            include: { product: { select: { id: true, name: true, slug: true, images: true } } },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) return EMPTY_CART;

  const { results, subtotal } = await resolveCartPricing(
    cart.items.map((i) => ({ productVariantId: i.productVariantId, quantity: i.quantity }))
  );

  const listSubtotal = results.reduce(
    (sum, r) => sum.add(r.listPrice.mul(r.quantity)),
    new Prisma.Decimal(0)
  );
  const bulkDiscount = listSubtotal.sub(subtotal);

  const coupon = await safeCouponDiscount(cart.couponCode, subtotal);
  const deliveryFee = calculateDeliveryFee(subtotal);
  const total = subtotal.sub(coupon.discount).add(deliveryFee);

  const items: CartLine[] = cart.items.map((item, idx) => {
    const r = results[idx];
    return {
      cartItemId: item.id,
      productVariantId: item.productVariantId,
      productId: item.productVariant.product.id,
      productSlug: item.productVariant.product.slug,
      productName: item.productVariant.product.name,
      variantName: item.productVariant.name,
      imageUrl: item.productVariant.imageUrl ?? item.productVariant.product.images[0] ?? null,
      quantity: item.quantity,
      unitPrice: r.unitPrice.toNumber(),
      listPrice: r.listPrice.toNumber(),
      lineTotal: r.lineTotal.toNumber(),
      savings: r.listPrice.sub(r.unitPrice).mul(r.quantity).toNumber(),
      tierApplied: r.tierApplied,
      inStock: r.inStock,
      availableStock: r.availableStock,
    };
  });

  return {
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: subtotal.toNumber(),
    bulkDiscount: bulkDiscount.toNumber(),
    couponCode: coupon.error ? null : cart.couponCode,
    couponDiscount: coupon.discount.toNumber(),
    couponError: coupon.error,
    deliveryFee: deliveryFee.toNumber(),
    total: total.toNumber(),
    hasStockIssue: items.some((i) => !i.inStock),
  };
}

/** Lightweight count for the header badge. */
export async function getCartItemCount(): Promise<number> {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return 0;
  const result = await prisma.cartItem.aggregate({
    where: { cart: { customerId } },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { calculateDeliveryFee, resolveCartPricing, resolveCouponDiscount } from "./pricing";
import { generateOrderNumber } from "./order-number";

/**
 * ORDER CREATION CORE
 * ───────────────────
 * Split out of the server action so it takes an explicit `customerId`
 * instead of reading the session. The action supplies the authenticated id;
 * tests and future entry points (an admin placing an order on the phone,
 * a bulk request converted to an order) can call this directly.
 *
 * Nothing here trusts a price, quantity or total from the caller — every
 * figure is recomputed from the database.
 */

export interface OrderInput {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  gstNumber?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  deliveryInstructions?: string;
  couponCode?: string;
  paymentMethod: "COD";
}

export class OrderError extends Error {}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  total: number;
}

export async function createOrderForCustomer(
  customerId: string,
  input: OrderInput
): Promise<CreatedOrder> {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    include: { items: true },
  });
  if (!cart || cart.items.length === 0) throw new OrderError("Your cart is empty");

  const { results, subtotal, outOfStockLines } = await resolveCartPricing(
    cart.items.map((i) => ({ productVariantId: i.productVariantId, quantity: i.quantity }))
  );

  if (outOfStockLines.length > 0) {
    const names = await prisma.productVariant.findMany({
      where: { id: { in: outOfStockLines.map((l) => l.productVariantId) } },
      select: { name: true, product: { select: { name: true } } },
    });
    throw new OrderError(
      `Not enough stock for: ${names
        .map((v) => `${v.product.name} (${v.name})`)
        .join(", ")}. Please update your cart.`
    );
  }

  const listSubtotal = results.reduce(
    (sum, r) => sum.add(r.listPrice.mul(r.quantity)),
    new Prisma.Decimal(0)
  );
  const bulkDiscount = listSubtotal.sub(subtotal);

  // Re-validated against the freshly computed subtotal; whatever the browser
  // displayed is irrelevant.
  const couponCode = input.couponCode || cart.couponCode || null;
  const { discount: couponDiscount, coupon } = await resolveCouponDiscount(couponCode, subtotal);

  const deliveryFee = calculateDeliveryFee(subtotal);
  const total = subtotal.sub(couponDiscount).add(deliveryFee);

  const shippingAddress = {
    contactName: input.contactName,
    businessName: input.businessName,
    phone: input.phone,
    email: input.email,
    line1: input.line1,
    line2: input.line2 || null,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
  };

  // Retry the whole transaction if two checkouts race for the same order number.
  let created: CreatedOrder | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    try {
      created = await prisma.$transaction(
        async (tx) => {
        // Re-validate stock inside the transaction to close the race window.
        for (const line of results) {
          const variant = await tx.productVariant.findUnique({
            where: { id: line.productVariantId },
            include: {
              inventory: true,
              product: { select: { allowBackorder: true, name: true, isActive: true, moq: true } },
            },
          });
          if (!variant || !variant.isActive || !variant.product.isActive) {
            throw new OrderError("A product in your cart is no longer available");
          }
          if (line.quantity < variant.product.moq) {
            throw new OrderError(
              `${variant.product.name} has a minimum order quantity of ${variant.product.moq}.`
            );
          }
          const stock = variant.inventory?.stock ?? 0;
          if (!variant.product.allowBackorder && stock < line.quantity) {
            throw new OrderError(
              `Stock changed for ${variant.product.name} (${variant.name}) — please review your cart`
            );
          }
        }

        const orderNumber = await generateOrderNumber(tx);

        const variantDetails = await tx.productVariant.findMany({
          where: { id: { in: results.map((r) => r.productVariantId) } },
          include: { product: { select: { id: true, name: true } } },
        });
        const variantMap = new Map(variantDetails.map((v) => [v.id, v]));

        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId,
            businessName: input.businessName,
            subtotal,
            bulkDiscount,
            couponDiscount,
            couponCode: coupon?.code ?? null,
            deliveryFee,
            tax: 0,
            total,
            paymentMethod: input.paymentMethod,
            paymentStatus: "COD",
            status: "PENDING",
            shippingAddress,
            gstNumber: input.gstNumber || null,
            deliveryInstructions: input.deliveryInstructions || null,
            items: {
              create: results.map((r) => {
                const v = variantMap.get(r.productVariantId)!;
                return {
                  productId: v.product.id,
                  productVariantId: r.productVariantId,
                  productName: v.product.name,
                  variantName: v.name,
                  quantity: r.quantity,
                  unitPrice: r.unitPrice,
                  listPrice: r.listPrice,
                  lineTotal: r.lineTotal,
                };
              }),
            },
            delivery: { create: { status: "PENDING" } },
          },
          select: { id: true, orderNumber: true, total: true },
        });

        // Decrement inventory + record a transaction per line.
        for (const line of results) {
          const inv = await tx.inventory.findUnique({
            where: { productVariantId: line.productVariantId },
          });
          if (!inv) continue;
          await tx.inventory.update({
            where: { id: inv.id },
            data: { stock: { decrement: line.quantity } },
          });
          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inv.id,
              action: "ORDER",
              quantity: -line.quantity,
              reason: `Order ${orderNumber}`,
              orderId: order.id,
            },
          });
        }

        if (coupon) {
          await tx.coupon.update({
            where: { code: coupon.code },
            data: { usageCount: { increment: 1 } },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

        return { id: order.id, orderNumber: order.orderNumber, total: order.total.toNumber() };
      }, { timeout: 15000 });
    } catch (err) {
      lastError = err;
      const isDuplicateOrderNumber =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isDuplicateOrderNumber) throw err;
    }
  }

  if (!created) throw lastError ?? new OrderError("Could not place the order. Please try again.");

  // Persist the checkout address on the customer's account for next time.
  // The address book is a convenience — never fail an order over it.
  await prisma.address
    .create({
      data: {
        customerId,
        label: input.businessName,
        line1: input.line1,
        line2: input.line2 || null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
      },
    })
    .catch(() => null);

  return created;
}

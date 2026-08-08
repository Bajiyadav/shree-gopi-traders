"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/auth";
import { tiersOverlap } from "@/lib/pricing";
import { fieldErrors, productSchema, variantSchema, wholesaleTierSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

function revalidateCatalog(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  if (slug) revalidatePath(`/products/${slug}`);
}

/** Accepts newline- or comma-separated image URLs from the admin textarea. */
function parseImages(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function checkbox(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true";
}

function optionalNumber(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (raw === null || String(raw).trim() === "") return null;
  return Number(raw);
}

// ── Products ──────────────────────────────────────────────────

export async function saveProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");

    const parsed = productSchema.safeParse({
      ...Object.fromEntries(formData),
      salePrice: optionalNumber(formData, "salePrice"),
      weight: optionalNumber(formData, "weight"),
      isActive: checkbox(formData, "isActive"),
      allowBackorder: checkbox(formData, "allowBackorder"),
    });
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const data = parsed.data;

    if (data.salePrice != null && data.salePrice > data.basePrice) {
      return { ok: false, fieldErrors: { salePrice: "Sale price cannot exceed the base price" } };
    }

    const [slugClash, skuClash] = await Promise.all([
      prisma.product.findUnique({ where: { slug: data.slug } }),
      prisma.product.findUnique({ where: { sku: data.sku } }),
    ]);
    if (slugClash && slugClash.id !== id) {
      return { ok: false, fieldErrors: { slug: "Another product already uses this slug" } };
    }
    if (skuClash && skuClash.id !== id) {
      return { ok: false, fieldErrors: { sku: "Another product already uses this SKU" } };
    }

    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      brand: data.brand || null,
      sku: data.sku,
      categoryId: data.categoryId,
      images: parseImages(String(formData.get("images") ?? "")),
      basePrice: data.basePrice,
      salePrice: data.salePrice ?? null,
      weight: data.weight ?? null,
      isActive: data.isActive,
      allowBackorder: data.allowBackorder,
    };

    if (id) {
      await prisma.product.update({ where: { id }, data: payload });
    } else {
      // A product with no variant cannot be bought, so create a default one.
      const created = await prisma.product.create({ data: payload });
      const variant = await prisma.productVariant.create({
        data: {
          productId: created.id,
          name: "Standard",
          sku: `${data.sku}-1`,
          price: data.basePrice,
          salePrice: data.salePrice ?? null,
          isActive: true,
        },
      });
      await prisma.inventory.create({
        data: { productVariantId: variant.id, stock: 0, lowStockThreshold: 5 },
      });
      await prisma.wholesalePriceTier.create({
        data: {
          productVariantId: variant.id,
          minQty: 1,
          maxQty: null,
          pricePerUnit: data.salePrice ?? data.basePrice,
        },
      });
    }

    revalidateCatalog(data.slug);
    return { ok: true, message: id ? "Product updated" : "Product created" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function toggleProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return { ok: false, error: "Product not found" };
    await prisma.product.update({ where: { id }, data: { isActive: !product.isActive } });
    revalidateCatalog(product.slug);
    return { ok: true, message: product.isActive ? "Product deactivated" : "Product activated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");

    // Orders keep name/price snapshots, but the FK still points here — a product
    // that has been sold is deactivated instead of deleted so history survives.
    const orderCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderCount > 0) {
      const product = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      revalidateCatalog(product.slug);
      return {
        ok: true,
        message: "This product appears in past orders, so it was deactivated instead of deleted.",
      };
    }

    const product = await prisma.product.delete({ where: { id } });
    revalidateCatalog(product.slug);
    return { ok: true, message: "Product deleted" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ── Variants ──────────────────────────────────────────────────

export async function saveVariantAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");

    const parsed = variantSchema.safeParse({
      ...Object.fromEntries(formData),
      weight: optionalNumber(formData, "weight"),
      isActive: checkbox(formData, "isActive"),
    });
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const data = parsed.data;

    const salePrice = optionalNumber(formData, "salePrice");
    if (salePrice != null && salePrice > data.price) {
      return { ok: false, fieldErrors: { salePrice: "Sale price cannot exceed the list price" } };
    }

    const skuClash = await prisma.productVariant.findUnique({ where: { sku: data.sku } });
    if (skuClash && skuClash.id !== id) {
      return { ok: false, fieldErrors: { sku: "Another variant already uses this SKU" } };
    }

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { slug: true },
    });
    if (!product) return { ok: false, error: "Product not found" };

    const payload = {
      productId: data.productId,
      name: data.name,
      sku: data.sku,
      price: data.price,
      salePrice,
      weight: data.weight ?? null,
      imageUrl: data.imageUrl || null,
      isActive: data.isActive,
    };

    if (id) {
      await prisma.productVariant.update({ where: { id }, data: payload });
      await prisma.inventory.upsert({
        where: { productVariantId: id },
        update: { lowStockThreshold: data.lowStockThreshold },
        create: {
          productVariantId: id,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold,
        },
      });
    } else {
      const variant = await prisma.productVariant.create({ data: payload });
      await prisma.inventory.create({
        data: {
          productVariantId: variant.id,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold,
        },
      });
      if (data.stock > 0) {
        const inv = await prisma.inventory.findUnique({
          where: { productVariantId: variant.id },
        });
        if (inv) {
          await prisma.inventoryTransaction.create({
            data: {
              inventoryId: inv.id,
              action: "RESTOCK",
              quantity: data.stock,
              reason: "Opening stock for new variant",
            },
          });
        }
      }
      await prisma.wholesalePriceTier.create({
        data: {
          productVariantId: variant.id,
          minQty: 1,
          maxQty: null,
          pricePerUnit: salePrice ?? data.price,
        },
      });
    }

    revalidateCatalog(product.slug);
    revalidatePath(`/admin/products/${data.productId}`);
    return { ok: true, message: id ? "Variant updated" : "Variant created" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function toggleVariantAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: { select: { id: true, slug: true } } },
    });
    if (!variant) return { ok: false, error: "Variant not found" };
    await prisma.productVariant.update({ where: { id }, data: { isActive: !variant.isActive } });
    revalidateCatalog(variant.product.slug);
    revalidatePath(`/admin/products/${variant.product.id}`);
    return { ok: true, message: variant.isActive ? "Variant deactivated" : "Variant activated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteVariantAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: { select: { id: true, slug: true } } },
    });
    if (!variant) return { ok: false, error: "Variant not found" };

    const [orderCount, siblingCount] = await Promise.all([
      prisma.orderItem.count({ where: { productVariantId: id } }),
      prisma.productVariant.count({ where: { productId: variant.product.id } }),
    ]);

    if (siblingCount <= 1) {
      return { ok: false, error: "A product needs at least one variant. Add another one first." };
    }
    if (orderCount > 0) {
      await prisma.productVariant.update({ where: { id }, data: { isActive: false } });
      revalidateCatalog(variant.product.slug);
      revalidatePath(`/admin/products/${variant.product.id}`);
      return {
        ok: true,
        message: "This variant appears in past orders, so it was deactivated instead of deleted.",
      };
    }

    await prisma.productVariant.delete({ where: { id } });
    revalidateCatalog(variant.product.slug);
    revalidatePath(`/admin/products/${variant.product.id}`);
    return { ok: true, message: "Variant deleted" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ── Wholesale tiers ───────────────────────────────────────────

export async function saveWholesaleTierAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");

    const parsed = wholesaleTierSchema.safeParse({
      ...Object.fromEntries(formData),
      maxQty: optionalNumber(formData, "maxQty"),
    });
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const data = parsed.data;

    const variant = await prisma.productVariant.findUnique({
      where: { id: data.productVariantId },
      include: { wholesaleTiers: true, product: { select: { id: true, slug: true } } },
    });
    if (!variant) return { ok: false, error: "Variant not found" };

    if (data.pricePerUnit > Number(variant.price)) {
      return {
        ok: false,
        fieldErrors: { pricePerUnit: "A wholesale tier cannot cost more than the list price" },
      };
    }

    // Overlapping tiers would make pricing ambiguous — reject them (spec §32).
    if (
      tiersOverlap(variant.wholesaleTiers, {
        id: id || undefined,
        minQty: data.minQty,
        maxQty: data.maxQty ?? null,
      })
    ) {
      return {
        ok: false,
        fieldErrors: { minQty: "This quantity range overlaps an existing tier" },
      };
    }

    const payload = {
      productVariantId: data.productVariantId,
      minQty: data.minQty,
      maxQty: data.maxQty ?? null,
      pricePerUnit: data.pricePerUnit,
    };

    if (id) {
      await prisma.wholesalePriceTier.update({ where: { id }, data: payload });
    } else {
      await prisma.wholesalePriceTier.create({ data: payload });
    }

    revalidateCatalog(variant.product.slug);
    revalidatePath(`/admin/products/${variant.product.id}`);
    return { ok: true, message: id ? "Tier updated" : "Tier added" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteWholesaleTierAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const tier = await prisma.wholesalePriceTier.findUnique({
      where: { id },
      include: { productVariant: { include: { product: { select: { id: true, slug: true } } } } },
    });
    if (!tier) return { ok: false, error: "Tier not found" };
    await prisma.wholesalePriceTier.delete({ where: { id } });
    revalidateCatalog(tier.productVariant.product.slug);
    revalidatePath(`/admin/products/${tier.productVariant.product.id}`);
    return { ok: true, message: "Tier deleted" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

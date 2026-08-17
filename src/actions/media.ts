"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/auth";
import { errorMessage } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  cloudinaryConfigured,
  uploadImage,
} from "@/lib/cloudinary";
import type { ActionState } from "./types";

function revalidateMedia(slug?: string) {
  revalidatePath("/admin/media");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  if (slug) revalidatePath(`/products/${slug}`);
}

/**
 * Admin: replace one gallery view of one product with an uploaded file.
 *
 * Writes only Product.images, and only the slot named in the form. The other
 * two views are carried through untouched, so replacing view 2 can never
 * disturb views 1 and 3.
 */
export async function uploadProductImageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();

    if (!cloudinaryConfigured()) {
      return { ok: false, error: "Cloudinary is not configured on the server." };
    }

    const productId = String(formData.get("productId") ?? "");
    const slot = Number(formData.get("slot"));
    const file = formData.get("file");

    if (!productId) return { ok: false, error: "Missing product." };
    if (![1, 2, 3].includes(slot)) return { ok: false, error: "Image slot must be 1, 2 or 3." };
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image first." };
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return { ok: false, error: `Unsupported file type. Use JPEG, PNG, WebP or AVIF.` };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 10MB.` };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, slug: true, images: true },
    });
    if (!product) return { ok: false, error: "Product not found." };

    // Deterministic id: re-uploading the same slot replaces the stored asset.
    const publicId = `${product.sku.toLowerCase()}-view-${slot}`;
    const url = await uploadImage(await file.arrayBuffer(), file.name, publicId);

    // Keep three slots, filling any gap ahead of the one being written so the
    // array never becomes sparse.
    const next = [...product.images];
    while (next.length < slot) next.push("");
    next[slot - 1] = url;

    await prisma.product.update({
      where: { id: product.id },
      data: { images: next.filter((u, i) => u !== "" || i < slot) },
    });

    revalidateMedia(product.slug);
    return { ok: true, message: `View ${slot} updated` };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Admin: remove one gallery view.
 *
 * The Cloudinary asset is deliberately left in place — deleting it would break
 * any invoice, cache or shared link still pointing at it, and storage is cheap
 * next to an image that cannot be recovered.
 */
export async function removeProductImageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();

    const productId = String(formData.get("productId") ?? "");
    const slot = Number(formData.get("slot"));
    if (![1, 2, 3].includes(slot)) return { ok: false, error: "Image slot must be 1, 2 or 3." };

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true, images: true },
    });
    if (!product) return { ok: false, error: "Product not found." };

    const next = product.images.filter((_, i) => i !== slot - 1);
    await prisma.product.update({ where: { id: product.id }, data: { images: next } });

    revalidateMedia(product.slug);
    return { ok: true, message: `View ${slot} removed` };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/auth";
import { categorySchema, fieldErrors } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

function revalidateCategories() {
  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath("/products");
  revalidatePath("/");
}

export async function saveCategoryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const raw = Object.fromEntries(formData);
    const parsed = categorySchema.safeParse({
      ...raw,
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    });
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const data = parsed.data;

    const clash = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (clash && clash.id !== id) {
      return { ok: false, fieldErrors: { slug: "Another category already uses this slug" } };
    }

    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    };

    if (id) {
      await prisma.category.update({ where: { id }, data: payload });
    } else {
      await prisma.category.create({ data: payload });
    }

    revalidateCategories();
    return { ok: true, message: id ? "Category updated" : "Category created" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function toggleCategoryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return { ok: false, error: "Category not found" };
    await prisma.category.update({ where: { id }, data: { isActive: !category.isActive } });
    revalidateCategories();
    return { ok: true, message: category.isActive ? "Category deactivated" : "Category activated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteCategoryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return {
        ok: false,
        error: `This category still has ${productCount} product(s). Move or delete them first, or deactivate the category instead.`,
      };
    }
    await prisma.category.delete({ where: { id } });
    revalidateCategories();
    return { ok: true, message: "Category deleted" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Moves a category up or down in the storefront ordering. */
export async function reorderCategoryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const direction = String(formData.get("direction") ?? "up") === "up" ? -1 : 1;

    const all = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) return { ok: false, error: "Category not found" };

    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= all.length) return { ok: true }; // already at the end

    // Rewrite the whole ordering so positions stay contiguous.
    const reordered = [...all];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    await prisma.$transaction(
      reordered.map((c, i) => prisma.category.update({ where: { id: c.id }, data: { sortOrder: i } }))
    );

    revalidateCategories();
    return { ok: true, message: "Order updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

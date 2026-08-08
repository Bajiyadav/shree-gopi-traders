"use client";

import { saveProductAction } from "@/actions/products";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { ManagedForm } from "@/components/admin/common";

export interface ProductFormValues {
  id?: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  sku: string;
  categoryId: string;
  images: string;
  basePrice: string;
  salePrice: string;
  weight: string;
  isActive: boolean;
  allowBackorder: boolean;
}

export function ProductForm({
  categories,
  values,
}: {
  categories: { id: string; name: string }[];
  values: ProductFormValues;
}) {
  return (
    <ManagedForm action={saveProductAction}>
      {({ error }) => (
        <>
          {values.id && <input type="hidden" name="id" value={values.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product Name" htmlFor="name" error={error("name")} required>
              <Input id="name" name="name" defaultValue={values.name} required />
            </Field>

            <Field
              label="Slug"
              htmlFor="slug"
              error={error("slug")}
              hint="Used in the product URL"
              required
            >
              <Input id="slug" name="slug" defaultValue={values.slug} required />
            </Field>

            <Field label="Brand" htmlFor="brand" error={error("brand")}>
              <Input id="brand" name="brand" defaultValue={values.brand} />
            </Field>

            <Field label="SKU" htmlFor="sku" error={error("sku")} required>
              <Input id="sku" name="sku" defaultValue={values.sku} required />
            </Field>

            <Field label="Category" htmlFor="categoryId" error={error("categoryId")} required>
              <Select id="categoryId" name="categoryId" defaultValue={values.categoryId} required>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Weight (kg)" htmlFor="weight" error={error("weight")}>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.01"
                min="0"
                defaultValue={values.weight}
              />
            </Field>

            <Field
              label="Base Price (₹)"
              htmlFor="basePrice"
              error={error("basePrice")}
              hint="Catalogue reference price"
              required
            >
              <Input
                id="basePrice"
                name="basePrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={values.basePrice}
                required
              />
            </Field>

            <Field
              label="Sale Price (₹)"
              htmlFor="salePrice"
              error={error("salePrice")}
              hint="Leave blank for no markdown"
            >
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={values.salePrice}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              error={error("description")}
              className="sm:col-span-2"
            >
              <Textarea id="description" name="description" rows={5} defaultValue={values.description} />
            </Field>

            <Field
              label="Image URLs"
              htmlFor="images"
              error={error("images")}
              hint="One per line. Local paths like /images/categories/hair-care.svg work too."
              className="sm:col-span-2"
            >
              <Textarea id="images" name="images" rows={3} defaultValue={values.images} />
            </Field>
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
            <label className="flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={values.isActive}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Active — visible on the storefront
            </label>
            <label className="flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                name="allowBackorder"
                defaultChecked={values.allowBackorder}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Allow backorders — customers can buy beyond available stock
            </label>
          </div>

          <div className="mt-5">
            <SubmitButton pendingText="Saving…">
              {values.id ? "Save Changes" : "Create Product"}
            </SubmitButton>
          </div>
        </>
      )}
    </ManagedForm>
  );
}

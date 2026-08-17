"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import {
  deleteCategoryAction,
  reorderCategoryAction,
  saveCategoryAction,
  toggleCategoryAction,
} from "@/actions/categories";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { ActionButton, ManagedForm } from "@/components/admin/common";
import { slugify } from "@/lib/utils";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

function CategoryForm({ category, onDone }: { category?: CategoryRow; onDone: () => void }) {
  const [slug, setSlug] = useState(category?.slug ?? "");

  return (
    <ManagedForm action={saveCategoryAction}>
      {({ error, state }) => {
        if (state.ok) queueMicrotask(onDone);
        return (
          <>
            {category && <input type="hidden" name="id" value={category.id} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="cat-name" error={error("name")} required>
                <Input
                  id="cat-name"
                  name="name"
                  defaultValue={category?.name}
                  onChange={(e) => {
                    if (!category) setSlug(slugify(e.target.value));
                  }}
                  required
                />
              </Field>

              <Field label="Slug" htmlFor="cat-slug" error={error("slug")} required>
                <Input
                  id="cat-slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </Field>

              <Field label="Image URL" htmlFor="cat-image" error={error("imageUrl")}>
                <Input
                  id="cat-image"
                  name="imageUrl"
                  defaultValue={category?.imageUrl}
                  placeholder="https://res.cloudinary.com/your-cloud/image/upload/category.jpg"
                />
              </Field>

              <Field label="Sort Order" htmlFor="cat-sort" error={error("sortOrder")}>
                <Input
                  id="cat-sort"
                  name="sortOrder"
                  type="number"
                  min="0"
                  defaultValue={category?.sortOrder ?? 0}
                />
              </Field>

              <Field
                label="Description"
                htmlFor="cat-description"
                error={error("description")}
                className="sm:col-span-2"
              >
                <Textarea
                  id="cat-description"
                  name="description"
                  rows={2}
                  defaultValue={category?.description}
                />
              </Field>
            </div>

            <label className="mt-4 flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={category?.isActive ?? true}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Active — shown on the storefront
            </label>

            <div className="mt-4 flex gap-2">
              <SubmitButton size="sm" pendingText="Saving…">
                {category ? "Save Category" : "Create Category"}
              </SubmitButton>
              <Button type="button" variant="ghost" size="sm" onClick={onDone}>
                Cancel
              </Button>
            </div>
          </>
        );
      }}
    </ManagedForm>
  );
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </div>

      {creating && (
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">New category</h2>
          <CategoryForm onDone={() => setCreating(false)} />
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="table-scroll">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-right font-medium">Products</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((category, index) => (
                <tr key={category.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <ActionButton
                          action={reorderCategoryAction}
                          fields={{ id: category.id, direction: "up" }}
                          variant="ghost"
                          className="px-1.5"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </ActionButton>
                      )}
                      {index < categories.length - 1 && (
                        <ActionButton
                          action={reorderCategoryAction}
                          fields={{ id: category.id, direction: "down" }}
                          variant="ghost"
                          className="px-1.5"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </ActionButton>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{category.name}</p>
                    {category.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {category.description}
                      </p>
                    )}
                    {editing === category.id && (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <CategoryForm category={category} onDone={() => setEditing(null)} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{category.slug}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {category.productCount}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={category.isActive ? "success" : "neutral"}>
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditing((id) => (id === category.id ? null : category.id))
                        }
                      >
                        {editing === category.id ? "Close" : "Edit"}
                      </Button>
                      <ActionButton
                        action={toggleCategoryAction}
                        fields={{ id: category.id }}
                        variant="ghost"
                      >
                        {category.isActive ? "Deactivate" : "Activate"}
                      </ActionButton>
                      <ActionButton
                        action={deleteCategoryAction}
                        fields={{ id: category.id }}
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        confirm={`Delete "${category.name}"?`}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

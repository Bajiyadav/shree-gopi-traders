"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  deleteVariantAction,
  deleteWholesaleTierAction,
  saveVariantAction,
  saveWholesaleTierAction,
  toggleVariantAction,
} from "@/actions/products";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { ActionButton, ManagedForm } from "@/components/admin/common";
import { StockBadge } from "@/components/ui/status";
import { formatCurrency } from "@/lib/utils";

export interface TierRow {
  id: string;
  minQty: number;
  maxQty: number | null;
  pricePerUnit: number;
}

export interface VariantRow {
  id: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number | null;
  weight: number | null;
  imageUrl: string | null;
  isActive: boolean;
  stock: number;
  lowStockThreshold: number;
  tiers: TierRow[];
}

function VariantForm({
  productId,
  variant,
  onDone,
}: {
  productId: string;
  variant?: VariantRow;
  onDone?: () => void;
}) {
  return (
    <ManagedForm action={saveVariantAction}>
      {({ error, state }) => {
        if (state.ok && onDone) queueMicrotask(onDone);
        return (
          <>
            <input type="hidden" name="productId" value={productId} />
            {variant && <input type="hidden" name="id" value={variant.id} />}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Variant Name" htmlFor={`name-${variant?.id ?? "new"}`} error={error("name")} required>
                <Input
                  id={`name-${variant?.id ?? "new"}`}
                  name="name"
                  defaultValue={variant?.name}
                  placeholder="500ml, Large, Black…"
                  required
                />
              </Field>

              <Field label="SKU" htmlFor={`sku-${variant?.id ?? "new"}`} error={error("sku")} required>
                <Input id={`sku-${variant?.id ?? "new"}`} name="sku" defaultValue={variant?.sku} required />
              </Field>

              <Field label="List Price (₹)" htmlFor={`price-${variant?.id ?? "new"}`} error={error("price")} required>
                <Input
                  id={`price-${variant?.id ?? "new"}`}
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={variant?.price}
                  required
                />
              </Field>

              <Field label="Sale Price (₹)" htmlFor={`salePrice-${variant?.id ?? "new"}`} error={error("salePrice")}>
                <Input
                  id={`salePrice-${variant?.id ?? "new"}`}
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={variant?.salePrice ?? ""}
                />
              </Field>

              <Field label="Weight (kg)" htmlFor={`weight-${variant?.id ?? "new"}`} error={error("weight")}>
                <Input
                  id={`weight-${variant?.id ?? "new"}`}
                  name="weight"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={variant?.weight ?? ""}
                />
              </Field>

              <Field label="Image URL" htmlFor={`imageUrl-${variant?.id ?? "new"}`} error={error("imageUrl")}>
                <Input
                  id={`imageUrl-${variant?.id ?? "new"}`}
                  name="imageUrl"
                  defaultValue={variant?.imageUrl ?? ""}
                />
              </Field>

              <Field
                label={variant ? "Stock (managed in Inventory)" : "Opening Stock"}
                htmlFor={`stock-${variant?.id ?? "new"}`}
                error={error("stock")}
                hint={variant ? "Use the Inventory page to adjust stock" : undefined}
              >
                <Input
                  id={`stock-${variant?.id ?? "new"}`}
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={variant?.stock ?? 0}
                  disabled={Boolean(variant)}
                />
              </Field>

              <Field
                label="Low Stock Threshold"
                htmlFor={`lowStockThreshold-${variant?.id ?? "new"}`}
                error={error("lowStockThreshold")}
              >
                <Input
                  id={`lowStockThreshold-${variant?.id ?? "new"}`}
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  defaultValue={variant?.lowStockThreshold ?? 5}
                />
              </Field>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={variant?.isActive ?? true}
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <SubmitButton size="sm" pendingText="Saving…">
                {variant ? "Save Variant" : "Add Variant"}
              </SubmitButton>
              {onDone && (
                <Button type="button" variant="ghost" size="sm" onClick={onDone}>
                  Cancel
                </Button>
              )}
            </div>
          </>
        );
      }}
    </ManagedForm>
  );
}

function TierManager({ variant }: { variant: VariantRow }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Wholesale Tiers</h4>
          <p className="text-xs text-slate-500">
            Ranges must not overlap. Leave max blank for an open-ended top tier.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          Add Tier
        </Button>
      </div>

      {variant.tiers.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No tiers — this variant is charged at its list/sale price for every quantity.
        </p>
      ) : (
        <div className="table-scroll mt-3">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 text-left font-medium">Quantity range</th>
                <th className="py-2 text-right font-medium">Price / unit</th>
                <th className="py-2 text-right font-medium">Discount</th>
                <th className="py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[...variant.tiers]
                .sort((a, b) => a.minQty - b.minQty)
                .map((tier) => (
                  <tr key={tier.id}>
                    <td className="py-2 text-slate-700">
                      {tier.maxQty === null
                        ? `${tier.minQty}+ units`
                        : `${tier.minQty} – ${tier.maxQty} units`}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums text-slate-900">
                      {formatCurrency(tier.pricePerUnit)}
                    </td>
                    <td className="py-2 text-right text-xs tabular-nums">
                      {tier.pricePerUnit < variant.price ? (
                        <span className="font-medium text-emerald-700">
                          {Math.round(((variant.price - tier.pricePerUnit) / variant.price) * 100)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <ActionButton
                        action={deleteWholesaleTierAction}
                        fields={{ id: tier.id }}
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        confirm="Delete this wholesale tier?"
                      >
                        Delete
                      </ActionButton>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <ManagedForm action={saveWholesaleTierAction}>
            {({ error, state }) => {
              if (state.ok) queueMicrotask(() => setAdding(false));
              return (
                <>
                  <input type="hidden" name="productVariantId" value={variant.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Min Quantity" htmlFor={`minQty-${variant.id}`} error={error("minQty")} required>
                      <Input
                        id={`minQty-${variant.id}`}
                        name="minQty"
                        type="number"
                        min="1"
                        defaultValue={1}
                        required
                      />
                    </Field>
                    <Field
                      label="Max Quantity"
                      htmlFor={`maxQty-${variant.id}`}
                      error={error("maxQty")}
                      hint="Blank = unlimited"
                    >
                      <Input id={`maxQty-${variant.id}`} name="maxQty" type="number" min="1" />
                    </Field>
                    <Field
                      label="Price / unit (₹)"
                      htmlFor={`pricePerUnit-${variant.id}`}
                      error={error("pricePerUnit")}
                      required
                    >
                      <Input
                        id={`pricePerUnit-${variant.id}`}
                        name="pricePerUnit"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <SubmitButton size="sm" pendingText="Saving…">
                      Save Tier
                    </SubmitButton>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              );
            }}
          </ManagedForm>
        </div>
      )}
    </div>
  );
}

export function VariantManager({
  productId,
  variants,
}: {
  productId: string;
  variants: VariantRow[];
}) {
  const [addingVariant, setAddingVariant] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Variants ({variants.length})</h2>
          <p className="text-sm text-slate-500">
            Each variant carries its own SKU, price, stock and wholesale ladder.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setAddingVariant((v) => !v)}>
          <Plus className="h-4 w-4" />
          Add Variant
        </Button>
      </div>

      {addingVariant && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">New variant</h3>
          <VariantForm productId={productId} onDone={() => setAddingVariant(false)} />
        </Card>
      )}

      {variants.map((variant) => (
        <Card key={variant.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{variant.name}</h3>
                <Badge tone={variant.isActive ? "success" : "neutral"}>
                  {variant.isActive ? "Active" : "Inactive"}
                </Badge>
                <StockBadge stock={variant.stock} threshold={variant.lowStockThreshold} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                SKU {variant.sku} · {formatCurrency(variant.price)}
                {variant.salePrice !== null && (
                  <> · sale {formatCurrency(variant.salePrice)}</>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing((id) => (id === variant.id ? null : variant.id))}
              >
                {editing === variant.id ? "Close" : "Edit"}
              </Button>
              <ActionButton action={toggleVariantAction} fields={{ id: variant.id }} variant="ghost">
                {variant.isActive ? "Deactivate" : "Activate"}
              </ActionButton>
              <ActionButton
                action={deleteVariantAction}
                fields={{ id: variant.id }}
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                confirm={`Delete variant "${variant.name}"?`}
              >
                Delete
              </ActionButton>
            </div>
          </div>

          {editing === variant.id && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <VariantForm
                productId={productId}
                variant={variant}
                onDone={() => setEditing(null)}
              />
            </div>
          )}

          <div className="mt-5">
            <TierManager variant={variant} />
          </div>
        </Card>
      ))}
    </div>
  );
}

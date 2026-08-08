"use client";

import Link from "next/link";
import { useState } from "react";
import { adjustInventoryAction, updateLowStockThresholdAction } from "@/actions/inventory";
import { Button, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { StockBadge } from "@/components/ui/status";
import { ManagedForm } from "@/components/admin/common";

export interface InventoryRowData {
  inventoryId: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
}

const ACTIONS = [
  { value: "RESTOCK", label: "Restock (add)" },
  { value: "ADJUSTMENT", label: "Adjustment (±)" },
  { value: "RETURN", label: "Return (add)" },
  { value: "DAMAGE", label: "Damage (remove)" },
];

export function InventoryRow({ row }: { row: InventoryRowData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="hover:bg-slate-50">
        <td className="px-4 py-3">
          <Link
            href={`/admin/products/${row.productId}`}
            className="font-medium text-slate-900 hover:text-brand-700"
          >
            {row.productName}
          </Link>
        </td>
        <td className="px-4 py-3 text-slate-600">{row.variantName}</td>
        <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sku}</td>
        <td className="px-4 py-3 text-right">
          <span
            className={`font-semibold tabular-nums ${
              row.stock <= 0
                ? "text-red-600"
                : row.stock <= row.lowStockThreshold
                  ? "text-amber-700"
                  : "text-slate-900"
            }`}
          >
            {row.stock}
          </span>
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-500">{row.lowStockThreshold}</td>
        <td className="px-4 py-3">
          <StockBadge stock={row.stock} threshold={row.lowStockThreshold} />
        </td>
        <td className="px-4 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Adjust"}
          </Button>
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid gap-5 lg:grid-cols-2">
              <ManagedForm action={adjustInventoryAction}>
                {({ error, state }) => {
                  if (state.ok) queueMicrotask(() => setOpen(false));
                  return (
                    <>
                      <input type="hidden" name="productVariantId" value={row.variantId} />
                      <p className="mb-3 text-sm font-semibold text-slate-900">Adjust stock</p>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div>
                          <label
                            htmlFor={`action-${row.inventoryId}`}
                            className="mb-1 block text-xs font-medium text-slate-600"
                          >
                            Action
                          </label>
                          <Select id={`action-${row.inventoryId}`} name="action" defaultValue="RESTOCK">
                            {ACTIONS.map((a) => (
                              <option key={a.value} value={a.value}>
                                {a.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label
                            htmlFor={`qty-${row.inventoryId}`}
                            className="mb-1 block text-xs font-medium text-slate-600"
                          >
                            Quantity
                          </label>
                          <Input
                            id={`qty-${row.inventoryId}`}
                            name="quantity"
                            type="number"
                            defaultValue={10}
                            required
                          />
                          {error("quantity") && (
                            <p className="mt-1 text-xs text-red-600">{error("quantity")}</p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <label
                            htmlFor={`reason-${row.inventoryId}`}
                            className="mb-1 block text-xs font-medium text-slate-600"
                          >
                            Reason
                          </label>
                          <Input
                            id={`reason-${row.inventoryId}`}
                            name="reason"
                            placeholder="Purchase order #, damage note…"
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <SubmitButton size="sm" pendingText="Applying…">
                          Apply
                        </SubmitButton>
                      </div>
                    </>
                  );
                }}
              </ManagedForm>

              <ManagedForm action={updateLowStockThresholdAction}>
                {({ error }) => (
                  <>
                    <input type="hidden" name="productVariantId" value={row.variantId} />
                    <p className="mb-3 text-sm font-semibold text-slate-900">Low stock threshold</p>
                    <div className="flex items-end gap-3">
                      <div className="w-32">
                        <Input
                          name="lowStockThreshold"
                          type="number"
                          min="0"
                          defaultValue={row.lowStockThreshold}
                          aria-label="Low stock threshold"
                        />
                        {error("lowStockThreshold") && (
                          <p className="mt-1 text-xs text-red-600">{error("lowStockThreshold")}</p>
                        )}
                      </div>
                      <SubmitButton size="sm" variant="outline" pendingText="Saving…">
                        Save
                      </SubmitButton>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Variants at or below this number are flagged as low stock.
                    </p>
                  </>
                )}
              </ManagedForm>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

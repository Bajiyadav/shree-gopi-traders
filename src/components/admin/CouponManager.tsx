"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { deleteCouponAction, saveCouponAction, toggleCouponAction } from "@/actions/coupons";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { ActionButton, ManagedForm } from "@/components/admin/common";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface CouponRow {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
}

function CouponForm({ coupon, onDone }: { coupon?: CouponRow; onDone: () => void }) {
  return (
    <ManagedForm action={saveCouponAction}>
      {({ error, state }) => {
        if (state.ok) queueMicrotask(onDone);
        return (
          <>
            {coupon && <input type="hidden" name="id" value={coupon.id} />}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Code" htmlFor="code" error={error("code")} required>
                <Input
                  id="code"
                  name="code"
                  defaultValue={coupon?.code}
                  className="font-mono uppercase"
                  placeholder="SALON10"
                  required
                />
              </Field>

              <Field label="Discount Type" htmlFor="discountType" error={error("discountType")} required>
                <Select
                  id="discountType"
                  name="discountType"
                  defaultValue={coupon?.discountType ?? "PERCENTAGE"}
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed amount (₹)</option>
                </Select>
              </Field>

              <Field label="Discount Value" htmlFor="discountValue" error={error("discountValue")} required>
                <Input
                  id="discountValue"
                  name="discountValue"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={coupon?.discountValue}
                  required
                />
              </Field>

              <Field
                label="Minimum Order (₹)"
                htmlFor="minOrderValue"
                error={error("minOrderValue")}
              >
                <Input
                  id="minOrderValue"
                  name="minOrderValue"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={coupon?.minOrderValue ?? ""}
                />
              </Field>

              <Field
                label="Maximum Discount (₹)"
                htmlFor="maxDiscount"
                error={error("maxDiscount")}
                hint="Caps a percentage discount"
              >
                <Input
                  id="maxDiscount"
                  name="maxDiscount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={coupon?.maxDiscount ?? ""}
                />
              </Field>

              <Field label="Usage Limit" htmlFor="usageLimit" error={error("usageLimit")}>
                <Input
                  id="usageLimit"
                  name="usageLimit"
                  type="number"
                  min="1"
                  defaultValue={coupon?.usageLimit ?? ""}
                />
              </Field>

              <Field label="Start Date" htmlFor="startDate" error={error("startDate")} required>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={coupon?.startDate}
                  required
                />
              </Field>

              <Field label="End Date" htmlFor="endDate" error={error("endDate")} required>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={coupon?.endDate}
                  required
                />
              </Field>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={coupon?.isActive ?? true}
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <SubmitButton size="sm" pendingText="Saving…">
                {coupon ? "Save Coupon" : "Create Coupon"}
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

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const now = new Date();

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" />
          New Coupon
        </Button>
      </div>

      {creating && (
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">New coupon</h2>
          <CouponForm onDone={() => setCreating(false)} />
        </Card>
      )}

      {coupons.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          No coupons yet. Create one to offer a discount at checkout.
        </Card>
      ) : (
        <div className="space-y-4">
          {coupons.map((coupon) => {
            const expired = new Date(coupon.endDate) < now;
            const exhausted =
              coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit;
            return (
              <Card key={coupon.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded-lg bg-slate-900 px-3 py-1 font-mono text-sm font-semibold tracking-wider text-white">
                        {coupon.code}
                      </span>
                      <Badge tone={coupon.isActive && !expired && !exhausted ? "success" : "neutral"}>
                        {!coupon.isActive
                          ? "Inactive"
                          : expired
                            ? "Expired"
                            : exhausted
                              ? "Limit reached"
                              : "Live"}
                      </Badge>
                    </div>

                    <p className="mt-3 text-sm text-slate-700">
                      <span className="font-medium">
                        {coupon.discountType === "PERCENTAGE"
                          ? `${coupon.discountValue}% off`
                          : `${formatCurrency(coupon.discountValue, { decimals: false })} off`}
                      </span>
                      {coupon.minOrderValue &&
                        ` · min order ${formatCurrency(coupon.minOrderValue, { decimals: false })}`}
                      {coupon.maxDiscount &&
                        ` · max ${formatCurrency(coupon.maxDiscount, { decimals: false })}`}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(coupon.startDate)} – {formatDate(coupon.endDate)} · used{" "}
                      {coupon.usageCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""} times
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing((id) => (id === coupon.id ? null : coupon.id))}
                    >
                      {editing === coupon.id ? "Close" : "Edit"}
                    </Button>
                    <ActionButton
                      action={toggleCouponAction}
                      fields={{ id: coupon.id }}
                      variant="ghost"
                    >
                      {coupon.isActive ? "Deactivate" : "Activate"}
                    </ActionButton>
                    <ActionButton
                      action={deleteCouponAction}
                      fields={{ id: coupon.id }}
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      confirm={`Delete coupon ${coupon.code}?`}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </div>

                {editing === coupon.id && (
                  <div className="mt-5 border-t border-slate-200 pt-5">
                    <CouponForm coupon={coupon} onDone={() => setEditing(null)} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

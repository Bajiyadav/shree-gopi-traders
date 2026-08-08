import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateBulkOrderAction } from "@/actions/bulk-orders";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status";
import { ManagedForm } from "@/components/admin/common";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Bulk Request" };

const STATUSES = ["PENDING", "REVIEWING", "QUOTED", "APPROVED", "REJECTED", "COMPLETED"] as const;

export default async function AdminBulkOrderDetailPage({ params }: { params: { id: string } }) {
  const request = await prisma.bulkOrderRequest.findUnique({
    where: { id: params.id },
    include: { customer: { include: { businessProfile: true } } },
  });
  if (!request) notFound();

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/admin/bulk-orders" className="hover:text-brand-700">
          ← Back to bulk requests
        </Link>
      </nav>

      <PageHeader
        title={request.companyName}
        description={`Received ${formatDate(request.createdAt, true)}`}
        action={<StatusBadge status={request.status} kind="bulk" />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold">Requirement</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {request.productsNote}
            </p>

            {request.additionalNotes && (
              <>
                <h3 className="mt-5 text-sm font-semibold">Additional notes</h3>
                <p className="mt-1.5 whitespace-pre-line text-sm text-slate-600">
                  {request.additionalNotes}
                </p>
              </>
            )}

            <dl className="mt-5 grid gap-4 border-t border-slate-200 pt-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Delivery location</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{request.deliveryLocation}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Expected purchase date</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {request.expectedDate ? formatDate(request.expectedDate) : "Not specified"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Update Request</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Set a quote amount before marking the request as quoted.
            </p>

            <ManagedForm action={updateBulkOrderAction} className="mt-5">
              {({ error }) => (
                <>
                  <input type="hidden" name="id" value={request.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Status" htmlFor="status" error={error("status")} required>
                      <Select id="status" name="status" defaultValue={request.status}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {humanize(s)}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field
                      label="Quoted Amount (₹)"
                      htmlFor="quotedAmount"
                      error={error("quotedAmount")}
                    >
                      <Input
                        id="quotedAmount"
                        name="quotedAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={
                          request.quotedAmount === null ? "" : String(request.quotedAmount)
                        }
                      />
                    </Field>

                    <Field
                      label="Internal / Customer Notes"
                      htmlFor="additionalNotes"
                      error={error("additionalNotes")}
                      className="sm:col-span-2"
                    >
                      <Textarea
                        id="additionalNotes"
                        name="additionalNotes"
                        rows={4}
                        defaultValue={request.additionalNotes ?? ""}
                      />
                    </Field>
                  </div>

                  <div className="mt-4">
                    <SubmitButton pendingText="Saving…">Update Request</SubmitButton>
                  </div>
                </>
              )}
            </ManagedForm>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold">Contact</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="text-slate-500">Contact person</dt>
                <dd className="font-medium text-slate-900">{request.contactPerson}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="text-slate-900">
                  <a href={`tel:${request.phone}`} className="hover:text-brand-700">
                    {request.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="break-all text-slate-900">
                  <a href={`mailto:${request.email}`} className="hover:text-brand-700">
                    {request.email}
                  </a>
                </dd>
              </div>
            </dl>

            {request.customer && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500">Registered customer</p>
                <Link
                  href={`/admin/customers/${request.customer.id}`}
                  className="mt-0.5 block text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  {request.customer.businessProfile?.businessName ?? request.customer.name}
                </Link>
              </div>
            )}
          </Card>

          {request.quotedAmount && (
            <Card className="bg-brand-50 p-5">
              <p className="text-sm text-brand-800">Current quote</p>
              <p className="mt-1 text-2xl font-semibold text-brand-900">
                {formatCurrency(Number(request.quotedAmount))}
              </p>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

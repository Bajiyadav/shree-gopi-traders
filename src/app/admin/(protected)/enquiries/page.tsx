import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteEnquiryAction, updateEnquiryStatusAction } from "@/actions/contact";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { ActionButton, FilterSelect, Toolbar } from "@/components/admin/common";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiries" };

const STATUSES = ["UNREAD", "READ", "ARCHIVED"] as const;
const PAGE_SIZE = 20;

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const q = searchParams.q?.trim();
  const status = STATUSES.includes(searchParams.status as never)
    ? (searchParams.status as (typeof STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.ContactMessageWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { businessName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { message: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [enquiries, total, unread] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { status: "UNREAD" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={`${total} message${total === 1 ? "" : "s"} · ${unread} unread`}
      />

      <Toolbar
        action="/admin/enquiries"
        searchValue={q}
        searchPlaceholder="Search name, business, email or message…"
      >
        <FilterSelect
          name="status"
          value={status}
          options={STATUSES}
          placeholder="All statuses"
          label="Filter by status"
        />
      </Toolbar>

      {enquiries.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-8 w-8" />}
          title="No enquiries found"
          description="Messages sent from the contact page appear here."
        />
      ) : (
        <div className="space-y-4">
          {enquiries.map((enquiry) => (
            <Card
              key={enquiry.id}
              className={`p-5 ${enquiry.status === "UNREAD" ? "border-l-4 border-l-amber-400" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-medium text-slate-900">
                      {enquiry.businessName ?? enquiry.name}
                    </p>
                    <StatusBadge status={enquiry.status} kind="enquiry" />
                    <span className="text-xs text-slate-500">
                      {formatDate(enquiry.createdAt, true)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {enquiry.name} ·{" "}
                    <a href={`tel:${enquiry.phone}`} className="hover:text-brand-700">
                      {enquiry.phone}
                    </a>{" "}
                    ·{" "}
                    <a href={`mailto:${enquiry.email}`} className="hover:text-brand-700">
                      {enquiry.email}
                    </a>
                  </p>

                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {enquiry.message}
                  </p>
                </div>

                <div className="flex flex-wrap items-start gap-2">
                  {enquiry.status === "UNREAD" && (
                    <ActionButton
                      action={updateEnquiryStatusAction}
                      fields={{ id: enquiry.id, status: "READ" }}
                      variant="primary"
                    >
                      Mark Read
                    </ActionButton>
                  )}
                  {enquiry.status !== "ARCHIVED" && (
                    <ActionButton
                      action={updateEnquiryStatusAction}
                      fields={{ id: enquiry.id, status: "ARCHIVED" }}
                      variant="outline"
                    >
                      Archive
                    </ActionButton>
                  )}
                  {enquiry.status === "ARCHIVED" && (
                    <ActionButton
                      action={updateEnquiryStatusAction}
                      fields={{ id: enquiry.id, status: "UNREAD" }}
                      variant="outline"
                    >
                      Reopen
                    </ActionButton>
                  )}
                  <ActionButton
                    action={deleteEnquiryAction}
                    fields={{ id: enquiry.id }}
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    confirm="Delete this enquiry permanently?"
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        baseParams={searchParams as Record<string, string | undefined>}
        basePath="/admin/enquiries"
      />
    </>
  );
}

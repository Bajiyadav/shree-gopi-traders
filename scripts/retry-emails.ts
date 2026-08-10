/**
 * Retries customer emails that failed or were skipped.
 *
 *   npm run email:retry            # retry up to 50
 *   npm run email:status           # just report, send nothing
 *
 * Exists because a mail failure must never roll back an order — the order
 * stands and the message is recoverable afterwards. Rows are reset and pushed
 * back through the normal send path, so there is one implementation of "send".
 */
import { PrismaClient } from "@prisma/client";
import { retryFailedEmails } from "../src/lib/email/send";
import { isMailConfigured, missingMailSettings, verifyTransport } from "../src/lib/email/transport";

const prisma = new PrismaClient();
const REPORT_ONLY = process.argv.includes("--status");

async function main() {
  const db = (process.env.DATABASE_URL ?? "").match(/\/([^/?]+)(\?|$)/)?.[1] ?? "local";
  console.log(`\n  Database : ${db}`);
  console.log(`  Mail     : ${isMailConfigured() ? "configured" : `NOT configured (missing: ${missingMailSettings().join(", ")})`}`);
  if (isMailConfigured()) {
    const v = await verifyTransport();
    console.log(`  SMTP     : ${v.ok ? "credentials accepted" : "rejected — " + v.detail}`);
  }

  // Let Prisma infer the shape — annotating it fights the generated types.
  try {
    const counts = await prisma.emailLog.groupBy({ by: ["status"], _count: { _all: true } });
    console.log(`  Emails   : ${counts.map((c) => `${c.status}=${c._count._all}`).join("  ") || "none yet"}`);
  } catch {
    console.log("  EmailLog table not present on this database — nothing to report.\n");
    return;
  }

  if (REPORT_ONLY) { console.log(); return; }

  const r = await retryFailedEmails();
  console.log(`\n  Retried ${r.attempted}: ${r.sent} sent, ${r.stillFailing} still failing.${"note" in r ? " " + r.note : ""}\n`);
}

main().finally(() => prisma.$disconnect());

/**
 * Rotates the admin password without touching any other data.
 *
 * Use this instead of re-running the seed, which is destructive. Safe to run
 * against production: it only writes to the Admin row.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<new strong password>' \
 *     npm run admin:set-password
 *
 * With no env vars set it falls back to whatever is in .env. The password is
 * never logged, and it is read from the environment rather than an argument
 * so it does not land in your shell history.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Rejects the obvious weak cases before they reach production. */
function assessPassword(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 12) problems.push("must be at least 12 characters");
  if (!/[a-z]/.test(password)) problems.push("needs a lowercase letter");
  if (!/[A-Z]/.test(password)) problems.push("needs an uppercase letter");
  if (!/[0-9]/.test(password)) problems.push("needs a digit");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("needs a symbol");

  const weak = ["admin", "password", "shreegopi", "12345", "qwerty", "changeme", "letmein"];
  const lower = password.toLowerCase();
  if (weak.some((w) => lower.includes(w))) {
    problems.push("must not contain an obvious word like 'admin', 'password' or '12345'");
  }
  return problems;
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must both be set.");
    process.exitCode = 1;
    return;
  }

  const problems = assessPassword(password);
  if (problems.length > 0 && process.env.ALLOW_WEAK_PASSWORD !== "1") {
    console.error(`\nRefusing to set a weak password. It ${problems.join(", ")}.`);
    console.error("Generate one with:  openssl rand -base64 24");
    console.error("Override (not recommended) with ALLOW_WEAK_PASSWORD=1\n");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.admin.findUnique({ where: { email } });

  if (existing) {
    await prisma.admin.update({ where: { email }, data: { passwordHash } });
    console.log(`Password updated for existing admin: ${email}`);
  } else {
    await prisma.admin.create({
      data: { name: "Shree Gopi Traders Admin", email, passwordHash },
    });
    console.log(`Created new admin: ${email}`);
  }

  const total = await prisma.admin.count();
  console.log(`Admin accounts in this database: ${total}`);
  if (total > 1) {
    const all = await prisma.admin.findMany({ select: { email: true } });
    console.log("  " + all.map((a) => a.email).join("\n  "));
    console.log("Remove any admin account you no longer want to have access.");
  }
  console.log("\nSign in at /admin/login — the old password no longer works.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

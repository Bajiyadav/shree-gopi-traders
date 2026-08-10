import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP transport, configured entirely from the environment.
 *
 * SMTP rather than a proprietary API so the shop can point this at whatever
 * mailbox it already owns — a business Google Workspace, Zoho, or the host's
 * mail server — without being tied to a vendor.
 *
 * Required:
 *   SMTP_HOST        e.g. smtp.zoho.in
 *   SMTP_PORT        465 for implicit TLS, 587 for STARTTLS
 *   SMTP_USER        the mailbox login
 *   SMTP_PASSWORD    an app password, never the account password
 *   MAIL_FROM        "Shree Gopi Traders <orders@yourdomain.com>"
 * Optional:
 *   MAIL_REPLY_TO    where customer replies should land
 *
 * None carry a NEXT_PUBLIC_ prefix, so Next cannot inline them into browser
 * JavaScript. Nothing here is ever logged.
 */

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  replyTo?: string;
}

/** Reads the environment. Returns null when mail is not configured. */
export function readMailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.MAIL_FROM?.trim();

  if (!host || !user || !password || !from || !Number.isFinite(port)) return null;
  return { host, port, user, password, from, replyTo: process.env.MAIL_REPLY_TO?.trim() || undefined };
}

export const isMailConfigured = () => readMailConfig() !== null;

/**
 * Which settings are missing, for an operator to act on. Deliberately reports
 * only the NAMES of absent variables — never a value, not even partially.
 */
export function missingMailSettings(): string[] {
  const need = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"] as const;
  return need.filter((k) => !process.env[k]?.trim());
}

let cached: Transporter | null = null;

export function getTransport(): Transporter | null {
  const cfg = readMailConfig();
  if (!cfg) return null;
  if (cached) return cached;

  cached = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    // 465 is implicit TLS; 587 upgrades via STARTTLS. Anything else is left to
    // the server to negotiate rather than guessed at.
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.password },
    // A hung SMTP dialogue must not hold a serverless function open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return cached;
}

/** Proves the credentials work without sending anything to anyone. */
export async function verifyTransport(): Promise<{ ok: boolean; detail: string }> {
  const t = getTransport();
  if (!t) return { ok: false, detail: `not configured (missing: ${missingMailSettings().join(", ")})` };
  try {
    await t.verify();
    return { ok: true, detail: "SMTP server accepted the credentials" };
  } catch (err) {
    return { ok: false, detail: redact(err instanceof Error ? err.message : String(err)) };
  }
}

/**
 * Strips anything credential-shaped from a provider error before it is stored
 * or logged. Mail servers sometimes echo the login back in a failure.
 */
export function redact(message: string): string {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  let out = message;
  if (user) out = out.split(user).join("[user]");
  if (pass) out = out.split(pass).join("[redacted]");
  return out.replace(/AUTH\s+\S+/gi, "AUTH [redacted]").slice(0, 400);
}

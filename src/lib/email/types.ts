/**
 * EmailKind
 *
 * The EmailLog model and EmailKind enum were designed to live in the Prisma
 * schema, but the migration has not been applied to every database (the
 * feature is opt-in). Defining the type here keeps the email subsystem fully
 * typed without requiring a schema migration to be deployed first.
 *
 * If the enum is later added to schema.prisma, replace this with:
 *   export type { EmailKind } from "@prisma/client";
 */
export type EmailKind =
  | "ORDER_CONFIRMATION"
  | "ORDER_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_OUT_FOR_DELIVERY"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED";

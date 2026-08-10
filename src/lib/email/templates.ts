import "server-only";
import type { EmailKind } from "@prisma/client";
import { siteConfig } from "@/lib/config";

/**
 * Customer emails, as plain HTML with inline styles.
 *
 * No external CSS, no web fonts, no remote images — Gmail, Outlook and most
 * Indian webmail clients strip or block all three, and a mail that depends on
 * them arrives unstyled. Tables rather than flexbox for the same reason.
 *
 * Every figure comes from the order snapshot passed in. Nothing is recomputed
 * here, so the email cannot disagree with the invoice or the order page.
 */

export interface OrderEmailData {
  orderNumber: string;
  placedAt: Date;
  contactName: string;
  businessName: string | null;
  email: string;
  status: string;
  paymentMethod: string;
  items: {
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  wholesaleSavings: number;
  couponDiscount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  shipping: { line1: string; line2?: string; city: string; state: string; pincode: string; phone?: string };
  trackingNumber?: string | null;
  courierName?: string | null;
}

const BRAND = "#6d28d9";
const INK = "#1f2937";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const dateIn = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

/** Heading, intro line and whether the money table is worth repeating. */
function copyFor(kind: EmailKind, d: OrderEmailData) {
  switch (kind) {
    case "ORDER_CONFIRMATION":
      return {
        subject: `Order ${d.orderNumber} confirmed — ${siteConfig.brandName}`,
        heading: "Order Confirmed",
        intro: `Thank you for your order. We have received it and will begin preparing it shortly.`,
        showItems: true,
      };
    case "ORDER_CONFIRMED":
      return {
        subject: `Order ${d.orderNumber} accepted — ${siteConfig.brandName}`,
        heading: "Order Accepted",
        intro: `We have checked stock and accepted your order. It is now being prepared for dispatch.`,
        showItems: true,
      };
    case "ORDER_SHIPPED":
      return {
        subject: `Order ${d.orderNumber} dispatched — ${siteConfig.brandName}`,
        heading: "Order Dispatched",
        intro: d.courierName
          ? `Your order has left our counter with ${esc(d.courierName)}.`
          : `Your order has left our counter and is on its way.`,
        showItems: false,
      };
    case "ORDER_OUT_FOR_DELIVERY":
      return {
        subject: `Order ${d.orderNumber} out for delivery — ${siteConfig.brandName}`,
        heading: "Out for Delivery",
        intro: `Your order is out for delivery today. Please keep the cash payment ready if you are paying on delivery.`,
        showItems: false,
      };
    case "ORDER_DELIVERED":
      return {
        subject: `Order ${d.orderNumber} delivered — ${siteConfig.brandName}`,
        heading: "Order Delivered",
        intro: `Your order has been delivered. Thank you for your business.`,
        showItems: false,
      };
    case "ORDER_CANCELLED":
      return {
        subject: `Order ${d.orderNumber} cancelled — ${siteConfig.brandName}`,
        heading: "Order Cancelled",
        intro: `This order has been cancelled. Nothing is payable. If this was not expected, please contact us.`,
        showItems: false,
      };
  }
}

export function renderOrderEmail(kind: EmailKind, d: OrderEmailData) {
  const c = copyFor(kind, d);
  const isCod = d.paymentMethod === "COD";

  const itemRows = d.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid ${LINE};">
          <div style="color:${INK};font-size:14px;">${esc(i.productName)}</div>
          <div style="color:${MUTED};font-size:12px;">${esc(i.variantName)} · SKU ${esc(i.sku)}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid ${LINE};text-align:center;color:${INK};font-size:14px;">${i.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid ${LINE};text-align:right;color:${MUTED};font-size:14px;">${inr(i.unitPrice)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid ${LINE};text-align:right;color:${INK};font-size:14px;font-weight:600;">${inr(i.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const money = (label: string, value: string, strong = false) => `
      <tr>
        <td colspan="3" style="padding:5px 8px;text-align:right;color:${strong ? INK : MUTED};font-size:${strong ? "15px" : "13px"};${strong ? "font-weight:700;" : ""}">${label}</td>
        <td style="padding:5px 8px;text-align:right;color:${strong ? INK : MUTED};font-size:${strong ? "15px" : "13px"};${strong ? "font-weight:700;" : ""}">${value}</td>
      </tr>`;

  const itemsBlock = c.showItems
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:22px;">
      <tr>
        <th align="left" style="padding:8px;border-bottom:2px solid ${INK};color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Product</th>
        <th align="center" style="padding:8px;border-bottom:2px solid ${INK};color:${MUTED};font-size:11px;text-transform:uppercase;">Qty</th>
        <th align="right" style="padding:8px;border-bottom:2px solid ${INK};color:${MUTED};font-size:11px;text-transform:uppercase;">Rate</th>
        <th align="right" style="padding:8px;border-bottom:2px solid ${INK};color:${MUTED};font-size:11px;text-transform:uppercase;">Amount</th>
      </tr>
      ${itemRows}
      ${money("Subtotal", inr(d.subtotal))}
      ${d.wholesaleSavings > 0 ? money("Wholesale savings", "− " + inr(d.wholesaleSavings)) : ""}
      ${d.couponDiscount > 0 ? money("Coupon discount", "− " + inr(d.couponDiscount)) : ""}
      ${money("Delivery", d.deliveryFee > 0 ? inr(d.deliveryFee) : "Free")}
      ${d.tax > 0 ? money("Tax", inr(d.tax)) : ""}
      ${money("Total", inr(d.total), true)}
    </table>`
    : "";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:10px;overflow:hidden;">

    <tr><td style="background:${BRAND};padding:20px 26px;">
      <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:.2px;">${esc(siteConfig.brandName)}</div>
      <div style="color:#ddd6fe;font-size:12px;margin-top:2px;">Salon &amp; Parlour Materials Supplier</div>
    </td></tr>

    <tr><td style="padding:26px;">
      <h1 style="margin:0;color:${INK};font-size:22px;">${c.heading}</h1>
      <p style="margin:10px 0 0;color:${MUTED};font-size:14px;line-height:1.6;">
        ${esc(d.contactName)}${d.businessName ? ` · ${esc(d.businessName)}` : ""}<br>${c.intro}
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid ${LINE};border-radius:8px;">
        <tr>
          <td style="padding:12px 14px;border-right:1px solid ${LINE};">
            <div style="color:${MUTED};font-size:11px;text-transform:uppercase;">Order</div>
            <div style="color:${INK};font-size:14px;font-weight:600;">${esc(d.orderNumber)}</div>
          </td>
          <td style="padding:12px 14px;border-right:1px solid ${LINE};">
            <div style="color:${MUTED};font-size:11px;text-transform:uppercase;">Date</div>
            <div style="color:${INK};font-size:14px;">${dateIn(d.placedAt)}</div>
          </td>
          <td style="padding:12px 14px;">
            <div style="color:${MUTED};font-size:11px;text-transform:uppercase;">Status</div>
            <div style="color:${INK};font-size:14px;">${esc(d.status.replace(/_/g, " ").toLowerCase())}</div>
          </td>
        </tr>
      </table>

      ${itemsBlock}

      ${
        isCod
          ? `<table role="presentation" width="100%" style="margin-top:20px;background:#f5f3ff;border-left:3px solid ${BRAND};">
               <tr><td style="padding:12px 14px;">
                 <div style="color:${INK};font-size:14px;font-weight:600;">Cash on Delivery — ${inr(d.total)}</div>
                 <div style="color:${MUTED};font-size:13px;margin-top:3px;">Please keep this amount ready for the delivery agent. No advance payment is required.</div>
               </td></tr>
             </table>`
          : ""
      }

      ${
        d.trackingNumber
          ? `<p style="margin:18px 0 0;color:${MUTED};font-size:13px;">Tracking: <strong style="color:${INK};">${esc(d.trackingNumber)}</strong>${d.courierName ? ` · ${esc(d.courierName)}` : ""}</p>`
          : ""
      }

      <div style="margin-top:22px;padding-top:18px;border-top:1px solid ${LINE};">
        <div style="color:${MUTED};font-size:11px;text-transform:uppercase;">Delivery address</div>
        <div style="color:${INK};font-size:14px;line-height:1.6;margin-top:4px;">
          ${d.businessName ? esc(d.businessName) + "<br>" : ""}${esc(d.shipping.line1)}${d.shipping.line2 ? "<br>" + esc(d.shipping.line2) : ""}<br>
          ${esc(d.shipping.city)}, ${esc(d.shipping.state)} — ${esc(d.shipping.pincode)}
          ${d.shipping.phone ? "<br>Phone: " + esc(d.shipping.phone) : ""}
        </div>
      </div>
    </td></tr>

    <tr><td style="background:#fafafa;padding:18px 26px;border-top:1px solid ${LINE};">
      <div style="color:${INK};font-size:13px;font-weight:600;">${esc(siteConfig.brandName)}</div>
      <div style="color:${MUTED};font-size:12px;line-height:1.7;margin-top:4px;">
        ${siteConfig.whatsappNumber ? `WhatsApp / Phone: +${esc(siteConfig.whatsappNumber)}<br>` : ""}
        ${esc(siteConfig.siteUrl)}
      </div>
      <div style="color:#9ca3af;font-size:11px;margin-top:10px;">
        You are receiving this because an order was placed with this email address.
      </div>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;

  // A text alternative keeps the mail out of spam filters that penalise
  // HTML-only messages, and it is what a screen reader gets.
  const text = [
    `${c.heading} — ${siteConfig.brandName}`,
    ``,
    `${d.contactName}${d.businessName ? ` (${d.businessName})` : ""}`,
    c.intro.replace(/<[^>]+>/g, ""),
    ``,
    `Order:  ${d.orderNumber}`,
    `Date:   ${dateIn(d.placedAt)}`,
    `Status: ${d.status.replace(/_/g, " ").toLowerCase()}`,
    ``,
    ...(c.showItems
      ? [
          ...d.items.map((i) => `  ${i.quantity} x ${i.productName} (${i.variantName}, ${i.sku}) — ${inr(i.lineTotal)}`),
          ``,
          `  Subtotal: ${inr(d.subtotal)}`,
          d.wholesaleSavings > 0 ? `  Wholesale savings: -${inr(d.wholesaleSavings)}` : "",
          `  Delivery: ${d.deliveryFee > 0 ? inr(d.deliveryFee) : "Free"}`,
          `  TOTAL: ${inr(d.total)}`,
          ``,
        ].filter(Boolean)
      : []),
    isCod ? `Cash on delivery — please keep ${inr(d.total)} ready.` : "",
    ``,
    `${siteConfig.brandName}`,
    siteConfig.whatsappNumber ? `WhatsApp / Phone: +${siteConfig.whatsappNumber}` : "",
    siteConfig.siteUrl,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject: c.subject, html, text };
}

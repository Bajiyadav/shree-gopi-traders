# Shree Gopi Traders — B2B Salon & Parlour Supplies Platform

A wholesale e-commerce and procurement platform for **salons, parlours, spas,
barbershops, makeup artists, beauty academies and retail beauty businesses** to
buy professional products, tools, equipment, furniture and consumables — with
quantity-based wholesale pricing, bulk-quote requests, inventory management,
cash on delivery, and a rolling 12-month admin analytics dashboard.

> This is a **procurement storefront, not a booking system**. There is no
> appointment, calendar or service-reservation functionality anywhere in it.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, React Server Components) |
| Language | TypeScript (strict) |
| UI | React 18 + Tailwind CSS |
| Data | Prisma ORM + PostgreSQL |
| Mutations | Server Actions (no REST/Express layer) |
| Validation | Zod on every server action |
| Auth | Signed HTTP-only cookie sessions (`jose`) + bcrypt |
| Charts | Recharts |
| Hosting | Vercel |

---

## Quick start

```bash
npm install                       # runs `prisma generate` via postinstall
cp .env.example .env              # then fill in the values (see below)
npx prisma migrate deploy         # apply migrations to your database
npm run seed                      # demo catalogue + 12 months of orders
npm run dev                       # http://localhost:3000
```

Sign-ins created by the seed:

| Role | URL | Credentials |
|---|---|---|
| Admin | `/admin/login` | `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` |
| Customer | `/login` | `demo@shreegopitraders.com` / `Demo@12345` |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run seed` | Reset + reseed the catalogue and demo data (destructive) |
| `npm run images` | Regenerate product placeholder images from the catalogue |
| `npm run test:e2e` | End-to-end verification against the database |
| `npm run test:catalog` | Catalogue verification (completeness, search, tiers) |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:studio` | Prisma Studio |

---

## Environment variables

Names only — never commit values. See `.env.example` for full descriptions.

| Variable | Required | Exposed to browser |
|---|---|---|
| `DATABASE_URL` | yes | no |
| `DIRECT_URL` | yes | no |
| `AUTH_SECRET` | yes | no |
| `ADMIN_EMAIL` | seed only | no |
| `ADMIN_PASSWORD` | seed only | no |
| `NEXT_PUBLIC_SITE_URL` | yes | **yes** |
| `NEXT_PUBLIC_BRAND_NAME` | no (defaults) | **yes** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | no | **yes** |

`AUTH_SECRET` must be 16+ characters (generate with `openssl rand -base64 32`).
In production the app **refuses to start** without it rather than falling back
to a development default.

---

## The product catalogue

`prisma/catalog-data.ts` is the single source of truth for the seeded
catalogue: **15 categories, 125 products, 301 variants, 1,123 wholesale
tiers**. The app never imports it — the storefront and admin read everything
from PostgreSQL. Editing that file and re-running `npm run seed` is how you
change the catalogue.

Each department declares a **tier profile** and a **stock profile**, so
pricing and stock behave differently by product class rather than uniformly:

| Profile | Tier bands | Max discount | Stock range | Low-stock at |
|---|---|---|---|---|
| consumable | 1–4 / 5–9 / 10–24 / 25+ | 22% | 100–1000 | 20 |
| product | 1–4 / 5–9 / 10–24 / 25+ | 20% | 20–200 | 15 |
| equipment | 1–4 / 5–9 / 10+ | 11% | 5–50 | 5 |
| furniture | 1–2 / 3–5 / 6+ | 9% | 2–20 | 2 |
| machine | 1–2 / 3–5 / 6+ | 10% | 2–15 | 2 |

SKUs are `SGT-<DEPT>-<NNN>` at product level (`SGT-HC-001`) with an appended
index per variant (`SGT-HC-001-2`). Searching a product SKU returns it.

### Images

`npm run images` generates 390 category-coded SVG placeholders into
`public/products/<category-slug>/`, three per product, and the seed stores
those paths on `Product.images`. They are **placeholders that name the
product, not brand photography**.

To use real photographs, drop them at the same paths — for example
`public/products/hair-care/professional-shampoo.svg` becomes
`…/professional-shampoo.jpg`, then update the extension in
`productImages()` in `prisma/seed.ts` and reseed. No component changes are
needed. Product images are also editable per product from the admin product
editor, which takes one URL or path per line.

### Brands and claims

Brand names are generic house names (`SGT Professional`, `Salon Pro`,
`Beauty Professional`, `Shree Gopi Professional`, `Generic Professional`).
No real manufacturer is named or implied, and the storefront makes no
authorized-distributor or "100% genuine" claims. Seeded reviews are demo
content attributed to seeded demo accounts — they are not real customer
feedback and should be cleared before launch.

---

## How the money works

This is the part worth reading before changing anything.

**The browser never decides a price.** Every figure a customer sees in the
cart, at checkout, and on the final order is recomputed on the server from the
database at the moment it is needed.

- `src/lib/pricing.ts` — resolves the per-unit price for a variant at a given
  quantity by reading its current price, its active markdown, and its wholesale
  tiers. Also validates coupons and computes the delivery fee.
- `src/lib/orders.ts` — the order-creation core. Re-reads every line, verifies
  the product and variant are active, re-checks stock **inside** the
  transaction, applies the coupon against the freshly computed subtotal, then
  creates the order, decrements inventory, writes an `InventoryTransaction`,
  creates the delivery record and clears the cart — atomically.
- `src/actions/orders.ts` — a thin authenticated wrapper that supplies the
  signed-in customer id and shapes the result for the checkout form.

### Wholesale tiers

Each `ProductVariant` owns a ladder of `WholesalePriceTier` rows. The tier with
the **highest `minQty` the quantity satisfies** wins:

| Quantity | Price / unit |
|---|---|
| 1 – 4 | ₹500 |
| 5 – 9 | ₹450 |
| 10+ | ₹400 |

Tiers may not overlap — the admin form rejects an overlapping range
(`tiersOverlap` in `src/lib/pricing.ts`). If no tier matches a quantity, the
variant's `salePrice ?? price` applies.

The product page shows a live price preview as the quantity changes. That
preview is **display only** — it mirrors the server's rule so the number does
not jump, but the server recalculates independently at add-to-cart and at
checkout.

### Order numbers

Format `SGT-YYYYMMDD-XXXX` (e.g. `SGT-20260808-0001`), sequenced per day.
Uniqueness is enforced by a unique index; the creation transaction retries on a
collision, so two simultaneous checkouts cannot produce the same number.

### Inventory

Stock can never go negative. Every movement writes an `InventoryTransaction`
(`RESTOCK` / `ORDER` / `ADJUSTMENT` / `RETURN` / `DAMAGE`) recording quantity,
reason, admin and timestamp. Cancelling an order — by the customer or an admin
— returns the reserved stock and logs a `RETURN`.

---

## Analytics

Everything on `/admin/dashboard` and `/admin/analytics` is computed live from
PostgreSQL (`src/lib/analytics.ts`). Nothing is hardcoded or cached.

**The rolling 12-month window** is derived from `new Date()` on every request:
`getLastNMonths(12)` builds twelve month boundaries ending with the current
month, so the report moves forward on its own — next month it covers a
different twelve months with no code change.

**Cancelled orders never count as revenue.** They are counted separately so the
orders chart can show delivered-versus-cancelled per month, but they contribute
zero to every revenue figure.

Reported: today / this-month / last-12-months revenue and orders, average order
value, total and new customers, delivered / cancelled / pending counts, active
products, low and out-of-stock counts, top products, top categories, top
customers, new-versus-returning customers, and an order-status breakdown.
Date filters (7d / 30d / 3m / 6m / 12m) scope the summary cards and tables; the
12-month charts stay on the rolling window by design.

Charts use a palette validated for colour-vision deficiency, and each one ships
a table view so no value is reachable only by hovering.

---

## Project structure

```
prisma/
  schema.prisma          19 models (see below)
  migrations/            committed; deploy with `prisma migrate deploy`
  catalog-data.ts        the product catalogue — 15 categories, 125 products
  seed.ts                deterministic demo data built from catalog-data
scripts/
  e2e-test.ts            end-to-end verification against a real database
  catalog-test.ts        catalogue completeness, search, filters, tiers
  generate-product-images.mjs   builds public/products/ placeholders
src/
  app/
    (storefront)/        public + customer routes
    admin/
      login/             unauthenticated
      (protected)/       everything behind requireAdmin()
    sitemap.ts robots.ts error.tsx not-found.tsx
  actions/               server actions, one module per domain
  components/
    ui/                  buttons, fields, badges, pagination, status
    layout/ products/ cart/ checkout/ orders/ account/ admin/ forms/
  lib/
    prisma.ts auth.ts pricing.ts orders.ts catalog.ts analytics.ts
    validation.ts order-number.ts config.ts utils.ts
  middleware.ts          edge guard for /admin/*
```

### Database models

`Admin`, `Customer`, `BusinessProfile`, `Address`, `Category`, `Product`,
`ProductVariant`, `WholesalePriceTier`, `Inventory`, `InventoryTransaction`,
`Cart`, `CartItem`, `Order`, `OrderItem`, `BulkOrderRequest`, `Delivery`,
`Review`, `ContactMessage`, `Coupon`.

Order items snapshot the product name, variant name, list price and charged
price, so historical orders stay accurate after a product is edited or
deactivated.

---

## Security

- Passwords hashed with bcrypt (cost 12). Sign-in runs a bcrypt comparison even
  when the account does not exist, so response timing does not reveal whether an
  email is registered.
- Sessions are signed JWTs in HTTP-only, `SameSite=Lax` cookies, `Secure` in
  production. Admin sessions expire after 8 hours, customer sessions after 30
  days. The cookie carries only an opaque id.
- `middleware.ts` is a fast redirect for `/admin/*`, **not** the authorization
  boundary: it can only verify a signature at the edge. Every admin page calls
  `requireAdmin()` and every admin action calls `requireAdminAction()`, both of
  which re-read the admin row, so a deleted account loses access immediately.
- Every cart and address mutation proves ownership before touching a row — an
  id from the client is treated as an untrusted identifier, never as
  authorization.
- Every server action validates input through a Zod schema.
- Server-only modules (`auth`, `pricing`, `orders`, `catalog`, `analytics`)
  import `server-only`, so importing one into a Client Component fails the build
  rather than shipping database code to the browser.
- No secrets are read outside `process.env`; only `NEXT_PUBLIC_*` values reach
  the browser.

---

## Deploying to Vercel

1. Create a PostgreSQL database (Neon, Supabase or Vercel Postgres).
2. Push this repository to GitHub.
3. Import the repo into Vercel — the framework preset is detected automatically.
4. Add every variable from the table above in **Settings → Environment
   Variables**. Set `NEXT_PUBLIC_SITE_URL` to the real deployed origin
   (`https://your-domain.com`), not localhost.
5. Deploy. `postinstall` runs `prisma generate`, so the client is always built
   against the current schema.
6. Apply migrations against the production database:
   ```bash
   DATABASE_URL="<prod-url>" DIRECT_URL="<prod-direct-url>" npx prisma migrate deploy
   ```
   Use `migrate deploy`, never `migrate dev`, against production.
7. Optionally seed demo data — **`npm run seed` deletes existing catalogue and
   order data**, so only run it on an empty database.
8. Sign in at `/admin/login` and change the admin password from **Settings**.
9. Point your custom domain at the project and update `NEXT_PUBLIC_SITE_URL`.

Nothing hardcodes `localhost`; `NEXT_PUBLIC_SITE_URL` falls back to `VERCEL_URL`
when unset, and to localhost only in development.

---

## Testing

`npm run test:e2e` runs 66 checks against a real database, exercising the same
modules the app runs in production — the pricing engine, the order-creation
core and the analytics engine, not reimplementations of them. It creates its own
fixtures and cleans up after itself.

Covered: wholesale tier selection at quantities 1/5/10 and at tier boundaries,
overlap rejection, order-number format and uniqueness, a full COD checkout
(totals, wholesale saving, delivery fee, inventory decrement, inventory
transaction, cart clearing), the stock guard (5 − 3 = 2, then a second order of
3 is rejected and stock is unchanged), coupon validation (percentage cap,
minimum order, expiry, unknown code), the inactive-product guard, the rolling
12-month analytics cross-checked against independent SQL aggregates, and
data-integrity invariants.

---

## Known issue — framework version

`npm audit` reports **21 advisories against Next.js 14.2.35**. 14.2.35 is the
newest release on the 14.x line, so there is no non-breaking fix; clearing them
requires upgrading to Next 16 (`npm audit fix --force`), which is a major
migration — React 19, async `cookies()` / `params` / `searchParams`, and
`useFormState` → `useActionState` across every form component. That was left as
a deliberate follow-up rather than an untested change at the end of the build.

Mitigations already in place:

- `images.remotePatterns` is **empty** — the previous `hostname: "**"` wildcard
  was the exact configuration named in the Image Optimizer DoS advisory
  (GHSA-9g9p-9gw9-jx7f). Every image the app ships is local.
- No custom server, no i18n and no Pages Router, which rules out several of the
  remaining advisories (request smuggling in rewrites, the i18n middleware
  bypass, SSRF on custom servers).
- `poweredByHeader` is off; `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` and `Permissions-Policy` are set on every response, and
  authenticated routes are `private, no-store`.

Plan the Next 16 upgrade as the first post-launch task.

## Not in V1 (architecture left ready)

Razorpay / UPI / card payments, courier tracking APIs, PDF or GST invoice
generation, email and SMS notifications, the WhatsApp Business API, and supplier
management. `PaymentMethod` and `PaymentStatus` already carry the enum values
online payments need, so adding a gateway does not require a schema migration.

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
| `npm run admin:set-password` | Rotate the admin password (safe on production) |
| `npm run demo:clear-reviews` | Remove seeded demo reviews and reset ratings |

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

### Supplying real product images

The catalogue ships with generated vector **illustrations**, not photographs.
To replace them:

1. Produce images — your own photos, licensed stock, or an AI generator. Square,
   product centred on a plain light background, product filling ~70–85% of frame.
   Keep them generic: no real brand marks (see Brands and claims above).

2. Name each file after what it should match. Most specific wins:

   | Filename | Matches |
   |---|---|
   | `professional-shampoo.png` | that one product |
   | `SGT-HC-001.png` | the product with that SKU |
   | `pump-bottle.png` | every product drawn as a pump bottle |
   | `hair-care.png` | every product in that category |

   Add `-2` / `-3` for the second and third gallery slots.
   Packaging types: `pump-bottle`, `tube`, `jar`, `dropper`, `spray-bottle`,
   `carton`, `hair-dryer`, `flat-iron`, `clipper`, `scissors`, `razor`, `chair`,
   `trolley`, `machine`, `lamp`, `polish`, `palette`, `lipstick`, `towels`,
   `box`, `brush-set`, `tools`.

3. Import:
   ```bash
   npm run images:import -- ~/my-images          # dry run — shows the plan
   npm run images:import -- ~/my-images --apply  # convert to WebP and copy
   ```

Roughly 22 images — one per packaging type — covers the whole catalogue. The
database already stores these paths, so no reseed is required; rebuild and
deploy and the new images are live.

---

### Hosted images (Cloudinary)

Images can live on a CDN instead of in the repo. `next.config.js` allows
**exactly one** remote host, `res.cloudinary.com` — never a wildcard, which
would turn the Image Optimizer into an open proxy. Any other domain renders as
a broken image, so the importer rejects it up front.

Write a mapping file, one `key,url` per line:

```
# key = product slug | SKU | packaging type | category slug
professional-shampoo,https://res.cloudinary.com/<cloud>/image/upload/v1/shampoo.jpg
professional-shampoo-2,https://res.cloudinary.com/<cloud>/image/upload/v1/shampoo-b.jpg
SGT-HC-002,https://res.cloudinary.com/<cloud>/image/upload/v1/dandruff.jpg
jar,https://res.cloudinary.com/<cloud>/image/upload/v1/generic-jar.jpg
```

```bash
npm run images:urls -- mapping.csv          # dry run — shows what would change
npm run images:urls -- mapping.csv --apply  # write Product.images
```

If you have image **files** rather than URLs, `images:cloudinary` does the
upload for you and then does everything above. Name each file after the
product it belongs to and put them all in one folder:

```
downloads/
  SGT-HC-002.jpg                 → the product with that SKU
  professional-shampoo.jpg       → the product with that slug
  professional-hair-dryer-2.png  → gallery slot 2 of that product
  jar.png                        → every product packaged as a jar
  hair-care.jpg                  → every product in that category
```

```bash
npm run images:cloudinary -- ./downloads          # dry run
npm run images:cloudinary -- ./downloads --apply  # upload, then write URLs
```

Credentials come from `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` /
`CLOUDINARY_API_SECRET` in `.env.local` (see `.env.example`). The secret signs
the upload server-side; none of the three carries a `NEXT_PUBLIC_` prefix, so
Next cannot inline them into browser JavaScript, and the storefront never calls
Cloudinary's API at all — it only loads the delivery URLs.

Files under 600px on the long edge are rejected. A product card renders around
400px and the detail view around 800px, so anything smaller is a thumbnail
rather than product photography — usually a search-result image copied by
mistake. Google Images results (`encrypted-tbn0.gstatic.com/...`) are cached
thumbnails of roughly 300px and cannot be used: they are not the original
image, they expire, and the host is not allowed by `next.config.js`. Open the
source page the result points to, check its licence, download the full-size
file from there, and put that in the folder.

`f_auto,q_auto` is injected automatically (skipped if the URL already carries
transformations). Slots you do not supply keep whatever the product already
has, so a main-image-only mapping leaves the gallery intact. Only
`Product.images` is written — prices, SKUs, stock, variants and orders are
untouched, and no reseed is involved.

The script reports which database it is pointed at. To target production,
run it with the production `DATABASE_URL` and check the dry run first.

**On sourcing:** a Google Images search returns copyrighted brand and retailer
photography by default. If you use it, filter to
**Tools → Usage Rights → Creative Commons** and verify the licence on the
source page — or start from Openverse, Pexels or Unsplash, where everything is
already cleared. Real brand packaging must not appear on this store: the
catalogue sells generic house-brand SKUs, so a photo of a named brand would
misrepresent what is being sold.

---

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

### Neon connection strings — required parameters

Both URLs need parameters beyond what the Neon dashboard hands you, or the app
fails intermittently in ways that look like unrelated bugs:

```
DATABASE_URL = postgresql://…-pooler…/neondb?sslmode=require&pgbouncer=true&connect_timeout=20
DIRECT_URL   = postgresql://…/neondb?sslmode=require&connect_timeout=20
```

| Parameter | Why |
|---|---|
| `pgbouncer=true` | **Pooled URL only.** Neon's pooled endpoint is PgBouncer in transaction mode, where Prisma's prepared statements break. |
| `connect_timeout=20` | Neon autosuspends idle compute. A cold start takes ~3s locally and longer from a Vercel region; Prisma's 5s default times out and reports "Can't reach database server". |
| `sslmode=require` | Enforces TLS. |
| ~~`channel_binding=require`~~ | Remove it. Prisma's query engine does not negotiate SCRAM channel binding, and TLS is already enforced by `sslmode`. |

The failure mode is nasty because it is *intermittent and partial*: statically
rendered pages keep serving from the last good build while every dynamic page —
the whole admin panel — returns 500. If the storefront works but `/admin`
throws, check these parameters first.

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

## Pre-launch checklist

Run through this before the site takes a real order.

1. **Set a production admin password.** Never reuse a development password.
   ```bash
   ADMIN_EMAIL=you@yourdomain.com \
   ADMIN_PASSWORD='<generate: openssl rand -base64 24>' \
   npm run admin:set-password
   ```
   This only writes to the `Admin` row, so it is safe against production —
   unlike `npm run seed`, which is destructive. It refuses passwords under 12
   characters or containing obvious words.

2. **Remove the demo reviews.** The seeded review text is placeholder content,
   not real customer feedback, and must not be presented as genuine.
   ```bash
   npm run demo:clear-reviews          # dry run — shows what would go
   npm run demo:clear-reviews -- --yes # delete and recompute ratings
   ```
   It only targets accounts on the reserved `.example` domain plus the named
   demo login, and it recomputes `ratingAvg`/`ratingCount` afterwards so no
   product is left showing stars with nothing behind them.

3. **Replace the placeholder images** — see the Images section above. The
   folder names come from the category slugs, so check them against
   `public/products/` before copying files in.

4. **Decide on demo trading data.** The 12-month order history, 33 demo
   customers and demo bulk requests make the admin dashboard look alive. Clear
   them before launch if you want the analytics to reflect only real trade.

5. **Confirm no secrets are tracked.**
   ```bash
   git ls-files | grep -E '^\.env$'   # must return nothing
   ```

6. **Plan the Next.js upgrade** as a separate, controlled task — see below.

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

## Seeing the admin dashboard with a year of trading

A new store's dashboard is all zeros, so there is no way to review the
analytics, order and billing screens — or demonstrate them — until orders
exist. `demo:orders` fills a **local** database with a plausible year of
trading:

```bash
npm run demo:orders                  # generate 12 months of orders + invoices
npm run demo:orders -- --clear       # remove everything it generated
npm run demo:orders -- --fresh       # also clear the seed's own orders, for
                                     #   one coherent history instead of two
npm run demo:orders -- --remote-demo # permit a remote *demo* database
```

It writes around 470 orders across 36 fictional salon and parlour accounts,
with invoices, deliveries and inventory movements, and prints a summary. The
catalogue is read but never modified — no product, price, wholesale tier or
stock level changes, and nothing is reseeded.

**It refuses to write to a remote database** unless two independent conditions
both hold: the database is *named* as a demo database, and `--remote-demo` is
passed explicitly. Production is called `neondb`, so it fails the first outright
and no flag can override that. Fabricated revenue in the live store could never
be told apart from real sales afterwards.

This is not real trading data and must never be presented as such. Every
account sits on `@demo.example` — RFC 2606 reserves `.example` so it can never
belong to anyone, which is also how `--clear` knows exactly what to remove.
The names are common Indian given names and surnames combined at random
against invented business names; any resemblance to a real proprietor is
coincidental.

Some detail worth knowing, because it is what makes the screens look right:

- **Quantities scale inversely with unit price.** A salon orders two styling
  chairs and ninety pairs of gloves, not sixty of each. Drawing every line
  from one range put furniture into the 25+ wholesale band and swung monthly
  revenue by over 100% on a flat order count.
- **Status depends on order age.** Anything from a previous month has been
  delivered or cancelled; only the current month still has orders in
  processing, packed or out for delivery.
- **Most accounts predate the reporting window**, with a minority joining
  during it — otherwise the early months have nobody eligible to order.
- **Seasonality** follows the Indian salon trade: festival restocking through
  September to November, wedding season November to February.

To log in locally afterwards:

```bash
ADMIN_EMAIL=admin@shreegopitraders.com ADMIN_PASSWORD='<choose one>' npm run admin:set-password
```

Then open `/admin/login` — not `/login`, which is the customer sign-in.

---

## The demo deployment

There are two deployments, and they must not be confused:

| | URL | Database | Contains |
|---|---|---|---|
| **Live** | `shree-gopi-traders.vercel.app` | `neondb` | The real store. Zero orders until a customer places one. |
| **Demo** | `shree-gopi-traders-demo.vercel.app` | `sgt_demo` | A fabricated year of trading, for showing the admin screens. |

`sgt_demo` is a separate database on the same Neon project. It shares no tables
with `neondb`, and the two deployments are separate Vercel projects with
separate `AUTH_SECRET` values, so a session on one is not valid on the other.

The demo was built by restoring a local `pg_dump` rather than by seeding over
the network — the seed makes thousands of sequential round trips and had not
finished the first step after twelve minutes against Neon, where a bulk restore
takes seconds.

To refresh the demo's trading history, point `DATABASE_URL` at `sgt_demo` and
run `npm run demo:orders -- --remote-demo --fresh`.

**This folder deploys to production.** `.vercel/` is linked to
`shree-gopi-traders`. Deploying the demo means temporarily relinking, and
relinking back afterwards. The Vercel CLI also appends `.env*` to `.gitignore`
on every `vercel link`; that line lands after `!.env.example` and, because
gitignore is last-match-wins, silently re-ignores the template. Delete it when
it reappears.

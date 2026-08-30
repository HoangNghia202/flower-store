# System Design: Catalog Feature

**Date**: 2026-08-30
**Status**: Approved (brainstorming)
**Technologies**: Next.js 16, React 19, Prisma 7 / PostgreSQL, Zustand, Tailwind CSS v4, shadcn UI
**Depends on**: Authentication + Landing page (already implemented)

---

## 1. Scope

This pass delivers the storefront product catalog:

1. **`/catalog`** — product listing: responsive grid, a **sticky filter bar** across the top, sort, text search, pagination.
2. **`/catalog/[slug]`** — product detail page: image gallery, description, price, availability, stems in the arrangement, add-to-cart with quantity.
3. **Add to cart** — working, wired to `useCartStore`, on both the card and the detail page.

### Out of scope (later passes)

- Cart drawer / cart page / cart badge in the sidebar. Add-to-cart gives inline "Added ✓" feedback only.
- Checkout.
- Admin product CRUD (and therefore `revalidateTag` wiring — see §7).
- Rewiring `featured-products.widget.tsx` to real data (still hardcoded; acceptable).
- `AppSidebar` nav cleanup and the hardcoded `user` in `StoreFrontLayout` (auth concern).
- Wishlist / favorites (the heart icon on cards is decorative).
- Reviews / ratings (the star row on cards is decorative, matching the landing widget).

---

## 2. Preconditions / fixes required

### 2.1 `StoreFrontLayout` does not render `children`

`src/_app/layout/store-front.layout.tsx` is unmodified shadcn sidebar-demo markup — it renders three `bg-muted/50` placeholder boxes and **never renders `{children}`**. Nothing on `/catalog` will appear until this is fixed.

**Fix (minimal):** replace the placeholder content region with `{children}`, wrapped in a padded, `max-w` container. Keep `<Initializer>`, `<SidebarProvider>`, `<AppSidebar>`, the header bar. Do **not** redo the sidebar nav or the hardcoded `user` object in this pass.

### 2.2 No product data in the database

Schema is migrated but `Category`, `Product`, `Stem`, `ProductStem` are empty. A seed script is required (§8).

### 2.3 Missing shadcn primitives

`src/shared/ui/` has no `select`, `popover`, or `badge`. Add them with the project's CLI:

```
npx shadcn@latest add select popover badge
```

and re-export from `src/shared/ui/index.ts` (note: `card`, `label`, `field` already exist as files but are not in the barrel — add them while there).

### 2.4 Category URL param mismatch

`categories.widget.tsx` links to `/catalog?occasion=<name>`. This design standardizes on **`?category=<slug>`**. Update the six links in `categories.widget.tsx` accordingly, and align seed category slugs to those names (Birthday, Wedding, Anniversary, Sympathy, Graduation, Just Because).

---

## 3. Architecture overview

```
app/(store-front)/catalog/page.tsx            ── re-export ──►  _pages/store-front/catalog  (listing)
app/(store-front)/catalog/[slug]/page.tsx     ── re-export ──►  _pages/store-front/catalog  (detail)
                    │
                    ▼  (server: await searchParams / params, fetch, compose)
        _pages/store-front/catalog/ui/*.page.tsx
                    │
        ┌───────────┴─────────────┐
        ▼                         ▼
 widgets/catalog-filter    widgets/catalog-products / catalog-product-detail
   .widget.tsx               .widget.tsx
        │                         │
        ▼                         ▼
 features/catalog-filter    entites/product/ui  +  features/add-to-cart
   /ui/* (client)             (ProductCard, ProductGrid, gallery)   (client)
        │                         │
        └───────────┬─────────────┘
                    ▼
        entites/product/actions/*   (import "server-only", Prisma reads)
                    ▼
        prisma/prisma-instance  ──►  PostgreSQL
```

**Layering (FSD, one-directional):** `_pages` → `widgets` → `features` / `entities` → `shared`. Entities never import features; the add-to-cart control is passed into `ProductCard` as an `actionSlot` prop and composed at the widget level (same pattern as `UserDropDownMenu`'s `logoutActionSlot`).

---

## 4. Folder layout

```
src/entites/product/
├── index.ts                        # re-exports model/ + ui/ ONLY — never actions/ (server-only)
├── model/
│   ├── index.ts
│   ├── product.model.ts            # ProductCardVM, ProductDetailVM, mapProductCard(), mapProductDetail()
│   ├── catalog-params.schema.ts    # catalogParamsSchema (zod), CatalogParams, parseCatalogParams(sp)
│   └── catalog-query.util.ts       # buildCatalogHref(current, patch) · toPrismaWhere(p) · toPrismaOrderBy(p)
├── actions/
│   ├── index.ts
│   ├── get-products.ts             # server-only; getProducts(params) → ProductListResult
│   ├── get-catalog-facets.ts       # server-only; getCatalogFacets() → { categories, colors }
│   └── get-product-by-slug.ts      # server-only; getProductBySlug(slug) → ProductDetailVM | null
└── ui/
    ├── index.ts
    ├── product-card.tsx            # <ProductCard product={ProductCardVM} actionSlot?={ReactNode} />
    ├── product-card-skeleton.tsx
    ├── product-grid.tsx            # presentational grid wrapper + empty state (maps children)
    └── product-gallery.tsx         # <ProductGallery images={string[]} name={string} /> (client, thumb switch)

src/features/catalog-filter/
├── index.ts
└── ui/
    ├── catalog-search-input.tsx    # "use client" — debounced text → ?q
    ├── catalog-sort-select.tsx     # "use client" — shadcn Select → ?sort
    ├── catalog-category-select.tsx # "use client" — shadcn Select → ?category
    ├── catalog-color-swatches.tsx  # "use client" — toggle buttons → ?color
    ├── catalog-price-filter.tsx    # "use client" — shadcn Popover, min/max inputs, debounced → ?minPrice/?maxPrice
    ├── catalog-active-pills.tsx    # "use client" — applied-filter chips + "Clear all"
    ├── catalog-filter-sheet.tsx    # "use client" — mobile <Sheet> holding category/color/price
    └── catalog-pagination.tsx      # <Link>-based page nav (server-renderable)

src/features/add-to-cart/
├── index.ts
└── ui/
    └── add-to-cart-button.tsx      # "use client" — useCartStore().addToCart; "Added ✓" for 2s; optional qty prop

src/widgets/
├── catalog-filter.widget.tsx      # sticky bar: arranges the catalog-filter feature parts + active pills
├── catalog-products.widget.tsx    # "N results" header + <ProductGrid> of <ProductCard> + <CatalogPagination>
├── catalog-product-detail.widget.tsx  # gallery + info column + stems list + <AddToCartButton qty>
└── index.ts                       # export * from the three new widgets

src/_pages/store-front/catalog/
├── index.ts                       # export { CatalogPage, ProductDetailPage }
└── ui/
    ├── catalog.page.tsx           # server: parse searchParams → getProducts + getCatalogFacets → compose widgets
    └── product-detail.page.tsx    # server: await params → getProductBySlug → notFound() | compose detail widget

app/(store-front)/catalog/
├── page.tsx                       # existing re-export; add `metadata`
├── loading.tsx                    # skeleton grid (listing)
└── [slug]/
    └── page.tsx                   # re-export ProductDetailPage; add `generateMetadata`

prisma/
└── seed.ts                        # seed Category + Stem + Product + ProductStem
```

---

## 5. Filter mechanism (URL is the single source of truth)

### 5.1 Query parameters

```
/catalog?category=birthday&color=red&minPrice=100000&maxPrice=500000&sort=price-asc&q=rose&page=2
```

| Param | Type | Prisma effect |
|---|---|---|
| `category` | `Category.slug`, single | `where.category = { slug }` |
| `color` | `Stem.color`, single (case-insensitive) | `where.stems = { some: { stem: { color: { equals, mode: "insensitive" } } } }` |
| `minPrice` / `maxPrice` | int VND | `where.price = { gte?, lte? }` |
| `sort` | `newest` \| `price-asc` \| `price-desc` \| `featured` (default `newest`) | `orderBy` |
| `q` | string 1–100 | `where.name = { contains, mode: "insensitive" }` |
| `page` | int ≥ 1 (default 1), page size **12** | `skip`, `take` |

Single-select for `category` and `color` in v1 (multi-select is a later enhancement — the util and schema should not make multi hard to add).

### 5.2 Parsing — `catalog-params.schema.ts`

```ts
export const catalogParamsSchema = z.object({
  category: z.string().trim().min(1).optional(),
  color:    z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort:     z.enum(["newest", "price-asc", "price-desc", "featured"]).catch("newest").default("newest"),
  q:        z.string().trim().min(1).max(100).optional(),
  page:     z.coerce.number().int().min(1).catch(1).default(1),
});
export type CatalogParams = z.infer<typeof catalogParamsSchema>;

export function parseCatalogParams(sp: Record<string, string | string[] | undefined>): CatalogParams {
  const flat = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  return catalogParamsSchema.parse(flat); // `.catch()` on brittle fields ⇒ never throws on junk input
}
```

If `minPrice > maxPrice`, `toPrismaWhere` swaps them.

### 5.3 URL rewriting — `buildCatalogHref`

```ts
buildCatalogHref(current: CatalogParams, patch: Partial<CatalogParams>): string
```

Merges `patch` onto `current`, **resets `page` to 1** whenever any non-`page` key changes, drops keys equal to their default/undefined, returns `"/catalog?..."`. Every client control calls it, then `router.push(href, { scroll: false })` inside `startTransition`.

### 5.4 Client controls behaviour

- **Search** and **price**: debounced ~400 ms before `router.push`.
- **Sort / category / color / pagination**: immediate.
- Pagination and (where practical) sort/category render as `<Link href={buildCatalogHref(...)}>` so they work without JS and prefetch.
- Pending feedback: rely on App Router keeping the current grid mounted until the new RSC payload resolves. No cross-widget dimming in v1 (see §3 note; a Zustand `catalogPending` flag is the documented later add).

---

## 6. Data access (`entites/product/actions/`)

All three files start with `import "server-only"`. They are plain async functions (reads called from Server Components), **not** `"use server"` actions.

### 6.1 `getProducts(params: CatalogParams): Promise<ProductListResult>`

```ts
interface ProductListResult {
  items: ProductCardVM[];
  total: number;
  page: number;
  pageCount: number;
}
```

- `where = toPrismaWhere(params)`, `orderBy = toPrismaOrderBy(params)` (from `catalog-query.util.ts`).
- `Promise.all([prisma.product.findMany({ where, orderBy, skip, take: 12, select: {...}, include: undefined }), prisma.product.count({ where })])`.
- `select`: `id, name, slug, price, images, stock, isFeatured` + `category: { select: { name: true, slug: true } }`.
- Map rows through `mapProductCard()`.
- `pageCount = Math.max(1, Math.ceil(total / 12))`; if `params.page > pageCount`, still return the (empty) page — the widget shows the empty state.

### 6.2 `getCatalogFacets(): Promise<{ categories: CategoryOption[]; colors: string[] }>`

- `prisma.category.findMany({ select: { name, slug }, orderBy: { name: "asc" } })`.
- Distinct stem colors: `prisma.stem.findMany({ distinct: ["color"], select: { color: true }, orderBy: { color: "asc" } })` → `string[]`.

### 6.3 `getProductBySlug(slug: string): Promise<ProductDetailVM | null>`

- `prisma.product.findUnique({ where: { slug }, select: { ...all display fields, category: { select: { name, slug } }, stems: { select: { quantity, stem: { select: { name, color } } } } } })`.
- Returns `null` when not found; the page calls `notFound()`.

### 6.4 View models (`product.model.ts`)

```ts
type ProductCardVM = {
  id: string; name: string; slug: string; price: number;
  image: string;           // images[0] ?? "/placeholder-flower.svg"
  images: string[];
  inStock: boolean;        // stock > 0
  isFeatured: boolean;
  categoryName: string;
};

type ProductDetailVM = ProductCardVM & {
  description: string;
  categorySlug: string;
  stock: number;
  stems: { name: string; color: string; quantity: number }[];
};
```

Mapping functions keep the Prisma types out of `widgets/` and client components.

---

## 7. Caching (Next.js 16)

- `getProducts` and `getCatalogFacets` use `"use cache"` with `cacheTag("products")` (+ `cacheTag("categories")` for facets) and `cacheLife("minutes")`.
- `getProductBySlug` uses `"use cache"`, `cacheTag("products")`, `cacheTag(\`product:\${slug}\`)`, `cacheLife("hours")`.
- No `revalidateTag` caller exists yet (admin CRUD is out of scope). Document the tags so the admin pass can call `revalidateTag("products", "max")`.
- `app/(store-front)/catalog/page.tsx` stays dynamic (reads `searchParams`); caching happens at the data-function layer, not the route.
- Before writing any of this, **read `node_modules/next/dist/docs/`** for the current `use cache` / `cacheLife` / `cacheTag` signatures (per `AGENTS.md`) — the exact `cacheLife` profile arg and import path must be verified, not assumed.

---

## 8. Seed data (`prisma/seed.ts`)

- **6 categories**: Birthday, Wedding, Anniversary, Sympathy, Graduation, Just Because (slugs kebab-cased). Matches `categories.widget.tsx`.
- **~10 stems** with realistic `color` values covering the swatch set: Red Rose (red), Pink Rose (pink), White Lily (white), Yellow Tulip (yellow), Purple Orchid (purple), Sunflower (yellow), Baby's Breath (white), Peony (pink), Lavender (purple), Carnation (red). `stock` 40–200, `criticalMin` 10.
- **~18–24 products** spread across categories: `name`, unique `slug`, `description` (1–2 sentences), `price` (150 000–900 000), `images: []` (empty ⇒ card/gallery fall back to `/placeholder-flower.svg`), `stock` (a few at `0` to exercise the out-of-stock state), `isFeatured` on ~4, each linked to a category and 2–4 `ProductStem` rows.
- Script is **idempotent**: `upsert` by unique `slug` / `name`, or `deleteMany` + `createMany` guarded to dev. Wrap in a `main().finally(() => prisma.$disconnect())`.
- **Runner**: add `tsx` to devDependencies. Register the seed for Prisma 7 in `prisma.config.ts` (Prisma 7 moved seed config out of `package.json#prisma`). Also add `"db:seed": "tsx prisma/seed.ts"` to `package.json` scripts as a direct fallback. Verify the exact `prisma.config.ts` seed key against `node_modules/prisma` docs before finalizing.
- Add `public/placeholder-flower.svg` (simple flower silhouette on a soft gradient, matches the landing palette).

---

## 9. UI layout

### 9.1 `/catalog` (matches the agreed wireframe)

```
Catalog                                            N results          ◄ catalog-products.widget header
╞═══ sticky top-0, bg-background/80 backdrop-blur, border-b, z-30 ═══╡  ◄ catalog-filter.widget
│ [🔍 search…]  [Category ▾]  ●●●● colors  [Price ▾]      [Sort ▾]   │
│ Birthday ✕   Red ✕   under 500k ✕                     Clear all    │  ◄ catalog-active-pills (only if any set)
╘══════════════════════════════════════════════════════════════════╛
grid  grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4  gap-4 md:gap-6  py-6
  ┌ ProductCard ┐ ┌ ProductCard ┐ ┌ ProductCard ┐ ┌ ProductCard ┐
  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
                       ‹ 1  2  3 … ›                                   ◄ catalog-pagination
```

- **Sticky bar wrapper**: `sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/80 backdrop-blur border-b border-border` — sits directly under the layout's `h-16` app header.
- **Desktop (`md+`)**: search (`flex-1 max-w-xs`) · Category `Select` · color swatch row · Price `Popover` · spacer · Sort `Select`.
- **Mobile (`<md`)**: search + a **Filters** button opening `catalog-filter-sheet.tsx` (`<Sheet>` with category / colors / price); Sort stays inline as a compact `Select`.
- **Active pills**: second wrapped line, only when ≥1 filter set; each chip is a `<Link>` removing that one param; "Clear all" → `/catalog`.
- **Empty state** (`total === 0`): centered message + "Clear all filters" `<Link>`.

### 9.2 `ProductCard`

Visual style follows `featured-products.widget.tsx` (rounded-2xl, `border-pink-100`, hover lift `-translate-y-1`, gradient image area) but bound to real data:

- Image: `next/image` with `product.image`; if it's the placeholder, render the gradient + a flower glyph instead.
- `isFeatured` ⇒ small badge top-left. `!inStock` ⇒ greyed image + "Out of stock" badge, add-to-cart disabled.
- Name (links to `/catalog/[slug]`), `categoryName` (muted), price `price.toLocaleString("vi-VN") + "₫"`.
- Decorative star row + heart icon (non-functional, consistent with the landing widget).
- Footer: `actionSlot` (the page passes `<AddToCartButton product={...} />`).

### 9.3 `/catalog/[slug]` — `catalog-product-detail.widget.tsx`

```
┌ 2-col on lg, stacked on mobile ─────────────────────────────┐
│  ProductGallery                 Name                        │
│  ┌───────────────┐              Category · (Featured)       │
│  │   main image  │              price.toLocaleString ₫      │
│  └───────────────┘              In stock / Out of stock     │
│  ▢ ▢ ▢ thumbnails              description                  │
│                                ── Stems in this arrangement │
│                                • 5× Red Rose (red)          │
│                                • 3× Baby's Breath (white)   │
│                                [ − 1 + ]  [ Add to cart ]   │
└────────────────────────────────────────────────────────────┘
```

- `ProductGallery` (client): main image + thumbnail strip from `images`; placeholder fallback when `images` is empty.
- Quantity stepper (local `useState`, min 1, max `stock`) feeds `<AddToCartButton product qty />`.
- Stems list from `product.stems` (`{quantity}× {name} ({color})`); hidden if empty.
- `notFound()` when slug unknown ⇒ Next default 404 within the store-front layout.
- No "related products" section in v1.

### 9.4 `add-to-cart-button.tsx`

```ts
const addToCart = useCartStore((s) => s.addToCart);
// onClick: addToCart({ id, name, slug, price, image, quantity: qty ?? 1 }, qty ?? 1)
// then setAdded(true); setTimeout(() => setAdded(false), 2000)
```

Button label swaps to "Added ✓" for 2 s. Disabled when `!inStock`. No toast, no drawer (out of scope).

---

## 10. Metadata

- `app/(store-front)/catalog/page.tsx`: static `export const metadata = { title: "Catalog | Bloom", description: "..." }`.
- `app/(store-front)/catalog/[slug]/page.tsx`: `export async function generateMetadata({ params })` — `await params`, `getProductBySlug`, return `{ title: \`\${product.name} | Bloom\`, description: product.description.slice(0, 155) }`; fall back to a generic title when `null`.
- `generateStaticParams` for `[slug]`: optional — prerender featured product slugs only. Acceptable to omit in v1.

---

## 11. Error / edge handling

| Case | Behaviour |
|---|---|
| Junk query params (`?page=abc`, `?sort=xyz`) | `.catch()`/`.coerce` in the zod schema ⇒ silently fall back to defaults, never 500 |
| `minPrice > maxPrice` | `toPrismaWhere` swaps them |
| `page` beyond last page | Returns empty page ⇒ empty-state UI (with active filters still shown so the user can back off) |
| Unknown `category` / `color` slug | Valid query, simply matches 0 rows ⇒ empty state |
| Unknown product slug | `notFound()` ⇒ 404 |
| Product with `images: []` | `/placeholder-flower.svg` + gradient treatment |
| `stock === 0` | Card & detail: "Out of stock", add-to-cart disabled; product still browsable |
| DB unreachable | Error bubbles to the nearest error boundary; add `app/(store-front)/catalog/error.tsx` is **optional** (Next default error UI acceptable in v1) |

---

## 12. Testing

No test runner is configured in this repo. Verification for this feature:

1. `npm run lint` — clean.
2. `npx tsc --noEmit` — clean (the build itself ignores TS errors, so this must be run explicitly).
3. `npm run build` — succeeds.
4. Manual (`npm run dev`) against seeded data:
   - `/catalog` renders the grid; each filter (category, color, price, sort, search) updates results and the URL; back/forward restores state; reload of a filtered URL shows the same results (SSR).
   - Pagination works; page resets to 1 when a filter changes.
   - Empty state shows for an over-constrained filter set; "Clear all" recovers.
   - Mobile width: Filters sheet opens and applies.
   - `/catalog/[slug]` for a known slug renders gallery + stems + quantity + add-to-cart; unknown slug ⇒ 404.
   - Add-to-cart updates `useCartStore` (verify via `localStorage["flower-cart-storage"]`); "Added ✓" appears; disabled when out of stock.
   - Out-of-stock product shows correctly in both places.

If a lightweight unit test is warranted, target the pure functions in `catalog-params.schema.ts` and `catalog-query.util.ts` (`parseCatalogParams`, `buildCatalogHref`, `toPrismaWhere`) — but adding a test runner is itself out of scope unless requested.

---

## 13. Known follow-ups (explicitly deferred)

1. Cart drawer + sidebar cart badge + cart page.
2. `revalidateTag("products")` from an admin product-CRUD pass.
3. Rewire `featured-products.widget.tsx` (and the category counts in `categories.widget.tsx`) to real DB data.
4. `AppSidebar` real nav + `StoreFrontLayout` reading the authed user from `useUserStore` instead of the hardcoded object.
5. Multi-select category/color, "in stock only" toggle, cross-widget pending dim (Zustand `catalogPending`).
6. Wishlist/favorites (card heart), reviews/ratings (card stars).
7. `generateStaticParams` + ISR tuning for `/catalog/[slug]`.

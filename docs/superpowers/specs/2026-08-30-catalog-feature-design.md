# System Design: Catalog Feature

**Date**: 2026-08-30
**Status**: Approved (brainstorming)
**Technologies**: Next.js 16, React 19, Prisma 7 / PostgreSQL, Zustand, Tailwind CSS v4, shadcn UI
**Depends on**: Authentication + Landing page (already implemented)

---

## 1. Scope

This pass delivers the storefront product catalog:

1. **`/catalog`** — product listing: responsive uniform-height grid with **infinite scroll**, a **sticky filter bar** across the top, sort, text search.
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
- List **virtualization** (`@tanstack/react-virtual` / `masonic`). Not needed at the expected catalog size (tens–hundreds of products). Offscreen render cost is handled by `content-visibility: auto` + `React.memo` (§9). Virtualization becomes a follow-up only if the catalog grows to thousands (§13).
- True variable-height **masonry**. Cards are uniform height (fixed image aspect ratio + clamped text), so the layout is a plain responsive grid.
- Shareable/restorable scroll position — infinite scroll state is not encoded in the URL (same as Pinterest).

---

## 2. Preconditions / fixes required

### 2.1 `StoreFrontLayout` does not render `children`

`src/_app/layout/store-front.layout.tsx` is unmodified shadcn sidebar-demo markup — it renders three `bg-muted/50` placeholder boxes and **never renders `{children}`**. Nothing on `/catalog` will appear until this is fixed.

**Fix (minimal):** replace the placeholder content region with `{children}`, wrapped in a padded, `max-w` container. Keep `<Initializer>`, `<SidebarProvider>`, `<AppSidebar>`, the header bar. Do **not** redo the sidebar nav or the hardcoded `user` object in this pass.

### 2.2 No product data in the database

Schema is migrated but `Category`, `Product`, `Stem`, `ProductStem` are empty. A seed script is required (§8).

### 2.3 Missing shadcn primitives

`src/shared/ui/` has no `select`, `popover`, or `badge`. Add them with the project's pinned CLI (`shadcn` 4.11 is already a dependency; `components.json` style is `radix-vega`, alias `ui → @/shared/ui`):

```
npx shadcn add select popover badge
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
 features/catalog-filter    features/product-feed/ui/product-feed.tsx  ("use client")
   /ui/* (client)             │  IntersectionObserver sentinel → load-more.action.ts ("use server")
        │                     ▼
        │              entites/product/ui  +  features/add-to-cart
        │                (ProductCard [memo], ProductGrid, gallery)   (client)
        │                         │
        └───────────┬─────────────┘
                    ▼
        entites/product/actions/*   (import "server-only", Prisma reads, cursor-based)
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
│   ├── get-products.ts             # server-only; getProducts(query) → ProductPage { items, nextCursor, total }
│   ├── get-catalog-facets.ts       # server-only; getCatalogFacets() → { categories, colors }
│   └── get-product-by-slug.ts      # server-only; getProductBySlug(slug) → ProductDetailVM | null
└── ui/
    ├── index.ts
    ├── product-card.tsx            # React.memo; <ProductCard product={ProductCardVM} actionSlot?={ReactNode} />
    ├── product-card-skeleton.tsx
    ├── product-grid.tsx            # presentational: just the responsive grid <div> around {children}
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
    └── catalog-filter-sheet.tsx    # "use client" — mobile <Sheet> holding category/color/price

src/features/product-feed/
├── index.ts
├── actions/
│   ├── index.ts
│   └── load-more.action.ts         # "use server" — loadMoreProducts(query, cursor) → ProductPage
└── ui/
    └── product-feed.tsx            # "use client" — initialItems/initialCursor/query props; accumulates items;
                                    #   IntersectionObserver sentinel triggers loadMoreProducts; renders
                                    #   <ProductGrid> of <ProductCard>; "You've seen all N" end state

src/features/add-to-cart/
├── index.ts
└── ui/
    └── add-to-cart-button.tsx      # "use client" — useCartStore().addToCart; "Added ✓" for 2s; optional qty prop

src/widgets/
├── catalog-filter.widget.tsx      # sticky bar: arranges the catalog-filter feature parts + active pills
├── catalog-products.widget.tsx    # "N results" header + <ProductFeed initialItems initialCursor query />
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
/catalog?category=birthday&color=red&minPrice=100000&maxPrice=500000&sort=price-asc&q=rose
```

| Param | Type | Prisma effect |
|---|---|---|
| `category` | `Category.slug`, single | `where.category = { slug }` |
| `color` | `Stem.color`, single (case-insensitive) | `where.stems = { some: { stem: { color: { equals, mode: "insensitive" } } } }` |
| `minPrice` / `maxPrice` | int VND | `where.price = { gte?, lte? }` |
| `sort` | `newest` \| `price-asc` \| `price-desc` \| `featured` (default `newest`) | `orderBy` |
| `q` | string 1–100 | `where.name = { contains, mode: "insensitive" }` |

**No `page` param.** Paging is infinite-scroll with a **cursor** that lives only in client state / server-action args, never in the URL. Page size **24**.

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
});
export type CatalogParams = z.infer<typeof catalogParamsSchema>;

export function parseCatalogParams(sp: Record<string, string | string[] | undefined>): CatalogParams {
  const flat = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  return catalogParamsSchema.parse(flat); // `.catch()` on brittle fields ⇒ never throws on junk input
}
```

`CatalogParams` is passed intact from the server component into `<ProductFeed>` and back through `loadMoreProducts` — it is the stable feed identity. If `minPrice > maxPrice`, `toPrismaWhere` swaps them.

### 5.3 URL rewriting — `buildCatalogHref`

```ts
buildCatalogHref(current: CatalogParams, patch: Partial<CatalogParams>): string
```

Merges `patch` onto `current`, drops keys equal to their default/undefined, returns `"/catalog?..."`. Every client control calls it, then `router.push(href, { scroll: false })` inside `startTransition`.

### 5.4 Client controls behaviour

- **Search** and **price**: debounced ~400 ms before `router.push`.
- **Sort / category / color**: immediate.
- Where practical, sort/category render as `<Link href={buildCatalogHref(...)}>` so they work without JS and prefetch.
- A filter change rewrites the URL ⇒ the server component re-renders with fresh page-1 data and a new `key={serialize(params)}` on `<ProductFeed>`, which **remounts the feed** (accumulated items + cursor discarded, scroll returns to top).
- Pending feedback: rely on App Router keeping the current grid mounted until the new RSC payload resolves. No cross-widget dimming in v1 (see §3 note; a Zustand `catalogPending` flag is the documented later add).

### 5.5 Infinite scroll — `features/product-feed/`

- **First page**: rendered on the server by `catalog-products.widget.tsx` (SSR HTML — SEO + fast paint). It calls `getProducts(params)` and passes `initialItems`, `initialCursor`, `query=params` to `<ProductFeed>`.
- **`product-feed.tsx`** (`"use client"`): state `= { items: initialItems, cursor: initialCursor, done: !initialCursor, loading: false }`. An `IntersectionObserver` on a bottom sentinel `<div>` (rootMargin ~600px) calls `loadMoreProducts(query, cursor)` when it enters view; results append; `cursor`/`done` update. Guard against concurrent calls with the `loading` flag.
- **`load-more.action.ts`** (`"use server"`): `loadMoreProducts(query: CatalogParams, cursor: string) => ProductPage`; thin wrapper over `getProducts({ ...query, cursor })`. Returns plain serializable VMs.
- **End state**: when `done`, render "You've seen all {total} arrangements" instead of the sentinel.
- **Errors**: a failed `loadMoreProducts` shows an inline "Couldn't load more — Retry" button; does not unmount existing items.
- **No-JS**: only the SSR first 24 render; acceptable for v1 (documented, not fixed).
- **Rendering cost**: `ProductCard` is `React.memo`; each card wrapper gets `content-visibility: auto` + `contain-intrinsic-size` so offscreen cards cost ~nothing to keep mounted. No virtualization library (§1 out-of-scope).

---

## 6. Data access (`entites/product/actions/`)

The three `entites/product/actions/` files start with `import "server-only"`. They are plain async functions (reads called from Server Components), **not** `"use server"` actions. The one `"use server"` action in this feature is `loadMoreProducts` in `features/product-feed/actions/` (§6.5), which the client feed calls directly.

### 6.1 `getProducts(query: CatalogQuery): Promise<ProductPage>`

```ts
type CatalogQuery = CatalogParams & { cursor?: string };

interface ProductPage {
  items: ProductCardVM[];
  nextCursor: string | null;   // null ⇒ no more pages
  total: number;               // count for the whole filtered set (for the "N results" header + end state)
}
```

- `where = toPrismaWhere(query)`, `orderBy = toPrismaOrderBy(query)` (from `catalog-query.util.ts`). `orderBy` is always **compound with a tiebreaker on `id`** so the cursor is stable: `newest → [{createdAt:"desc"},{id:"desc"}]`, `price-asc → [{price:"asc"},{id:"asc"}]`, etc.
- **Cursor** = opaque base64 of the last row's sort key(s) + `id` (e.g. `{ createdAt, id }` or `{ price, id }`). `catalog-query.util.ts` provides `encodeCursor(row, sort)` / `decodeCursor(str)`. When `query.cursor` is set, translate it to a Prisma `cursor: { id }` + `skip: 1` (Prisma's native cursor pagination), keeping the same `orderBy`.
- Page size `TAKE = 24`. Fetch `TAKE + 1` rows; if `TAKE + 1` came back, `nextCursor = encodeCursor(items[TAKE - 1])` and drop the extra row; else `nextCursor = null`.
- `total`: `prisma.product.count({ where })`. Runs on every call for simplicity (cheap at this data size). If it ever matters, the plan can add a fast path that skips the count when `query.cursor` is set — the feed already has `total` from page 1 and doesn't use the value returned by later pages.
- `select`: `id, name, slug, price, images, stock, isFeatured, createdAt` + `category: { select: { name: true, slug: true } }`.
- Map rows through `mapProductCard()`.

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

### 6.5 `loadMoreProducts(query, cursor)` (`features/product-feed/actions/load-more.action.ts`)

```ts
"use server";
export async function loadMoreProducts(query: CatalogParams, cursor: string): Promise<ProductPage> {
  const parsed = catalogParamsSchema.parse(query);        // re-validate — client input crosses the boundary
  return getProducts({ ...parsed, cursor });
}
```

- Re-validates `query` with the same zod schema — the argument arrives from the client and must not be trusted.
- No auth check needed (public catalog).
- Returns the same `ProductPage` shape; `nextCursor: null` tells the feed to stop.

---

## 7. Caching (Next.js 16)

- `getProducts` and `getCatalogFacets` use `"use cache"` with `cacheTag("products")` (+ `cacheTag("categories")` for facets) and `cacheLife("minutes")`. `getProducts` is cache-keyed by its full argument object including `cursor`, so each scroll page caches independently; it is called both from the server component (first page) and from inside the `loadMoreProducts` server action (subsequent pages) — verify `"use cache"` is permitted in a function invoked from a `"use server"` action against the Next docs; if not, drop `"use cache"` from `getProducts` and keep the reads dynamic.
- `getProductBySlug` uses `"use cache"`, `cacheTag("products")`, `cacheTag(\`product:\${slug}\`)`, `cacheLife("hours")`.
- No `revalidateTag` caller exists yet (admin CRUD is out of scope). Document the tags so the admin pass can call `revalidateTag("products", "max")`.
- `app/(store-front)/catalog/page.tsx` stays dynamic (reads `searchParams`); caching happens at the data-function layer, not the route.
- Before writing any of this, **read `node_modules/next/dist/docs/`** for the current `use cache` / `cacheLife` / `cacheTag` signatures (per `AGENTS.md`) — the exact `cacheLife` profile arg and import path must be verified, not assumed.

---

## 8. Seed data (`prisma/seed.ts`)

- **6 categories**: Birthday, Wedding, Anniversary, Sympathy, Graduation, Just Because (slugs kebab-cased). Matches `categories.widget.tsx`.
- **~10 stems** with realistic `color` values covering the swatch set: Red Rose (red), Pink Rose (pink), White Lily (white), Yellow Tulip (yellow), Purple Orchid (purple), Sunflower (yellow), Baby's Breath (white), Peony (pink), Lavender (purple), Carnation (red). `stock` 40–200, `criticalMin` 10.
- **~55–60 products** spread across categories (enough for ≥3 infinite-scroll pages at 24/page, and multiple pages per single-category filter): `name`, unique `slug`, `description` (1–2 sentences), `price` (150 000–900 000, with some deliberate ties to exercise the cursor tiebreaker), `images: []` (empty ⇒ card/gallery fall back to `/placeholder-flower.svg`), `stock` (several at `0` for the out-of-stock state), `isFeatured` on ~6, each linked to a category and 2–4 `ProductStem` rows. Generate names by combining an adjective/flower/occasion word list rather than hand-writing 60 rows.
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
grid  grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5  gap-4  py-6
  ┌ ProductCard ┐ ┌ ProductCard ┐ ┌ ProductCard ┐ ┌ ProductCard ┐ ┌ ProductCard ┐
  │ aspect-[4/5]│ │             │ │             │ │             │ │             │   ◄ uniform height,
  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     content-visibility:auto
          … more rows appended on scroll …
  [ sentinel ]  → IntersectionObserver → loadMoreProducts        ◄ features/product-feed
  "You've seen all N arrangements"   (when nextCursor === null)
```

- **Sticky bar wrapper**: `sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/80 backdrop-blur border-b border-border` — sits directly under the layout's `h-16` app header.
- **Desktop (`md+`)**: search (`flex-1 max-w-xs`) · Category `Select` · color swatch row · Price `Popover` · spacer · Sort `Select`.
- **Mobile (`<md`)**: search + a **Filters** button opening `catalog-filter-sheet.tsx` (`<Sheet>` with category / colors / price); Sort stays inline as a compact `Select`.
- **Active pills**: second wrapped line, only when ≥1 filter set; each chip is a `<Link>` removing that one param; "Clear all" → `/catalog`.
- **Grid**: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4`. Every card is uniform height; each card wrapper carries `style={{ contentVisibility: "auto", containIntrinsicSize: "<w> <h>" }}` (Tailwind arbitrary `[content-visibility:auto]` is fine too).
- **Feed**: the initial 24 cards are SSR HTML inside `<ProductFeed>`; a bottom sentinel + `IntersectionObserver` appends the next 24 via `loadMoreProducts`. Loading row shows 4–5 `<ProductCardSkeleton>`. End line replaces the sentinel when `nextCursor === null`. Inline "Couldn't load more — Retry" on error.
- **Empty state** (`total === 0`): centered message + "Clear all filters" `<Link>`, rendered by the widget instead of `<ProductFeed>`.

### 9.2 `ProductCard`

Visual style follows `featured-products.widget.tsx` (rounded-2xl, `border-pink-100`, hover lift `-translate-y-1`, gradient image area) but bound to real data:

- **Uniform height** — this is what makes infinite scroll cheap. Image area is a fixed `aspect-[4/5]`; name is `line-clamp-1`; the meta/price/action rows are fixed height. No card is taller than another, so the grid needs no masonry and `content-visibility` estimates stay accurate.
- Wrapped in `React.memo` — re-renders of `<ProductFeed>` when appending a page must not re-render the existing cards.
- Image: `next/image` with `product.image`, explicit `sizes` (`"(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"`), lazy (default); if it's the placeholder, render the gradient + a flower glyph instead.
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
| Junk query params (`?sort=xyz`, `?minPrice=abc`) | `.catch()`/`.coerce` in the zod schema ⇒ silently fall back to defaults, never 500 |
| `minPrice > maxPrice` | `toPrismaWhere` swaps them |
| Filter changed mid-scroll | URL rewrite ⇒ new `key` ⇒ `<ProductFeed>` remounts with fresh page 1; accumulated items + cursor discarded |
| `loadMoreProducts` rejects (network / server) | Existing items stay; inline "Couldn't load more — Retry" button; sentinel observer paused until retry |
| Stale cursor (row deleted between pages) | Prisma `cursor: { id }` + `skip: 1` tolerates it — you may miss/repeat at most one item; acceptable for a catalog |
| Scrolled to the end | `nextCursor === null` ⇒ observer disconnected, "You've seen all N" line shown |
| Unknown `category` / `color` slug | Valid query, simply matches 0 rows ⇒ empty state |
| Unknown product slug | `notFound()` ⇒ 404 |
| Product with `images: []` | `/placeholder-flower.svg` + gradient treatment |
| `stock === 0` | Card & detail: "Out of stock", add-to-cart disabled; product still browsable |
| JS disabled | Only the SSR first 24 render; no "load more". Acceptable for v1 |
| DB unreachable | Error bubbles to the nearest error boundary; `app/(store-front)/catalog/error.tsx` is **optional** (Next default error UI acceptable in v1) |

---

## 12. Testing

No test runner is configured in this repo. Verification for this feature:

1. `npm run lint` — clean.
2. `npx tsc --noEmit` — clean (the build itself ignores TS errors, so this must be run explicitly).
3. `npm run build` — succeeds.
4. Manual (`npm run dev`) against seeded data (seed **>48 products** so at least 3 scroll pages exist):
   - `/catalog` renders the SSR grid; each filter (category, color, price, sort, search) updates results and the URL; back/forward restores state; reload of a filtered URL shows the same results (SSR).
   - Scrolling to the bottom appends the next 24 without a full reload; repeats until "You've seen all N"; no duplicate or skipped products across page boundaries (check with `sort=price-asc` and equal prices to exercise the `id` tiebreaker).
   - Changing a filter mid-scroll resets the feed to the top with page-1 results.
   - Throttle network / force `loadMoreProducts` to fail ⇒ "Retry" appears, existing cards remain, retry works.
   - DevTools performance: after loading ~150 cards, scrolling stays smooth; offscreen cards show as skipped (`content-visibility`) in the Rendering panel.
   - Empty state shows for an over-constrained filter set; "Clear all" recovers.
   - Mobile width: Filters sheet opens and applies.
   - `/catalog/[slug]` for a known slug renders gallery + stems + quantity + add-to-cart; unknown slug ⇒ 404.
   - Add-to-cart updates `useCartStore` (verify via `localStorage["flower-cart-storage"]`); "Added ✓" appears; disabled when out of stock.
   - Out-of-stock product shows correctly in both places.

If a lightweight unit test is warranted, target the pure functions in `catalog-params.schema.ts` and `catalog-query.util.ts` (`parseCatalogParams`, `buildCatalogHref`, `toPrismaWhere`, `encodeCursor`/`decodeCursor`) — but adding a test runner is itself out of scope unless requested.

---

## 13. Known follow-ups (explicitly deferred)

1. Cart drawer + sidebar cart badge + cart page.
2. `revalidateTag("products")` from an admin product-CRUD pass.
3. Rewire `featured-products.widget.tsx` (and the category counts in `categories.widget.tsx`) to real DB data.
4. `AppSidebar` real nav + `StoreFrontLayout` reading the authed user from `useUserStore` instead of the hardcoded object.
5. Multi-select category/color, "in stock only" toggle, cross-widget pending dim (Zustand `catalogPending`).
6. Wishlist/favorites (card heart), reviews/ratings (card stars).
7. `generateStaticParams` + ISR tuning for `/catalog/[slug]`.
8. List **virtualization** (`@tanstack/react-virtual`, or `masonic` if variable-height masonry is ever wanted) — only if the catalog grows past ~1–2k products and `content-visibility` + `React.memo` stop being enough.
9. "Back to top" button and scroll-position restore when navigating back from a product detail page into a long feed.

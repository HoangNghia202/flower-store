# Catalog Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the storefront catalog — `/catalog` listing with a sticky URL-driven filter bar and infinite scroll, a `/catalog/[slug]` product detail page, and working add-to-cart wired to `useCartStore`.

**Architecture:** Feature-Sliced Design. `app/` routes are thin re-exports of `_pages/` compositions; `_pages` compose `widgets`; widgets compose `features` (interactive client bits) and `entities` (domain model + `server-only` Prisma reads + presentational card UI). The catalog list state lives entirely in the URL query string; the page is a Server Component that parses it, fetches page 1, and hands off to a client `<ProductFeed>` that appends further pages via a `"use server"` action. No response caching in v1 (see Global Constraints).

**Tech Stack:** Next.js 16 (App Router, async `searchParams`/`params`, `proxy.ts`), React 19, Prisma 7 (generated client at `prisma/generated/`), PostgreSQL, Zustand, Zod 4, Tailwind CSS v4, shadcn UI, `lucide-react`.

**Spec:** `docs/superpowers/specs/2026-08-30-catalog-feature-design.md` — read it alongside this plan.

## Global Constraints

- **Next.js 16 is not the Next.js in your training data.** Before writing any Next-specific code, read the relevant file under `node_modules/next/dist/docs/01-app/`. Confirmed facts for this plan:
  - Page props: `params: Promise<{ slug: string }>` and `searchParams: Promise<{ [key: string]: string | string[] | undefined }>` — always `await` them.
  - `generateMetadata({ params })` — `await params` inside.
  - `"use cache"` / `cacheLife` / `cacheTag` require `cacheComponents: true` in `next.config.ts` — **do not use them**; keep all reads plain dynamic `async` functions (spec §7).
  - Route protection lives in `proxy.ts` (already handles `/admin`); `/catalog` is public — no proxy changes.
- **No test runner exists in this repo and adding one is out of scope.** Per-task verification is: `npx tsc --noEmit` clean, `npm run lint` clean, and the task's stated manual/script check. Pure functions get a `tsx` self-check script (`scripts/catalog-selfcheck.ts`), run with `npx tsx`.
- **`npm run build` does not type-check or lint** (`next.config.ts` sets `ignoreBuildErrors` + `ignoreDuringBuilds`). Always run `npx tsc --noEmit` and `npm run lint` explicitly.
- **Import aliases:** `@/*` → repo root; `@/shared/*`, `@/_app/*`, `@/_pages/*`, `@/widgets/*` → `src/…`. There is **no alias for `entites` or `features`** — import them as `@/src/entites/…` and `@/src/features/…`. The entities folder is spelled **`entites`** (no `i`) — this is load-bearing.
- **FSD layering (one-directional):** `_pages` → `widgets` → `features` / `entities` → `shared`. Entities never import features. `src/entites/product/index.ts` re-exports `model/` + `ui/` only — **never `actions/`** (they are `server-only`). Client code imports VM types from `@/src/entites/product/model` directly.
- **Prisma:** types from `@/prisma/generated/client`, singleton from `@/prisma/prisma-instance`. Every file under `entites/product/actions/` starts with `import "server-only";`.
- **Prettier:** 4-space indent, double quotes, semicolons, trailing commas (`.prettierrc.json`). Run `npm run format` before each commit if unsure.
- **Money:** integer VND. Display as `price.toLocaleString("vi-VN") + "₫"`.
- **Page size:** 24 products per scroll page. Cursor is base64url of the last row's `id`, carried in client/action state only — never in the URL.
- **Commit style:** end commit messages with the two trailer lines used in this repo's history (`Co-Authored-By: Claude Sonnet 5 …` / `Claude-Session: …`). Work on the current `landing-page` branch.

---

## File Structure

**New files**

| Path | Responsibility |
|---|---|
| `scripts/catalog-selfcheck.ts` | Assertion script for the pure catalog functions (run via `npx tsx`). |
| `prisma/seed.ts` | Idempotent seed: 6 categories, ~10 stems, ~56 products + `ProductStem` links. |
| `public/placeholder-flower.svg` | Fallback product image / gradient glyph source. |
| `src/entites/product/model/catalog-params.schema.ts` | `catalogParamsSchema`, `CatalogParams`, `parseCatalogParams`, `catalogParamsToSearchParams`, `catalogParamsKey`. Client-safe (no Prisma). |
| `src/entites/product/model/catalog-href.util.ts` | `buildCatalogHref(current, patch)`, `CATALOG_SORTS`, filter-label helpers. Client-safe. |
| `src/entites/product/model/product.model.ts` | `ProductCardVM`, `ProductDetailVM`, row interfaces, `mapProductCard`, `mapProductDetail`, `PLACEHOLDER_IMAGE`. Client-safe. |
| `src/entites/product/model/index.ts` | Barrel for the three model files. |
| `src/entites/product/actions/catalog-query.ts` | `server-only`. `toPrismaWhere`, `toPrismaOrderBy`, `encodeCursor`, `decodeCursor`. |
| `src/entites/product/actions/get-products.ts` | `server-only`. `getProducts(query) → ProductPage`. |
| `src/entites/product/actions/get-catalog-facets.ts` | `server-only`. `getCatalogFacets() → CatalogFacets`. |
| `src/entites/product/actions/get-product-by-slug.ts` | `server-only`. `getProductBySlug(slug) → ProductDetailVM | null`. |
| `src/entites/product/actions/index.ts` | Barrel for the action files. |
| `src/entites/product/ui/product-card.tsx` | `React.memo` presentational card. `actionSlot` prop. |
| `src/entites/product/ui/product-card-skeleton.tsx` | Loading placeholder matching card dimensions. |
| `src/entites/product/ui/product-grid.tsx` | Responsive grid `<div>` wrapper around `{children}`. |
| `src/entites/product/ui/product-gallery.tsx` | `"use client"`. Main image + thumbnail strip. |
| `src/entites/product/ui/index.ts` | Barrel for the ui files. |
| `src/entites/product/index.ts` | Re-exports `./model` + `./ui` only. |
| `src/features/catalog-filter/ui/catalog-search-input.tsx` | `"use client"`. Debounced `?q`. |
| `src/features/catalog-filter/ui/catalog-sort-select.tsx` | `"use client"`. `?sort`. |
| `src/features/catalog-filter/ui/catalog-category-select.tsx` | `"use client"`. `?category`. |
| `src/features/catalog-filter/ui/catalog-color-swatches.tsx` | `"use client"`. `?color`. |
| `src/features/catalog-filter/ui/catalog-price-filter.tsx` | `"use client"`. Debounced `?minPrice`/`?maxPrice` in a `Popover`. |
| `src/features/catalog-filter/ui/catalog-active-pills.tsx` | `"use client"`. Applied-filter chips + "Clear all". |
| `src/features/catalog-filter/ui/catalog-filter-sheet.tsx` | `"use client"`. Mobile `<Sheet>` holding category/color/price. |
| `src/features/catalog-filter/index.ts` | Barrel. |
| `src/features/product-feed/actions/load-more.action.ts` | `"use server"`. `loadMoreProducts(query, cursor) → ProductPage`. |
| `src/features/product-feed/ui/product-feed.tsx` | `"use client"`. Accumulates items; `IntersectionObserver` → `loadMoreProducts`; retry/end states. |
| `src/features/product-feed/index.ts` | Barrel. |
| `src/features/add-to-cart/ui/add-to-cart-button.tsx` | `"use client"`. `useCartStore().addToCart`; "Added ✓". |
| `src/features/add-to-cart/index.ts` | Barrel. |
| `src/widgets/catalog-filter.widget.tsx` | Sticky bar layout of the catalog-filter feature parts. |
| `src/widgets/catalog-products.widget.tsx` | "N results" header + `<ProductFeed>` (or empty state). |
| `src/widgets/catalog-product-detail.widget.tsx` | Gallery + info column + stems list + quantity + add-to-cart. |
| `src/_pages/store-front/catalog/ui/product-detail.page.tsx` | Server. `await params` → `getProductBySlug` → `notFound()` or detail widget. |
| `app/(store-front)/catalog/[slug]/page.tsx` | Re-export `ProductDetailPage` + `generateMetadata`. |
| `app/(store-front)/catalog/loading.tsx` | Skeleton grid for the listing route. |

**Modified files**

| Path | Change |
|---|---|
| `package.json` | Add `tsx` devDep; add `"db:seed": "tsx prisma/seed.ts"` script. |
| `prisma.config.ts` | Register the seed command (verify Prisma 7 key against `node_modules/prisma`). |
| `src/shared/ui/index.ts` | Add `select`, `popover`, `badge` exports (from `npx shadcn add`), plus the already-present `card`, `label`, `field`. |
| `src/_app/layout/store-front.layout.tsx` | Render `{children}` in the content area; drop the three `bg-muted/50` demo boxes. |
| `src/_pages/store-front/catalog/ui/catalog.page.tsx` | Replace stub with the real server composition. |
| `src/_pages/store-front/catalog/index.ts` | Also export `ProductDetailPage`. |
| `app/(store-front)/catalog/page.tsx` | Add `export const metadata`. |
| `src/widgets/index.ts` | Export the three new widgets. |
| `src/widgets/categories.widget.tsx` | Change the six `/catalog?occasion=<name>` links to `/catalog?category=<slug>`. |

---

## Task 1: Project setup — deps, shadcn primitives, placeholder asset, layout fix

**Files:**
- Modify: `package.json`
- Create (via CLI): `src/shared/ui/select.tsx`, `src/shared/ui/popover.tsx`, `src/shared/ui/badge.tsx`
- Modify: `src/shared/ui/index.ts`
- Create: `public/placeholder-flower.svg`
- Modify: `src/_app/layout/store-front.layout.tsx`

**Interfaces:**
- Produces: `Select*`, `Popover*`, `Badge` components exported from `@/shared/ui`; `tsx` available as `npx tsx`; `/catalog` renders inside the store-front shell.

- [ ] **Step 1: Install `tsx`**

Run: `npm install --save-dev tsx`
Expected: `package.json` devDependencies gains `tsx`.

- [ ] **Step 2: Add the seed script entry to `package.json`**

In `"scripts"`, add after `"start"`:

```json
"db:seed": "tsx prisma/seed.ts",
```

- [ ] **Step 3: Add the shadcn primitives**

Run: `npx shadcn add select popover badge`
Expected: creates `src/shared/ui/select.tsx`, `popover.tsx`, `badge.tsx` (alias `ui → @/shared/ui` from `components.json`). If the CLI prompts, accept defaults. If `popover` pulls `@radix-ui/react-popover`, that is fine — `radix-ui` is already a dependency.

- [ ] **Step 4: Export the new + missing primitives from the barrel**

In `src/shared/ui/index.ts` add these lines (keep alphabetical-ish grouping consistent with the file):

```ts
export * from "./badge";
export * from "./card";
export * from "./field";
export * from "./label";
export * from "./popover";
export * from "./select";
```

- [ ] **Step 5: Add the placeholder image**

Create `public/placeholder-flower.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500" role="img" aria-label="Flower placeholder">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fce7f3"/>
      <stop offset="1" stop-color="#ede9fe"/>
    </linearGradient>
  </defs>
  <rect width="400" height="500" fill="url(#g)"/>
  <g transform="translate(200 250)" fill="#f9a8d4">
    <circle r="34"/>
    <g fill="#f472b6">
      <ellipse cx="0" cy="-70" rx="26" ry="46"/>
      <ellipse cx="0" cy="70" rx="26" ry="46"/>
      <ellipse cx="-70" cy="0" rx="46" ry="26"/>
      <ellipse cx="70" cy="0" rx="46" ry="26"/>
      <ellipse cx="-50" cy="-50" rx="30" ry="40" transform="rotate(45)"/>
      <ellipse cx="50" cy="-50" rx="30" ry="40" transform="rotate(-45)"/>
    </g>
    <circle r="20" fill="#fbcfe8"/>
  </g>
</svg>
```

- [ ] **Step 6: Fix `StoreFrontLayout` to render children**

In `src/_app/layout/store-front.layout.tsx`, replace the content `<div className="flex flex-1 flex-col gap-4 p-4 pt-0"> … </div>` block (the one containing the three `aspect-video rounded-xl bg-muted/50` divs and the `min-h-screen … bg-muted/50` div) with:

```tsx
<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
    <div className="mx-auto w-full max-w-7xl">{children}</div>
</div>
```

Leave everything else (the `user` object, `<Initializer>`, `<SidebarProvider>`, `<AppSidebar>`, the `<header>`) untouched.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: clean.

Run: `npm run dev`, open `http://localhost:3000/catalog`
Expected: the page shows the stub text "catalog page" inside the sidebar + header shell (not the three grey boxes). Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/shared/ui public/placeholder-flower.svg src/_app/layout/store-front.layout.tsx
git commit -m "feat(catalog): project setup — tsx, shadcn select/popover/badge, layout renders children"
```

---

## Task 2: Catalog param schema + href util (pure, client-safe)

**Files:**
- Create: `src/entites/product/model/catalog-params.schema.ts`
- Create: `src/entites/product/model/catalog-href.util.ts`
- Create: `src/entites/product/model/index.ts`
- Create: `scripts/catalog-selfcheck.ts`

**Interfaces:**
- Produces:
  - `catalogParamsSchema` (zod), `type CatalogParams = { category?: string; color?: string; minPrice?: number; maxPrice?: number; sort: CatalogSort; q?: string }`
  - `type CatalogSort = "newest" | "price-asc" | "price-desc" | "featured"`
  - `parseCatalogParams(sp: Record<string, string | string[] | undefined>): CatalogParams`
  - `catalogParamsToSearchParams(p: CatalogParams): URLSearchParams`
  - `catalogParamsKey(p: CatalogParams): string` — stable string for React `key`
  - `buildCatalogHref(current: CatalogParams, patch: Partial<CatalogParams>): string` — returns `"/catalog"` or `"/catalog?..."`
  - `CATALOG_SORTS: { value: CatalogSort; label: string }[]`
  - `hasActiveFilters(p: CatalogParams): boolean`

- [ ] **Step 1: Write the self-check script (it will fail — modules don't exist yet)**

Create `scripts/catalog-selfcheck.ts`:

```ts
import assert from "node:assert/strict";
import {
    parseCatalogParams,
    buildCatalogHref,
    catalogParamsKey,
    hasActiveFilters,
} from "../src/entites/product/model/catalog-params.schema";
import { toPrismaWhere, toPrismaOrderBy, encodeCursor, decodeCursor } from "../src/entites/product/actions/catalog-query";

// --- parseCatalogParams ---
assert.deepEqual(parseCatalogParams({}), { sort: "newest" });
assert.deepEqual(
    parseCatalogParams({ category: "birthday", color: "Red", minPrice: "100000", sort: "price-asc" }),
    { category: "birthday", color: "Red", minPrice: 100000, sort: "price-asc" },
);
// junk never throws
assert.deepEqual(parseCatalogParams({ sort: "nonsense", minPrice: "abc", page: "x" }), { sort: "newest" });
// array values take the first
assert.equal(parseCatalogParams({ q: ["rose", "tulip"] }).q, "rose");
// blank strings are dropped
assert.equal(parseCatalogParams({ category: "" }).category, undefined);

// --- buildCatalogHref ---
assert.equal(buildCatalogHref({ sort: "newest" }, { category: "birthday" }), "/catalog?category=birthday");
assert.equal(buildCatalogHref({ sort: "newest" }, {}), "/catalog");
assert.equal(
    buildCatalogHref({ sort: "newest", category: "birthday" }, { category: undefined }),
    "/catalog",
);
assert.equal(
    buildCatalogHref({ sort: "price-asc", category: "birthday" }, { sort: "newest" }),
    "/catalog?category=birthday",
); // default sort omitted
{
    const href = buildCatalogHref({ sort: "newest" }, { minPrice: 100000, maxPrice: 500000 });
    assert.ok(href.includes("minPrice=100000") && href.includes("maxPrice=500000"));
}

// --- catalogParamsKey / hasActiveFilters ---
assert.equal(catalogParamsKey({ sort: "newest" }), catalogParamsKey({ sort: "newest" }));
assert.notEqual(catalogParamsKey({ sort: "newest" }), catalogParamsKey({ sort: "newest", q: "x" }));
assert.equal(hasActiveFilters({ sort: "newest" }), false);
assert.equal(hasActiveFilters({ sort: "price-asc" }), false); // sort is not a "filter"
assert.equal(hasActiveFilters({ sort: "newest", color: "Red" }), true);

// --- toPrismaWhere ---
assert.deepEqual(toPrismaWhere({ sort: "newest" }), {});
assert.deepEqual(toPrismaWhere({ sort: "newest", category: "birthday" }), {
    category: { slug: "birthday" },
});
{
    const w = toPrismaWhere({ sort: "newest", minPrice: 500000, maxPrice: 100000 }); // swapped
    assert.deepEqual(w.price, { gte: 100000, lte: 500000 });
}
{
    const w = toPrismaWhere({ sort: "newest", color: "red", q: "rose" });
    assert.deepEqual(w.stems, { some: { stem: { color: { equals: "red", mode: "insensitive" } } } });
    assert.deepEqual(w.name, { contains: "rose", mode: "insensitive" });
}

// --- toPrismaOrderBy ---
assert.deepEqual(toPrismaOrderBy({ sort: "newest" }), [{ createdAt: "desc" }, { id: "desc" }]);
assert.deepEqual(toPrismaOrderBy({ sort: "price-asc" }), [{ price: "asc" }, { id: "asc" }]);
assert.deepEqual(toPrismaOrderBy({ sort: "price-desc" }), [{ price: "desc" }, { id: "desc" }]);
assert.deepEqual(toPrismaOrderBy({ sort: "featured" }), [{ isFeatured: "desc" }, { id: "desc" }]);

// --- cursor round-trip ---
assert.equal(decodeCursor(encodeCursor("clabc123")), "clabc123");
assert.equal(decodeCursor("not-valid-!!"), null);

console.log("catalog-selfcheck: OK");
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx tsx scripts/catalog-selfcheck.ts`
Expected: FAIL — cannot find module `catalog-params.schema` (and `catalog-query`).

- [ ] **Step 3: Implement `catalog-params.schema.ts`**

```ts
import { z } from "zod";

export const CATALOG_SORTS = [
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price: low to high" },
    { value: "price-desc", label: "Price: high to low" },
    { value: "featured", label: "Featured" },
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number]["value"];

const optionalString = z
    .string()
    .trim()
    .min(1)
    .optional()
    .catch(undefined);

const optionalMoney = z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .catch(undefined);

export const catalogParamsSchema = z.object({
    category: optionalString,
    color: optionalString,
    minPrice: optionalMoney,
    maxPrice: optionalMoney,
    sort: z
        .enum(["newest", "price-asc", "price-desc", "featured"])
        .catch("newest"),
    q: z.string().trim().min(1).max(100).optional().catch(undefined),
});

export type CatalogParams = z.infer<typeof catalogParamsSchema>;

export function parseCatalogParams(
    sp: Record<string, string | string[] | undefined>,
): CatalogParams {
    const flat: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(sp)) {
        flat[k] = Array.isArray(v) ? v[0] : v;
    }
    return catalogParamsSchema.parse(flat);
}

const DEFAULTS: CatalogParams = { sort: "newest" };

const ORDERED_KEYS: (keyof CatalogParams)[] = [
    "q",
    "category",
    "color",
    "minPrice",
    "maxPrice",
    "sort",
];

export function catalogParamsToSearchParams(p: CatalogParams): URLSearchParams {
    const usp = new URLSearchParams();
    for (const key of ORDERED_KEYS) {
        const value = p[key];
        if (value === undefined || value === "") continue;
        if (key === "sort" && value === DEFAULTS.sort) continue;
        usp.set(key, String(value));
    }
    return usp;
}

export function catalogParamsKey(p: CatalogParams): string {
    return catalogParamsToSearchParams(p).toString();
}

export function hasActiveFilters(p: CatalogParams): boolean {
    return (
        p.category !== undefined ||
        p.color !== undefined ||
        p.minPrice !== undefined ||
        p.maxPrice !== undefined ||
        p.q !== undefined
    );
}
```

- [ ] **Step 4: Implement `catalog-href.util.ts`**

```ts
import {
    catalogParamsToSearchParams,
    type CatalogParams,
} from "./catalog-params.schema";

/**
 * Merge `patch` onto `current` and return a "/catalog" href.
 * Keys set to `undefined` in `patch` are removed. Empty result → "/catalog".
 */
export function buildCatalogHref(
    current: CatalogParams,
    patch: Partial<CatalogParams>,
): string {
    const merged: CatalogParams = { ...current, ...patch };
    for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) {
            delete (merged as Record<string, unknown>)[k];
        }
    }
    const qs = catalogParamsToSearchParams(merged).toString();
    return qs ? `/catalog?${qs}` : "/catalog";
}
```

Re-export both from `src/entites/product/model/index.ts` (Task 3 adds `product.model`):

```ts
export * from "./catalog-params.schema";
export * from "./catalog-href.util";
```

- [ ] **Step 5: Run the self-check — still fails, but only on `catalog-query`**

Run: `npx tsx scripts/catalog-selfcheck.ts`
Expected: FAIL importing `../src/entites/product/actions/catalog-query` (that module is Task 4). The `parseCatalogParams` / `buildCatalogHref` / `catalogParamsKey` / `hasActiveFilters` assertions are not reached yet — that's fine.

- [ ] **Step 6: Temporarily comment out the `catalog-query` import + its assertions in the self-check, re-run**

Comment the `import { toPrismaWhere, ... }` line and the four `toPrisma*` / cursor assertion blocks. Run: `npx tsx scripts/catalog-selfcheck.ts`
Expected: `catalog-selfcheck: OK`. Then **uncomment them again** (Task 4 needs them) and leave the script failing on that import until Task 4 — note this in the commit message.

- [ ] **Step 7: Verify types + lint**

Run: `npx tsc --noEmit`
Expected: clean (the self-check script is included by `tsconfig` `**/*.ts` — the missing `catalog-query` module will error here too; acceptable and resolved in Task 4. If you prefer a clean `tsc` now, add `"scripts/**"` to `tsconfig.json` `exclude` and remove it in Task 4. Pick one and note it.)

Run: `npm run lint`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/entites/product/model scripts/catalog-selfcheck.ts tsconfig.json
git commit -m "feat(catalog): catalog params schema + href builder (pure)

catalog-selfcheck.ts still references actions/catalog-query (Task 4)."
```

---

## Task 3: Product view models + mappers

**Files:**
- Create: `src/entites/product/model/product.model.ts`
- Modify: `src/entites/product/model/index.ts`
- Modify: `scripts/catalog-selfcheck.ts` (add mapper assertions)

**Interfaces:**
- Produces:
  - `PLACEHOLDER_IMAGE = "/placeholder-flower.svg"`
  - `type ProductCardVM = { id: string; name: string; slug: string; price: number; image: string; hasImage: boolean; images: string[]; inStock: boolean; isFeatured: boolean; categoryName: string }`
  - `type ProductDetailVM = ProductCardVM & { description: string; categorySlug: string; stock: number; stems: { name: string; color: string; quantity: number }[] }`
  - `type ProductCardRow` / `type ProductDetailRow` — plain interfaces describing the Prisma `select` shapes (no Prisma import)
  - `mapProductCard(row: ProductCardRow): ProductCardVM`
  - `mapProductDetail(row: ProductDetailRow): ProductDetailVM`

- [ ] **Step 1: Add mapper assertions to `scripts/catalog-selfcheck.ts`**

Insert before the final `console.log`:

```ts
import { mapProductCard, mapProductDetail, PLACEHOLDER_IMAGE } from "../src/entites/product/model/product.model";

{
    const vm = mapProductCard({
        id: "p1", name: "Rose Garden", slug: "rose-garden", price: 320000,
        images: [], stock: 0, isFeatured: true, category: { name: "Birthday", slug: "birthday" },
    });
    assert.equal(vm.image, PLACEHOLDER_IMAGE);
    assert.equal(vm.hasImage, false);
    assert.equal(vm.inStock, false);
    assert.equal(vm.categoryName, "Birthday");
}
{
    const vm = mapProductCard({
        id: "p2", name: "Tulip Mix", slug: "tulip-mix", price: 280000,
        images: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
        stock: 5, isFeatured: false, category: { name: "Wedding", slug: "wedding" },
    });
    assert.equal(vm.image, "https://cdn.example/a.jpg");
    assert.equal(vm.hasImage, true);
    assert.equal(vm.inStock, true);
}
{
    const vm = mapProductDetail({
        id: "p3", name: "Lily", slug: "lily", description: "Elegant white lilies.",
        price: 400000, images: [], stock: 3, isFeatured: false,
        category: { name: "Sympathy", slug: "sympathy" },
        stems: [{ quantity: 5, stem: { name: "White Lily", color: "white" } }],
    });
    assert.equal(vm.categorySlug, "sympathy");
    assert.deepEqual(vm.stems, [{ name: "White Lily", color: "white", quantity: 5 }]);
}
```

- [ ] **Step 2: Run the self-check, confirm it fails on `product.model`**

Run: `npx tsx scripts/catalog-selfcheck.ts`
Expected: FAIL — cannot find `product.model` (or still failing on `catalog-query`; both are expected until their tasks).

- [ ] **Step 3: Implement `product.model.ts`**

```ts
export const PLACEHOLDER_IMAGE = "/placeholder-flower.svg";

interface CategoryRef {
    name: string;
    slug: string;
}

export interface ProductCardRow {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
    stock: number;
    isFeatured: boolean;
    category: CategoryRef;
}

export interface ProductDetailRow extends ProductCardRow {
    description: string;
    stems: { quantity: number; stem: { name: string; color: string } }[];
}

export interface ProductCardVM {
    id: string;
    name: string;
    slug: string;
    price: number;
    image: string;
    hasImage: boolean;
    images: string[];
    inStock: boolean;
    isFeatured: boolean;
    categoryName: string;
}

export interface ProductDetailVM extends ProductCardVM {
    description: string;
    categorySlug: string;
    stock: number;
    stems: { name: string; color: string; quantity: number }[];
}

export function mapProductCard(row: ProductCardRow): ProductCardVM {
    const hasImage = row.images.length > 0;
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        price: row.price,
        image: hasImage ? row.images[0] : PLACEHOLDER_IMAGE,
        hasImage,
        images: row.images,
        inStock: row.stock > 0,
        isFeatured: row.isFeatured,
        categoryName: row.category.name,
    };
}

export function mapProductDetail(row: ProductDetailRow): ProductDetailVM {
    return {
        ...mapProductCard(row),
        description: row.description,
        categorySlug: row.category.slug,
        stock: row.stock,
        stems: row.stems.map((s) => ({
            name: s.stem.name,
            color: s.stem.color,
            quantity: s.quantity,
        })),
    };
}
```

- [ ] **Step 4: Export from the model barrel**

`src/entites/product/model/index.ts`:

```ts
export * from "./catalog-params.schema";
export * from "./catalog-href.util";
export * from "./product.model";
```

- [ ] **Step 5: Run the self-check with the `catalog-query` bits still commented**

Temporarily comment the `catalog-query` import + its assertion blocks again (as in Task 2 Step 6). Run: `npx tsx scripts/catalog-selfcheck.ts`
Expected: `catalog-selfcheck: OK`. Uncomment the `catalog-query` bits again.

- [ ] **Step 6: Verify**

Run: `npm run lint` → clean. (`npx tsc --noEmit` still errors on the missing `catalog-query` module unless you added the `scripts/**` exclude in Task 2 — resolved in Task 4.)

- [ ] **Step 7: Commit**

```bash
git add src/entites/product/model scripts/catalog-selfcheck.ts
git commit -m "feat(catalog): product view models + row mappers"
```

---

## Task 4: Prisma seed

**Files:**
- Create: `prisma/seed.ts`
- Modify: `prisma.config.ts`

**Interfaces:**
- Produces: a populated dev database — 6 `Category`, ~10 `Stem`, ~56 `Product` (each with a `categoryId` and 2–4 `ProductStem`), several with `stock: 0`, ~6 with `isFeatured: true`, some prices deliberately equal.
- Category slugs (must match Task 12's `categories.widget.tsx` links): `birthday`, `wedding`, `anniversary`, `sympathy`, `graduation`, `just-because`.

- [ ] **Step 1: Check the Prisma 7 seed config key**

Read `node_modules/prisma/README.md` or `node_modules/prisma/config/*` / run `npx prisma` help to confirm where Prisma 7 expects the seed command. If `prisma.config.ts` supports a `migrations.seed` (or top-level `seed`) string, set it:

```ts
// prisma.config.ts — add inside defineConfig({...})
migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
},
```

If Prisma 7 no longer reads a seed key, rely solely on `npm run db:seed` (added in Task 1) and skip the `prisma.config.ts` change — note which path you took in the commit message.

- [ ] **Step 2: Write `prisma/seed.ts`**

```ts
import "dotenv/config";
import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
    { name: "Birthday", slug: "birthday", description: "Bright, celebratory arrangements for birthdays." },
    { name: "Wedding", slug: "wedding", description: "Romantic bouquets and ceremony flowers." },
    { name: "Anniversary", slug: "anniversary", description: "Timeless roses and keepsake blooms." },
    { name: "Sympathy", slug: "sympathy", description: "Graceful, respectful tributes." },
    { name: "Graduation", slug: "graduation", description: "Cheerful bouquets to mark the milestone." },
    { name: "Just Because", slug: "just-because", description: "A little something to brighten the day." },
];

const STEMS = [
    { name: "Red Rose", color: "red" },
    { name: "Pink Rose", color: "pink" },
    { name: "White Lily", color: "white" },
    { name: "Yellow Tulip", color: "yellow" },
    { name: "Purple Orchid", color: "purple" },
    { name: "Sunflower", color: "yellow" },
    { name: "Baby's Breath", color: "white" },
    { name: "Peony", color: "pink" },
    { name: "Lavender", color: "purple" },
    { name: "Carnation", color: "red" },
];

const ADJECTIVES = ["Garden", "Morning", "Velvet", "Sunlit", "Blush", "Meadow", "Amber", "Coral", "Ivory", "Dawn", "Silk", "Wild"];
const NOUNS = ["Bouquet", "Bloom Box", "Posy", "Arrangement", "Basket", "Bundle"];

function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
    // Idempotent: wipe catalog tables (dev only), then recreate.
    await prisma.productStem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.stem.deleteMany();
    await prisma.category.deleteMany();

    const categories = await Promise.all(
        CATEGORIES.map((c) => prisma.category.create({ data: c })),
    );
    const stems = await Promise.all(
        STEMS.map((s) => prisma.stem.create({ data: { ...s, stock: 40 + Math.floor(Math.random() * 160), criticalMin: 10 } })),
    );

    // Deterministic-ish price ladder with deliberate ties.
    const PRICES = [150000, 180000, 180000, 220000, 250000, 250000, 280000, 320000, 360000, 420000, 480000, 550000, 620000, 720000, 900000];

    let made = 0;
    for (let i = 0; i < 56; i++) {
        const category = categories[i % categories.length];
        const name = `${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[i % NOUNS.length]} ${i + 1}`;
        const price = PRICES[i % PRICES.length];
        const stock = i % 9 === 0 ? 0 : 5 + ((i * 7) % 40);
        const isFeatured = i % 10 === 3;
        const stemCount = 2 + (i % 3); // 2..4
        const chosen = [...stems].sort(() => 0.5 - Math.random()).slice(0, stemCount);

        await prisma.product.create({
            data: {
                name,
                slug: slugify(name),
                description: `A hand-tied ${NOUNS[i % NOUNS.length].toLowerCase()} of seasonal stems, perfect for ${category.name.toLowerCase()}.`,
                price,
                images: [],
                stock,
                isFeatured,
                categoryId: category.id,
                stems: {
                    create: chosen.map((stem, j) => ({ stemId: stem.id, quantity: 3 + j * 2 })),
                },
            },
        });
        made++;
    }

    console.log(`Seeded ${categories.length} categories, ${stems.length} stems, ${made} products.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Run the seed**

Run: `npm run db:seed`
Expected: `Seeded 6 categories, 10 stems, 56 products.` and exit 0.

- [ ] **Step 4: Verify the data landed**

Run: `npx tsx -e "import('./prisma/prisma-instance').then(async ({prisma}) => { console.log(await prisma.product.count(), await prisma.category.count(), await prisma.stem.count()); await prisma.\$disconnect(); })"`
Expected: `56 6 10`.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts prisma.config.ts package.json
git commit -m "feat(catalog): idempotent seed — categories, stems, 56 products"
```

---

## Task 5: Data-access actions

**Files:**
- Create: `src/entites/product/actions/catalog-query.ts`
- Create: `src/entites/product/actions/get-products.ts`
- Create: `src/entites/product/actions/get-catalog-facets.ts`
- Create: `src/entites/product/actions/get-product-by-slug.ts`
- Create: `src/entites/product/actions/index.ts`
- Modify: `tsconfig.json` (remove the `scripts/**` exclude if you added it in Task 2)
- Create: `scripts/catalog-actions-smoke.ts`

**Interfaces:**
- Consumes: `CatalogParams`, `mapProductCard`, `mapProductDetail`, `ProductCardVM`, `ProductDetailVM` from `@/src/entites/product/model`; `prisma` from `@/prisma/prisma-instance`; `Prisma` from `@/prisma/generated/client`.
- Produces:
  - `type CatalogQuery = CatalogParams & { cursor?: string }`
  - `type ProductPage = { items: ProductCardVM[]; nextCursor: string | null; total: number }`
  - `type CatalogFacets = { categories: { name: string; slug: string }[]; colors: string[] }`
  - `toPrismaWhere(p: CatalogParams): Prisma.ProductWhereInput`
  - `toPrismaOrderBy(p: CatalogParams): Prisma.ProductOrderByWithRelationInput[]`
  - `encodeCursor(id: string): string` / `decodeCursor(s: string): string | null`
  - `getProducts(query: CatalogQuery): Promise<ProductPage>`
  - `getCatalogFacets(): Promise<CatalogFacets>`
  - `getProductBySlug(slug: string): Promise<ProductDetailVM | null>`
- `PRODUCTS_PAGE_SIZE = 24` exported from `get-products.ts`.

- [ ] **Step 1: Implement `catalog-query.ts`**

```ts
import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import type { CatalogParams } from "@/src/entites/product/model";

export function toPrismaWhere(p: CatalogParams): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (p.category) where.category = { slug: p.category };
    if (p.color) {
        where.stems = {
            some: { stem: { color: { equals: p.color, mode: "insensitive" } } },
        };
    }
    if (p.q) where.name = { contains: p.q, mode: "insensitive" };

    let { minPrice, maxPrice } = p;
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        [minPrice, maxPrice] = [maxPrice, minPrice];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    return where;
}

export function toPrismaOrderBy(
    p: CatalogParams,
): Prisma.ProductOrderByWithRelationInput[] {
    switch (p.sort) {
        case "price-asc":
            return [{ price: "asc" }, { id: "asc" }];
        case "price-desc":
            return [{ price: "desc" }, { id: "desc" }];
        case "featured":
            return [{ isFeatured: "desc" }, { id: "desc" }];
        case "newest":
        default:
            return [{ createdAt: "desc" }, { id: "desc" }];
    }
}

export function encodeCursor(id: string): string {
    return Buffer.from(id, "utf8").toString("base64url");
}

export function decodeCursor(s: string): string | null {
    try {
        const decoded = Buffer.from(s, "base64url").toString("utf8");
        return decoded.length > 0 && /^[\w-]+$/.test(decoded) ? decoded : null;
    } catch {
        return null;
    }
}
```

- [ ] **Step 2: Implement `get-products.ts`**

```ts
import "server-only";
import { prisma } from "@/prisma/prisma-instance";
import {
    mapProductCard,
    type CatalogParams,
    type ProductCardVM,
} from "@/src/entites/product/model";
import { decodeCursor, encodeCursor, toPrismaOrderBy, toPrismaWhere } from "./catalog-query";

export const PRODUCTS_PAGE_SIZE = 24;

export type CatalogQuery = CatalogParams & { cursor?: string };

export interface ProductPage {
    items: ProductCardVM[];
    nextCursor: string | null;
    total: number;
}

const CARD_SELECT = {
    id: true,
    name: true,
    slug: true,
    price: true,
    images: true,
    stock: true,
    isFeatured: true,
    category: { select: { name: true, slug: true } },
} as const;

export async function getProducts(query: CatalogQuery): Promise<ProductPage> {
    const where = toPrismaWhere(query);
    const orderBy = toPrismaOrderBy(query);

    const cursorId = query.cursor ? decodeCursor(query.cursor) : null;

    const rows = await prisma.product.findMany({
        where,
        orderBy,
        select: CARD_SELECT,
        take: PRODUCTS_PAGE_SIZE + 1,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    const total = await prisma.product.count({ where });

    const hasMore = rows.length > PRODUCTS_PAGE_SIZE;
    const pageRows = hasMore ? rows.slice(0, PRODUCTS_PAGE_SIZE) : rows;
    const last = pageRows[pageRows.length - 1];

    return {
        items: pageRows.map(mapProductCard),
        nextCursor: hasMore && last ? encodeCursor(last.id) : null,
        total,
    };
}
```

- [ ] **Step 3: Implement `get-catalog-facets.ts`**

```ts
import "server-only";
import { prisma } from "@/prisma/prisma-instance";

export interface CatalogFacets {
    categories: { name: string; slug: string }[];
    colors: string[];
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
    const [categories, stemColors] = await Promise.all([
        prisma.category.findMany({
            select: { name: true, slug: true },
            orderBy: { name: "asc" },
        }),
        prisma.stem.findMany({
            select: { color: true },
            distinct: ["color"],
            orderBy: { color: "asc" },
        }),
    ]);

    return { categories, colors: stemColors.map((s) => s.color) };
}
```

- [ ] **Step 4: Implement `get-product-by-slug.ts`**

```ts
import "server-only";
import { prisma } from "@/prisma/prisma-instance";
import { mapProductDetail, type ProductDetailVM } from "@/src/entites/product/model";

export async function getProductBySlug(
    slug: string,
): Promise<ProductDetailVM | null> {
    const row = await prisma.product.findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            images: true,
            stock: true,
            isFeatured: true,
            category: { select: { name: true, slug: true } },
            stems: {
                select: { quantity: true, stem: { select: { name: true, color: true } } },
                orderBy: { quantity: "desc" },
            },
        },
    });
    return row ? mapProductDetail(row) : null;
}
```

- [ ] **Step 5: Barrel `src/entites/product/actions/index.ts`**

```ts
export * from "./catalog-query";
export * from "./get-products";
export * from "./get-catalog-facets";
export * from "./get-product-by-slug";
```

- [ ] **Step 6: Run the pure-function self-check (now complete)**

If you added `scripts/**` to `tsconfig.json` `exclude` in Task 2, remove it now.

Run: `npx tsx scripts/catalog-selfcheck.ts`
Expected: `catalog-selfcheck: OK` — including the `toPrismaWhere` / `toPrismaOrderBy` / cursor assertions.

> Note: `catalog-query.ts` starts with `import "server-only"`. `npx tsx` running the self-check outside Next may throw on that import. If it does, change the self-check to import the pure helpers from a path that does not pull `server-only`, **or** guard: in `catalog-query.ts` the `server-only` import is belt-and-suspenders (the file has no secrets) — it is acceptable to move `toPrismaWhere`/`toPrismaOrderBy`/`encodeCursor`/`decodeCursor` into `src/entites/product/model/catalog-query.util.ts` (client-safe, no `server-only`, no Prisma **values** — `import type { Prisma }` only) and have `actions/catalog-query.ts` re-export them. Prefer this move; update the self-check import path and the Task 5 interface note accordingly.

- [ ] **Step 7: Smoke-test the DB actions**

Create `scripts/catalog-actions-smoke.ts`:

```ts
import { getProducts } from "../src/entites/product/actions/get-products";
import { getCatalogFacets } from "../src/entites/product/actions/get-catalog-facets";
import { getProductBySlug } from "../src/entites/product/actions/get-product-by-slug";
import { prisma } from "../prisma/prisma-instance";

async function main() {
    const page1 = await getProducts({ sort: "newest" });
    console.log("page1", page1.items.length, "nextCursor?", Boolean(page1.nextCursor), "total", page1.total);
    if (page1.nextCursor) {
        const page2 = await getProducts({ sort: "newest", cursor: page1.nextCursor });
        const overlap = page1.items.some((a) => page2.items.some((b) => b.id === a.id));
        console.log("page2", page2.items.length, "overlap", overlap);
    }
    const filtered = await getProducts({ sort: "price-asc", category: "birthday" });
    console.log("birthday+priceasc", filtered.items.length, "total", filtered.total);
    const facets = await getCatalogFacets();
    console.log("facets", facets.categories.map((c) => c.slug).join(","), "|", facets.colors.join(","));
    const detail = await getProductBySlug(page1.items[0].slug);
    console.log("detail", detail?.name, "stems", detail?.stems.length);
    console.log("missing", await getProductBySlug("does-not-exist"));
    await prisma.$disconnect();
}
main();
```

Run: `npx tsx scripts/catalog-actions-smoke.ts`
Expected: `page1 24 nextCursor? true total 56`; `page2 24 overlap false`; birthday count ≈ 9–10; facets list all 6 slugs and the colors `pink,purple,red,white,yellow`; a detail name + stem count ≥ 2; `missing null`.

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit` → clean.
Run: `npm run lint` → clean.

- [ ] **Step 9: Commit**

```bash
git add src/entites/product/actions scripts/catalog-actions-smoke.ts scripts/catalog-selfcheck.ts tsconfig.json
git commit -m "feat(catalog): server-only data-access actions (cursor pagination, facets, detail)"
```

---

## Task 6: Product card, grid, skeleton (entity UI) + entity barrels

**Files:**
- Create: `src/entites/product/ui/product-card.tsx`
- Create: `src/entites/product/ui/product-card-skeleton.tsx`
- Create: `src/entites/product/ui/product-grid.tsx`
- Create: `src/entites/product/ui/index.ts`
- Create: `src/entites/product/index.ts`

**Interfaces:**
- Consumes: `ProductCardVM` from `@/src/entites/product/model`; `Badge` from `@/shared/ui`; `cn` from `@/shared/lib/utils`; `next/image`, `next/link`, `lucide-react`.
- Produces:
  - `ProductCard` — `React.memo<{ product: ProductCardVM; actionSlot?: React.ReactNode }>`
  - `ProductGrid` — `({ children }: { children: React.ReactNode }) => JSX` (the `grid` wrapper)
  - `ProductCardSkeleton` — `() => JSX`

- [ ] **Step 1: Implement `product-grid.tsx`**

```tsx
export function ProductGrid({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {children}
        </div>
    );
}
```

- [ ] **Step 2: Implement `product-card-skeleton.tsx`**

```tsx
import { Skeleton } from "@/shared/ui";

export function ProductCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-pink-100">
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-8 w-full" />
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Implement `product-card.tsx`**

```tsx
import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart } from "lucide-react";
import { Badge } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import type { ProductCardVM } from "@/src/entites/product/model";

interface ProductCardProps {
    product: ProductCardVM;
    actionSlot?: React.ReactNode;
}

function ProductCardBase({ product, actionSlot }: ProductCardProps) {
    return (
        <div
            className="group flex flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-100/50"
            style={{ contentVisibility: "auto", containIntrinsicSize: "auto 380px" }}
        >
            <Link
                href={`/catalog/${product.slug}`}
                className="relative block aspect-[4/5] overflow-hidden bg-gradient-to-br from-pink-100 to-violet-100"
            >
                {product.hasImage ? (
                    <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                        className={cn(
                            "object-cover transition-transform duration-300 group-hover:scale-105",
                            !product.inStock && "opacity-60 grayscale",
                        )}
                    />
                ) : (
                    <span
                        className={cn(
                            "absolute inset-0 flex items-center justify-center text-6xl select-none",
                            !product.inStock && "opacity-50 grayscale",
                        )}
                    >
                        💐
                    </span>
                )}
                {product.isFeatured && (
                    <Badge className="absolute left-3 top-3 bg-pink-500 text-white hover:bg-pink-500">
                        Featured
                    </Badge>
                )}
                {!product.inStock && (
                    <Badge
                        variant="secondary"
                        className="absolute right-3 top-3 bg-white/90 text-gray-700"
                    >
                        Out of stock
                    </Badge>
                )}
                <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-400 backdrop-blur-sm">
                    <Heart size={14} />
                </span>
            </Link>

            <div className="flex flex-1 flex-col p-4">
                <Link href={`/catalog/${product.slug}`} className="line-clamp-1 font-semibold text-gray-800">
                    {product.name}
                </Link>
                <p className="mt-0.5 text-xs text-gray-400">{product.categoryName}</p>
                <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-1 text-[11px] text-gray-400">(4.9)</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-gray-900">
                        {product.price.toLocaleString("vi-VN")}₫
                    </span>
                    {actionSlot}
                </div>
            </div>
        </div>
    );
}

export const ProductCard = memo(ProductCardBase);
```

> If `Badge` from shadcn does not accept `variant="secondary"`, use a plain `<span>` with the same classes instead — check `src/shared/ui/badge.tsx` after Task 1.

- [ ] **Step 4: Barrels**

`src/entites/product/ui/index.ts`:

```ts
export * from "./product-card";
export * from "./product-card-skeleton";
export * from "./product-grid";
```

`src/entites/product/index.ts`:

```ts
export * from "./model";
export * from "./ui";
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → clean.
Run: `npm run lint` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/entites/product/ui src/entites/product/index.ts
git commit -m "feat(catalog): ProductCard (memo, uniform height) + grid + skeleton"
```

---

## Task 7: catalog-filter feature (client controls)

**Files:**
- Create: `src/features/catalog-filter/ui/catalog-search-input.tsx`
- Create: `src/features/catalog-filter/ui/catalog-sort-select.tsx`
- Create: `src/features/catalog-filter/ui/catalog-category-select.tsx`
- Create: `src/features/catalog-filter/ui/catalog-color-swatches.tsx`
- Create: `src/features/catalog-filter/ui/catalog-price-filter.tsx`
- Create: `src/features/catalog-filter/ui/catalog-active-pills.tsx`
- Create: `src/features/catalog-filter/ui/catalog-filter-sheet.tsx`
- Create: `src/features/catalog-filter/index.ts`

**Interfaces:**
- Consumes: `CatalogParams`, `CatalogFacets`, `buildCatalogHref`, `CATALOG_SORTS`, `hasActiveFilters` from the product model + facets type; `useRouter`/`usePathname`/`useSearchParams` from `next/navigation`; shadcn `Select*`, `Popover*`, `Input`, `Button`, `Sheet*`, `Badge`.
- Produces (all `"use client"`):
  - `CatalogSearchInput({ params }: { params: CatalogParams })`
  - `CatalogSortSelect({ params }: { params: CatalogParams })`
  - `CatalogCategorySelect({ params, categories }: { params: CatalogParams; categories: CatalogFacets["categories"] })`
  - `CatalogColorSwatches({ params, colors }: { params: CatalogParams; colors: string[] })`
  - `CatalogPriceFilter({ params }: { params: CatalogParams })`
  - `CatalogActivePills({ params, categories }: { params: CatalogParams; categories: CatalogFacets["categories"] })`
  - `CatalogFilterSheet({ params, facets }: { params: CatalogParams; facets: CatalogFacets })`
- Shared local helper (define once, e.g. in `index.ts` or a `use-catalog-nav.ts`): `useCatalogNav()` returning `(patch: Partial<CatalogParams>) => void` that calls `router.push(buildCatalogHref(params, patch), { scroll: false })` inside `startTransition`. **Simpler:** each component takes `params` and builds the href itself; keep it inline to avoid an extra file. Pick one and be consistent.

- [ ] **Step 1: Implement `catalog-search-input.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui";
import { buildCatalogHref, type CatalogParams } from "@/src/entites/product/model";

export function CatalogSearchInput({ params }: { params: CatalogParams }) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [value, setValue] = useState(params.q ?? "");
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // keep in sync when the URL changes elsewhere (pills "clear all", back button)
    useEffect(() => {
        setValue(params.q ?? "");
    }, [params.q]);

    function onChange(next: string) {
        setValue(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            const q = next.trim() === "" ? undefined : next.trim();
            startTransition(() => {
                router.push(buildCatalogHref(params, { q }), { scroll: false });
            });
        }, 400);
    }

    return (
        <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search arrangements…"
                className="pl-9"
                aria-label="Search products"
            />
        </div>
    );
}
```

- [ ] **Step 2: Implement `catalog-sort-select.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui";
import {
    buildCatalogHref,
    CATALOG_SORTS,
    type CatalogParams,
    type CatalogSort,
} from "@/src/entites/product/model";

export function CatalogSortSelect({ params }: { params: CatalogParams }) {
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <Select
            value={params.sort}
            onValueChange={(v) =>
                startTransition(() => {
                    router.push(buildCatalogHref(params, { sort: v as CatalogSort }), {
                        scroll: false,
                    });
                })
            }
        >
            <SelectTrigger className="w-[180px]" aria-label="Sort products">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {CATALOG_SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                        {s.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
```

- [ ] **Step 3: Implement `catalog-category-select.tsx`**

Same pattern as sort. `value={params.category ?? "all"}`; an `"all"` `SelectItem` maps to `{ category: undefined }`; every other value is a category slug. `categories` comes from props.

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui";
import { buildCatalogHref, type CatalogParams } from "@/src/entites/product/model";

export function CatalogCategorySelect({
    params,
    categories,
}: {
    params: CatalogParams;
    categories: { name: string; slug: string }[];
}) {
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <Select
            value={params.category ?? "all"}
            onValueChange={(v) =>
                startTransition(() => {
                    router.push(
                        buildCatalogHref(params, {
                            category: v === "all" ? undefined : v,
                        }),
                        { scroll: false },
                    );
                })
            }
        >
            <SelectTrigger className="w-[170px]" aria-label="Filter by occasion">
                <SelectValue placeholder="All occasions" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All occasions</SelectItem>
                {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
```

- [ ] **Step 4: Implement `catalog-color-swatches.tsx`**

Toggle buttons; clicking the active color clears it.

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { buildCatalogHref, type CatalogParams } from "@/src/entites/product/model";

const SWATCH: Record<string, string> = {
    red: "bg-red-400",
    pink: "bg-pink-300",
    white: "bg-gray-100 border border-gray-300",
    yellow: "bg-amber-300",
    purple: "bg-violet-400",
};

export function CatalogColorSwatches({
    params,
    colors,
}: {
    params: CatalogParams;
    colors: string[];
}) {
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <div className="flex items-center gap-1.5">
            {colors.map((color) => {
                const active = params.color?.toLowerCase() === color.toLowerCase();
                return (
                    <button
                        key={color}
                        type="button"
                        aria-label={color}
                        aria-pressed={active}
                        onClick={() =>
                            startTransition(() => {
                                router.push(
                                    buildCatalogHref(params, {
                                        color: active ? undefined : color,
                                    }),
                                    { scroll: false },
                                );
                            })
                        }
                        className={cn(
                            "h-6 w-6 rounded-full transition",
                            SWATCH[color.toLowerCase()] ?? "bg-gray-300",
                            active && "ring-2 ring-pink-500 ring-offset-1",
                        )}
                    />
                );
            })}
        </div>
    );
}
```

- [ ] **Step 5: Implement `catalog-price-filter.tsx`**

`Popover` with two numeric `Input`s (min/max) and an Apply button; debounced 400 ms on change OR apply on button click (choose button-click — simpler and no debounce needed). Empty input → `undefined`.

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    Button,
    Input,
} from "@/shared/ui";
import { buildCatalogHref, type CatalogParams } from "@/src/entites/product/model";

export function CatalogPriceFilter({ params }: { params: CatalogParams }) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [min, setMin] = useState(params.minPrice?.toString() ?? "");
    const [max, setMax] = useState(params.maxPrice?.toString() ?? "");

    function apply() {
        const toNum = (s: string) => {
            const n = Number(s);
            return s.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined;
        };
        startTransition(() => {
            router.push(
                buildCatalogHref(params, { minPrice: toNum(min), maxPrice: toNum(max) }),
                { scroll: false },
            );
        });
    }

    const label =
        params.minPrice !== undefined || params.maxPrice !== undefined
            ? `${params.minPrice?.toLocaleString("vi-VN") ?? "0"}–${params.maxPrice?.toLocaleString("vi-VN") ?? "∞"}₫`
            : "Price";

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[110px]">
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-3">
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={min}
                        onChange={(e) => setMin(e.target.value)}
                    />
                    <span className="text-gray-400">–</span>
                    <Input
                        type="number"
                        min={0}
                        placeholder="Max"
                        value={max}
                        onChange={(e) => setMax(e.target.value)}
                    />
                </div>
                <Button className="w-full" onClick={apply}>
                    Apply
                </Button>
            </PopoverContent>
        </Popover>
    );
}
```

- [ ] **Step 6: Implement `catalog-active-pills.tsx`**

Renders nothing when `!hasActiveFilters(params)`. Otherwise a wrapped row of removable chips (`<Link href={buildCatalogHref(params, { <key>: undefined })}>`) plus a "Clear all" `<Link href="/catalog">`. Category chip shows the category **name** (look it up in `categories` by slug).

```tsx
"use client";

import Link from "next/link";
import { X } from "lucide-react";
import {
    buildCatalogHref,
    hasActiveFilters,
    type CatalogParams,
} from "@/src/entites/product/model";

export function CatalogActivePills({
    params,
    categories,
}: {
    params: CatalogParams;
    categories: { name: string; slug: string }[];
}) {
    if (!hasActiveFilters(params)) return null;

    const chips: { key: keyof CatalogParams; label: string; patch: Partial<CatalogParams> }[] = [];
    if (params.q) chips.push({ key: "q", label: `“${params.q}”`, patch: { q: undefined } });
    if (params.category) {
        const name = categories.find((c) => c.slug === params.category)?.name ?? params.category;
        chips.push({ key: "category", label: name, patch: { category: undefined } });
    }
    if (params.color) chips.push({ key: "color", label: params.color, patch: { color: undefined } });
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
        chips.push({
            key: "minPrice",
            label: `${params.minPrice?.toLocaleString("vi-VN") ?? "0"}–${params.maxPrice?.toLocaleString("vi-VN") ?? "∞"}₫`,
            patch: { minPrice: undefined, maxPrice: undefined },
        });
    }

    return (
        <div className="flex flex-wrap items-center gap-2 pt-2">
            {chips.map((chip) => (
                <Link
                    key={chip.key}
                    href={buildCatalogHref(params, chip.patch)}
                    scroll={false}
                    className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs text-pink-700 hover:bg-pink-100"
                >
                    {chip.label}
                    <X size={12} />
                </Link>
            ))}
            <Link href="/catalog" scroll={false} className="text-xs text-gray-500 underline hover:text-gray-700">
                Clear all
            </Link>
        </div>
    );
}
```

- [ ] **Step 7: Implement `catalog-filter-sheet.tsx`**

Mobile-only trigger (`Button` with a `SlidersHorizontal` icon). Inside the `<Sheet>` body, stack `CatalogCategorySelect`, `CatalogColorSwatches`, `CatalogPriceFilter` with labels. Reuse the components from steps 3–5.

```tsx
"use client";

import { SlidersHorizontal } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    Button,
} from "@/shared/ui";
import type { CatalogParams } from "@/src/entites/product/model";
import type { CatalogFacets } from "@/src/entites/product/actions/get-catalog-facets";
import { CatalogCategorySelect } from "./catalog-category-select";
import { CatalogColorSwatches } from "./catalog-color-swatches";
import { CatalogPriceFilter } from "./catalog-price-filter";

export function CatalogFilterSheet({
    params,
    facets,
}: {
    params: CatalogParams;
    facets: CatalogFacets;
}) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                    <SlidersHorizontal size={15} className="mr-1.5" />
                    Filters
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
                <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-5 px-4">
                    <div>
                        <p className="mb-2 text-sm font-medium">Occasion</p>
                        <CatalogCategorySelect params={params} categories={facets.categories} />
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-medium">Colour</p>
                        <CatalogColorSwatches params={params} colors={facets.colors} />
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-medium">Price</p>
                        <CatalogPriceFilter params={params} />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
```

> Importing a type from `@/src/entites/product/actions/get-catalog-facets` into a client component pulls a `server-only` module's **types** only — `import type` is erased, so this is safe. If the bundler complains, move `CatalogFacets` into `src/entites/product/model/facets.model.ts` and import from there.

- [ ] **Step 8: Barrel `src/features/catalog-filter/index.ts`**

```ts
export * from "./ui/catalog-search-input";
export * from "./ui/catalog-sort-select";
export * from "./ui/catalog-category-select";
export * from "./ui/catalog-color-swatches";
export * from "./ui/catalog-price-filter";
export * from "./ui/catalog-active-pills";
export * from "./ui/catalog-filter-sheet";
```

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit` → clean.
Run: `npm run lint` → clean.

- [ ] **Step 10: Commit**

```bash
git add src/features/catalog-filter
git commit -m "feat(catalog): URL-driven filter controls (search, sort, category, colour, price, pills, mobile sheet)"
```

---

## Task 8: product-feed feature (infinite scroll + load-more action)

**Files:**
- Create: `src/features/product-feed/actions/load-more.action.ts`
- Create: `src/features/product-feed/ui/product-feed.tsx`
- Create: `src/features/product-feed/index.ts`

**Interfaces:**
- Consumes: `getProducts`, `type ProductPage`, `type CatalogQuery` from `@/src/entites/product/actions`; `catalogParamsSchema`, `type CatalogParams`, `type ProductCardVM` from `@/src/entites/product/model`; `ProductCard`, `ProductGrid`, `ProductCardSkeleton` from `@/src/entites/product`.
- Produces:
  - `"use server"` `loadMoreProducts(query: CatalogParams, cursor: string): Promise<ProductPage>`
  - `"use client"` `ProductFeed({ initialItems, initialCursor, total, params, renderAction }: { initialItems: ProductCardVM[]; initialCursor: string | null; total: number; params: CatalogParams; renderAction?: (p: ProductCardVM) => React.ReactNode })`

- [ ] **Step 1: Implement `load-more.action.ts`**

```ts
"use server";

import { catalogParamsSchema, type CatalogParams } from "@/src/entites/product/model";
import { getProducts, type ProductPage } from "@/src/entites/product/actions";

export async function loadMoreProducts(
    query: CatalogParams,
    cursor: string,
): Promise<ProductPage> {
    const parsed = catalogParamsSchema.parse(query);
    return getProducts({ ...parsed, cursor });
}
```

- [ ] **Step 2: Implement `product-feed.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogParams, ProductCardVM } from "@/src/entites/product/model";
import { ProductCard, ProductCardSkeleton, ProductGrid } from "@/src/entites/product";
import { Button } from "@/shared/ui";
import { loadMoreProducts } from "../actions/load-more.action";

interface ProductFeedProps {
    initialItems: ProductCardVM[];
    initialCursor: string | null;
    total: number;
    params: CatalogParams;
    renderAction?: (p: ProductCardVM) => React.ReactNode;
}

export function ProductFeed({
    initialItems,
    initialCursor,
    total,
    params,
    renderAction,
}: ProductFeedProps) {
    const [items, setItems] = useState(initialItems);
    const [cursor, setCursor] = useState(initialCursor);
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    // guard against overlapping loads / stale closures
    const loadingRef = useRef(false);

    const loadMore = useCallback(async () => {
        if (loadingRef.current || cursor === null) return;
        loadingRef.current = true;
        setStatus("loading");
        try {
            const page = await loadMoreProducts(params, cursor);
            setItems((prev) => {
                const seen = new Set(prev.map((p) => p.id));
                return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
            });
            setCursor(page.nextCursor);
            setStatus("idle");
        } catch {
            setStatus("error");
        } finally {
            loadingRef.current = false;
        }
    }, [cursor, params]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || cursor === null) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) void loadMore();
            },
            { rootMargin: "600px 0px" },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [loadMore, cursor]);

    return (
        <div className="space-y-6">
            <ProductGrid>
                {items.map((p) => (
                    <ProductCard key={p.id} product={p} actionSlot={renderAction?.(p)} />
                ))}
                {status === "loading" &&
                    Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={`sk-${i}`} />)}
            </ProductGrid>

            {cursor !== null && status !== "error" && <div ref={sentinelRef} aria-hidden className="h-px" />}

            {status === "error" && (
                <div className="flex flex-col items-center gap-2 py-6 text-sm text-gray-500">
                    <p>Couldn&apos;t load more products.</p>
                    <Button variant="outline" size="sm" onClick={() => void loadMore()}>
                        Retry
                    </Button>
                </div>
            )}

            {cursor === null && (
                <p className="py-8 text-center text-sm text-gray-400">
                    You&apos;ve seen all {total} arrangements.
                </p>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Barrel `src/features/product-feed/index.ts`**

```ts
export * from "./ui/product-feed";
export * from "./actions/load-more.action";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → clean.
Run: `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/product-feed
git commit -m "feat(catalog): infinite-scroll ProductFeed + loadMoreProducts server action"
```

---

## Task 9: Widgets + listing page + route wiring

**Files:**
- Create: `src/widgets/catalog-filter.widget.tsx`
- Create: `src/widgets/catalog-products.widget.tsx`
- Modify: `src/widgets/index.ts`
- Modify: `src/_pages/store-front/catalog/ui/catalog.page.tsx`
- Modify: `app/(store-front)/catalog/page.tsx`
- Create: `app/(store-front)/catalog/loading.tsx`

**Interfaces:**
- Consumes: everything from Tasks 5–8; `parseCatalogParams`, `catalogParamsKey`, `type CatalogParams` from model; `getProducts`, `getCatalogFacets`, `type CatalogFacets` from actions.
- Produces:
  - `CatalogFilterWidget({ params, facets }: { params: CatalogParams; facets: CatalogFacets })`
  - `CatalogProductsWidget({ params, page, renderAction? }: { params: CatalogParams; page: ProductPage; renderAction?: (p: ProductCardVM) => React.ReactNode })`
  - `CatalogPage` (default export of the `_pages` barrel) — server component reading `searchParams`.

- [ ] **Step 1: Implement `catalog-filter.widget.tsx`**

```tsx
import type { CatalogParams } from "@/src/entites/product/model";
import type { CatalogFacets } from "@/src/entites/product/actions/get-catalog-facets";
import {
    CatalogSearchInput,
    CatalogSortSelect,
    CatalogCategorySelect,
    CatalogColorSwatches,
    CatalogPriceFilter,
    CatalogActivePills,
    CatalogFilterSheet,
} from "@/src/features/catalog-filter";

export function CatalogFilterWidget({
    params,
    facets,
}: {
    params: CatalogParams;
    facets: CatalogFacets;
}) {
    return (
        <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
                <CatalogSearchInput params={params} />
                <div className="hidden items-center gap-3 md:flex">
                    <CatalogCategorySelect params={params} categories={facets.categories} />
                    <CatalogColorSwatches params={params} colors={facets.colors} />
                    <CatalogPriceFilter params={params} />
                </div>
                <CatalogFilterSheet params={params} facets={facets} />
                <div className="ml-auto">
                    <CatalogSortSelect params={params} />
                </div>
            </div>
            <CatalogActivePills params={params} categories={facets.categories} />
        </div>
    );
}
```

- [ ] **Step 2: Implement `catalog-products.widget.tsx`**

```tsx
import Link from "next/link";
import type { CatalogParams, ProductCardVM } from "@/src/entites/product/model";
import { catalogParamsKey } from "@/src/entites/product/model";
import type { ProductPage } from "@/src/entites/product/actions";
import { ProductFeed } from "@/src/features/product-feed";

export function CatalogProductsWidget({
    params,
    page,
    renderAction,
}: {
    params: CatalogParams;
    page: ProductPage;
    renderAction?: (p: ProductCardVM) => React.ReactNode;
}) {
    return (
        <section className="py-6">
            <header className="mb-4 flex items-baseline justify-between">
                <h1 className="font-playfair text-2xl font-bold text-gray-900">Catalog</h1>
                <span className="text-sm text-gray-500">{page.total} results</span>
            </header>

            {page.total === 0 ? (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                    <p className="text-gray-500">No arrangements match these filters.</p>
                    <Link href="/catalog" className="text-sm text-pink-600 underline">
                        Clear all filters
                    </Link>
                </div>
            ) : (
                <ProductFeed
                    key={catalogParamsKey(params)}
                    initialItems={page.items}
                    initialCursor={page.nextCursor}
                    total={page.total}
                    params={params}
                    renderAction={renderAction}
                />
            )}
        </section>
    );
}
```

- [ ] **Step 3: Export the widgets**

Append to `src/widgets/index.ts`:

```ts
export * from "./catalog-filter.widget";
export * from "./catalog-products.widget";
```

- [ ] **Step 4: Implement the listing page composition**

Replace `src/_pages/store-front/catalog/ui/catalog.page.tsx`:

```tsx
import { parseCatalogParams } from "@/src/entites/product/model";
import { getCatalogFacets, getProducts } from "@/src/entites/product/actions";
import { CatalogFilterWidget, CatalogProductsWidget } from "@/widgets/index";

export async function CatalogPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = parseCatalogParams(await searchParams);
    const [page, facets] = await Promise.all([getProducts(params), getCatalogFacets()]);

    return (
        <>
            <CatalogFilterWidget params={params} facets={facets} />
            <CatalogProductsWidget params={params} page={page} />
        </>
    );
}
```

Leave `src/_pages/store-front/catalog/index.ts` as `export * from "./ui/catalog.page";` for now (Task 11 adds the detail export).

- [ ] **Step 5: Add route metadata**

`app/(store-front)/catalog/page.tsx`:

```tsx
import type { Metadata } from "next";

export { CatalogPage as default } from "@/_pages/store-front/catalog";

export const metadata: Metadata = {
    title: "Catalog | Bloom",
    description: "Browse handcrafted bouquets and arrangements for every occasion.",
};
```

- [ ] **Step 6: Add `loading.tsx`**

`app/(store-front)/catalog/loading.tsx`:

```tsx
import { ProductGrid, ProductCardSkeleton } from "@/src/entites/product";

export default function Loading() {
    return (
        <div className="py-6">
            <div className="mb-4 h-8 w-32 rounded bg-muted" />
            <ProductGrid>
                {Array.from({ length: 10 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </ProductGrid>
        </div>
    );
}
```

- [ ] **Step 7: Verify — types, lint, build**

Run: `npx tsc --noEmit` → clean.
Run: `npm run lint` → clean.
Run: `npm run build` → succeeds.

- [ ] **Step 8: Verify — manual (dev)**

Run `npm run dev`, then check at `http://localhost:3000/catalog`:
- Grid of 24 cards renders; header shows "56 results".
- Scroll down → next pages append; skeletons flash; ends with "You've seen all 56 arrangements."; no duplicate names across boundaries.
- Pick occasion "Birthday" → URL becomes `/catalog?category=birthday`, grid resets to top, count drops, feed still scrolls if >24.
- Sort "Price: low to high" → order changes; with `sort=price-asc`, the two `180000` products keep a stable relative order across a scroll boundary (id tiebreaker).
- Click a colour swatch → `?color=…`; click again → removed.
- Price popover: min `200000`, max `300000`, Apply → results constrained; pill shows the range; clicking the pill clears it.
- Type "posy" in search → after ~400 ms results filter; back button restores the previous state.
- Over-constrain (e.g. `?category=sympathy&color=red&minPrice=900000`) → empty state + "Clear all filters" recovers.
- Narrow the window (<768px) → inline category/colour/price hide, "Filters" button appears, opens the sheet, applying a filter there updates the grid.
- Reload a filtered URL → identical results server-rendered (no flash of the full list).

Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add src/widgets src/_pages/store-front/catalog "app/(store-front)/catalog"
git commit -m "feat(catalog): listing page — sticky filter widget + infinite-scroll products widget"
```

---

## Task 10: Add-to-cart feature + wire into the card

**Files:**
- Create: `src/features/add-to-cart/ui/add-to-cart-button.tsx`
- Create: `src/features/add-to-cart/index.ts`
- Modify: `src/_pages/store-front/catalog/ui/catalog.page.tsx` (pass `renderAction`)

**Interfaces:**
- Consumes: `useCartStore` from `@/_app/store/useCartStore`; `type ProductCardVM` / `type ProductDetailVM` from model; `Button` from `@/shared/ui`.
- Produces: `"use client"` `AddToCartButton({ product, quantity = 1, size = "sm" }: { product: Pick<ProductCardVM, "id" | "name" | "slug" | "price" | "image" | "inStock">; quantity?: number; size?: "sm" | "default" })`

- [ ] **Step 1: Implement `add-to-cart-button.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/shared/ui";
import { useCartStore } from "@/_app/store/useCartStore";
import type { ProductCardVM } from "@/src/entites/product/model";

type AddToCartProduct = Pick<
    ProductCardVM,
    "id" | "name" | "slug" | "price" | "image" | "inStock"
>;

export function AddToCartButton({
    product,
    quantity = 1,
    size = "sm",
}: {
    product: AddToCartProduct;
    quantity?: number;
    size?: "sm" | "default";
}) {
    const addToCart = useCartStore((s) => s.addToCart);
    const [added, setAdded] = useState(false);

    function onAdd() {
        addToCart(
            {
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                image: product.image,
                quantity,
            },
            quantity,
        );
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    }

    return (
        <Button
            type="button"
            size={size}
            disabled={!product.inStock}
            onClick={onAdd}
            className="bg-pink-500 hover:bg-pink-600"
        >
            {added ? (
                <>
                    <Check size={15} className="mr-1" /> Added
                </>
            ) : (
                <>
                    <ShoppingBag size={15} className="mr-1" />
                    {product.inStock ? "Add" : "Sold out"}
                </>
            )}
        </Button>
    );
}
```

> Verify the `CartItem` shape in `src/_app/store/useCartStore.ts` — `addToCart(product: CartItem, quantity?: number)` where `CartItem` needs `id, name, slug, price, image, quantity`. The call above matches; adjust field names if the store differs.

- [ ] **Step 2: Barrel `src/features/add-to-cart/index.ts`**

```ts
export * from "./ui/add-to-cart-button";
```

- [ ] **Step 3: Pass `renderAction` from the listing page**

In `src/_pages/store-front/catalog/ui/catalog.page.tsx`, import the button and pass it:

```tsx
import { AddToCartButton } from "@/src/features/add-to-cart";
// ...
<CatalogProductsWidget
    params={params}
    page={page}
    renderAction={(p) => <AddToCartButton product={p} />}
/>
```

(`renderAction` is a function returning JSX — a Server Component may pass it to the client `ProductFeed` as a prop; `ProductFeed` calls it during render. This is a standard RSC → client pass-through. If the RSC serializer rejects passing a function prop, fall back to: give `ProductFeed` a boolean `withAddToCart` and let it render `<AddToCartButton>` itself — `ProductFeed` is already a client component, so importing the client button there is free.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → clean.
Run: `npm run lint` → clean.
Run: `npm run dev` → on `/catalog`, click "Add" on an in-stock card → label flips to "Added" for 2 s. Open DevTools → Application → Local Storage → `flower-cart-storage` contains the item. An out-of-stock card's button reads "Sold out" and is disabled. Stop dev.

- [ ] **Step 5: Commit**

```bash
git add src/features/add-to-cart src/_pages/store-front/catalog
git commit -m "feat(catalog): working add-to-cart on product cards"
```

---

## Task 11: Product detail page

**Files:**
- Create: `src/entites/product/ui/product-gallery.tsx`
- Modify: `src/entites/product/ui/index.ts`
- Create: `src/widgets/catalog-product-detail.widget.tsx`
- Modify: `src/widgets/index.ts`
- Create: `src/_pages/store-front/catalog/ui/product-detail.page.tsx`
- Modify: `src/_pages/store-front/catalog/index.ts`
- Create: `app/(store-front)/catalog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getProductBySlug` from actions; `type ProductDetailVM` from model; `AddToCartButton` from `@/src/features/add-to-cart`; `notFound` from `next/navigation`; shadcn `Button`, `Badge`.
- Produces:
  - `"use client"` `ProductGallery({ images, name }: { images: string[]; name: string })`
  - `CatalogProductDetailWidget({ product }: { product: ProductDetailVM })`
  - `ProductDetailPage({ params }: { params: Promise<{ slug: string }> })` (server)

- [ ] **Step 1: Implement `product-gallery.tsx`**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";
import { PLACEHOLDER_IMAGE } from "@/src/entites/product/model";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
    const gallery = images.length > 0 ? images : [PLACEHOLDER_IMAGE];
    const [active, setActive] = useState(0);
    const hasReal = images.length > 0;

    return (
        <div className="space-y-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-pink-100 to-violet-100">
                {hasReal ? (
                    <Image src={gallery[active]} alt={name} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-8xl select-none">💐</span>
                )}
            </div>
            {hasReal && gallery.length > 1 && (
                <div className="flex gap-2">
                    {gallery.map((src, i) => (
                        <button
                            key={src}
                            type="button"
                            onClick={() => setActive(i)}
                            className={cn(
                                "relative h-16 w-16 overflow-hidden rounded-lg border",
                                i === active ? "border-pink-500" : "border-transparent",
                            )}
                        >
                            <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
```

Add `export * from "./product-gallery";` to `src/entites/product/ui/index.ts`.

- [ ] **Step 2: Implement `catalog-product-detail.widget.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@/shared/ui";
import { ProductGallery } from "@/src/entites/product";
import { AddToCartButton } from "@/src/features/add-to-cart";
import type { ProductDetailVM } from "@/src/entites/product/model";

export function CatalogProductDetailWidget({ product }: { product: ProductDetailVM }) {
    const [qty, setQty] = useState(1);
    const max = Math.max(1, product.stock);

    return (
        <div className="grid gap-8 py-6 lg:grid-cols-2">
            <ProductGallery images={product.images} name={product.name} />

            <div className="space-y-4">
                <div>
                    <Link
                        href={`/catalog?category=${product.categorySlug}`}
                        className="text-xs uppercase tracking-widest text-pink-500"
                    >
                        {product.categoryName}
                    </Link>
                    <h1 className="font-playfair text-3xl font-bold text-gray-900">{product.name}</h1>
                </div>

                <p className="text-2xl font-bold text-gray-900">
                    {product.price.toLocaleString("vi-VN")}₫
                </p>

                <Badge variant={product.inStock ? "default" : "secondary"}>
                    {product.inStock ? "In stock" : "Out of stock"}
                </Badge>

                <p className="text-gray-600">{product.description}</p>

                {product.stems.length > 0 && (
                    <div>
                        <p className="mb-1 text-sm font-semibold text-gray-800">
                            Stems in this arrangement
                        </p>
                        <ul className="space-y-1 text-sm text-gray-600">
                            {product.stems.map((s) => (
                                <li key={s.name}>
                                    {s.quantity}× {s.name} ({s.color})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <div className="flex items-center rounded-md border">
                        <button
                            type="button"
                            className="px-3 py-2 text-lg disabled:opacity-40"
                            disabled={qty <= 1}
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                        >
                            −
                        </button>
                        <span className="w-10 text-center">{qty}</span>
                        <button
                            type="button"
                            className="px-3 py-2 text-lg disabled:opacity-40"
                            disabled={qty >= max}
                            onClick={() => setQty((q) => Math.min(max, q + 1))}
                        >
                            +
                        </button>
                    </div>
                    <AddToCartButton product={product} quantity={qty} size="default" />
                </div>
            </div>
        </div>
    );
}
```

Add `export * from "./catalog-product-detail.widget";` to `src/widgets/index.ts`.

- [ ] **Step 3: Implement `product-detail.page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/src/entites/product/actions";
import { CatalogProductDetailWidget } from "@/widgets/index";

export async function ProductDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) notFound();
    return <CatalogProductDetailWidget product={product} />;
}
```

- [ ] **Step 4: Export it from the `_pages` barrel**

`src/_pages/store-front/catalog/index.ts`:

```ts
export * from "./ui/catalog.page";
export * from "./ui/product-detail.page";
```

- [ ] **Step 5: Create the route with `generateMetadata`**

`app/(store-front)/catalog/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { getProductBySlug } from "@/src/entites/product/actions";

export { ProductDetailPage as default } from "@/_pages/store-front/catalog";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) return { title: "Product not found | Bloom" };
    return {
        title: `${product.name} | Bloom`,
        description: product.description.slice(0, 155),
    };
}
```

- [ ] **Step 6: Verify — types, lint, build**

Run: `npx tsc --noEmit` → clean.
Run: `npm run lint` → clean.
Run: `npm run build` → succeeds.

- [ ] **Step 7: Verify — manual (dev)**

`npm run dev`:
- From `/catalog`, click a card → navigates to `/catalog/<slug>`; gallery (placeholder glyph), price, "In stock", description, stems list, quantity stepper, "Add" button all render.
- Quantity: − disabled at 1; + disabled at `stock`; add to cart with qty 3 → `flower-cart-storage` shows quantity 3.
- Visit `/catalog/not-a-real-slug` → Next 404 rendered inside the store-front shell.
- Open an out-of-stock product (find one whose card said "Sold out") → badge "Out of stock", stepper max 1, button disabled.
- View source / check tab title → `<product name> | Bloom`.

Stop dev.

- [ ] **Step 8: Commit**

```bash
git add src/entites/product/ui src/widgets src/_pages/store-front/catalog "app/(store-front)/catalog/[slug]"
git commit -m "feat(catalog): product detail page (/catalog/[slug]) with gallery, stems, quantity"
```

---

## Task 12: Category widget links + final verification

**Files:**
- Modify: `src/widgets/categories.widget.tsx`

**Interfaces:**
- No new exports. Aligns the landing page's occasion tiles with the catalog's `?category=<slug>` contract and the seeded slugs.

- [ ] **Step 1: Update the six links**

In `src/widgets/categories.widget.tsx`, the `categories` array currently drives `href={/catalog?occasion=${cat.name.toLowerCase().replace(/ /g, "-")}}`. Change the `href` to use `category` and the seeded slugs. Simplest: add a `slug` field to each entry and use it.

```tsx
const categories = [
    { id: 1, name: "Birthday", slug: "birthday", emoji: "🎂", bg: "from-pink-100 to-rose-200", count: "120+ designs" },
    { id: 2, name: "Wedding", slug: "wedding", emoji: "💍", bg: "from-violet-100 to-purple-200", count: "85+ designs" },
    { id: 3, name: "Anniversary", slug: "anniversary", emoji: "💝", bg: "from-red-100 to-pink-200", count: "60+ designs" },
    { id: 4, name: "Sympathy", slug: "sympathy", emoji: "🕊️", bg: "from-slate-100 to-gray-200", count: "40+ designs" },
    { id: 5, name: "Graduation", slug: "graduation", emoji: "🎓", bg: "from-emerald-100 to-teal-200", count: "35+ designs" },
    { id: 6, name: "Just Because", slug: "just-because", emoji: "🌷", bg: "from-orange-100 to-amber-200", count: "200+ designs" },
];
```

and the `<Link>`:

```tsx
<Link href={`/catalog?category=${cat.slug}`} className="group block">
```

- [ ] **Step 2: Verify the hand-off**

Run: `npm run dev` → open `/` (landing), scroll to "Shop by Occasion", click "Birthday" → lands on `/catalog?category=birthday` with the Birthday filter active (pill visible, count reduced). Try "Just Because" → `/catalog?category=just-because` resolves (not empty). Stop dev.

- [ ] **Step 3: Full regression pass**

Run each and confirm the stated result:
- `npx tsx scripts/catalog-selfcheck.ts` → `catalog-selfcheck: OK`
- `npx tsx scripts/catalog-actions-smoke.ts` → counts as in Task 5 Step 7
- `npx tsc --noEmit` → clean
- `npm run lint` → clean
- `npm run build` → succeeds
- `npm run dev` → walk the Task 9 Step 8 checklist once more end-to-end, plus Task 11 Step 7.

- [ ] **Step 4: Commit**

```bash
git add src/widgets/categories.widget.tsx
git commit -m "feat(catalog): point landing occasion tiles at ?category=<slug>"
```

- [ ] **Step 5 (optional): prune the smoke scripts**

`scripts/catalog-selfcheck.ts` is worth keeping (cheap regression for the pure logic). `scripts/catalog-actions-smoke.ts` hits the DB — keep it if useful, or `git rm` it in a follow-up commit. Leave `catalog-selfcheck.ts` in the repo.

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| §1 scope: listing + detail + add-to-cart | 9, 11, 10 |
| §2.1 layout renders children | 1 |
| §2.2 seed | 4 |
| §2.3 shadcn select/popover/badge + barrel | 1 |
| §2.4 `?occasion=` → `?category=` + slug alignment | 12 (+ seed slugs in 4) |
| §3 FSD layering, `actionSlot` pattern | 6 (card `actionSlot`), 9/10 (composed at widget/page) |
| §4 folder layout | 2–11 (with the noted `catalog-query` model→actions refinement) |
| §5.1 query params (no `page`) | 2 |
| §5.2 zod schema + `parseCatalogParams` | 2 |
| §5.3 `buildCatalogHref` | 2 |
| §5.4 client control behaviour, debounce, `key` remount | 7, 9 |
| §5.5 infinite scroll (feed, sentinel, retry, end state, no-JS SSR) | 8, 9 |
| §6.1 `getProducts` cursor/TAKE+1/total | 5 |
| §6.2 `getCatalogFacets` | 5 |
| §6.3 `getProductBySlug` | 5 |
| §6.4 view models | 3 |
| §6.5 `loadMoreProducts` re-validates | 8 |
| §7 caching deferred (plain dynamic) | Global Constraints + 5 (no directives) |
| §8 seed details (56 products, ties, stock 0, featured) | 4 |
| §9.1 sticky bar layout | 9 (filter widget) |
| §9.2 ProductCard uniform height, memo, `content-visibility` | 6 |
| §9.3 detail widget (gallery, stems, quantity) | 11 |
| §9.4 add-to-cart "Added ✓" 2s, disabled OOS | 10 |
| §10 metadata (static + `generateMetadata`) | 9, 11 |
| §11 error/edge cases | 2 (junk params), 5 (price swap, cursor), 8 (retry/end), 11 (`notFound`), 6 (placeholder/OOS) |
| §12 testing (tsc/lint/build/manual + pure-fn checks) | every task + 12 |
| §13 follow-ups | not implemented (deferred by design) |

`generateStaticParams` for `[slug]` — spec §10 says "acceptable to omit in v1"; omitted. `app/(store-front)/catalog/error.tsx` — spec §11 says optional; omitted (Next default error UI).

**2. Placeholder scan** — no "TBD/TODO/handle edge cases" placeholders; every code step has complete code. The few "if the bundler complains, move X" notes are concrete fallbacks with named target files, not deferrals.

**3. Type consistency**

- `CatalogParams` shape (`sort` required, rest optional) — consistent across Tasks 2, 5, 7, 8, 9.
- `ProductPage` (`items`, `nextCursor`, `total`) — defined in Task 5, consumed identically in Tasks 8, 9.
- `ProductCardVM` fields (`image`, `hasImage`, `inStock`, `categoryName`, …) — defined Task 3, used Tasks 6, 8, 10.
- `getProducts(query: CatalogQuery)` where `CatalogQuery = CatalogParams & { cursor?: string }` — Task 5; `loadMoreProducts(query, cursor)` spreads to `{ ...parsed, cursor }` — Task 8. Consistent.
- `buildCatalogHref(current, patch)` — Task 2; every filter control calls it with `(params, { …one key… })` — Task 7. Consistent.
- `AddToCartButton` prop is `Pick<ProductCardVM, …>` — Task 10; passed a full `ProductCardVM` (Task 9 `renderAction`) and a `ProductDetailVM` (Task 11, which extends `ProductCardVM`) — both satisfy the `Pick`. Consistent.
- `catalogParamsKey` — Task 2, used for the `<ProductFeed>` `key` — Task 9. Consistent.

**Open refinements the executor must apply (already flagged in-task):**
- Move `toPrismaWhere`/`toPrismaOrderBy`/`encodeCursor`/`decodeCursor` to a client-safe `model/catalog-query.util.ts` (type-only `Prisma` import) re-exported by `actions/catalog-query.ts`, so `scripts/catalog-selfcheck.ts` can import them without pulling `server-only` (Task 5 Step 6).
- If RSC rejects the `renderAction` function prop, switch `ProductFeed` to a `withAddToCart` boolean (Task 10 Step 3).
- If `CatalogFacets` type imported from an `actions/` file trips the bundler, relocate it to `model/facets.model.ts` (Tasks 7, 9).

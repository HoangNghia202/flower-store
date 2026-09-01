# Custom Bouquet Builder — Design Spec

**Date:** 2026-09-01
**Status:** Approved for planning
**Route:** `/custom-bouquet` (inside the `(store-front)` route group)

---

## 1. Goal

Let a customer design a bouquet from scratch through a 4-step wizard —
pick stems, pick wrap paper, pick ribbon, review — then generate a
preview image of the result and add it to the cart as a custom line
item that flows through the existing faked checkout.

The store (`useCustomBouquetStore`), the cart slot
(`CartItem.isCustomBouquet` + `customDetails`), the Prisma models
(`CustomBouquet`, `CustomBouquetStem`), and the landing CTA
(`CustomBouquetWidget`) already exist. This spec fills in the builder
UI, a stem/option data layer, an image-generation feature, a Prisma
migration for pricing data, and the cart line-item rendering for custom
bouquets.

### Non-goals

- Real AI image generation. The generator is stubbed this pass (see §6);
  a real provider drops in later behind an unchanged signature.
- Persisting the generated image to object storage or the DB. The image
  lives in the cart item as a data URL only.
- Order persistence / real checkout. Custom bouquets ride the existing
  faked checkout (`clearCart()` + success dialog) with no DB writes.
- Automated tests. The project has no test runner and ships without one;
  this feature stays consistent. Verification is lint + typecheck +
  build + manual walk-through (see §10).
- Admin management UI for wrap papers / ribbons. They are seed data.

---

## 2. Decisions (resolved)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Stem pricing source | Add `pricePerStem Float` to the `Stem` model; seed real per-stem prices. |
| 2 | Wrap / ribbon source | New `WrapPaper` and `Ribbon` Prisma lookup models, seeded. |
| 3 | Wrap / ribbon on `CustomBouquet` | Keep the existing `wrapPaper String` / `ribbon String` snapshot columns — no FK. |
| 4 | Add-to-cart gate | Minimum 5 stems total (`MIN_STEMS = 5`). Per-stem DB stock is **not** enforced this pass. |
| 5 | Builder steps | 4 steps: stems → wrap → ribbon → review. |
| 6 | Final image | Built from all collected step data after the last step; shown on review and carried into the cart as `CartItem.image`. |
| 7 | Image method | AI image generation by contract; **stubbed** this pass with a deterministic inline-SVG composition from the selected colors. |
| 8 | Image provider wiring | Server action + env API key. Provider deferred; stub now. |
| 9 | UI polish | Richer / animated — stepper fill animation, running summary sidebar, "bloom" loader during generation. CSS-only (no animation library); respects `prefers-reduced-motion`. |
| 10 | Entity slices | Two: `src/entites/stem/` and `src/entites/bouquet-option/`. |
| 11 | Builder reset | `resetBuilder()` runs on builder mount — every visit starts fresh. |

---

## 3. Architecture overview

```
app/(store-front)/custom-bouquet/page.tsx        (unchanged — re-exports)
  └─ src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx   [async server component]
       ├─ getStems()               ← src/entites/stem/actions
       ├─ getWrapPapers()          ← src/entites/bouquet-option/actions
       ├─ getRibbons()             ← src/entites/bouquet-option/actions
       └─ <BouquetBuilderWidget stems wraps ribbons />   [client]
            ├─ useCustomBouquetStore            (step, selections, total, generatedImage)
            ├─ <BuilderStepper />
            ├─ <BouquetSummary />               (running sidebar)
            ├─ step 1  <StemStep />
            ├─ step 2  <WrapStep />
            ├─ step 3  <RibbonStep />
            └─ step 4  <ReviewStep />
                 └─ generateBouquetImage()  ← src/features/generate-bouquet-image/actions
                 └─ on confirm → useCartStore.addToCart() → resetBuilder() → router.push("/cart")

src/_pages/cart/ui/cart-line-item.tsx   — extended to render custom-bouquet details + image
```

FSD dependency direction is respected: pages → widgets → features → entities → shared.

---

## 4. Data model (Prisma migration)

Migration name: `add_custom_bouquet_pricing`.

### 4.1 `Stem` — add one column

```prisma
model Stem {
  // ...existing fields...
  pricePerStem Float @default(0)   // VND per single stem
  // ...existing relations...
}
```

`@default(0)` keeps the migration safe against existing rows; the seed
sets real values.

### 4.2 New lookup models

```prisma
model WrapPaper {
  id        String   @id @default(cuid())
  name      String   @unique
  color     String   // hex, e.g. "#8B5E3C" — swatch shown in the picker
  price     Float    // absolute VND added to the bouquet total
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

model Ribbon {
  id        String   @id @default(cuid())
  name      String   @unique
  color     String   // hex swatch
  price     Float    // absolute VND
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

No relation to `CustomBouquet` — the builder writes the chosen
name/price into the cart item, and (if orders are ever persisted)
`CustomBouquet.wrapPaper` / `.ribbon` keep their current `String`
snapshot semantics.

### 4.3 Post-migration commands

```
npx prisma migrate dev --name add_custom_bouquet_pricing
npx prisma generate            # regenerates prisma/generated/
npm run db:seed
```

---

## 5. Seed changes (`prisma/seed.ts`)

### 5.1 Stems — add `pricePerStem`

Replace the `STEMS` array entries with `{ name, color, pricePerStem }`:

| Stem | color | pricePerStem (VND) |
|------|-------|--------------------|
| Red Rose | red | 25000 |
| Pink Rose | pink | 22000 |
| White Lily | white | 30000 |
| Yellow Tulip | yellow | 18000 |
| Purple Orchid | purple | 45000 |
| Sunflower | yellow | 15000 |
| Baby's Breath | white | 12000 |
| Peony | pink | 40000 |
| Lavender | purple | 20000 |
| Carnation | red | 14000 |

The existing `prisma.stem.create` call passes `...s`, so it picks up the
new field automatically once the array carries it.

### 5.2 New `WRAP_PAPERS` and `RIBBONS` arrays

```ts
const WRAP_PAPERS = [
  { name: "Kraft Brown",        color: "#8B5E3C", price: 20000 },
  { name: "Korean Matte White", color: "#F4F1EC", price: 35000 },
  { name: "Pastel Pink Tissue", color: "#F7C9D6", price: 25000 },
  { name: "Clear Cellophane",   color: "#D9E4E1", price: 15000 },
];

const RIBBONS = [
  { name: "Satin Blush",      color: "#E8A0B4", price: 10000 },
  { name: "Grosgrain Ivory",  color: "#EFE7D6", price:  8000 },
  { name: "Velvet Burgundy",  color: "#6E1E2C", price: 15000 },
  { name: "Twine Rustic",     color: "#B79B6E", price:  5000 },
];
```

### 5.3 Wipe + recreate inside the existing transaction

Add to the `$transaction([...])` delete batch (before `category.deleteMany`):

```ts
prisma.ribbon.deleteMany(),
prisma.wrapPaper.deleteMany(),
```

After categories/stems are created, add:

```ts
await prisma.wrapPaper.createMany({ data: WRAP_PAPERS });
await prisma.ribbon.createMany({ data: RIBBONS });
```

Update the closing `console.log` to include the new counts.

---

## 6. Feature: `src/features/generate-bouquet-image/`

```
src/features/generate-bouquet-image/
├── model/build-prompt.ts
├── actions/generate-bouquet-image.action.ts
└── index.ts
```

### 6.1 `model/build-prompt.ts` — pure

```ts
export interface BouquetSelection {
  stems: { name: string; color: string; quantity: number }[];
  wrapPaper: { name: string; color: string } | null;
  ribbon:    { name: string; color: string } | null;
}

export function buildBouquetPrompt(sel: BouquetSelection): string;
```

Produces e.g.:

> `a hand-tied bouquet of 12 red roses, 6 white baby's breath, wrapped
> in kraft brown paper, tied with a blush satin ribbon, professional
> studio flower photography, soft natural light, plain background`

Pluralises stem names naively (`rose` → `roses`), lowercases, joins with
commas, appends the wrap/ribbon clauses only when present, then a fixed
style suffix.

### 6.2 `actions/generate-bouquet-image.action.ts`

```ts
"use server";

export interface GenerateBouquetImageResult {
  imageUrl: string;   // data URL this pass
  prompt: string;
}

export async function generateBouquetImage(
  sel: BouquetSelection,
): Promise<GenerateBouquetImageResult>;
```

Behaviour **this pass (stub)**:

1. `const prompt = buildBouquetPrompt(sel)`.
2. `await new Promise(r => setTimeout(r, 1500))` — simulate latency so the
   loader animation is visible.
3. Build a deterministic inline SVG: a fan of petal/circle shapes coloured
   from `sel.stems` (repeat each stem's `color` by its `quantity`, capped
   at ~24 shapes for layout), a wrapper cone in `wrapPaper.color`, and a
   ribbon band in `ribbon.color`. Serialise to
   `data:image/svg+xml;utf8,<encoded>`.
4. Return `{ imageUrl, prompt }`.

**Real provider later:** replace step 3 with an API call
(`process.env.BOUQUET_IMAGE_PROVIDER` selecting the implementation, key
from `.env`). Signature and return type stay identical, so no caller
changes. Add a short "swap here" comment block marking the boundary.

### 6.3 `index.ts`

Barrel: `export * from "./model/build-prompt"; export * from "./actions/generate-bouquet-image.action";`

---

## 7. Entities

### 7.1 `src/entites/stem/`

```
model/stem.model.ts     — StemVM + mapStem
model/index.ts          — barrel
actions/get-stems.ts    — "server-only", getStems()
actions/index.ts        — barrel
index.ts                — export * from "./model"   (actions imported deep, matching product slice)
```

```ts
// model/stem.model.ts
export interface StemVM {
  id: string;
  name: string;
  color: string;
  pricePerStem: number;
  stock: number;
}
export function mapStem(row: {
  id: string; name: string; color: string; pricePerStem: number; stock: number;
}): StemVM;
```

```ts
// actions/get-stems.ts
import "server-only";
import { cache } from "react";
import { prisma } from "@/prisma/prisma-instance";
import { mapStem, type StemVM } from "@/src/entites/stem/model";

export const getStems = cache(async (): Promise<StemVM[]> => {
  const rows = await prisma.stem.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, pricePerStem: true, stock: true },
  });
  return rows.map(mapStem);
});
```

### 7.2 `src/entites/bouquet-option/`

```
model/bouquet-option.model.ts   — BouquetOptionVM + mapBouquetOption
model/index.ts
actions/get-bouquet-options.ts  — "server-only", getWrapPapers(), getRibbons()
actions/index.ts
index.ts                        — export * from "./model"
```

```ts
// model/bouquet-option.model.ts
export interface BouquetOptionVM {
  id: string;
  name: string;
  color: string;
  price: number;
}
export function mapBouquetOption(row: {
  id: string; name: string; color: string; price: number;
}): BouquetOptionVM;
```

```ts
// actions/get-bouquet-options.ts
import "server-only";
import { cache } from "react";
import { prisma } from "@/prisma/prisma-instance";
import { mapBouquetOption, type BouquetOptionVM } from "@/src/entites/bouquet-option/model";

const SELECT = { id: true, name: true, color: true, price: true } as const;

export const getWrapPapers = cache(async (): Promise<BouquetOptionVM[]> => {
  const rows = await prisma.wrapPaper.findMany({
    where: { active: true }, orderBy: { price: "asc" }, select: SELECT,
  });
  return rows.map(mapBouquetOption);
});

export const getRibbons = cache(async (): Promise<BouquetOptionVM[]> => {
  const rows = await prisma.ribbon.findMany({
    where: { active: true }, orderBy: { price: "asc" }, select: SELECT,
  });
  return rows.map(mapBouquetOption);
});
```

---

## 8. Store rewrite (`src/_app/store/useCustomBouquetStore.ts`)

Session-only (not persisted). The interface changes; every consumer is
new code in this feature, so there is no back-compat burden.

### 8.1 Types

```ts
export interface SelectedStem {
  id: string;
  name: string;
  pricePerStem: number;
  quantity: number;
  color: string;
}

export interface SelectedOption {
  id: string;
  name: string;
  color: string;
  price: number;
}
```

### 8.2 State + actions

```ts
interface CustomBouquetState {
  step: number;                         // 1..4
  selectedStems: SelectedStem[];
  selectedWrap: SelectedOption | null;
  selectedRibbon: SelectedOption | null;
  generatedImage: string | null;

  nextStep: () => void;                 // clamp to 4
  prevStep: () => void;                 // clamp to 1
  setStep: (step: number) => void;

  addStem: (stem: Omit<SelectedStem, "quantity">) => void;   // +1 or insert
  removeStem: (stemId: string) => void;
  updateStemQuantity: (stemId: string, quantity: number) => void;  // <=0 removes

  setWrap: (wrap: SelectedOption) => void;
  setRibbon: (ribbon: SelectedOption) => void;
  setGeneratedImage: (url: string | null) => void;

  resetBuilder: () => void;             // clears everything incl. generatedImage, step -> 1

  getBuilderTotalPrice: () => number;   // Σ(stem.pricePerStem*qty) + wrap.price + ribbon.price
  getBuilderTotalStems: () => number;
}
```

### 8.3 Changes vs current implementation

- `selectedWrap` / `selectedRibbon`: `string | null` → `SelectedOption | null`.
- `setWrap` / `setRibbon`: accept the object, not a string.
- `getBuilderTotalPrice`: **remove** the flat `50000` base fee; add
  `selectedWrap?.price ?? 0` and `selectedRibbon?.price ?? 0`.
- `nextStep`: clamp to `4` (currently unbounded).
- New: `generatedImage`, `setGeneratedImage`; `resetBuilder` clears it.

### 8.4 Constants — `src/shared/lib/constants/custom-bouquet.const.ts`

```ts
export const MIN_STEMS = 5;

export const BUILDER_STEPS = ["Stems", "Wrap", "Ribbon", "Review"] as const;

export const STEM_EMOJI: Record<string, string> = {
  "Red Rose": "🌹", "Pink Rose": "🌷", "White Lily": "🌼",
  "Yellow Tulip": "🌷", "Purple Orchid": "🪻", "Sunflower": "🌻",
  "Baby's Breath": "🤍", "Peony": "🌸", "Lavender": "💜", "Carnation": "🌺",
};
export const STEM_EMOJI_FALLBACK = "🌿";
```

Export from `src/shared/lib/constants/index.ts` if a barrel exists there;
otherwise import the file directly (match the pattern used by
`app-page.const.ts`).

---

## 9. Widgets — `src/widgets/custom-bouquet/`

Existing `custom-bouquet.widget.tsx` (landing CTA) is **unchanged**.

```
src/widgets/custom-bouquet/
├── custom-bouquet.widget.tsx      (existing, untouched)
├── bouquet-builder.widget.tsx     (new — orchestrator)
├── builder-stepper.tsx            (new)
├── bouquet-summary.tsx            (new)
├── steps/stem-step.tsx            (new)
├── steps/wrap-step.tsx            (new)
├── steps/ribbon-step.tsx          (new)
├── steps/review-step.tsx          (new)
└── index.ts                       (barrel — add new public exports)
```

`src/widgets/index.ts` gains `export * from "./custom-bouquet/bouquet-builder.widget";`

### 9.1 `bouquet-builder.widget.tsx`

- `"use client"`.
- Props: `{ stems: StemVM[]; wraps: BouquetOptionVM[]; ribbons: BouquetOptionVM[] }`.
- `useHydrated()` guard — **optional**. The store is a plain `create`
  (not `persist`), so there is no SSR/client mismatch and this can be
  skipped. Include it only if a step-flash is observed in practice
  (`if (!hydrated) return <Skeleton/>`).
- `useEffect(() => { resetBuilder(); }, [])` — fresh every visit.
- Layout: two columns on `lg` — main step area + `<BouquetSummary />`
  sidebar (`h-fit`, sticky). Single column below `lg`.
- Renders `<BuilderStepper current={step} />`, then a switch on `step`:
  `1 → <StemStep stems={stems} />`, `2 → <WrapStep wraps={wraps} />`,
  `3 → <RibbonStep ribbons={ribbons} />`, `4 → <ReviewStep />`.
- Footer nav row:
  - **Back** — `prevStep()`, hidden on step 1.
  - **Next** — `nextStep()`; disabled on step 1 until
    `getBuilderTotalStems() >= MIN_STEMS`; disabled on step 2 until
    `selectedWrap`; disabled on step 3 until `selectedRibbon`. Hidden on
    step 4 (review has its own CTA).
- Step change wrapped in a CSS fade/slide transition (keyed `<div>` +
  `ScrollReveal` or a small `key={step}` + Tailwind `animate-*`).

### 9.2 `builder-stepper.tsx`

4 labelled dots from `BUILDER_STEPS`, connector bar fills with a
`transition-[width] duration-500` as `current` advances. Completed steps
get a check icon (`lucide-react`), current step is accented
(`bg-pink-500`), future steps muted. `aria-current="step"` on the active
one.

### 9.3 `bouquet-summary.tsx`

Card. Shows: total stems (`getBuilderTotalStems()` / `MIN_STEMS` with a
"need N more" hint while under), a compact stem list with per-line
subtotals, selected wrap + ribbon with prices, and the running
`getBuilderTotalPrice()` formatted `toLocaleString("vi-VN") + "₫"`.
Numbers animate on change via a CSS transition on a count wrapper (or
plain re-render — keep simple).

### 9.4 `steps/stem-step.tsx`

- Responsive grid of stem cards (`sm:grid-cols-2 lg:grid-cols-3`).
- Card: color swatch dot (`style={{ background: stem.color }}` — the seed
  colors are CSS keyword names like `"red"`, `"pink"` which are valid CSS
  colors, so inline `background` works directly), `STEM_EMOJI[name] ??
  STEM_EMOJI_FALLBACK`, name, `pricePerStem` formatted, and a qty
  stepper (`−` / value / `+`) bound to `addStem` /
  `updateStemQuantity(id, qty)` / `removeStem`. Reads current qty from
  `selectedStems.find(s => s.id === id)?.quantity ?? 0`.
- Header line: `N / 5 stems` — pink when `>= MIN_STEMS`, muted otherwise.
- No per-stem stock cap this pass (decision #4). Out-of-stock stems are
  still shown and selectable.

### 9.5 `steps/wrap-step.tsx` / `steps/ribbon-step.tsx`

Single-select radio-card grid. Card: swatch (`style={{ background:
option.color }}`), name, price. Selected card gets a ring
(`ring-2 ring-pink-500`) + check icon. Click → `setWrap(option)` /
`setRibbon(option)` (pass the full `BouquetOptionVM`). The two files are
near-identical; keep them separate for clarity rather than
over-abstracting (matches how the codebase keeps `wrap-step` /
`ribbon-step` distinct in the store).

### 9.6 `steps/review-step.tsx`

- `"use client"`. Reads the whole selection from the store.
- On mount (`useEffect` with an empty dep list + an `ignore` flag):
  call `generateBouquetImage({ stems, wrapPaper, ribbon })` inside
  `startTransition` / a local `isGenerating` state. On resolve →
  `setGeneratedImage(result.imageUrl)`.
- If `generatedImage` is already set (user stepped back to review then
  returned within the same session without resetting), skip regeneration.
- **Loading state:** a CSS "bloom" animation (`@keyframes` scaling +
  rotating petals) with copy like *"Arranging your bouquet…"*. Respects
  `prefers-reduced-motion` (static text + spinner fallback).
- **Error state:** if the action throws, show a message + a "Try again"
  button that re-invokes generation. (Stub never throws, but the real
  provider will.)
- **Success state:** render the image via a plain `<img src={generatedImage}
  alt="Your custom bouquet preview" className="rounded-2xl w-full" />`
  (`next/image` is not used — SVG/arbitrary data URL), the full selection
  summary, the total, and a primary **"Add to cart & checkout"** button.
- **Add to cart handler:**
  ```ts
  const id = `CUSTOM-${crypto.randomUUID()}`;
  addToCart({
    id,
    name: "Custom Bouquet",
    slug: "custom-bouquet",
    price: getBuilderTotalPrice(),
    image: generatedImage ?? "",
    quantity: 1,
    isCustomBouquet: true,
    customDetails: {
      wrapPaper: selectedWrap?.name ?? "",
      ribbon: selectedRibbon?.name ?? "",
      stems: selectedStems.map(s => ({
        stemId: s.id, name: s.name, pricePerStem: s.pricePerStem,
        quantity: s.quantity, color: s.color,
      })),
    },
  }, 1);
  resetBuilder();
  router.push("/cart");
  ```
  The "Add to cart" button is disabled while `isGenerating` or when
  `generatedImage` is null.

### 9.7 `index.ts`

Barrel re-exports `bouquet-builder.widget` (and any sub-component that
needs to be public — likely none; keep steps internal).

---

## 10. Page — `src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx`

Replace the stub with an `async` server component:

```tsx
import { getStems } from "@/src/entites/stem/actions";
import { getWrapPapers, getRibbons } from "@/src/entites/bouquet-option/actions";
import { BouquetBuilderWidget } from "@/widgets/index";

export async function CustomBouquetPage() {
  const [stems, wraps, ribbons] = await Promise.all([
    getStems(), getWrapPapers(), getRibbons(),
  ]);

  return (
    <div className="py-8">
      <header className="mb-8 text-center">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">
          Design Your Own Bouquet
        </h1>
        <p className="mt-2 text-gray-500">
          Choose your stems, wrap, and ribbon — we&apos;ll show you a preview.
        </p>
      </header>
      <BouquetBuilderWidget stems={stems} wraps={wraps} ribbons={ribbons} />
    </div>
  );
}
```

`app/(store-front)/custom-bouquet/page.tsx` is unchanged (already
re-exports `CustomBouquetPage` and sits in the `(store-front)` group, so
it inherits the sidebar + cart-button chrome from `StoreFrontLayout`).

---

## 11. Cart line item — `src/_pages/cart/ui/cart-line-item.tsx`

Extend `CartLineItem` to handle `item.isCustomBouquet`:

- **Image:** when custom, render `<img src={item.image}>` (data URL)
  instead of the `next/image` branch. Keep the `💐` emoji fallback when
  `item.image` is empty.
- **Title:** when custom, render the name as plain text (no
  `/catalog/[slug]` `<Link>` — that slug does not resolve).
- **Details block:** when `item.customDetails` is present, render under
  the price, styled like the existing `addons` `<ul>`:
  ```
  Wrap: Kraft Brown
  Ribbon: Satin Blush
  3× Red Rose · 6× Baby's Breath · 4× White Lily
  ```
- **Quantity stepper / line total / remove:** unchanged — the existing
  logic already works off `item.price` and `item.quantity`, and
  `item.price` is the full bouquet price. Custom bouquets have no
  `addons`, so `addonsTotal` is `0`.

No changes needed to `useCartStore` (the `CartStem` / `customDetails`
shape already matches what §9.6 writes) or to `cart.page.tsx` (its
subtotal reducer already reads `item.price`).

---

## 12. Files touched — summary

**New:**
```
docs/superpowers/specs/2026-09-01-custom-bouquet-builder-design.md
prisma/migrations/<ts>_add_custom_bouquet_pricing/migration.sql   (generated)
src/shared/lib/constants/custom-bouquet.const.ts
src/entites/stem/model/stem.model.ts
src/entites/stem/model/index.ts
src/entites/stem/actions/get-stems.ts
src/entites/stem/actions/index.ts
src/entites/stem/index.ts
src/entites/bouquet-option/model/bouquet-option.model.ts
src/entites/bouquet-option/model/index.ts
src/entites/bouquet-option/actions/get-bouquet-options.ts
src/entites/bouquet-option/actions/index.ts
src/entites/bouquet-option/index.ts
src/features/generate-bouquet-image/model/build-prompt.ts
src/features/generate-bouquet-image/actions/generate-bouquet-image.action.ts
src/features/generate-bouquet-image/index.ts
src/widgets/custom-bouquet/bouquet-builder.widget.tsx
src/widgets/custom-bouquet/builder-stepper.tsx
src/widgets/custom-bouquet/bouquet-summary.tsx
src/widgets/custom-bouquet/steps/stem-step.tsx
src/widgets/custom-bouquet/steps/wrap-step.tsx
src/widgets/custom-bouquet/steps/ribbon-step.tsx
src/widgets/custom-bouquet/steps/review-step.tsx
src/widgets/custom-bouquet/index.ts
```

**Modified:**
```
prisma/schema.prisma                        (Stem.pricePerStem, WrapPaper, Ribbon)
prisma/seed.ts                              (stem prices, wrap/ribbon seed, txn deletes, log)
src/_app/store/useCustomBouquetStore.ts     (rewrite per §8)
src/widgets/index.ts                        (export bouquet-builder.widget)
src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx   (stub → real)
src/_pages/cart/ui/cart-line-item.tsx       (custom-bouquet rendering)
```

Possibly `src/shared/lib/constants/index.ts` if a constants barrel exists.

---

## 13. Verification (no test runner — matches project)

Run in order:

1. `npx prisma migrate dev --name add_custom_bouquet_pricing`
2. `npx prisma generate`
3. `npm run db:seed` — confirm the log shows stems + wrap papers + ribbons.
4. `npx tsc --noEmit` — clean (the Next build ignores type errors, so
   this is the real gate).
5. `npm run lint` — clean.
6. `npm run format:check` (or `npm run format`).
7. `npm run build` — succeeds.
8. Manual browser walk-through on `/custom-bouquet`:
   - Step 1: add stems; Next stays disabled under 5, enables at 5.
   - Step 2: pick a wrap; Step 3: pick a ribbon.
   - Step 4: loader animates ~1.5s, then an SVG bouquet preview appears
     whose colors track the selection; total = stems + wrap + ribbon.
   - "Add to cart & checkout" → lands on `/cart` with a "Custom Bouquet"
     line showing the preview image, wrap, ribbon, stem breakdown, and
     the correct price; builder is reset.
   - Checkout → existing success dialog.
   - Revisit `/custom-bouquet` → wizard is back at step 1, empty.
   - Toggle OS reduced-motion → loader falls back to static text.

---

## 14. Risks / notes

- **Store interface break:** `useCustomBouquetStore` currently has no
  consumers besides this feature, so the rewrite is safe. Grep to confirm
  before editing.
- **SVG data URL in the cart:** must use a plain `<img>`, not
  `next/image`. Encode the SVG with `encodeURIComponent` and keep it
  small (cap shape count) so the data URL stays well under any practical
  limit for a localStorage-persisted cart.
- **`crypto.randomUUID()`** is available in the browser (secure context)
  and in the Node runtime this project targets — no `uuid` package
  needed.
- **Seed colors are CSS keywords** (`"red"`, `"pink"`, …). They render
  fine as inline `background` values; the new wrap/ribbon colors are hex.
  No normalisation needed.
- **`prisma.*.createMany`** with the PrismaPg adapter is supported; if it
  proves problematic in seed, fall back to `Promise.all(map(create))`
  like the existing stem seed.
- **Real image provider** is deliberately out of scope. The `.env` switch
  (`BOUQUET_IMAGE_PROVIDER`) and the "swap here" comment mark the seam.
```

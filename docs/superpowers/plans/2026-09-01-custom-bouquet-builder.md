# Custom Bouquet Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-step `/custom-bouquet` wizard (stems → wrap → ribbon → review) that generates a preview image from the selection and adds the result to the cart as a custom line item.

**Architecture:** Feature-Sliced. An `async` server page fetches stem/wrap/ribbon data from Prisma and passes it to a client orchestrator widget that drives step state through `useCustomBouquetStore` (Zustand, session-only). The review step calls a `"use server"` action that returns a preview image (stubbed this pass as a deterministic inline-SVG composed from the selected colors). Add-to-cart writes a `CartItem` with `isCustomBouquet` + `customDetails` into the existing persisted `useCartStore`, and the cart line-item component is extended to render it.

**Tech Stack:** Next.js 16 (App Router, Turbopack, async request APIs), React 19, Prisma 7 (client generated to `prisma/generated/`, PrismaPg adapter), Zustand 5, Tailwind v4, shadcn/radix primitives in `src/shared/ui`, `lucide-react` icons.

**Spec:** `docs/superpowers/specs/2026-09-01-custom-bouquet-builder-design.md` — read it alongside this plan.

## Global Constraints

- **No test runner exists in this project and none is being added.** Every task is verified with `npx tsc --noEmit` (the real type gate — `next build` ignores type errors), `npm run lint`, and the manual checks each task spells out. Do not add vitest/jest.
- **Next.js 16 request APIs are async-only.** `await cookies()`, `await headers()`, `await props.params`, `await props.searchParams`. Not used directly here, but do not reintroduce sync forms.
- **Prisma client is generated to `prisma/generated/`**, not `node_modules`. Import types from `@/prisma/generated/client`; import the singleton from `@/prisma/prisma-instance` (`import { prisma } from "@/prisma/prisma-instance"`).
- **Import aliases:** `@/shared/*`, `@/_app/*`, `@/_pages/*`, `@/widgets/*` resolve into `src/`. There is **no alias for `entites` or `features`** — import those as `@/src/entites/…` and `@/src/features/…`.
- **The entities folder is misspelled `src/entites/`** — this is load-bearing. Use that spelling in every path and import.
- **Prettier config:** 4-space indent, double quotes, semicolons, trailing commas. Run `npm run format` before each commit if unsure.
- **Server-only data modules** start with `import "server-only";` and are wrapped in React `cache()` — match `src/entites/product/actions/get-product-by-slug.ts`.
- **Barrel imports only.** Each slice exposes an `index.ts`; import from the barrel, not deep paths (exception: entity `actions` are imported deep as `@/src/entites/<slice>/actions`, matching the product slice).
- **Money is VND**, displayed as `value.toLocaleString("vi-VN") + "₫"`.
- **Commit message trailers** (every commit):
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1
  ```
- **Branch:** all work lands on `custom-bouquet-builder` (already checked out; the spec commit is `64caf9c`).

---

### Task 1: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma` (add field to `Stem` ~line 63-73; add two models after `CustomBouquetStem` ~line 155)
- Generated: `prisma/migrations/<timestamp>_add_custom_bouquet_pricing/migration.sql`
- Generated: `prisma/generated/**` (via `prisma generate`)

**Interfaces:**
- Consumes: nothing.
- Produces: Prisma model types `WrapPaper`, `Ribbon` and `Stem.pricePerStem: number`, importable from `@/prisma/generated/client`. Delegates `prisma.wrapPaper`, `prisma.ribbon`, and `Stem.pricePerStem` on the singleton.

- [ ] **Step 1: Add `pricePerStem` to the `Stem` model**

In `prisma/schema.prisma`, inside `model Stem`, add the field after `criticalMin`:

```prisma
    pricePerStem Float               @default(0) // VND per single stem
```

- [ ] **Step 2: Add the `WrapPaper` and `Ribbon` models**

Immediately after the `CustomBouquetStem` model (before `AddressBookEntry`), add:

```prisma
// Giấy gói cho bó hoa tự thiết kế (lookup data cho builder)
model WrapPaper {
    id        String   @id @default(cuid())
    name      String   @unique
    color     String // Mã màu hex hiển thị swatch trong builder
    price     Float // Phụ phí cộng vào tổng bó (VND)
    active    Boolean  @default(true)
    createdAt DateTime @default(now())
}

// Ruy băng cho bó hoa tự thiết kế
model Ribbon {
    id        String   @id @default(cuid())
    name      String   @unique
    color     String
    price     Float
    active    Boolean  @default(true)
    createdAt DateTime @default(now())
}
```

- [ ] **Step 3: Create and apply the migration**

Ensure local Postgres is up (`docker compose up -d`), then run:

```bash
npx prisma migrate dev --name add_custom_bouquet_pricing
```

Expected: a new folder under `prisma/migrations/` whose `migration.sql`
adds the `pricePerStem` column with default `0` and creates the
`WrapPaper` and `Ribbon` tables. Command ends with "Your database is now
in sync with your schema" and auto-runs generate.

- [ ] **Step 4: Regenerate the client explicitly**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client" into `./prisma/generated`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (same baseline as before the task).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/generated
git commit -m "feat(prisma): add stem pricePerStem + WrapPaper/Ribbon models

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 2: Seed pricing + wrap/ribbon data

**Files:**
- Modify: `prisma/seed.ts` (`STEMS` array ~line 43-54; `$transaction` delete batch ~line 100-105; after stem creation ~line 121; final `console.log` ~line 163)

**Interfaces:**
- Consumes: `prisma.wrapPaper`, `prisma.ribbon`, `Stem.pricePerStem` from Task 1.
- Produces: a seeded DB — 10 stems with real `pricePerStem`, 4 `WrapPaper` rows, 4 `Ribbon` rows.

- [ ] **Step 1: Add `pricePerStem` to every `STEMS` entry**

Replace the `STEMS` array with:

```ts
const STEMS = [
    { name: "Red Rose", color: "red", pricePerStem: 25000 },
    { name: "Pink Rose", color: "pink", pricePerStem: 22000 },
    { name: "White Lily", color: "white", pricePerStem: 30000 },
    { name: "Yellow Tulip", color: "yellow", pricePerStem: 18000 },
    { name: "Purple Orchid", color: "purple", pricePerStem: 45000 },
    { name: "Sunflower", color: "yellow", pricePerStem: 15000 },
    { name: "Baby's Breath", color: "white", pricePerStem: 12000 },
    { name: "Peony", color: "pink", pricePerStem: 40000 },
    { name: "Lavender", color: "purple", pricePerStem: 20000 },
    { name: "Carnation", color: "red", pricePerStem: 14000 },
];
```

The existing `prisma.stem.create({ data: { ...s, stock, criticalMin } })`
call already spreads `s`, so it picks up `pricePerStem` with no further
change.

- [ ] **Step 2: Add the wrap/ribbon source arrays**

Directly below the `STEMS` array add:

```ts
const WRAP_PAPERS = [
    { name: "Kraft Brown", color: "#8B5E3C", price: 20000 },
    { name: "Korean Matte White", color: "#F4F1EC", price: 35000 },
    { name: "Pastel Pink Tissue", color: "#F7C9D6", price: 25000 },
    { name: "Clear Cellophane", color: "#D9E4E1", price: 15000 },
];

const RIBBONS = [
    { name: "Satin Blush", color: "#E8A0B4", price: 10000 },
    { name: "Grosgrain Ivory", color: "#EFE7D6", price: 8000 },
    { name: "Velvet Burgundy", color: "#6E1E2C", price: 15000 },
    { name: "Twine Rustic", color: "#B79B6E", price: 5000 },
];
```

- [ ] **Step 3: Wipe the new tables in the delete transaction**

In the `await prisma.$transaction([ ... ])` call, add these two lines
before `prisma.category.deleteMany()`:

```ts
        prisma.ribbon.deleteMany(),
        prisma.wrapPaper.deleteMany(),
```

- [ ] **Step 4: Create the wrap/ribbon rows**

After the `const stems = await Promise.all( ... )` block (and before the
`let made = 0;` line), add:

```ts
    await prisma.wrapPaper.createMany({ data: WRAP_PAPERS });
    await prisma.ribbon.createMany({ data: RIBBONS });
```

If `createMany` errors under the PrismaPg adapter, fall back to:

```ts
    await Promise.all(WRAP_PAPERS.map((w) => prisma.wrapPaper.create({ data: w })));
    await Promise.all(RIBBONS.map((r) => prisma.ribbon.create({ data: r })));
```

- [ ] **Step 5: Update the summary log**

Change the final `console.log` to include the new counts, e.g.:

```ts
    console.log(
        `Seeded ${categories.length} categories, ${stems.length} stems, ` +
            `${WRAP_PAPERS.length} wrap papers, ${RIBBONS.length} ribbons, ` +
            `${made} products (${productStemRows} product-stem rows).`,
    );
```

- [ ] **Step 6: Run the seed**

```bash
npm run db:seed
```

Expected: the summary line prints `4 wrap papers, 4 ribbons` and exits 0.

- [ ] **Step 7: Verify the rows landed**

```bash
npx tsx -e "import{prisma}from'./prisma/prisma-instance';(async()=>{console.log(await prisma.wrapPaper.count(),await prisma.ribbon.count(),(await prisma.stem.findFirst({where:{name:'Red Rose'}}))?.pricePerStem);await prisma.\$disconnect()})()"
```

Expected: `4 4 25000`.

- [ ] **Step 8: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): stem prices + wrap paper / ribbon data

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 3: Shared constants

**Files:**
- Create: `src/shared/lib/constants/custom-bouquet.const.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `MIN_STEMS: number` (= 5)
  - `BUILDER_STEPS: readonly ["Stems", "Wrap", "Ribbon", "Review"]`
  - `STEM_EMOJI: Record<string, string>`
  - `STEM_EMOJI_FALLBACK: string`
  - `stemEmoji(name: string): string`
  Imported directly from `@/shared/lib/constants/custom-bouquet.const` (there is no constants barrel — match how `app-page.const.ts` is imported).

- [ ] **Step 1: Create the constants file**

`src/shared/lib/constants/custom-bouquet.const.ts`:

```ts
export const MIN_STEMS = 5;

export const BUILDER_STEPS = ["Stems", "Wrap", "Ribbon", "Review"] as const;

export const STEM_EMOJI: Record<string, string> = {
    "Red Rose": "🌹",
    "Pink Rose": "🌷",
    "White Lily": "🌼",
    "Yellow Tulip": "🌷",
    "Purple Orchid": "🪻",
    Sunflower: "🌻",
    "Baby's Breath": "🤍",
    Peony: "🌸",
    Lavender: "💜",
    Carnation: "🌺",
};

export const STEM_EMOJI_FALLBACK = "🌿";

export function stemEmoji(name: string): string {
    return STEM_EMOJI[name] ?? STEM_EMOJI_FALLBACK;
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/constants/custom-bouquet.const.ts
git commit -m "feat(shared): custom bouquet builder constants

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 4: `stem` entity slice

**Files:**
- Create: `src/entites/stem/model/stem.model.ts`
- Create: `src/entites/stem/model/index.ts`
- Create: `src/entites/stem/actions/get-stems.ts`
- Create: `src/entites/stem/actions/index.ts`
- Create: `src/entites/stem/index.ts`

**Interfaces:**
- Consumes: `prisma` singleton; `Stem.pricePerStem` from Task 1.
- Produces:
  - `interface StemVM { id: string; name: string; color: string; pricePerStem: number; stock: number; }` — from `@/src/entites/stem/model`
  - `mapStem(row): StemVM` — from `@/src/entites/stem/model`
  - `getStems(): Promise<StemVM[]>` — from `@/src/entites/stem/actions` (deep import; cached; sorted by `name` asc)

- [ ] **Step 1: Create the model + mapper**

`src/entites/stem/model/stem.model.ts`:

```ts
export interface StemVM {
    id: string;
    name: string;
    color: string;
    pricePerStem: number;
    stock: number;
}

export function mapStem(row: {
    id: string;
    name: string;
    color: string;
    pricePerStem: number;
    stock: number;
}): StemVM {
    return {
        id: row.id,
        name: row.name,
        color: row.color,
        pricePerStem: row.pricePerStem,
        stock: row.stock,
    };
}
```

`src/entites/stem/model/index.ts`:

```ts
export * from "./stem.model";
```

- [ ] **Step 2: Create the server action**

`src/entites/stem/actions/get-stems.ts`:

```ts
import "server-only";
import { cache } from "react";
import { prisma } from "@/prisma/prisma-instance";
import { mapStem, type StemVM } from "@/src/entites/stem/model";

export const getStems = cache(async (): Promise<StemVM[]> => {
    const rows = await prisma.stem.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            color: true,
            pricePerStem: true,
            stock: true,
        },
    });
    return rows.map(mapStem);
});
```

`src/entites/stem/actions/index.ts`:

```ts
export * from "./get-stems";
```

- [ ] **Step 3: Create the slice barrel**

`src/entites/stem/index.ts` (model only — actions are imported deep, matching the product slice):

```ts
export * from "./model";
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/entites/stem
git commit -m "feat(entites): stem slice with getStems action

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 5: `bouquet-option` entity slice

**Files:**
- Create: `src/entites/bouquet-option/model/bouquet-option.model.ts`
- Create: `src/entites/bouquet-option/model/index.ts`
- Create: `src/entites/bouquet-option/actions/get-bouquet-options.ts`
- Create: `src/entites/bouquet-option/actions/index.ts`
- Create: `src/entites/bouquet-option/index.ts`

**Interfaces:**
- Consumes: `prisma` singleton; `WrapPaper` / `Ribbon` models from Task 1.
- Produces:
  - `interface BouquetOptionVM { id: string; name: string; color: string; price: number; }` — from `@/src/entites/bouquet-option/model`
  - `mapBouquetOption(row): BouquetOptionVM`
  - `getWrapPapers(): Promise<BouquetOptionVM[]>` and `getRibbons(): Promise<BouquetOptionVM[]>` — from `@/src/entites/bouquet-option/actions` (deep import; cached; `active: true` only; sorted by `price` asc)

- [ ] **Step 1: Create the model + mapper**

`src/entites/bouquet-option/model/bouquet-option.model.ts`:

```ts
export interface BouquetOptionVM {
    id: string;
    name: string;
    color: string;
    price: number;
}

export function mapBouquetOption(row: {
    id: string;
    name: string;
    color: string;
    price: number;
}): BouquetOptionVM {
    return {
        id: row.id,
        name: row.name,
        color: row.color,
        price: row.price,
    };
}
```

`src/entites/bouquet-option/model/index.ts`:

```ts
export * from "./bouquet-option.model";
```

- [ ] **Step 2: Create the server actions**

`src/entites/bouquet-option/actions/get-bouquet-options.ts`:

```ts
import "server-only";
import { cache } from "react";
import { prisma } from "@/prisma/prisma-instance";
import {
    mapBouquetOption,
    type BouquetOptionVM,
} from "@/src/entites/bouquet-option/model";

const SELECT = {
    id: true,
    name: true,
    color: true,
    price: true,
} as const;

export const getWrapPapers = cache(async (): Promise<BouquetOptionVM[]> => {
    const rows = await prisma.wrapPaper.findMany({
        where: { active: true },
        orderBy: { price: "asc" },
        select: SELECT,
    });
    return rows.map(mapBouquetOption);
});

export const getRibbons = cache(async (): Promise<BouquetOptionVM[]> => {
    const rows = await prisma.ribbon.findMany({
        where: { active: true },
        orderBy: { price: "asc" },
        select: SELECT,
    });
    return rows.map(mapBouquetOption);
});
```

`src/entites/bouquet-option/actions/index.ts`:

```ts
export * from "./get-bouquet-options";
```

- [ ] **Step 3: Create the slice barrel**

`src/entites/bouquet-option/index.ts`:

```ts
export * from "./model";
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/entites/bouquet-option
git commit -m "feat(entites): bouquet-option slice (wrap papers + ribbons)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 6: `generate-bouquet-image` feature

**Files:**
- Create: `src/features/generate-bouquet-image/model/build-prompt.ts`
- Create: `src/features/generate-bouquet-image/actions/generate-bouquet-image.action.ts`
- Create: `src/features/generate-bouquet-image/index.ts`

**Interfaces:**
- Consumes: nothing (pure + stub).
- Produces:
  - `interface BouquetSelection { stems: { name: string; color: string; quantity: number }[]; wrapPaper: { name: string; color: string } | null; ribbon: { name: string; color: string } | null; }`
  - `buildBouquetPrompt(sel: BouquetSelection): string`
  - `interface GenerateBouquetImageResult { imageUrl: string; prompt: string; }`
  - `generateBouquetImage(sel: BouquetSelection): Promise<GenerateBouquetImageResult>` — `"use server"`; ~1.5s delay; returns a `data:image/svg+xml` URL composed from the selection colors.
  All from `@/src/features/generate-bouquet-image`.

- [ ] **Step 1: Create the prompt builder**

`src/features/generate-bouquet-image/model/build-prompt.ts`:

```ts
export interface BouquetSelection {
    stems: { name: string; color: string; quantity: number }[];
    wrapPaper: { name: string; color: string } | null;
    ribbon: { name: string; color: string } | null;
}

function pluralize(name: string, qty: number): string {
    if (qty === 1) return name.toLowerCase();
    return `${name.toLowerCase()}s`;
}

export function buildBouquetPrompt(sel: BouquetSelection): string {
    const stemPhrases = sel.stems
        .filter((s) => s.quantity > 0)
        .map((s) => `${s.quantity} ${pluralize(s.name, s.quantity)}`);

    const parts: string[] = [
        `a hand-tied bouquet of ${stemPhrases.join(", ") || "assorted flowers"}`,
    ];
    if (sel.wrapPaper) {
        parts.push(`wrapped in ${sel.wrapPaper.name.toLowerCase()} paper`);
    }
    if (sel.ribbon) {
        parts.push(`tied with a ${sel.ribbon.name.toLowerCase()} ribbon`);
    }
    parts.push(
        "professional studio flower photography, soft natural light, plain background",
    );
    return parts.join(", ");
}
```

- [ ] **Step 2: Smoke-check the prompt builder**

```bash
npx tsx -e "import{buildBouquetPrompt}from'./src/features/generate-bouquet-image/model/build-prompt';console.log(buildBouquetPrompt({stems:[{name:'Red Rose',color:'red',quantity:12},{name:\"Baby's Breath\",color:'white',quantity:1}],wrapPaper:{name:'Kraft Brown',color:'#8B5E3C'},ribbon:{name:'Satin Blush',color:'#E8A0B4'}}))"
```

Expected (one line):
`a hand-tied bouquet of 12 red roses, 1 baby's breath, wrapped in kraft brown paper, tied with a satin blush ribbon, professional studio flower photography, soft natural light, plain background`

- [ ] **Step 3: Create the server action (stub)**

`src/features/generate-bouquet-image/actions/generate-bouquet-image.action.ts`:

```ts
"use server";

import {
    buildBouquetPrompt,
    type BouquetSelection,
} from "@/src/features/generate-bouquet-image/model/build-prompt";

export interface GenerateBouquetImageResult {
    imageUrl: string;
    prompt: string;
}

const CANVAS = 480;

function svgBouquet(sel: BouquetSelection): string {
    // Expand each stem colour by its quantity, cap the shape count so the
    // resulting data URL stays small enough for a localStorage-persisted cart.
    const dots: string[] = [];
    for (const stem of sel.stems) {
        for (let i = 0; i < stem.quantity && dots.length < 24; i++) {
            dots.push(stem.color);
        }
    }
    if (dots.length === 0) dots.push("#F7C9D6");

    const cx = CANVAS / 2;
    const petals = dots
        .map((color, i) => {
            const angle = (i / dots.length) * Math.PI * 2;
            const radius = 70 + (i % 3) * 26;
            const x = cx + Math.cos(angle) * radius;
            const y = 170 + Math.sin(angle) * radius * 0.7;
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="26" fill="${color}" fill-opacity="0.92" />`;
        })
        .join("");

    const wrapColor = sel.wrapPaper?.color ?? "#E7DFD3";
    const ribbonColor = sel.ribbon?.color ?? "#E8A0B4";

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">`,
        `<rect width="${CANVAS}" height="${CANVAS}" fill="#FFF7FA" />`,
        `<path d="M${cx} 250 L${cx - 120} 460 L${cx + 120} 460 Z" fill="${wrapColor}" />`,
        petals,
        `<rect x="${cx - 130}" y="330" width="260" height="26" rx="13" fill="${ribbonColor}" />`,
        `</svg>`,
    ].join("");
}

export async function generateBouquetImage(
    sel: BouquetSelection,
): Promise<GenerateBouquetImageResult> {
    const prompt = buildBouquetPrompt(sel);

    // --- STUB: swap this block for a real image API call. ------------------
    // Select the implementation via process.env.BOUQUET_IMAGE_PROVIDER and
    // read the provider key from .env. Keep the signature and return type.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const svg = svgBouquet(sel);
    const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    // ---------------------------------------------------------------------

    return { imageUrl, prompt };
}
```

- [ ] **Step 4: Create the feature barrel**

`src/features/generate-bouquet-image/index.ts`:

```ts
export * from "./model/build-prompt";
export * from "./actions/generate-bouquet-image.action";
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/generate-bouquet-image
git commit -m "feat(features): generate-bouquet-image (stubbed SVG generator)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 7: Rewrite `useCustomBouquetStore`

**Files:**
- Modify (full rewrite): `src/_app/store/useCustomBouquetStore.ts`

**Interfaces:**
- Consumes: nothing (grep confirms no other module imports this store).
- Produces (all from `@/_app/store/useCustomBouquetStore`):
  - `interface SelectedStem { id: string; name: string; pricePerStem: number; quantity: number; color: string; }`
  - `interface SelectedOption { id: string; name: string; color: string; price: number; }`
  - `useCustomBouquetStore` with state `{ step: number; selectedStems: SelectedStem[]; selectedWrap: SelectedOption | null; selectedRibbon: SelectedOption | null; generatedImage: string | null }` and actions `nextStep()`, `prevStep()`, `setStep(step)`, `addStem(stem: Omit<SelectedStem, "quantity">)`, `removeStem(stemId)`, `updateStemQuantity(stemId, quantity)`, `setWrap(SelectedOption)`, `setRibbon(SelectedOption)`, `setGeneratedImage(url: string | null)`, `resetBuilder()`, `getBuilderTotalPrice()`, `getBuilderTotalStems()`.

- [ ] **Step 1: Confirm no consumers**

Run: `grep -rn "useCustomBouquetStore" src app --include="*.ts" --include="*.tsx"`
Expected: only `src/_app/store/useCustomBouquetStore.ts` itself. If any
other file appears, STOP and reconcile before rewriting.

- [ ] **Step 2: Replace the file contents**

`src/_app/store/useCustomBouquetStore.ts`:

```ts
import { create } from "zustand";

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

const LAST_STEP = 4;

interface CustomBouquetState {
    step: number;
    selectedStems: SelectedStem[];
    selectedWrap: SelectedOption | null;
    selectedRibbon: SelectedOption | null;
    generatedImage: string | null;

    nextStep: () => void;
    prevStep: () => void;
    setStep: (step: number) => void;

    addStem: (stem: Omit<SelectedStem, "quantity">) => void;
    removeStem: (stemId: string) => void;
    updateStemQuantity: (stemId: string, quantity: number) => void;

    setWrap: (wrap: SelectedOption) => void;
    setRibbon: (ribbon: SelectedOption) => void;
    setGeneratedImage: (url: string | null) => void;

    resetBuilder: () => void;

    getBuilderTotalPrice: () => number;
    getBuilderTotalStems: () => number;
}

export const useCustomBouquetStore = create<CustomBouquetState>((set, get) => ({
    step: 1,
    selectedStems: [],
    selectedWrap: null,
    selectedRibbon: null,
    generatedImage: null,

    nextStep: () =>
        set((state) => ({ step: Math.min(LAST_STEP, state.step + 1) })),
    prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
    setStep: (step) =>
        set({ step: Math.min(LAST_STEP, Math.max(1, step)) }),

    addStem: (stem) => {
        const current = get().selectedStems;
        const existing = current.find((s) => s.id === stem.id);
        if (existing) {
            set({
                selectedStems: current.map((s) =>
                    s.id === stem.id ? { ...s, quantity: s.quantity + 1 } : s,
                ),
            });
        } else {
            set({ selectedStems: [...current, { ...stem, quantity: 1 }] });
        }
    },

    removeStem: (stemId) => {
        set({
            selectedStems: get().selectedStems.filter((s) => s.id !== stemId),
        });
    },

    updateStemQuantity: (stemId, quantity) => {
        if (quantity <= 0) {
            get().removeStem(stemId);
            return;
        }
        set({
            selectedStems: get().selectedStems.map((s) =>
                s.id === stemId ? { ...s, quantity } : s,
            ),
        });
    },

    setWrap: (wrap) => set({ selectedWrap: wrap }),
    setRibbon: (ribbon) => set({ selectedRibbon: ribbon }),
    setGeneratedImage: (url) => set({ generatedImage: url }),

    resetBuilder: () =>
        set({
            step: 1,
            selectedStems: [],
            selectedWrap: null,
            selectedRibbon: null,
            generatedImage: null,
        }),

    getBuilderTotalPrice: () => {
        const stemsPrice = get().selectedStems.reduce(
            (total, stem) => total + stem.pricePerStem * stem.quantity,
            0,
        );
        const wrapPrice = get().selectedWrap?.price ?? 0;
        const ribbonPrice = get().selectedRibbon?.price ?? 0;
        return stemsPrice + wrapPrice + ribbonPrice;
    },

    getBuilderTotalStems: () => {
        return get().selectedStems.reduce(
            (total, stem) => total + stem.quantity,
            0,
        );
    },
}));
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/_app/store/useCustomBouquetStore.ts
git commit -m "refactor(store): object-based wrap/ribbon + real pricing + generatedImage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 8: Stepper + summary sub-components

**Files:**
- Create: `src/widgets/custom-bouquet/builder-stepper.tsx`
- Create: `src/widgets/custom-bouquet/bouquet-summary.tsx`

**Interfaces:**
- Consumes: `useCustomBouquetStore`, `BUILDER_STEPS`, `MIN_STEMS`, `stemEmoji`, `cn`.
- Produces:
  - `<BuilderStepper current={number} />` — 4-dot progress header
  - `<BouquetSummary />` — running selection + total sidebar card
  Both exported from their own files; re-exported by the widget barrel in Task 11.

- [ ] **Step 1: Create `builder-stepper.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { BUILDER_STEPS } from "@/shared/lib/constants/custom-bouquet.const";

export function BuilderStepper({ current }: { current: number }) {
    return (
        <ol className="mb-8 flex items-center gap-2">
            {BUILDER_STEPS.map((label, i) => {
                const stepNo = i + 1;
                const done = stepNo < current;
                const active = stepNo === current;
                return (
                    <li key={label} className="flex flex-1 items-center gap-2">
                        <div
                            aria-current={active ? "step" : undefined}
                            className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                                done && "bg-pink-500 text-white",
                                active &&
                                    "bg-pink-500 text-white ring-4 ring-pink-100",
                                !done &&
                                    !active &&
                                    "bg-gray-100 text-gray-400",
                            )}
                        >
                            {done ? <Check size={16} /> : stepNo}
                        </div>
                        <span
                            className={cn(
                                "hidden text-sm font-medium sm:inline",
                                active ? "text-gray-900" : "text-gray-400",
                            )}
                        >
                            {label}
                        </span>
                        {stepNo < BUILDER_STEPS.length && (
                            <div className="relative mx-1 h-0.5 flex-1 bg-gray-100">
                                <div
                                    className="absolute inset-y-0 left-0 bg-pink-500 transition-[width] duration-500"
                                    style={{
                                        width: done ? "100%" : "0%",
                                    }}
                                />
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
```

- [ ] **Step 2: Create `bouquet-summary.tsx`**

```tsx
"use client";

import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import {
    MIN_STEMS,
    stemEmoji,
} from "@/shared/lib/constants/custom-bouquet.const";
import { cn } from "@/shared/lib/utils";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function BouquetSummary() {
    const stems = useCustomBouquetStore((s) => s.selectedStems);
    const wrap = useCustomBouquetStore((s) => s.selectedWrap);
    const ribbon = useCustomBouquetStore((s) => s.selectedRibbon);
    const totalStems = useCustomBouquetStore((s) => s.getBuilderTotalStems());
    const totalPrice = useCustomBouquetStore((s) => s.getBuilderTotalPrice());

    const remaining = Math.max(0, MIN_STEMS - totalStems);

    return (
        <aside className="h-fit rounded-2xl border border-pink-100 bg-white p-5 lg:sticky lg:top-6">
            <h2 className="font-semibold text-gray-800">Your bouquet</h2>

            <p
                className={cn(
                    "mt-1 text-sm",
                    totalStems >= MIN_STEMS
                        ? "text-pink-600"
                        : "text-gray-400",
                )}
            >
                {totalStems} stem{totalStems === 1 ? "" : "s"}
                {remaining > 0 && ` · ${remaining} more to continue`}
            </p>

            <ul className="mt-3 space-y-1 text-sm text-gray-600">
                {stems.length === 0 && (
                    <li className="text-gray-400">No stems yet</li>
                )}
                {stems.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                        <span>
                            {stemEmoji(s.name)} {s.quantity}× {s.name}
                        </span>
                        <span>{vnd(s.pricePerStem * s.quantity)}</span>
                    </li>
                ))}
            </ul>

            <dl className="mt-3 space-y-1 border-t pt-3 text-sm text-gray-600">
                <div className="flex justify-between">
                    <dt>Wrap</dt>
                    <dd>
                        {wrap
                            ? `${wrap.name} · ${vnd(wrap.price)}`
                            : "—"}
                    </dd>
                </div>
                <div className="flex justify-between">
                    <dt>Ribbon</dt>
                    <dd>
                        {ribbon
                            ? `${ribbon.name} · ${vnd(ribbon.price)}`
                            : "—"}
                    </dd>
                </div>
            </dl>

            <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{vnd(totalPrice)}</span>
            </div>
        </aside>
    );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/widgets/custom-bouquet/builder-stepper.tsx src/widgets/custom-bouquet/bouquet-summary.tsx
git commit -m "feat(custom-bouquet): stepper + running summary components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 9: Step components — stems, wrap, ribbon

**Files:**
- Create: `src/widgets/custom-bouquet/steps/stem-step.tsx`
- Create: `src/widgets/custom-bouquet/steps/wrap-step.tsx`
- Create: `src/widgets/custom-bouquet/steps/ribbon-step.tsx`

**Interfaces:**
- Consumes: `StemVM` (`@/src/entites/stem/model`), `BouquetOptionVM` (`@/src/entites/bouquet-option/model`), `useCustomBouquetStore`, `stemEmoji`, `MIN_STEMS`, `cn`.
- Produces:
  - `<StemStep stems={StemVM[]} />`
  - `<WrapStep wraps={BouquetOptionVM[]} />`
  - `<RibbonStep ribbons={BouquetOptionVM[]} />`

- [ ] **Step 1: Create `steps/stem-step.tsx`**

```tsx
"use client";

import { Minus, Plus } from "lucide-react";
import type { StemVM } from "@/src/entites/stem/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import {
    MIN_STEMS,
    stemEmoji,
} from "@/shared/lib/constants/custom-bouquet.const";
import { cn } from "@/shared/lib/utils";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function StemStep({ stems }: { stems: StemVM[] }) {
    const selected = useCustomBouquetStore((s) => s.selectedStems);
    const addStem = useCustomBouquetStore((s) => s.addStem);
    const updateStemQuantity = useCustomBouquetStore(
        (s) => s.updateStemQuantity,
    );
    const totalStems = useCustomBouquetStore((s) => s.getBuilderTotalStems());

    const qtyOf = (id: string) =>
        selected.find((s) => s.id === id)?.quantity ?? 0;

    return (
        <div>
            <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-playfair text-xl font-bold text-gray-900">
                    Pick your stems
                </h2>
                <span
                    className={cn(
                        "text-sm font-medium",
                        totalStems >= MIN_STEMS
                            ? "text-pink-600"
                            : "text-gray-400",
                    )}
                >
                    {totalStems} / {MIN_STEMS}
                </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stems.map((stem) => {
                    const qty = qtyOf(stem.id);
                    return (
                        <div
                            key={stem.id}
                            className={cn(
                                "rounded-2xl border p-4 transition-colors",
                                qty > 0
                                    ? "border-pink-300 bg-pink-50/50"
                                    : "border-gray-200 bg-white",
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="h-4 w-4 shrink-0 rounded-full border"
                                    style={{ background: stem.color }}
                                    aria-hidden
                                />
                                <span className="text-lg" aria-hidden>
                                    {stemEmoji(stem.name)}
                                </span>
                                <span className="font-medium text-gray-800">
                                    {stem.name}
                                </span>
                            </div>

                            <p className="mt-1 text-sm text-gray-500">
                                {vnd(stem.pricePerStem)} / stem
                            </p>

                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center rounded-md border">
                                    <button
                                        type="button"
                                        aria-label={`Remove one ${stem.name}`}
                                        className="px-2 py-1 disabled:opacity-40"
                                        disabled={qty <= 0}
                                        onClick={() =>
                                            updateStemQuantity(
                                                stem.id,
                                                qty - 1,
                                            )
                                        }
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center text-sm">
                                        {qty}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={`Add one ${stem.name}`}
                                        className="px-2 py-1"
                                        onClick={() =>
                                            qty === 0
                                                ? addStem({
                                                      id: stem.id,
                                                      name: stem.name,
                                                      pricePerStem:
                                                          stem.pricePerStem,
                                                      color: stem.color,
                                                  })
                                                : updateStemQuantity(
                                                      stem.id,
                                                      qty + 1,
                                                  )
                                        }
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create `steps/wrap-step.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { cn } from "@/shared/lib/utils";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function WrapStep({ wraps }: { wraps: BouquetOptionVM[] }) {
    const selected = useCustomBouquetStore((s) => s.selectedWrap);
    const setWrap = useCustomBouquetStore((s) => s.setWrap);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Choose wrap paper
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                {wraps.map((wrap) => {
                    const active = selected?.id === wrap.id;
                    return (
                        <button
                            key={wrap.id}
                            type="button"
                            onClick={() => setWrap(wrap)}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span
                                className="h-10 w-10 shrink-0 rounded-full border"
                                style={{ background: wrap.color }}
                                aria-hidden
                            />
                            <span className="flex-1">
                                <span className="block font-medium text-gray-800">
                                    {wrap.name}
                                </span>
                                <span className="block text-sm text-gray-500">
                                    {vnd(wrap.price)}
                                </span>
                            </span>
                            {active && (
                                <Check
                                    size={18}
                                    className="text-pink-500"
                                    aria-hidden
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Create `steps/ribbon-step.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { cn } from "@/shared/lib/utils";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function RibbonStep({ ribbons }: { ribbons: BouquetOptionVM[] }) {
    const selected = useCustomBouquetStore((s) => s.selectedRibbon);
    const setRibbon = useCustomBouquetStore((s) => s.setRibbon);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Choose a ribbon
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                {ribbons.map((ribbon) => {
                    const active = selected?.id === ribbon.id;
                    return (
                        <button
                            key={ribbon.id}
                            type="button"
                            onClick={() => setRibbon(ribbon)}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span
                                className="h-10 w-10 shrink-0 rounded-full border"
                                style={{ background: ribbon.color }}
                                aria-hidden
                            />
                            <span className="flex-1">
                                <span className="block font-medium text-gray-800">
                                    {ribbon.name}
                                </span>
                                <span className="block text-sm text-gray-500">
                                    {vnd(ribbon.price)}
                                </span>
                            </span>
                            {active && (
                                <Check
                                    size={18}
                                    className="text-pink-500"
                                    aria-hidden
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/custom-bouquet/steps/stem-step.tsx src/widgets/custom-bouquet/steps/wrap-step.tsx src/widgets/custom-bouquet/steps/ribbon-step.tsx
git commit -m "feat(custom-bouquet): stem / wrap / ribbon step components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 10: Review step

**Files:**
- Create: `src/widgets/custom-bouquet/steps/review-step.tsx`
- Modify: `app/globals.css` (append one `@keyframes` block + helper classes)

**Interfaces:**
- Consumes: `useCustomBouquetStore`, `useCartStore` (`@/_app/store/useCartStore`), `generateBouquetImage` + `BouquetSelection` (`@/src/features/generate-bouquet-image`), `stemEmoji`, `next/navigation` `useRouter`.
- Produces: `<ReviewStep />` — auto-generates the preview on mount, renders it, and on confirm writes the cart item + resets + routes to `/cart`.

- [ ] **Step 1: Append the loader animation to `app/globals.css`**

At the end of `app/globals.css`:

```css
@keyframes bouquet-bloom {
    0% {
        transform: scale(0.6) rotate(-8deg);
        opacity: 0.4;
    }
    50% {
        transform: scale(1.05) rotate(6deg);
        opacity: 1;
    }
    100% {
        transform: scale(0.6) rotate(-8deg);
        opacity: 0.4;
    }
}

.animate-bouquet-bloom {
    animation: bouquet-bloom 1.6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
    .animate-bouquet-bloom {
        animation: none;
    }
}
```

- [ ] **Step 2: Create `steps/review-step.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { useCartStore } from "@/_app/store/useCartStore";
import {
    generateBouquetImage,
    type BouquetSelection,
} from "@/src/features/generate-bouquet-image";
import { stemEmoji } from "@/shared/lib/constants/custom-bouquet.const";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function ReviewStep() {
    const router = useRouter();

    const stems = useCustomBouquetStore((s) => s.selectedStems);
    const wrap = useCustomBouquetStore((s) => s.selectedWrap);
    const ribbon = useCustomBouquetStore((s) => s.selectedRibbon);
    const generatedImage = useCustomBouquetStore((s) => s.generatedImage);
    const setGeneratedImage = useCustomBouquetStore(
        (s) => s.setGeneratedImage,
    );
    const totalPrice = useCustomBouquetStore((s) => s.getBuilderTotalPrice());
    const resetBuilder = useCustomBouquetStore((s) => s.resetBuilder);

    const addToCart = useCartStore((s) => s.addToCart);

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(false);
    const startedRef = useRef(false);

    useEffect(() => {
        if (generatedImage || startedRef.current) return;
        startedRef.current = true;

        let ignore = false;
        const selection: BouquetSelection = {
            stems: stems.map((s) => ({
                name: s.name,
                color: s.color,
                quantity: s.quantity,
            })),
            wrapPaper: wrap
                ? { name: wrap.name, color: wrap.color }
                : null,
            ribbon: ribbon
                ? { name: ribbon.name, color: ribbon.color }
                : null,
        };

        setIsGenerating(true);
        setError(false);
        generateBouquetImage(selection)
            .then((res) => {
                if (ignore) return;
                setGeneratedImage(res.imageUrl);
            })
            .catch(() => {
                if (!ignore) setError(true);
            })
            .finally(() => {
                if (!ignore) setIsGenerating(false);
            });

        return () => {
            ignore = true;
        };
    }, [generatedImage, stems, wrap, ribbon, setGeneratedImage]);

    function retry() {
        startedRef.current = false;
        setGeneratedImage(null);
    }

    function addToCartAndCheckout() {
        const id = `CUSTOM-${crypto.randomUUID()}`;
        addToCart(
            {
                id,
                name: "Custom Bouquet",
                slug: "custom-bouquet",
                price: totalPrice,
                image: generatedImage ?? "",
                quantity: 1,
                isCustomBouquet: true,
                customDetails: {
                    wrapPaper: wrap?.name ?? "",
                    ribbon: ribbon?.name ?? "",
                    stems: stems.map((s) => ({
                        stemId: s.id,
                        name: s.name,
                        pricePerStem: s.pricePerStem,
                        quantity: s.quantity,
                        color: s.color,
                    })),
                },
            },
            1,
        );
        resetBuilder();
        router.push("/cart");
    }

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Review your bouquet
            </h2>

            <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-pink-100 bg-pink-50/40">
                    {isGenerating && (
                        <div className="flex flex-col items-center gap-3 text-center">
                            <span
                                className="animate-bouquet-bloom text-5xl select-none"
                                aria-hidden
                            >
                                💐
                            </span>
                            <p className="text-sm text-gray-500">
                                Arranging your bouquet…
                            </p>
                        </div>
                    )}

                    {!isGenerating && error && (
                        <div className="flex flex-col items-center gap-3 text-center">
                            <p className="text-sm text-gray-500">
                                Couldn&apos;t generate the preview.
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                onClick={retry}
                            >
                                Try again
                            </Button>
                        </div>
                    )}

                    {!isGenerating && !error && generatedImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={generatedImage}
                            alt="Your custom bouquet preview"
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>

                <div>
                    <ul className="space-y-1 text-sm text-gray-600">
                        {stems.map((s) => (
                            <li key={s.id}>
                                {stemEmoji(s.name)} {s.quantity}× {s.name}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-sm text-gray-600">
                        Wrap: {wrap?.name ?? "—"}
                    </p>
                    <p className="text-sm text-gray-600">
                        Ribbon: {ribbon?.name ?? "—"}
                    </p>
                    <p className="mt-4 text-2xl font-bold text-gray-900">
                        {vnd(totalPrice)}
                    </p>

                    <Button
                        type="button"
                        size="lg"
                        className="mt-4 w-full bg-pink-500 hover:bg-pink-600"
                        disabled={isGenerating || !generatedImage}
                        onClick={addToCartAndCheckout}
                    >
                        Add to cart &amp; checkout
                    </Button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. (The `<img>` is intentionally ESLint-disabled inline —
`next/image` cannot render an arbitrary SVG data URL.)

- [ ] **Step 4: Commit**

```bash
git add src/widgets/custom-bouquet/steps/review-step.tsx app/globals.css
git commit -m "feat(custom-bouquet): review step with preview generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 11: Builder orchestrator widget + barrels

**Files:**
- Create: `src/widgets/custom-bouquet/bouquet-builder.widget.tsx`
- Create: `src/widgets/custom-bouquet/index.ts`
- Modify: `src/widgets/index.ts` (add one export line)

**Interfaces:**
- Consumes: `StemVM`, `BouquetOptionVM`, `useCustomBouquetStore`, `MIN_STEMS`, all step components from Tasks 8-10, `Button`.
- Produces: `<BouquetBuilderWidget stems={StemVM[]} wraps={BouquetOptionVM[]} ribbons={BouquetOptionVM[]} />`, re-exported from `@/widgets/index`.

- [ ] **Step 1: Create `bouquet-builder.widget.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui";
import type { StemVM } from "@/src/entites/stem/model";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { MIN_STEMS } from "@/shared/lib/constants/custom-bouquet.const";
import { BuilderStepper } from "./builder-stepper";
import { BouquetSummary } from "./bouquet-summary";
import { StemStep } from "./steps/stem-step";
import { WrapStep } from "./steps/wrap-step";
import { RibbonStep } from "./steps/ribbon-step";
import { ReviewStep } from "./steps/review-step";

interface Props {
    stems: StemVM[];
    wraps: BouquetOptionVM[];
    ribbons: BouquetOptionVM[];
}

export function BouquetBuilderWidget({ stems, wraps, ribbons }: Props) {
    const step = useCustomBouquetStore((s) => s.step);
    const nextStep = useCustomBouquetStore((s) => s.nextStep);
    const prevStep = useCustomBouquetStore((s) => s.prevStep);
    const resetBuilder = useCustomBouquetStore((s) => s.resetBuilder);
    const totalStems = useCustomBouquetStore((s) => s.getBuilderTotalStems());
    const wrap = useCustomBouquetStore((s) => s.selectedWrap);
    const ribbon = useCustomBouquetStore((s) => s.selectedRibbon);

    // Every visit starts a fresh bouquet.
    useEffect(() => {
        resetBuilder();
    }, [resetBuilder]);

    const canAdvance =
        (step === 1 && totalStems >= MIN_STEMS) ||
        (step === 2 && !!wrap) ||
        (step === 3 && !!ribbon);

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
                <BuilderStepper current={step} />

                <div key={step} className="animate-in fade-in duration-300">
                    {step === 1 && <StemStep stems={stems} />}
                    {step === 2 && <WrapStep wraps={wraps} />}
                    {step === 3 && <RibbonStep ribbons={ribbons} />}
                    {step === 4 && <ReviewStep />}
                </div>

                {step < 4 && (
                    <div className="mt-8 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={prevStep}
                            className={step === 1 ? "invisible" : ""}
                        >
                            Back
                        </Button>
                        <Button
                            type="button"
                            onClick={nextStep}
                            disabled={!canAdvance}
                            className="bg-pink-500 hover:bg-pink-600"
                        >
                            {step === 3 ? "Review" : "Next"}
                        </Button>
                    </div>
                )}
            </div>

            <BouquetSummary />
        </div>
    );
}
```

Note: `animate-in fade-in duration-300` are `tw-animate-css` utilities
bundled with the shadcn setup; if `npx tsc --noEmit` / the build flags
them as unknown, replace that `className` with `"transition-opacity duration-300"`.

- [ ] **Step 2: Create the widget-folder barrel**

`src/widgets/custom-bouquet/index.ts`:

```ts
export * from "./custom-bouquet.widget";
export * from "./bouquet-builder.widget";
```

- [ ] **Step 3: Point the top-level widgets barrel at the folder barrel**

In `src/widgets/index.ts`, replace the single line

```ts
export * from "./custom-bouquet/custom-bouquet.widget";
```

with

```ts
export * from "./custom-bouquet";
```

The folder barrel from Step 2 re-exports both `CustomBouquetWidget` (the
landing CTA, unchanged) and `BouquetBuilderWidget`, so every existing
importer of `CustomBouquetWidget` keeps working.

- [ ] **Step 4: Verify the landing widget still resolves**

Run: `grep -rn "CustomBouquetWidget" src app`
Confirm every importer resolves (they import from `@/widgets/index`).
`npx tsc --noEmit` in Step 5 is the real gate.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/widgets/custom-bouquet/bouquet-builder.widget.tsx src/widgets/custom-bouquet/index.ts src/widgets/index.ts
git commit -m "feat(custom-bouquet): builder orchestrator widget + barrels

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 12: Wire the page

**Files:**
- Modify (replace stub): `src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx`

**Interfaces:**
- Consumes: `getStems` (`@/src/entites/stem/actions`), `getWrapPapers` + `getRibbons` (`@/src/entites/bouquet-option/actions`), `BouquetBuilderWidget` (`@/widgets/index`).
- Produces: `CustomBouquetPage` — `async` server component (unchanged export name; `app/(store-front)/custom-bouquet/page.tsx` already re-exports it).

- [ ] **Step 1: Replace the file**

`src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx`:

```tsx
import { getStems } from "@/src/entites/stem/actions";
import {
    getRibbons,
    getWrapPapers,
} from "@/src/entites/bouquet-option/actions";
import { BouquetBuilderWidget } from "@/widgets/index";

export async function CustomBouquetPage() {
    const [stems, wraps, ribbons] = await Promise.all([
        getStems(),
        getWrapPapers(),
        getRibbons(),
    ]);

    return (
        <div className="py-8">
            <header className="mb-8 text-center">
                <h1 className="font-playfair text-3xl font-bold text-gray-900">
                    Design Your Own Bouquet
                </h1>
                <p className="mt-2 text-gray-500">
                    Choose your stems, wrap, and ribbon — we&apos;ll show
                    you a preview.
                </p>
            </header>
            <BouquetBuilderWidget
                stems={stems}
                wraps={wraps}
                ribbons={ribbons}
            />
        </div>
    );
}
```

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all clean; build lists the `/custom-bouquet` route.

- [ ] **Step 3: Manual walk-through**

```bash
npm run dev
```

Visit `http://localhost:3000/custom-bouquet`:
- Stepper shows 4 steps, step 1 active.
- Add stems; "Next" is disabled until the counter hits `5 / 5`, then enables.
- Step 2: click a wrap → it gets a ring, "Next" enables.
- Step 3: click a ribbon → "Review" button enables.
- Step 4: 💐 blooms for ~1.5s, then an SVG bouquet appears whose petal
  colors match the chosen stems, cone matches the wrap color, band
  matches the ribbon color. Total = stem subtotals + wrap + ribbon.
- Sidebar total tracks every change.

Leave the dev server running for Task 13.

- [ ] **Step 4: Commit**

```bash
git add src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx
git commit -m "feat(custom-bouquet): wire the builder page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 13: Render custom bouquets in the cart

**Files:**
- Modify: `src/_pages/cart/ui/cart-line-item.tsx`

**Interfaces:**
- Consumes: `CartItem` (already carries `isCustomBouquet?: boolean` and `customDetails?: { wrapPaper: string; ribbon: string; stems: CartStem[] }`).
- Produces: no new exports — `CartLineItem` now branches on `item.isCustomBouquet`.

- [ ] **Step 1: Replace the file**

Replace `src/_pages/cart/ui/cart-line-item.tsx` in full. Changes vs the
current version: a new `isCustom` derived const; the image block gains a
plain-`<img>` branch for custom bouquets (SVG data URL); the title
renders as plain text (no `/catalog/[slug]` link) when custom; a details
`<ul>` (wrap / ribbon / stem list) is added after the price. The
quantity stepper, line total, and remove button are untouched — they
already work off `item.price` / `item.quantity`, and custom bouquets
carry no `addons` so `addonsTotal` stays `0`.

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { PLACEHOLDER_IMAGE } from "@/src/entites/product/model";
import { useCartStore, type CartItem } from "@/_app/store/useCartStore";

export function CartLineItem({ item }: { item: CartItem }) {
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const removeFromCart = useCartStore((s) => s.removeFromCart);

    const addonsTotal = (item.addons ?? []).reduce(
        (sum, a) => sum + a.price * a.quantity,
        0,
    );
    const lineTotal = (item.price + addonsTotal) * item.quantity;
    const hasImage = Boolean(item.image) && item.image !== PLACEHOLDER_IMAGE;
    const isCustom = Boolean(item.isCustomBouquet && item.customDetails);

    return (
        <div className="flex gap-4 py-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-100 to-violet-100">
                {isCustom && item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.image}
                        alt={item.name}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : hasImage ? (
                    <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                    />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-3xl select-none">
                        💐
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                    {isCustom ? (
                        <span className="line-clamp-2 font-medium text-gray-800">
                            {item.name}
                        </span>
                    ) : (
                        <Link
                            href={`/catalog/${item.slug}`}
                            className="line-clamp-2 font-medium text-gray-800 hover:text-pink-600"
                        >
                            {item.name}
                        </Link>
                    )}
                    <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="mt-0.5 text-sm text-gray-500">
                    {item.price.toLocaleString("vi-VN")}₫
                </p>

                {isCustom && (
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                        <li>Wrap: {item.customDetails!.wrapPaper || "—"}</li>
                        <li>
                            Ribbon: {item.customDetails!.ribbon || "—"}
                        </li>
                        <li>
                            {item
                                .customDetails!.stems.map(
                                    (s) => `${s.quantity}× ${s.name}`,
                                )
                                .join(" · ")}
                        </li>
                    </ul>
                )}

                {(item.addons ?? []).length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                        {item.addons!.map((a) => (
                            <li key={a.id}>
                                + {a.name} ({a.quantity}×{" "}
                                {a.price.toLocaleString("vi-VN")}₫)
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-md border">
                        <button
                            type="button"
                            aria-label="Decrease quantity"
                            className="px-2 py-1 disabled:opacity-40"
                            disabled={item.quantity <= 1}
                            onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                            }
                        >
                            <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm">
                            {item.quantity}
                        </span>
                        <button
                            type="button"
                            aria-label="Increase quantity"
                            className="px-2 py-1"
                            onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                            }
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <span className="font-semibold text-gray-900">
                        {lineTotal.toLocaleString("vi-VN")}₫
                    </span>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean.

- [ ] **Step 3: Manual end-to-end**

With `npm run dev` running:
- Build a bouquet through all 4 steps → "Add to cart & checkout".
- Land on `/cart`: the "Custom Bouquet" line shows the SVG preview
  thumbnail, `Wrap: …`, `Ribbon: …`, the `N× Stem` list, the correct
  price, and a working quantity stepper. The title is plain text (not a
  link).
- Increment quantity → line total and order-summary subtotal scale.
- Return to `/custom-bouquet` → wizard is reset to step 1, empty.
- Click "Proceed to checkout" → existing payment-success dialog appears,
  cart clears.
- In the OS, enable "reduce motion" and revisit step 4 → the 💐 no
  longer animates; text still shows and the image still resolves.

- [ ] **Step 4: Commit**

```bash
git add src/_pages/cart/ui/cart-line-item.tsx
git commit -m "feat(cart): render custom bouquet line items

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 14: Final verification pass

**Files:** none (verification only; fix-forward commits if issues found).

- [ ] **Step 1: Clean typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors/warnings introduced by this feature.

- [ ] **Step 3: Format check**

Run: `npm run format:check`
Expected: clean. If it fails, run `npm run format` and commit the result
as `style: prettier`.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: succeeds; `/custom-bouquet` is listed as a route.

- [ ] **Step 5: Migration state**

Run: `npx prisma migrate status`
Expected: "Database schema is up to date!"

- [ ] **Step 6: Full manual script** (dev server)

Walk the entire flow once more, top to bottom:
1. `/` → "Start Designing" CTA → lands on `/custom-bouquet`.
2. Step 1: try to click "Next" with < 5 stems (blocked) → add to 5 → advance.
3. Step 2: "Next" blocked until a wrap is chosen.
4. Step 3: "Review" blocked until a ribbon is chosen.
5. Step 4: loader → preview image reflects colors → total is correct.
6. "Add to cart & checkout" → `/cart` shows the custom line correctly.
7. Adjust quantity, then "Proceed to checkout" → success dialog, cart clears.
8. Revisit `/custom-bouquet` → fully reset.
9. Refresh mid-build on step 2 → store is session-only, so it resets to
   step 1 (expected; not persisted).

- [ ] **Step 7: Update docs if needed**

If `README.md` or `docs/` enumerates store-front features, add a line for
the custom bouquet builder. Commit as `docs: note custom bouquet builder`.

- [ ] **Step 8: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "chore(custom-bouquet): final verification fixes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

## Notes for the executor

- **`crypto.randomUUID()`** is available in the browser (the storefront runs
  in a secure context on localhost + prod) — no `uuid` dependency.
- **Seed colors** for the 10 stems are CSS keyword strings (`"red"`,
  `"pink"`, …); they are valid `background` values, so the swatch dots
  render without conversion. Wrap/ribbon colors are hex.
- **`data:image/svg+xml` URLs must not go through `next/image`** — both the
  review step and the cart line item use a plain `<img>` with an inline
  `eslint-disable` for `@next/next/no-img-element`.
- **Store is not persisted** — no `useHydrated` gymnastics are required in
  the builder. A hard refresh mid-wizard resetting to step 1 is expected
  behaviour, not a bug.
- If **`prisma.*.createMany`** misbehaves under the PrismaPg adapter in the
  seed, use the `Promise.all(map(create))` fallback shown in Task 2 Step 4.
- The **real image provider** is out of scope. The swap point is the
  clearly-commented block in `generate-bouquet-image.action.ts`; it reads
  `process.env.BOUQUET_IMAGE_PROVIDER` + a provider key from `.env` when
  implemented.

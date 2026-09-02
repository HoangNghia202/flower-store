# Custom Bouquet Builder v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `/custom-bouquet` into an occasion-driven ordering flow with a mode-select screen and two wizards — a 7-step "Tự thiết kế" build wizard (+ a Quick shortcut) and a 5-step "Đặt theo ảnh" photo wizard that uploads reference images to Cloudinary — both ending by adding a custom line item to the existing faked cart.

**Architecture:** One `/custom-bouquet` route. A reworked `useCustomBouquetStore` holds a `mode` value; the client orchestrator renders the mode-select screen, the build wizard, or the photo wizard off it. Fixed hardcoded price tiers are the whole bouquet price (wrap/ribbon folded in, no per-item price). No Prisma/schema changes — the bouquet lives in `useCartStore.customDetails` and checkout stays faked. Reuses v1's `Stem`/`WrapPaper`/`Ribbon` models, the `stem` and `bouquet-option` entity slices, and much of the widget scaffolding, all currently on `master`.

**Tech Stack:** Next.js 16 (App Router, Turbopack, async request APIs), React 19, Zustand 5, Prisma 7 (unchanged), Tailwind v4 + `tw-animate-css`, shadcn/`radix-ui` primitives in `src/shared/ui`, `lucide-react` icons, Cloudinary unsigned upload (raw `fetch`, no SDK).

**Spec:** `docs/superpowers/specs/2026-09-02-custom-bouquet-builder-v2-design.md` — read it alongside this plan. It is the authority; this plan argues from it.

## Global Constraints

- **No test runner exists and none is added.** Every task is verified with `npx tsc --noEmit` (the real type gate — `next build` ignores type errors), `npm run lint`, and the manual checks each task names. Accepted baseline: `tsc` shows exactly 2 pre-existing errors (`next.config.ts`, `src/shared/ui/sidebar.tsx`); `npm run lint` shows ~6 pre-existing problems in files this feature never touches. "Clean" = no NEW diagnostics beyond that baseline.
- **No Prisma schema, migration, or seed changes.** `Stem`, `WrapPaper`, `Ribbon` and their seed data are reused as-is. `Stem.pricePerStem` / `WrapPaper.price` / `Ribbon.price` stay in the schema but are unused in v2 customer math/display.
- **No behavioural/logic changes to `src/_app/store/useCartStore.ts`.** The current `CartItem.customDetails` is a closed shape with required `wrapPaper` / `ribbon` / `stems`. Task 17 performs a **type-only widening** of that optional field — making the v1 keys optional and adding the v2 keys, all optional — with no change to any store function. That is the one permitted edit to this file.
- **Prettier:** 4-space indent, double quotes, semicolons, trailing commas. After editing, run `npx prettier --write` on the files you changed and confirm `npx prettier --check <those files>` is clean. **Never run repo-wide `npm run format`** — the repo has ~94 pre-existing non-conforming files.
- **Import aliases:** `@/shared/*`, `@/_app/*`, `@/_pages/*`, `@/widgets/*` resolve into `src/`. **No alias for `entites` or `features`** — import those as `@/src/entites/…` and `@/src/features/…`. The `entites` folder is intentionally misspelled.
- **Barrel imports.** Each slice exposes `index.ts`; import from the barrel. Exception: entity `actions` are imported deep as `@/src/entites/<slice>/actions` (matches the product slice).
- **Server-data modules** start with `import "server-only";` and use React `cache()` — but v2 adds none; the three fetchers (`getStems`, `getWrapPapers`, `getRibbons`) already exist unchanged.
- **`"use server"` files** export only async functions (+ types). The image-gen action follows this.
- **Money is VND**, displayed `value.toLocaleString("vi-VN") + "₫"`. A local `vnd()` helper duplicated per component is the established repo convention — acceptable, do not extract.
- **`data:` URLs and Cloudinary URLs render via a plain `<img>`, never `next/image`** — with an inline `// eslint-disable-next-line @next/next/no-img-element`.
- **`crypto.randomUUID()`** for cart item ids — no `uuid` package.
- **Commit trailers** (every commit):
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1
  ```
- **Branch:** all work lands on `custom-bouquet-v2` (already checked out; base `master` @ `7956659`; spec commit `20ba799`).
- **v1 is on `master`.** For every "rework" task, read the current file first — it exists and works — and apply the described changes to it rather than writing from a blank page.

---

### Task 1: Constants rework

**Files:**
- Modify: `src/shared/lib/constants/custom-bouquet.const.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (all from `@/shared/lib/constants/custom-bouquet.const`):
  - `MAX_REFERENCE_IMAGES = 3`
  - `interface BudgetTier { id: string; price: number; maxFlowerTypes: number; label: string }`
  - `BUDGET_TIERS: BudgetTier[]` (6 entries)
  - `OCCASIONS` — readonly array of `{ id, label, emoji }`
  - `FLOWER_COLORS` — readonly array of `{ id, label, swatch }` (5 entries; `id` matches `Stem.color`)
  - `BOUQUET_STYLES` — readonly array of `{ id, label, hidesWrapping? }` (5 entries)
  - `BUILD_STEPS`, `BUILD_STEPS_QUICK`, `PHOTO_STEPS` — `string[]`
  - `STEM_EMOJI`, `STEM_EMOJI_FALLBACK`, `stemEmoji` — kept from v1, unchanged
- Removes: `MIN_STEMS`, `BUILDER_STEPS` (were v1 exports).

- [ ] **Step 1: Grep for the removed exports**

Run: `grep -rn "MIN_STEMS\|BUILDER_STEPS" src app`
Expected: matches only in `src/widgets/custom-bouquet/**` (v1 widgets that later tasks rework/replace) and the const file itself. Note the list — later tasks must not re-import them. If anything **outside** `src/widgets/custom-bouquet/**` and the const file matches, STOP and report.

- [ ] **Step 2: Rewrite the file**

`src/shared/lib/constants/custom-bouquet.const.ts`:

```ts
export const MAX_REFERENCE_IMAGES = 3;

export interface BudgetTier {
    id: string;
    price: number;
    maxFlowerTypes: number;
    label: string;
}

export const BUDGET_TIERS: BudgetTier[] = [
    { id: "t100", price: 100_000, maxFlowerTypes: 2, label: "100.000₫" },
    { id: "t200", price: 200_000, maxFlowerTypes: 3, label: "200.000₫" },
    { id: "t350", price: 350_000, maxFlowerTypes: 3, label: "350.000₫" },
    { id: "t500", price: 500_000, maxFlowerTypes: 4, label: "500.000₫" },
    { id: "t800", price: 800_000, maxFlowerTypes: 5, label: "800.000₫" },
    { id: "t1200", price: 1_200_000, maxFlowerTypes: 6, label: "1.200.000₫" },
];

export const OCCASIONS = [
    { id: "birthday", label: "Sinh nhật", emoji: "🎂" },
    { id: "love", label: "Tình yêu / Kỷ niệm", emoji: "💕" },
    { id: "grand-opening", label: "Khai trương", emoji: "🎉" },
    { id: "congrats", label: "Chúc mừng", emoji: "🌟" },
    { id: "sympathy", label: "Chia buồn", emoji: "🕊️" },
    { id: "thanks", label: "Cảm ơn", emoji: "🙏" },
    { id: "sorry", label: "Xin lỗi", emoji: "🌷" },
] as const;

// id values match Stem.color in the seed
export const FLOWER_COLORS = [
    { id: "red", label: "Đỏ", swatch: "#C0392B" },
    { id: "pink", label: "Hồng", swatch: "#F7C9D6" },
    { id: "white", label: "Trắng", swatch: "#FFFFFF" },
    { id: "yellow", label: "Vàng", swatch: "#F1C40F" },
    { id: "purple", label: "Tím", swatch: "#8E7CC3" },
] as const;

export const BOUQUET_STYLES = [
    { id: "round", label: "Bó tròn (hand-tied)" },
    { id: "korean", label: "Bó dài kiểu Hàn" },
    { id: "rustic", label: "Rustic / tự nhiên" },
    { id: "minimal", label: "Tối giản" },
    { id: "basket", label: "Lẵng / Kệ", hidesWrapping: true },
] as const;

export const BUILD_STEPS = [
    "Dịp",
    "Ngân sách",
    "Màu sắc",
    "Kiểu dáng",
    "Chọn hoa",
    "Gói hoa",
    "Xem lại",
];
export const BUILD_STEPS_QUICK = ["Dịp", "Ngân sách", "Màu sắc", "Xem lại"];
export const PHOTO_STEPS = ["Tải ảnh", "Dịp", "Ngân sách", "Ghi chú", "Xem lại"];

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

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: NEW errors only where v1 widgets still import `MIN_STEMS` / `BUILDER_STEPS` — those widgets are reworked in later tasks and are expected to be temporarily broken. Note which files break; they must all be addressed by Task 16. If a file **outside** `src/widgets/custom-bouquet/**` breaks, STOP.

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/shared/lib/constants/custom-bouquet.const.ts
git add src/shared/lib/constants/custom-bouquet.const.ts
git commit -m "feat(custom-bouquet): v2 constants (tiers, occasions, colors, styles)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 2: Cloudinary upload helper

**Files:**
- Create: `src/shared/lib/cloudinary.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
- Produces: `uploadImageToCloudinary(file: File): Promise<string>` from `@/shared/lib/cloudinary` — resolves to a Cloudinary `secure_url`, rejects with a Vietnamese `Error` on missing config or HTTP/parse failure.

- [ ] **Step 1: Create `src/shared/lib/cloudinary.ts`**

```ts
export async function uploadImageToCloudinary(file: File): Promise<string> {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) {
        throw new Error("Cloudinary chưa được cấu hình");
    }

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", preset);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
        { method: "POST", body: form },
    );
    if (!res.ok) {
        throw new Error(`Tải ảnh lên thất bại (${res.status})`);
    }

    const data = (await res.json()) as { secure_url?: string };
    if (!data.secure_url) {
        throw new Error("Cloudinary không trả về URL ảnh");
    }
    return data.secure_url;
}
```

- [ ] **Step 2: Add env vars to `.env.example`**

Append:

```
# Cloudinary — unsigned upload preset for custom-bouquet reference photos.
# Create an UNSIGNED preset in the Cloudinary console and restrict it
# (max file size, allowed formats jpg/png/webp, a dedicated folder).
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean for these files (baseline unchanged; ignore the v1-widget breakage from Task 1).

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/shared/lib/cloudinary.ts
git add src/shared/lib/cloudinary.ts .env.example
git commit -m "feat(custom-bouquet): Cloudinary unsigned upload helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 3: `dialog.tsx` shadcn primitive

**Files:**
- Create: `src/shared/ui/dialog.tsx`
- Modify: `src/shared/ui/index.ts` (add one export line)

**Interfaces:**
- Consumes: `radix-ui` (`Dialog` namespace), `cn` from `@/shared/lib/utils`, `lucide-react` `X`.
- Produces from `@/shared/ui`: `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`.

- [ ] **Step 1: Read the existing conventions**

Read `src/shared/ui/sheet.tsx` and `src/shared/ui/popover.tsx`. Match: the `import { Dialog as DialogPrimitive } from "radix-ui"` style (namespace import from the unified `radix-ui` package — confirm the exact form used in `sheet.tsx`), `data-slot` attributes, `cn(...)` class composition, and the overlay/content animation classes (`data-[state=open]:animate-in` etc.).

- [ ] **Step 2: Create `src/shared/ui/dialog.tsx`**

Standard shadcn "new-york" dialog, adapted to this repo's import style. Reference implementation (adjust the `radix-ui` import to match `sheet.tsx`):

```tsx
"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(
    props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(
    props: React.ComponentProps<typeof DialogPrimitive.Portal>,
) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn(
                "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                className,
            )}
            {...props}
        />
    );
}

function DialogContent({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    "fixed top-1/2 left-1/2 z-50 grid w-full max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                    className,
                )}
                {...props}
            >
                {children}
                <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
                    <X className="size-4" />
                    <span className="sr-only">Đóng</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPortal>
    );
}

function DialogHeader({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-header"
            className={cn("flex flex-col gap-1.5 text-left", className)}
            {...props}
        />
    );
}

function DialogFooter({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
                className,
            )}
            {...props}
        />
    );
}

function DialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn("text-lg font-semibold text-gray-900", className)}
            {...props}
        />
    );
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn("text-sm text-gray-500", className)}
            {...props}
        />
    );
}

export {
    Dialog,
    DialogTrigger,
    DialogPortal,
    DialogClose,
    DialogOverlay,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
};
```

If `sheet.tsx` imports radix differently (e.g. `import * as SheetPrimitive from "radix-ui/dialog"` or a direct `@radix-ui/react-dialog`), mirror that exact form instead — the package layout must match what already resolves in this repo.

- [ ] **Step 3: Export from the UI barrel**

In `src/shared/ui/index.ts` add (alphabetical-ish, next to `dropdown-menu`):

```ts
export * from "./dialog";
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: `dialog.tsx` and the barrel add no new diagnostics.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/shared/ui/dialog.tsx src/shared/ui/index.ts
git add src/shared/ui/dialog.tsx src/shared/ui/index.ts
git commit -m "feat(ui): dialog primitive

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 4: Store rework

**Files:**
- Modify (full rewrite): `src/_app/store/useCustomBouquetStore.ts`

**Interfaces:**
- Consumes: `BudgetTier` from `@/shared/lib/constants/custom-bouquet.const`, `BOUQUET_STYLES` (for the wrapping-skip check), `MAX_REFERENCE_IMAGES`.
- Produces (from `@/_app/store/useCustomBouquetStore`):
  - `type BouquetMode = "build" | "photo"`
  - `interface SelectedFlower { id: string; name: string; color: string }`
  - `interface SelectedOption { id: string; name: string; color: string; price: number }`
  - `useCustomBouquetStore` with the full state + actions from spec §7.

- [ ] **Step 1: Confirm the only consumers are v2 widgets**

Run: `grep -rn "useCustomBouquetStore" src app --include=*.ts --include=*.tsx | grep -v "src/widgets/custom-bouquet/" | grep -v "useCustomBouquetStore.ts"`
Expected: no output. If anything matches, STOP and reconcile.

- [ ] **Step 2: Replace the file**

`src/_app/store/useCustomBouquetStore.ts`:

```ts
import { create } from "zustand";
import {
    BOUQUET_STYLES,
    MAX_REFERENCE_IMAGES,
    type BudgetTier,
} from "@/shared/lib/constants/custom-bouquet.const";

export type BouquetMode = "build" | "photo";

export interface SelectedFlower {
    id: string;
    name: string;
    color: string;
}

export interface SelectedOption {
    id: string;
    name: string;
    color: string;
    price: number;
}

const BUILD_REVIEW_STEP = 7;
const PHOTO_LAST_STEP = 5;

function styleHidesWrapping(styleId: string | null): boolean {
    return !!BOUQUET_STYLES.find((s) => s.id === styleId && "hidesWrapping" in s);
}

interface CustomBouquetState {
    mode: BouquetMode | null;
    step: number;
    quick: boolean;

    occasion: string | null;
    tier: BudgetTier | null;
    colors: string[];
    style: string | null;
    selectedFlowers: SelectedFlower[];
    arrangementNote: string;
    selectedWrap: SelectedOption | null;
    selectedRibbon: SelectedOption | null;
    generatedImage: string | null;

    referenceImages: string[];
    floristNote: string;

    cardMessage: string;

    setMode: (mode: BouquetMode) => void;
    resetMode: () => void;
    nextStep: () => void;
    prevStep: () => void;
    setStep: (step: number) => void;
    setQuick: (quick: boolean) => void;

    setOccasion: (id: string) => void;
    setTier: (tier: BudgetTier) => void;
    toggleColor: (color: string) => void;
    setStyle: (id: string) => void;
    toggleFlower: (flower: SelectedFlower) => void;
    setArrangementNote: (text: string) => void;
    setWrap: (opt: SelectedOption) => void;
    setRibbon: (opt: SelectedOption) => void;
    setGeneratedImage: (url: string | null) => void;

    addReferenceImage: (url: string) => void;
    removeReferenceImage: (url: string) => void;
    setFloristNote: (text: string) => void;

    setCardMessage: (text: string) => void;
    resetBuilder: () => void;

    getTotalPrice: () => number;
    canProceed: (step: number) => boolean;
}

const WIZARD_DEFAULTS = {
    step: 1,
    quick: false,
    occasion: null,
    tier: null,
    colors: [] as string[],
    style: null,
    selectedFlowers: [] as SelectedFlower[],
    arrangementNote: "",
    selectedWrap: null,
    selectedRibbon: null,
    generatedImage: null,
    referenceImages: [] as string[],
    floristNote: "",
    cardMessage: "",
};

export const useCustomBouquetStore = create<CustomBouquetState>((set, get) => ({
    mode: null,
    ...WIZARD_DEFAULTS,

    setMode: (mode) => set({ mode, step: 1, quick: false }),
    resetMode: () => set({ mode: null, ...WIZARD_DEFAULTS }),

    nextStep: () => {
        const { mode, step, quick, style } = get();
        if (mode === "photo") {
            set({ step: Math.min(PHOTO_LAST_STEP, step + 1) });
            return;
        }
        // build
        if (quick && step === 3) {
            set({ step: BUILD_REVIEW_STEP });
            return;
        }
        if (step === 5 && styleHidesWrapping(style)) {
            set({ step: BUILD_REVIEW_STEP });
            return;
        }
        set({ step: Math.min(BUILD_REVIEW_STEP, step + 1) });
    },

    prevStep: () => {
        const { mode, step, quick, style } = get();
        if (mode === "photo") {
            set({ step: Math.max(1, step - 1) });
            return;
        }
        if (quick && step === BUILD_REVIEW_STEP) {
            set({ step: 3 });
            return;
        }
        if (step === BUILD_REVIEW_STEP && styleHidesWrapping(style)) {
            set({ step: 5 });
            return;
        }
        set({ step: Math.max(1, step - 1) });
    },

    setStep: (step) => set({ step: Math.max(1, step) }),
    setQuick: (quick) =>
        set(quick ? { quick: true, step: BUILD_REVIEW_STEP } : { quick: false }),

    setOccasion: (id) => set({ occasion: id }),

    setTier: (tier) => {
        const current = get().selectedFlowers;
        set({
            tier,
            selectedFlowers: current.slice(0, tier.maxFlowerTypes),
            generatedImage: null,
        });
    },

    toggleColor: (color) => {
        const has = get().colors.includes(color);
        const colors = has
            ? get().colors.filter((c) => c !== color)
            : [...get().colors, color];
        set({
            colors,
            selectedFlowers: get().selectedFlowers.filter((f) =>
                colors.includes(f.color),
            ),
            generatedImage: null,
        });
    },

    setStyle: (id) => set({ style: id, generatedImage: null }),

    toggleFlower: (flower) => {
        const current = get().selectedFlowers;
        const has = current.some((f) => f.id === flower.id);
        if (has) {
            set({
                selectedFlowers: current.filter((f) => f.id !== flower.id),
                generatedImage: null,
            });
            return;
        }
        const cap = get().tier?.maxFlowerTypes ?? 0;
        if (current.length >= cap) return;
        set({
            selectedFlowers: [...current, flower],
            generatedImage: null,
        });
    },

    setArrangementNote: (text) =>
        set({ arrangementNote: text, generatedImage: null }),
    setWrap: (opt) => set({ selectedWrap: opt, generatedImage: null }),
    setRibbon: (opt) => set({ selectedRibbon: opt, generatedImage: null }),
    setGeneratedImage: (url) => set({ generatedImage: url }),

    addReferenceImage: (url) => {
        const current = get().referenceImages;
        if (current.length >= MAX_REFERENCE_IMAGES || current.includes(url)) {
            return;
        }
        set({ referenceImages: [...current, url] });
    },
    removeReferenceImage: (url) =>
        set({
            referenceImages: get().referenceImages.filter((u) => u !== url),
        }),
    setFloristNote: (text) => set({ floristNote: text }),

    setCardMessage: (text) => set({ cardMessage: text }),
    resetBuilder: () => set({ mode: null, ...WIZARD_DEFAULTS }),

    getTotalPrice: () => get().tier?.price ?? 0,

    canProceed: (step) => {
        const s = get();
        if (s.mode === "photo") {
            switch (step) {
                case 1:
                    return s.referenceImages.length >= 1;
                case 2:
                    return s.occasion !== null;
                case 3:
                    return s.tier !== null;
                default:
                    return true; // steps 4, 5
            }
        }
        // build
        switch (step) {
            case 1:
                return s.occasion !== null;
            case 2:
                return s.tier !== null;
            case 3:
                return s.colors.length > 0;
            case 4:
                return s.style !== null;
            case 5:
                return s.selectedFlowers.length > 0;
            case 6:
                return s.selectedWrap !== null && s.selectedRibbon !== null;
            default:
                return true; // step 7
        }
    },
}));
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: the store itself is clean; v1 widgets that import the old store shape are still broken (addressed in later tasks). No breakage outside `src/widgets/custom-bouquet/**`.

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/_app/store/useCustomBouquetStore.ts
git add src/_app/store/useCustomBouquetStore.ts
git commit -m "feat(custom-bouquet): v2 store (mode, tiers, colors, photo fields)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 5: `generate-bouquet-image` rework

**Files:**
- Modify: `src/features/generate-bouquet-image/model/build-prompt.ts`
- Modify: `src/features/generate-bouquet-image/actions/generate-bouquet-image.action.ts`
- (barrel `src/features/generate-bouquet-image/index.ts` unchanged — it re-exports both)

**Interfaces:**
- Consumes: nothing (pure + stub).
- Produces (from `@/src/features/generate-bouquet-image`):
  - `interface BouquetSelection { occasion: string | null; colors: string[]; style: string | null; flowers: { name: string; color: string }[]; arrangementNote: string; wrapPaper: { name: string; color: string } | null; ribbon: { name: string; color: string } | null }`
  - `buildBouquetPrompt(sel: BouquetSelection): string`
  - `generateBouquetImage(sel: BouquetSelection): Promise<{ imageUrl: string; prompt: string }>` (`"use server"`)

- [ ] **Step 1: Read the current files**

Read both files as they are on `master` (v1). Keep: the `"use server"` directive, the `SAFE_COLOR` / `safeColor` helper, the delimited `// --- STUB: ...` comment block **including** its zod-validation / auth-or-rate-limit / cost-cap checklist lines, and the `data:image/svg+xml;charset=utf-8,` prefix. Only the input shape and the SVG/prompt composition change.

- [ ] **Step 2: Rewrite `model/build-prompt.ts`**

```ts
export interface BouquetSelection {
    occasion: string | null;
    colors: string[];
    style: string | null;
    flowers: { name: string; color: string }[];
    arrangementNote: string;
    wrapPaper: { name: string; color: string } | null;
    ribbon: { name: string; color: string } | null;
}

const OCCASION_EN: Record<string, string> = {
    birthday: "birthday",
    love: "anniversary",
    "grand-opening": "grand opening",
    congrats: "congratulations",
    sympathy: "sympathy",
    thanks: "thank-you",
    sorry: "apology",
};

const COLOR_EN: Record<string, string> = {
    red: "red",
    pink: "pink",
    white: "white",
    yellow: "yellow",
    purple: "purple",
};

const STYLE_EN: Record<string, string> = {
    round: "hand-tied",
    korean: "long Korean-style",
    rustic: "loose rustic",
    minimal: "minimalist",
    basket: "arranged in a basket",
};

function joinEn(parts: string[]): string {
    if (parts.length <= 1) return parts.join("");
    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function pluralFlower(name: string): string {
    const n = name.toLowerCase();
    return n.endsWith("s") ? n : `${n}s`;
}

export function buildBouquetPrompt(sel: BouquetSelection): string {
    const occasion = sel.occasion ? OCCASION_EN[sel.occasion] : null;
    const styleWord = sel.style ? STYLE_EN[sel.style] : null;
    const colorWords = sel.colors.map((c) => COLOR_EN[c] ?? c);

    const head =
        `a ${styleWord ? styleWord + " " : ""}` +
        `${occasion ? occasion + " " : ""}bouquet`;

    const parts: string[] = [head];
    if (colorWords.length) {
        parts.push(`in ${joinEn(colorWords)} tones`);
    }
    if (sel.flowers.length) {
        parts.push(
            `featuring ${joinEn(sel.flowers.map((f) => pluralFlower(f.name)))}`,
        );
    } else {
        parts.push("a florist's-choice arrangement");
    }
    const note = sel.arrangementNote.trim();
    parts.push(note ? `arranged ${note}` : "arranged in a natural rounded shape");
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

- [ ] **Step 3: Rewrite `actions/generate-bouquet-image.action.ts`**

Preserve the STUB comment block and helpers from v1; swap the guard field to `colors` and rewrite `svgBouquet`:

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
const MAX_SHAPES = 16;

const SAFE_COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/;
const safeColor = (c: string): string => (SAFE_COLOR.test(c) ? c : "#F7C9D6");

function svgBouquet(sel: BouquetSelection): string {
    const palette =
        sel.flowers.length > 0
            ? sel.flowers.map((f) => f.color)
            : sel.colors.length > 0
              ? sel.colors
              : ["#F7C9D6"];

    const cx = CANVAS / 2;
    const petals = Array.from({ length: MAX_SHAPES }, (_, i) => {
        const color = safeColor(palette[i % palette.length]);
        const angle = (i / MAX_SHAPES) * Math.PI * 2;
        const radius = 70 + (i % 3) * 26;
        const x = cx + Math.cos(angle) * radius;
        const y = 170 + Math.sin(angle) * radius * 0.7;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="26" fill="${color}" fill-opacity="0.92" />`;
    }).join("");

    const wrapColor = safeColor(sel.wrapPaper?.color ?? "#E7DFD3");
    const ribbonColor = safeColor(sel.ribbon?.color ?? "#E8A0B4");

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
    if (!sel || !Array.isArray(sel.colors)) {
        throw new Error("Invalid bouquet selection");
    }

    const prompt = buildBouquetPrompt(sel);

    // --- STUB: swap this block for a real image API call. ------------------
    // Select the implementation via process.env.BOUQUET_IMAGE_PROVIDER and
    // read the provider key from .env. Keep the signature and return type.
    // Before wiring a metered image provider here, this endpoint needs:
    //   - full payload validation with a Zod schema (not just the shape guard
    //     above), rejecting unknown occasions/colours/styles;
    //   - auth or rate-limiting — this is an anonymous, unauthenticated
    //     server action reachable by anyone;
    //   - a per-request cost cap, since a metered image API will sit here and
    //     each call spends real money.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const svg = svgBouquet(sel);
    const imageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    // ---------------------------------------------------------------------

    return { imageUrl, prompt };
}
```

- [ ] **Step 4: Smoke-check the prompt builder**

```bash
npx tsx -e "import{buildBouquetPrompt}from'./src/features/generate-bouquet-image/model/build-prompt';console.log(buildBouquetPrompt({occasion:'birthday',colors:['pink','white'],style:'round',flowers:[{name:'Red Rose',color:'red'},{name:'White Lily',color:'white'}],arrangementNote:'',wrapPaper:{name:'Kraft Brown',color:'#8B5E3C'},ribbon:null}))"
```
Expected (one line):
`a hand-tied birthday bouquet, in pink and white tones, featuring red roses and white lilys, arranged in a natural rounded shape, wrapped in kraft brown paper, professional studio flower photography, soft natural light, plain background`
(If the shell one-liner has quote trouble, write a throwaway `.ts` in the scratchpad, run it with `npx tsx`, delete it, and paste the output into the report.)

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: these files clean.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/features/generate-bouquet-image/model/build-prompt.ts src/features/generate-bouquet-image/actions/generate-bouquet-image.action.ts
git add src/features/generate-bouquet-image
git commit -m "feat(custom-bouquet): v2 prompt + SVG stub (occasion/colours/style inputs)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 6: Simple build steps — occasion, budget, colour, style

**Files:**
- Create: `src/widgets/custom-bouquet/steps/occasion-step.tsx`
- Create: `src/widgets/custom-bouquet/steps/budget-step.tsx`
- Create: `src/widgets/custom-bouquet/steps/color-step.tsx`
- Create: `src/widgets/custom-bouquet/steps/style-step.tsx`

**Interfaces:**
- Consumes: `useCustomBouquetStore`; `OCCASIONS`, `BUDGET_TIERS`, `FLOWER_COLORS`, `BOUQUET_STYLES` from constants; `cn` from `@/shared/lib/utils`; `Check` from `lucide-react`.
- Produces: `<OccasionStep />`, `<BudgetStep />`, `<ColorStep />`, `<StyleStep />` (no props; each reads/writes the store).

- [ ] **Step 1: `steps/occasion-step.tsx`**

```tsx
"use client";

import { cn } from "@/shared/lib/utils";
import { OCCASIONS } from "@/shared/lib/constants/custom-bouquet.const";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function OccasionStep() {
    const occasion = useCustomBouquetStore((s) => s.occasion);
    const setOccasion = useCustomBouquetStore((s) => s.setOccasion);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Dịp tặng hoa
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {OCCASIONS.map((o) => {
                    const active = occasion === o.id;
                    return (
                        <button
                            key={o.id}
                            type="button"
                            onClick={() => setOccasion(o.id)}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span className="text-2xl" aria-hidden>
                                {o.emoji}
                            </span>
                            <span className="font-medium text-gray-800">
                                {o.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: `steps/budget-step.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { BUDGET_TIERS } from "@/shared/lib/constants/custom-bouquet.const";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function BudgetStep() {
    const tier = useCustomBouquetStore((s) => s.tier);
    const setTier = useCustomBouquetStore((s) => s.setTier);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Ngân sách
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                {BUDGET_TIERS.map((t) => {
                    const active = tier?.id === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTier(t)}
                            className={cn(
                                "flex items-center justify-between rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span>
                                <span className="block text-lg font-semibold text-gray-900">
                                    {t.label}
                                </span>
                                <span className="block text-sm text-gray-500">
                                    Tối đa {t.maxFlowerTypes} loại hoa
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

- [ ] **Step 3: `steps/color-step.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { FLOWER_COLORS } from "@/shared/lib/constants/custom-bouquet.const";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function ColorStep() {
    const colors = useCustomBouquetStore((s) => s.colors);
    const toggleColor = useCustomBouquetStore((s) => s.toggleColor);

    return (
        <div>
            <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-playfair text-xl font-bold text-gray-900">
                    Tông màu
                </h2>
                <span
                    className={cn(
                        "text-sm font-medium",
                        colors.length > 0 ? "text-pink-600" : "text-gray-400",
                    )}
                >
                    Chọn ít nhất 1 màu
                </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {FLOWER_COLORS.map((c) => {
                    const active = colors.includes(c.id);
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleColor(c.id)}
                            className={cn(
                                "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span
                                className="relative h-10 w-10 rounded-full border border-gray-300"
                                style={{ background: c.swatch }}
                                aria-hidden
                            >
                                {active && (
                                    <Check
                                        size={16}
                                        className="absolute inset-0 m-auto text-pink-600"
                                    />
                                )}
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                                {c.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 4: `steps/style-step.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { BOUQUET_STYLES } from "@/shared/lib/constants/custom-bouquet.const";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function StyleStep() {
    const style = useCustomBouquetStore((s) => s.style);
    const setStyle = useCustomBouquetStore((s) => s.setStyle);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Kiểu dáng
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                {BOUQUET_STYLES.map((st) => {
                    const active = style === st.id;
                    return (
                        <button
                            key={st.id}
                            type="button"
                            onClick={() => setStyle(st.id)}
                            className={cn(
                                "flex items-center justify-between rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span className="font-medium text-gray-800">
                                {st.label}
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

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: these 4 files add no new diagnostics.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/steps/occasion-step.tsx src/widgets/custom-bouquet/steps/budget-step.tsx src/widgets/custom-bouquet/steps/color-step.tsx src/widgets/custom-bouquet/steps/style-step.tsx
git add src/widgets/custom-bouquet/steps/occasion-step.tsx src/widgets/custom-bouquet/steps/budget-step.tsx src/widgets/custom-bouquet/steps/color-step.tsx src/widgets/custom-bouquet/steps/style-step.tsx
git commit -m "feat(custom-bouquet): occasion / budget / colour / style steps

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 7: Flower step (rename + rework)

**Files:**
- Rename: `src/widgets/custom-bouquet/steps/stem-step.tsx` → `src/widgets/custom-bouquet/steps/flower-step.tsx` (use `git mv`)
- Modify (the renamed file): full rework

**Interfaces:**
- Consumes: `StemVM` from `@/src/entites/stem/model`; `useCustomBouquetStore`; `stemEmoji` from constants; `cn`.
- Produces: `<FlowerStep stems={StemVM[]} />`.

- [ ] **Step 1: `git mv`**

```bash
git mv src/widgets/custom-bouquet/steps/stem-step.tsx src/widgets/custom-bouquet/steps/flower-step.tsx
```

- [ ] **Step 2: Replace the file contents**

`src/widgets/custom-bouquet/steps/flower-step.tsx`:

```tsx
"use client";

import type { StemVM } from "@/src/entites/stem/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { stemEmoji } from "@/shared/lib/constants/custom-bouquet.const";
import { cn } from "@/shared/lib/utils";

export function FlowerStep({ stems }: { stems: StemVM[] }) {
    const colors = useCustomBouquetStore((s) => s.colors);
    const tier = useCustomBouquetStore((s) => s.tier);
    const selected = useCustomBouquetStore((s) => s.selectedFlowers);
    const toggleFlower = useCustomBouquetStore((s) => s.toggleFlower);
    const arrangementNote = useCustomBouquetStore((s) => s.arrangementNote);
    const setArrangementNote = useCustomBouquetStore(
        (s) => s.setArrangementNote,
    );

    const cap = tier?.maxFlowerTypes ?? 0;
    const list = stems.filter((f) => colors.includes(f.color));
    const isSelected = (id: string) => selected.some((f) => f.id === id);

    return (
        <div>
            <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-playfair text-xl font-bold text-gray-900">
                    Chọn loại hoa
                </h2>
                <span
                    className={cn(
                        "text-sm font-medium",
                        selected.length > 0 ? "text-pink-600" : "text-gray-400",
                    )}
                >
                    {selected.length} / {cap}
                </span>
            </div>

            {list.length === 0 ? (
                <p className="text-sm text-gray-500">
                    Không có loại hoa nào khớp màu đã chọn.
                </p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((flower) => {
                        const on = isSelected(flower.id);
                        const atCap = !on && selected.length >= cap;
                        return (
                            <button
                                key={flower.id}
                                type="button"
                                disabled={atCap}
                                onClick={() =>
                                    toggleFlower({
                                        id: flower.id,
                                        name: flower.name,
                                        color: flower.color,
                                    })
                                }
                                className={cn(
                                    "flex items-center gap-2 rounded-2xl border p-4 text-left transition-colors",
                                    on
                                        ? "border-pink-400 bg-pink-50/50 ring-2 ring-pink-400"
                                        : "border-gray-200 bg-white hover:border-pink-200",
                                    atCap && "opacity-40",
                                )}
                            >
                                <span
                                    className="h-4 w-4 shrink-0 rounded-full border"
                                    style={{ background: flower.color }}
                                    aria-hidden
                                />
                                <span className="text-lg" aria-hidden>
                                    {stemEmoji(flower.name)}
                                </span>
                                <span className="font-medium text-gray-800">
                                    {flower.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <label
                htmlFor="arrangement-note"
                className="mt-6 block text-sm font-semibold text-gray-800"
            >
                Mô tả cách sắp xếp (không bắt buộc)
            </label>
            <textarea
                id="arrangement-note"
                value={arrangementNote}
                onChange={(e) => setArrangementNote(e.target.value)}
                rows={3}
                placeholder="Ví dụ: hồng làm trung tâm, baby's breath viền quanh, điểm vài nhành lá bạch đàn rủ xuống..."
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
        </div>
    );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: `flower-step.tsx` clean. `stem-step.tsx` no longer referenced except by the old `bouquet-builder.widget` (reworked in Task 16).

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/steps/flower-step.tsx
git add src/widgets/custom-bouquet/steps/flower-step.tsx src/widgets/custom-bouquet/steps/stem-step.tsx
git commit -m "feat(custom-bouquet): flower step (type-select, tier cap, arrangement note)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 8: Wrapping step (merge wrap + ribbon)

**Files:**
- Create: `src/widgets/custom-bouquet/steps/wrapping-step.tsx`
- Delete: `src/widgets/custom-bouquet/steps/wrap-step.tsx`, `src/widgets/custom-bouquet/steps/ribbon-step.tsx`

**Interfaces:**
- Consumes: `BouquetOptionVM` from `@/src/entites/bouquet-option/model`; `useCustomBouquetStore` (`selectedWrap`, `selectedRibbon`, `setWrap`, `setRibbon`); `cn`; `Check`.
- Produces: `<WrappingStep wraps={BouquetOptionVM[]} ribbons={BouquetOptionVM[]} />`.

- [ ] **Step 1: Create `steps/wrapping-step.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { cn } from "@/shared/lib/utils";

function OptionGrid({
    title,
    options,
    selectedId,
    onSelect,
}: {
    title: string;
    options: BouquetOptionVM[];
    selectedId: string | undefined;
    onSelect: (opt: BouquetOptionVM) => void;
}) {
    return (
        <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-800">{title}</h3>
            {options.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có lựa chọn.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {options.map((opt) => {
                        const active = selectedId === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => onSelect(opt)}
                                className={cn(
                                    "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                                    active
                                        ? "border-pink-400 ring-2 ring-pink-400"
                                        : "border-gray-200 hover:border-pink-200",
                                )}
                            >
                                <span
                                    className="h-8 w-8 shrink-0 rounded-full border"
                                    style={{ background: opt.color }}
                                    aria-hidden
                                />
                                <span className="flex-1 font-medium text-gray-800">
                                    {opt.name}
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
            )}
        </div>
    );
}

export function WrappingStep({
    wraps,
    ribbons,
}: {
    wraps: BouquetOptionVM[];
    ribbons: BouquetOptionVM[];
}) {
    const selectedWrap = useCustomBouquetStore((s) => s.selectedWrap);
    const selectedRibbon = useCustomBouquetStore((s) => s.selectedRibbon);
    const setWrap = useCustomBouquetStore((s) => s.setWrap);
    const setRibbon = useCustomBouquetStore((s) => s.setRibbon);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Gói hoa
            </h2>
            <div className="space-y-6">
                <OptionGrid
                    title="Giấy gói"
                    options={wraps}
                    selectedId={selectedWrap?.id}
                    onSelect={setWrap}
                />
                <OptionGrid
                    title="Ruy băng"
                    options={ribbons}
                    selectedId={selectedRibbon?.id}
                    onSelect={setRibbon}
                />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Delete the v1 files**

```bash
git rm src/widgets/custom-bouquet/steps/wrap-step.tsx src/widgets/custom-bouquet/steps/ribbon-step.tsx
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: `wrapping-step.tsx` clean. The old `bouquet-builder.widget` still imports the deleted step files — that widget is replaced in Task 16; note it.

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/steps/wrapping-step.tsx
git add src/widgets/custom-bouquet/steps/wrapping-step.tsx src/widgets/custom-bouquet/steps/wrap-step.tsx src/widgets/custom-bouquet/steps/ribbon-step.tsx
git commit -m "feat(custom-bouquet): merge wrap + ribbon into one wrapping step (no price)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 9: Card-message field + gate

**Files:**
- Create: `src/widgets/custom-bouquet/card-message-field.tsx`

**Interfaces:**
- Consumes: `useCustomBouquetStore` (`cardMessage`, `setCardMessage`); `Dialog*` from `@/shared/ui`; `Button` from `@/shared/ui`.
- Produces (from the file, imported directly by review steps):
  - `<CardMessageField />` — labelled `<textarea id="card-message">` bound to the store.
  - `useCardMessageGate(onProceed: () => void): { attemptAddToCart: () => void; dialogOpen: boolean; setDialogOpen: (o: boolean) => void; onWriteMessage: () => void; onContinue: () => void }`
  - `<CardMessageDialog open onOpenChange onWriteMessage onContinue />`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/shared/ui";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/shared/ui";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

const FIELD_ID = "card-message";

export function CardMessageField() {
    const cardMessage = useCustomBouquetStore((s) => s.cardMessage);
    const setCardMessage = useCustomBouquetStore((s) => s.setCardMessage);

    return (
        <div>
            <label
                htmlFor={FIELD_ID}
                className="block text-sm font-semibold text-gray-800"
            >
                Lời nhắn trên thiệp
            </label>
            <textarea
                id={FIELD_ID}
                value={cardMessage}
                onChange={(e) => setCardMessage(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Chúc mừng sinh nhật! Mong mọi điều tốt đẹp nhất đến với bạn."
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
        </div>
    );
}

export function useCardMessageGate(onProceed: () => void) {
    const [dialogOpen, setDialogOpen] = useState(false);

    function attemptAddToCart() {
        const msg = useCustomBouquetStore.getState().cardMessage.trim();
        if (msg.length > 0) {
            onProceed();
        } else {
            setDialogOpen(true);
        }
    }

    function onWriteMessage() {
        setDialogOpen(false);
        // let the dialog close before focusing
        setTimeout(() => document.getElementById(FIELD_ID)?.focus(), 0);
    }

    function onContinue() {
        setDialogOpen(false);
        onProceed();
    }

    return {
        attemptAddToCart,
        dialogOpen,
        setDialogOpen,
        onWriteMessage,
        onContinue,
    };
}

export function CardMessageDialog({
    open,
    onOpenChange,
    onWriteMessage,
    onContinue,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onWriteMessage: () => void;
    onContinue: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bạn chưa nhập lời nhắn</DialogTitle>
                    <DialogDescription>
                        Bạn muốn thêm lời nhắn cho tấm thiệp không?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onContinue}
                    >
                        Tiếp tục
                    </Button>
                    <Button
                        type="button"
                        onClick={onWriteMessage}
                        className="bg-pink-500 hover:bg-pink-600"
                    >
                        Nhập lời nhắn
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

Note: reading `useCustomBouquetStore.getState().cardMessage` inside `attemptAddToCart` avoids a stale-closure on the message value. If lint's `react-hooks` rules object to `getState()` in a hook, subscribe to `cardMessage` in the hook body and read that instead.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/card-message-field.tsx
git add src/widgets/custom-bouquet/card-message-field.tsx
git commit -m "feat(custom-bouquet): card message field + empty-message gate dialog

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 10: Review step (build) rework

**Files:**
- Modify (full rework): `src/widgets/custom-bouquet/steps/review-step.tsx`

**Interfaces:**
- Consumes: `useCustomBouquetStore`; `useCartStore`; `generateBouquetImage` + `type BouquetSelection` from `@/src/features/generate-bouquet-image`; `CardMessageField`, `useCardMessageGate`, `CardMessageDialog` from `../card-message-field`; `OCCASIONS`, `BUDGET_TIERS`, `FLOWER_COLORS`, `BOUQUET_STYLES` from constants; `Button`; `useRouter`.
- Produces: `<ReviewStep />`.

- [ ] **Step 1: Read the current `review-step.tsx`**

It exists on `master` (v1, post-fixes). Keep the structure: the `startedRef` effect **without** an `ignore` flag (do not reintroduce one — commit `3c760dd` removed it and a re-review confirmed the fix), the three visual states (bloom loader / error+retry / `<img>`), the `attempt` counter for retry, and the `addToCart` → `router.push("/cart")` → `resetBuilder()` order. Only the inputs, the summary block, and the gate wiring change.

- [ ] **Step 2: Replace the file**

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
import {
    OCCASIONS,
    FLOWER_COLORS,
    BOUQUET_STYLES,
} from "@/shared/lib/constants/custom-bouquet.const";
import {
    CardMessageField,
    CardMessageDialog,
    useCardMessageGate,
} from "../card-message-field";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

const occasionLabel = (id: string | null) =>
    OCCASIONS.find((o) => o.id === id)?.label ?? "—";
const styleLabel = (id: string | null) =>
    BOUQUET_STYLES.find((s) => s.id === id)?.label ?? null;
const colorLabels = (ids: string[]) =>
    ids
        .map((id) => FLOWER_COLORS.find((c) => c.id === id)?.label ?? id)
        .join(", ");

export function ReviewStep() {
    const router = useRouter();
    const s = useCustomBouquetStore();
    const addToCart = useCartStore((c) => c.addToCart);

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const startedRef = useRef(false);

    const selection: BouquetSelection = {
        occasion: s.occasion,
        colors: s.colors,
        style: s.style,
        flowers: s.selectedFlowers.map((f) => ({
            name: f.name,
            color: f.color,
        })),
        arrangementNote: s.arrangementNote,
        wrapPaper: s.selectedWrap
            ? { name: s.selectedWrap.name, color: s.selectedWrap.color }
            : null,
        ribbon: s.selectedRibbon
            ? { name: s.selectedRibbon.name, color: s.selectedRibbon.color }
            : null,
    };

    useEffect(() => {
        if (s.generatedImage || startedRef.current) return;
        startedRef.current = true;
        setIsGenerating(true);
        setError(false);
        generateBouquetImage(selection)
            .then((res) => s.setGeneratedImage(res.imageUrl))
            .catch(() => setError(true))
            .finally(() => setIsGenerating(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [s.generatedImage, attempt]);

    function retry() {
        startedRef.current = false;
        setError(false);
        setAttempt((n) => n + 1);
    }

    function proceed() {
        const id = `CUSTOM-${crypto.randomUUID()}`;
        addToCart(
            {
                id,
                name: "Bó hoa tự thiết kế",
                slug: "custom-bouquet",
                price: s.getTotalPrice(),
                image: s.generatedImage ?? "",
                quantity: 1,
                isCustomBouquet: true,
                customDetails: {
                    mode: "build",
                    occasion: s.occasion ?? undefined,
                    tierLabel: s.tier?.label,
                    colors: s.colors,
                    style: s.style ?? undefined,
                    flowers: s.selectedFlowers.map((f) => ({
                        name: f.name,
                        color: f.color,
                    })),
                    arrangementNote: s.arrangementNote || undefined,
                    wrapPaper: s.selectedWrap?.name,
                    ribbon: s.selectedRibbon?.name,
                    cardMessage: s.cardMessage || undefined,
                },
            },
            1,
        );
        router.push("/cart");
        s.resetBuilder();
    }

    const gate = useCardMessageGate(proceed);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Xem lại
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
                                Đang dựng bó hoa…
                            </p>
                        </div>
                    )}
                    {!isGenerating && error && (
                        <div className="flex flex-col items-center gap-3 text-center">
                            <p className="text-sm text-gray-500">
                                Không tạo được ảnh xem trước.
                            </p>
                            <Button type="button" size="sm" onClick={retry}>
                                Thử lại
                            </Button>
                        </div>
                    )}
                    {!isGenerating && !error && s.generatedImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={s.generatedImage}
                            alt="Ảnh xem trước bó hoa"
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                    {s.quick && (
                        <p className="text-gray-500">
                            Florist sẽ chọn hoa, kiểu dáng và cách gói phù hợp.
                        </p>
                    )}
                    <p>Dịp: {occasionLabel(s.occasion)}</p>
                    <p>Ngân sách: {s.tier?.label ?? "—"}</p>
                    <p>Màu: {colorLabels(s.colors) || "—"}</p>
                    {styleLabel(s.style) && <p>Kiểu: {styleLabel(s.style)}</p>}
                    {s.selectedFlowers.length > 0 && (
                        <p>
                            Hoa:{" "}
                            {s.selectedFlowers.map((f) => f.name).join(", ")}
                        </p>
                    )}
                    {s.arrangementNote.trim() && (
                        <p>Sắp xếp: {s.arrangementNote}</p>
                    )}
                    {s.selectedWrap && <p>Giấy gói: {s.selectedWrap.name}</p>}
                    {s.selectedRibbon && (
                        <p>Ruy băng: {s.selectedRibbon.name}</p>
                    )}

                    <p className="pt-3 text-2xl font-bold text-gray-900">
                        {vnd(s.getTotalPrice())}
                    </p>

                    <div className="pt-3">
                        <CardMessageField />
                    </div>

                    <Button
                        type="button"
                        size="lg"
                        className="mt-4 w-full bg-pink-500 hover:bg-pink-600"
                        disabled={isGenerating || !s.generatedImage}
                        onClick={gate.attemptAddToCart}
                    >
                        Thêm vào giỏ
                    </Button>
                </div>
            </div>

            <CardMessageDialog
                open={gate.dialogOpen}
                onOpenChange={gate.setDialogOpen}
                onWriteMessage={gate.onWriteMessage}
                onContinue={gate.onContinue}
            />
        </div>
    );
}
```

Note: `useCustomBouquetStore()` with no selector subscribes to the whole store — acceptable here (the review step re-renders on any wizard change, which is fine), and matches how this project already uses stores loosely. If lint flags it, switch to individual selectors.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean for this file.

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/steps/review-step.tsx
git add src/widgets/custom-bouquet/steps/review-step.tsx
git commit -m "feat(custom-bouquet): v2 review step (preview + summary + message gate)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 11: Photo upload step

**Files:**
- Create: `src/widgets/custom-bouquet/steps/photo-upload-step.tsx`

**Interfaces:**
- Consumes: `useCustomBouquetStore` (`referenceImages`, `addReferenceImage`, `removeReferenceImage`); `uploadImageToCloudinary` from `@/shared/lib/cloudinary`; `MAX_REFERENCE_IMAGES` from constants; `X` from `lucide-react`.
- Produces: `<PhotoUploadStep />`.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { uploadImageToCloudinary } from "@/shared/lib/cloudinary";
import { MAX_REFERENCE_IMAGES } from "@/shared/lib/constants/custom-bouquet.const";

export function PhotoUploadStep() {
    const images = useCustomBouquetStore((s) => s.referenceImages);
    const addImage = useCustomBouquetStore((s) => s.addReferenceImage);
    const removeImage = useCustomBouquetStore((s) => s.removeReferenceImage);

    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const remaining = MAX_REFERENCE_IMAGES - images.length;

    async function handleFiles(files: FileList | null) {
        if (!files) return;
        setError(null);
        const picked = Array.from(files).slice(0, remaining);
        for (const file of picked) {
            setUploading((n) => n + 1);
            try {
                const url = await uploadImageToCloudinary(file);
                addImage(url);
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : "Tải ảnh lên thất bại",
                );
            } finally {
                setUploading((n) => n - 1);
            }
        }
        if (inputRef.current) inputRef.current.value = "";
    }

    return (
        <div>
            <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-playfair text-xl font-bold text-gray-900">
                    Tải ảnh mẫu
                </h2>
                <span className="text-sm text-gray-400">
                    {images.length} / {MAX_REFERENCE_IMAGES}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {images.map((url) => (
                    <div
                        key={url}
                        className="relative aspect-square overflow-hidden rounded-xl border"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url}
                            alt="Ảnh mẫu"
                            className="h-full w-full object-cover"
                        />
                        <button
                            type="button"
                            aria-label="Xoá ảnh"
                            onClick={() => removeImage(url)}
                            className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {remaining > 0 && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading > 0}
                        className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-pink-300 disabled:opacity-50"
                    >
                        {uploading > 0 ? "Đang tải…" : "+ Thêm ảnh"}
                    </button>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handleFiles(e.target.files)}
            />

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <p className="mt-2 text-xs text-gray-400">
                Tải lên 1–{MAX_REFERENCE_IMAGES} ảnh bó hoa bạn muốn florist
                phỏng theo.
            </p>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/steps/photo-upload-step.tsx
git add src/widgets/custom-bouquet/steps/photo-upload-step.tsx
git commit -m "feat(custom-bouquet): photo upload step (Cloudinary)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 12: Photo note + review steps

**Files:**
- Create: `src/widgets/custom-bouquet/steps/photo-note-step.tsx`
- Create: `src/widgets/custom-bouquet/steps/photo-review-step.tsx`

**Interfaces:**
- Consumes: `useCustomBouquetStore`; `useCartStore`; `CardMessageField`/`useCardMessageGate`/`CardMessageDialog` from `../card-message-field`; `OCCASIONS` from constants; `Button`; `useRouter`.
- Produces: `<PhotoNoteStep />`, `<PhotoReviewStep />`.

- [ ] **Step 1: `steps/photo-note-step.tsx`**

```tsx
"use client";

import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { CardMessageField } from "../card-message-field";

export function PhotoNoteStep() {
    const floristNote = useCustomBouquetStore((s) => s.floristNote);
    const setFloristNote = useCustomBouquetStore((s) => s.setFloristNote);

    return (
        <div className="space-y-6">
            <h2 className="font-playfair text-xl font-bold text-gray-900">
                Ghi chú cho florist
            </h2>
            <div>
                <label
                    htmlFor="florist-note"
                    className="block text-sm font-semibold text-gray-800"
                >
                    Bạn muốn giống ảnh ở điểm nào nhất?
                </label>
                <textarea
                    id="florist-note"
                    value={floristNote}
                    onChange={(e) => setFloristNote(e.target.value)}
                    rows={4}
                    placeholder="Ví dụ: giữ đúng tông màu và dáng bó dài; loại hoa có thể thay tương đương nếu hết; ưu tiên hồng và cẩm chướng..."
                    className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
            </div>
            <CardMessageField />
        </div>
    );
}
```

- [ ] **Step 2: `steps/photo-review-step.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { useCartStore } from "@/_app/store/useCartStore";
import { OCCASIONS } from "@/shared/lib/constants/custom-bouquet.const";
import {
    CardMessageDialog,
    useCardMessageGate,
} from "../card-message-field";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function PhotoReviewStep() {
    const router = useRouter();
    const s = useCustomBouquetStore();
    const addToCart = useCartStore((c) => c.addToCart);

    const occasionLabel =
        OCCASIONS.find((o) => o.id === s.occasion)?.label ?? "—";

    function proceed() {
        const id = `CUSTOM-${crypto.randomUUID()}`;
        addToCart(
            {
                id,
                name: "Bó hoa đặt theo ảnh",
                slug: "custom-bouquet",
                price: s.getTotalPrice(),
                image: s.referenceImages[0] ?? "",
                quantity: 1,
                isCustomBouquet: true,
                customDetails: {
                    mode: "photo",
                    occasion: s.occasion ?? undefined,
                    tierLabel: s.tier?.label,
                    referenceImages: s.referenceImages,
                    floristNote: s.floristNote || undefined,
                    cardMessage: s.cardMessage || undefined,
                },
            },
            1,
        );
        router.push("/cart");
        s.resetBuilder();
    }

    const gate = useCardMessageGate(proceed);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Xem lại
            </h2>

            <div className="grid grid-cols-3 gap-3">
                {s.referenceImages.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={url}
                        src={url}
                        alt="Ảnh mẫu"
                        className="aspect-square w-full rounded-xl border object-cover"
                    />
                ))}
            </div>

            <div className="mt-4 space-y-1 text-sm text-gray-600">
                <p>Dịp: {occasionLabel}</p>
                <p>Ngân sách: {s.tier?.label ?? "—"}</p>
                {s.floristNote.trim() && <p>Ghi chú: {s.floristNote}</p>}
                {s.cardMessage.trim() && <p>Lời nhắn: {s.cardMessage}</p>}
                <p className="pt-3 text-2xl font-bold text-gray-900">
                    {vnd(s.getTotalPrice())}
                </p>
            </div>

            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                Bó thật được florist phỏng theo ảnh bạn cung cấp, có thể khác
                biệt do mùa vụ và nguyên liệu sẵn có. Nếu sai khác lớn, shop
                sẽ liên hệ trước khi giao.
            </p>

            <Button
                type="button"
                size="lg"
                className="mt-4 w-full bg-pink-500 hover:bg-pink-600"
                onClick={gate.attemptAddToCart}
            >
                Thêm vào giỏ
            </Button>

            <CardMessageDialog
                open={gate.dialogOpen}
                onOpenChange={gate.setDialogOpen}
                onWriteMessage={gate.onWriteMessage}
                onContinue={gate.onContinue}
            />
        </div>
    );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/steps/photo-note-step.tsx src/widgets/custom-bouquet/steps/photo-review-step.tsx
git add src/widgets/custom-bouquet/steps/photo-note-step.tsx src/widgets/custom-bouquet/steps/photo-review-step.tsx
git commit -m "feat(custom-bouquet): photo note + review steps

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 13: Stepper + summary rework

**Files:**
- Modify: `src/widgets/custom-bouquet/builder-stepper.tsx`
- Modify: `src/widgets/custom-bouquet/bouquet-summary.tsx`

**Interfaces:**
- `builder-stepper.tsx` — Produces `<BuilderStepper steps={string[]} current={number} />` (was `current` only; `BUILDER_STEPS` was imported internally — now the label array is a prop).
- `bouquet-summary.tsx` — Produces `<BouquetSummary />` (no props), mode-aware; renders nothing when `mode === null`.

- [ ] **Step 1: Read both current files** (v1, on `master`).

- [ ] **Step 2: `builder-stepper.tsx` — parameterise the steps**

Replace the `import { BUILDER_STEPS } ...` line and the signature:

```tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function BuilderStepper({
    steps,
    current,
}: {
    steps: string[];
    current: number;
}) {
    return (
        <ol className="mb-8 flex items-center gap-2">
            {steps.map((label, i) => {
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
                                !done && !active && "bg-gray-100 text-gray-400",
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
                        {stepNo < steps.length && (
                            <div className="relative mx-1 h-0.5 flex-1 bg-gray-100">
                                <div
                                    className="absolute inset-y-0 left-0 bg-pink-500 transition-[width] duration-500"
                                    style={{ width: done ? "100%" : "0%" }}
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

- [ ] **Step 3: `bouquet-summary.tsx` — mode-aware rewrite**

```tsx
"use client";

import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import {
    OCCASIONS,
    FLOWER_COLORS,
    BOUQUET_STYLES,
} from "@/shared/lib/constants/custom-bouquet.const";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function BouquetSummary() {
    const s = useCustomBouquetStore();
    if (s.mode === null) return null;

    const occasion = OCCASIONS.find((o) => o.id === s.occasion)?.label;
    const style = BOUQUET_STYLES.find((st) => st.id === s.style)?.label;
    const colorLabels = s.colors
        .map((id) => FLOWER_COLORS.find((c) => c.id === id)?.label ?? id)
        .join(", ");

    return (
        <aside className="h-fit rounded-2xl border border-pink-100 bg-white p-5 lg:sticky lg:top-6">
            <h2 className="font-semibold text-gray-800">Tóm tắt</h2>
            <dl className="mt-3 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between gap-2">
                    <dt>Dịp</dt>
                    <dd>{occasion ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                    <dt>Ngân sách</dt>
                    <dd>{s.tier?.label ?? "—"}</dd>
                </div>

                {s.mode === "build" && (
                    <>
                        <div className="flex justify-between gap-2">
                            <dt>Màu</dt>
                            <dd className="text-right">{colorLabels || "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt>Kiểu</dt>
                            <dd>{style ?? "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt>Hoa</dt>
                            <dd className="text-right">
                                {s.selectedFlowers.length > 0
                                    ? s.selectedFlowers
                                          .map((f) => f.name)
                                          .join(", ")
                                    : "—"}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt>Gói</dt>
                            <dd className="text-right">
                                {[s.selectedWrap?.name, s.selectedRibbon?.name]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                            </dd>
                        </div>
                    </>
                )}

                {s.mode === "photo" && (
                    <div className="flex justify-between gap-2">
                        <dt>Ảnh mẫu</dt>
                        <dd>{s.referenceImages.length} ảnh</dd>
                    </div>
                )}
            </dl>

            <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold text-gray-900">
                <span>Tổng</span>
                <span>{vnd(s.getTotalPrice())}</span>
            </div>
        </aside>
    );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both files clean.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/builder-stepper.tsx src/widgets/custom-bouquet/bouquet-summary.tsx
git add src/widgets/custom-bouquet/builder-stepper.tsx src/widgets/custom-bouquet/bouquet-summary.tsx
git commit -m "feat(custom-bouquet): parameterise stepper + mode-aware summary

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 14: Build wizard widget

**Files:**
- Create: `src/widgets/custom-bouquet/build-wizard.widget.tsx`

**Interfaces:**
- Consumes: `useCustomBouquetStore`; `BUILD_STEPS`, `BUILD_STEPS_QUICK` from constants; `StemVM`, `BouquetOptionVM` types; `BuilderStepper`, `BouquetSummary`; all build step components (`OccasionStep`, `BudgetStep`, `ColorStep`, `StyleStep`, `FlowerStep`, `WrappingStep`, `ReviewStep`); `Button`.
- Produces: `<BuildWizardWidget stems={StemVM[]} wraps={BouquetOptionVM[]} ribbons={BouquetOptionVM[]} />`.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { Button } from "@/shared/ui";
import type { StemVM } from "@/src/entites/stem/model";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import {
    BUILD_STEPS,
    BUILD_STEPS_QUICK,
    BOUQUET_STYLES,
} from "@/shared/lib/constants/custom-bouquet.const";
import { BuilderStepper } from "./builder-stepper";
import { BouquetSummary } from "./bouquet-summary";
import { OccasionStep } from "./steps/occasion-step";
import { BudgetStep } from "./steps/budget-step";
import { ColorStep } from "./steps/color-step";
import { StyleStep } from "./steps/style-step";
import { FlowerStep } from "./steps/flower-step";
import { WrappingStep } from "./steps/wrapping-step";
import { ReviewStep } from "./steps/review-step";

const REVIEW_STEP = 7;

interface Props {
    stems: StemVM[];
    wraps: BouquetOptionVM[];
    ribbons: BouquetOptionVM[];
}

export function BuildWizardWidget({ stems, wraps, ribbons }: Props) {
    // Subscribe to the whole store: the Next button's disabled state depends
    // on many fields (occasion / tier / colors / style / flowers / wrap /
    // ribbon) via `canProceed(step)`, and the wizard must re-render whenever
    // any of them changes. A wizard re-rendering on every store change is
    // fine. (Same pattern as ReviewStep and BouquetSummary.)
    const s = useCustomBouquetStore();
    const { step, quick } = s;

    const steps = quick ? BUILD_STEPS_QUICK : BUILD_STEPS;
    // map internal step (always numbered against the full 7-step flow) to the
    // displayed stepper index
    const displayStep =
        quick && step === REVIEW_STEP ? BUILD_STEPS_QUICK.length : step;

    const onReview = step === REVIEW_STEP;

    const hidesWrapping = !!BOUQUET_STYLES.find(
        (st) => st.id === s.style && "hidesWrapping" in st,
    );
    // does pressing "next" from the current step land on the review step?
    const nextLandsOnReview =
        step === 6 || (step === 5 && hidesWrapping) || (quick && step === 3);

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
                <button
                    type="button"
                    onClick={s.resetMode}
                    className="mb-4 text-sm text-gray-500 hover:text-pink-600"
                >
                    ← Đổi cách đặt
                </button>

                <BuilderStepper steps={steps} current={displayStep} />

                <div key={step} className="animate-in fade-in duration-300">
                    {step === 1 && <OccasionStep />}
                    {step === 2 && <BudgetStep />}
                    {step === 3 && (
                        <>
                            <ColorStep />
                            <div className="mt-6 rounded-xl bg-pink-50/60 p-4">
                                <p className="text-sm text-gray-600">
                                    Không muốn chọn từng bước? Để florist tự
                                    quyết hoa và cách gói trong ngân sách của
                                    bạn.
                                </p>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2"
                                    disabled={!s.canProceed(3)}
                                    onClick={() => s.setQuick(true)}
                                >
                                    Đặt nhanh →
                                </Button>
                            </div>
                        </>
                    )}
                    {step === 4 && <StyleStep />}
                    {step === 5 && <FlowerStep stems={stems} />}
                    {step === 6 && (
                        <WrappingStep wraps={wraps} ribbons={ribbons} />
                    )}
                    {step === REVIEW_STEP && <ReviewStep />}
                </div>

                {!onReview && (
                    <div className="mt-8 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={s.prevStep}
                            className={step === 1 ? "invisible" : ""}
                        >
                            Quay lại
                        </Button>
                        <Button
                            type="button"
                            onClick={s.nextStep}
                            disabled={!s.canProceed(step)}
                            className="bg-pink-500 hover:bg-pink-600"
                        >
                            {nextLandsOnReview ? "Xem lại" : "Tiếp theo"}
                        </Button>
                    </div>
                )}
                {onReview && (
                    <div className="mt-8">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={s.prevStep}
                        >
                            Quay lại
                        </Button>
                    </div>
                )}
            </div>

            <BouquetSummary />
        </div>
    );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean for this file.

- [ ] **Step 3: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/build-wizard.widget.tsx
git add src/widgets/custom-bouquet/build-wizard.widget.tsx
git commit -m "feat(custom-bouquet): build wizard orchestrator (7 steps + quick)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 15: Photo wizard widget

**Files:**
- Create: `src/widgets/custom-bouquet/photo-wizard.widget.tsx`

**Interfaces:**
- Consumes: `useCustomBouquetStore`; `PHOTO_STEPS` from constants; `BuilderStepper`, `BouquetSummary`; `PhotoUploadStep`, `OccasionStep`, `BudgetStep`, `PhotoNoteStep`, `PhotoReviewStep`; `Button`.
- Produces: `<PhotoWizardWidget />` (no props).

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { Button } from "@/shared/ui";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { PHOTO_STEPS } from "@/shared/lib/constants/custom-bouquet.const";
import { BuilderStepper } from "./builder-stepper";
import { BouquetSummary } from "./bouquet-summary";
import { PhotoUploadStep } from "./steps/photo-upload-step";
import { OccasionStep } from "./steps/occasion-step";
import { BudgetStep } from "./steps/budget-step";
import { PhotoNoteStep } from "./steps/photo-note-step";
import { PhotoReviewStep } from "./steps/photo-review-step";

const REVIEW_STEP = 5;

export function PhotoWizardWidget() {
    // Whole-store subscribe: the Next button's disabled state depends on
    // referenceImages / occasion / tier via `canProceed(step)`, so the
    // wizard must re-render on any of those. (Same pattern as BuildWizard.)
    const s = useCustomBouquetStore();
    const { step } = s;

    const onReview = step === REVIEW_STEP;

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
                <button
                    type="button"
                    onClick={s.resetMode}
                    className="mb-4 text-sm text-gray-500 hover:text-pink-600"
                >
                    ← Đổi cách đặt
                </button>

                <BuilderStepper steps={PHOTO_STEPS} current={step} />

                <div key={step} className="animate-in fade-in duration-300">
                    {step === 1 && <PhotoUploadStep />}
                    {step === 2 && <OccasionStep />}
                    {step === 3 && <BudgetStep />}
                    {step === 4 && <PhotoNoteStep />}
                    {step === REVIEW_STEP && <PhotoReviewStep />}
                </div>

                {!onReview && (
                    <div className="mt-8 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={s.prevStep}
                            className={step === 1 ? "invisible" : ""}
                        >
                            Quay lại
                        </Button>
                        <Button
                            type="button"
                            onClick={s.nextStep}
                            disabled={!s.canProceed(step)}
                            className="bg-pink-500 hover:bg-pink-600"
                        >
                            {step === 4 ? "Xem lại" : "Tiếp theo"}
                        </Button>
                    </div>
                )}
                {onReview && (
                    <div className="mt-8">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={s.prevStep}
                        >
                            Quay lại
                        </Button>
                    </div>
                )}
            </div>

            <BouquetSummary />
        </div>
    );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/photo-wizard.widget.tsx
git add src/widgets/custom-bouquet/photo-wizard.widget.tsx
git commit -m "feat(custom-bouquet): photo wizard orchestrator (5 steps)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 16: Shell — mode select, orchestrator rework, barrels, page

**Files:**
- Create: `src/widgets/custom-bouquet/mode-select.widget.tsx`
- Modify (full rework): `src/widgets/custom-bouquet/bouquet-builder.widget.tsx`
- Modify: `src/widgets/custom-bouquet/index.ts`
- Modify: `src/widgets/index.ts` (only if it names removed exports)
- Modify: `src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx` (header copy only)

**Interfaces:**
- Consumes: `useCustomBouquetStore` (`mode`, `setMode`, `resetBuilder`); `BuildWizardWidget`, `PhotoWizardWidget`; `StemVM`, `BouquetOptionVM` types.
- Produces: `<ModeSelectWidget />`, reworked `<BouquetBuilderWidget stems wraps ribbons />` (unchanged signature), unchanged `CustomBouquetPage`.

- [ ] **Step 1: `mode-select.widget.tsx`**

```tsx
"use client";

import { Sparkles, ImageIcon } from "lucide-react";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function ModeSelectWidget() {
    const setMode = useCustomBouquetStore((s) => s.setMode);

    return (
        <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-playfair text-2xl font-bold text-gray-900">
                Bạn muốn đặt hoa theo cách nào?
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => setMode("build")}
                    className="rounded-2xl border border-gray-200 p-6 text-left transition-all hover:border-pink-300 hover:shadow-md"
                >
                    <Sparkles className="text-pink-500" />
                    <h3 className="mt-3 font-semibold text-gray-900">
                        Tự thiết kế
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Chọn dịp, ngân sách, màu sắc, loại hoa — florist dựng
                        bó theo ý bạn.
                    </p>
                    <span className="mt-3 inline-block text-sm font-medium text-pink-600">
                        Bắt đầu →
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setMode("photo")}
                    className="rounded-2xl border border-gray-200 p-6 text-left transition-all hover:border-pink-300 hover:shadow-md"
                >
                    <ImageIcon className="text-pink-500" />
                    <h3 className="mt-3 font-semibold text-gray-900">
                        Đặt theo ảnh mẫu
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Có sẵn ảnh bó hoa bạn thích? Tải lên, florist làm phỏng
                        theo.
                    </p>
                    <span className="mt-3 inline-block text-sm font-medium text-pink-600">
                        Tải ảnh lên →
                    </span>
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: `bouquet-builder.widget.tsx` — full rework**

```tsx
"use client";

import { useEffect } from "react";
import type { StemVM } from "@/src/entites/stem/model";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { ModeSelectWidget } from "./mode-select.widget";
import { BuildWizardWidget } from "./build-wizard.widget";
import { PhotoWizardWidget } from "./photo-wizard.widget";

interface Props {
    stems: StemVM[];
    wraps: BouquetOptionVM[];
    ribbons: BouquetOptionVM[];
}

export function BouquetBuilderWidget({ stems, wraps, ribbons }: Props) {
    const mode = useCustomBouquetStore((s) => s.mode);
    const resetBuilder = useCustomBouquetStore((s) => s.resetBuilder);

    // Fresh every visit.
    useEffect(() => {
        resetBuilder();
    }, [resetBuilder]);

    if (mode === "build") {
        return (
            <BuildWizardWidget
                stems={stems}
                wraps={wraps}
                ribbons={ribbons}
            />
        );
    }
    if (mode === "photo") {
        return <PhotoWizardWidget />;
    }
    return <ModeSelectWidget />;
}
```

- [ ] **Step 3: `src/widgets/custom-bouquet/index.ts`**

The folder barrel must export the landing widget (moved to `landing-page/` on `master` — keep whatever line currently re-exports it) plus the builder entry. Ensure it reads:

```ts
export * from "../landing-page/custom-bouquet.widget";
export * from "./bouquet-builder.widget";
```

Do **not** export the wizards / steps / mode-select from the barrel — they are internal to `bouquet-builder.widget`.

- [ ] **Step 4: Check `src/widgets/index.ts`**

Run: `grep -n "custom-bouquet" src/widgets/index.ts`
It should already be `export * from "./custom-bouquet";` (from a v1 change). If it names a specific removed file, fix it to `export * from "./custom-bouquet";`.

- [ ] **Step 5: `custom-bouquet.page.tsx` — header copy**

The page already fetches `getStems()` / `getWrapPapers()` / `getRibbons()` and renders `<BouquetBuilderWidget>`. Update only the header copy:

```tsx
<header className="mb-8 text-center">
    <h1 className="font-playfair text-3xl font-bold text-gray-900">
        Đặt bó hoa của riêng bạn
    </h1>
    <p className="mt-2 text-gray-500">
        Tự thiết kế từng chi tiết, hoặc gửi ảnh mẫu để florist làm theo.
    </p>
</header>
```

Keep the `Promise.all` fetch and the `<BouquetBuilderWidget stems wraps ribbons />` render exactly as they are.

- [ ] **Step 6: Full typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: **now everything must be clean** — every v1-widget breakage introduced by Tasks 1/4/8 is resolved. `tsc` back to the 2-error baseline, `lint` back to the ~6-problem baseline, `build` succeeds and lists `ƒ /custom-bouquet`. If anything under `src/widgets/custom-bouquet/**` still references a deleted/renamed symbol (`stem-step`, `wrap-step`, `ribbon-step`, `MIN_STEMS`, `BUILDER_STEPS`, old store fields), fix it here.

- [ ] **Step 7: Dev-server smoke**

```bash
npm run dev   # background, log to a file
curl -s http://localhost:3000/custom-bouquet | grep -o "Tự thiết kế\|Đặt theo ảnh mẫu\|Bạn muốn đặt hoa theo cách nào"
```
Expected: all three strings present, HTTP 200, no Next error overlay. Kill the dev server after.

- [ ] **Step 8: Commit**

```bash
npx prettier --write src/widgets/custom-bouquet/mode-select.widget.tsx src/widgets/custom-bouquet/bouquet-builder.widget.tsx src/widgets/custom-bouquet/index.ts src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx
git add src/widgets/custom-bouquet/mode-select.widget.tsx src/widgets/custom-bouquet/bouquet-builder.widget.tsx src/widgets/custom-bouquet/index.ts src/widgets/index.ts src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx
git commit -m "feat(custom-bouquet): mode-select screen + orchestrator + page wiring

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 17: Cart line item — v2 modes

**Files:**
- Modify: `src/_pages/cart/ui/cart-line-item.tsx`

**Interfaces:**
- Consumes: `CartItem` (already carries `isCustomBouquet` + optional `customDetails`).
- Produces: no new exports — `CartLineItem` branches on `item.customDetails?.mode`.

- [ ] **Step 1: Read the current file** (v1, on `master`). It already has an `isCustom` branch that renders v1's `customDetails.stems` list, uses a plain `<img>` for the custom image, and renders the title as plain text.

- [ ] **Step 2: Add the v2 branches**

Near the derived consts:

```tsx
const cd = item.customDetails;
const isV2Build = cd?.mode === "build";
const isV2Photo = cd?.mode === "photo";
const isV1Custom = !cd?.mode && Boolean(item.isCustomBouquet && cd?.stems);
const isAnyCustom = isV2Build || isV2Photo || isV1Custom;
```

- **Image block:** the existing `isCustom && item.image` plain-`<img>` branch — change its condition to `isAnyCustom && item.image`. (Same `<img>` element, same eslint-disable.)
- **Title:** the existing `isCustom ? <span> : <Link>` — change the condition to `isAnyCustom ? <span> : <Link>`.
- **Details block:** replace the existing `isCustom && (<ul>…stems…</ul>)` with a branch:

```tsx
{isV2Build && cd && (
    <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
        {cd.occasion && <li>Dịp: {cd.occasion}</li>}
        {cd.tierLabel && <li>Ngân sách: {cd.tierLabel}</li>}
        {cd.colors?.length ? <li>Màu: {cd.colors.join(", ")}</li> : null}
        {cd.style && <li>Kiểu: {cd.style}</li>}
        {cd.flowers?.length ? (
            <li>{cd.flowers.map((f) => f.name).join(" · ")}</li>
        ) : null}
        {cd.arrangementNote && <li>Sắp xếp: {cd.arrangementNote}</li>}
        {cd.wrapPaper && <li>Giấy gói: {cd.wrapPaper}</li>}
        {cd.ribbon && <li>Ruy băng: {cd.ribbon}</li>}
        {cd.cardMessage && <li>Lời nhắn: {cd.cardMessage}</li>}
    </ul>
)}
{isV2Photo && cd && (
    <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
        {cd.occasion && <li>Dịp: {cd.occasion}</li>}
        {cd.tierLabel && <li>Ngân sách: {cd.tierLabel}</li>}
        <li>{cd.referenceImages?.length ?? 0} ảnh mẫu</li>
        {cd.floristNote && <li>Ghi chú: {cd.floristNote}</li>}
        {cd.cardMessage && <li>Lời nhắn: {cd.cardMessage}</li>}
    </ul>
)}
{isV1Custom && cd?.stems && (
    <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
        <li>Wrap: {cd.wrapPaper || "—"}</li>
        <li>Ribbon: {cd.ribbon || "—"}</li>
        <li>{cd.stems.map((s) => `${s.quantity}× ${s.name}`).join(" · ")}</li>
    </ul>
)}
```

Everything else (quantity stepper, `lineTotal`, remove button, the `addons` block, the standard-product path) stays byte-identical.

- [ ] **Step 3: TypeScript note**

`CartItem.customDetails` is typed in `src/_app/store/useCartStore.ts`. If its current type is a closed shape that lacks the v2 keys (`mode`, `occasion`, `tierLabel`, `colors`, `style`, `flowers`, `arrangementNote`, `referenceImages`, `floristNote`, `cardMessage`), widen it: change `customDetails?: { … }` to include the v2 optional keys (all optional; keep the existing v1 keys `wrapPaper`, `ribbon`, `stems` optional too). This is a type-only widening of the existing optional field — **not** a behavioural change to the store, so it is allowed under the Global Constraint (the constraint forbids logic changes, not the field's type). Make `stems` optional if it isn't already.

- [ ] **Step 4: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: baseline clean; build succeeds.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/_pages/cart/ui/cart-line-item.tsx src/_app/store/useCartStore.ts
git add src/_pages/cart/ui/cart-line-item.tsx src/_app/store/useCartStore.ts
git commit -m "feat(cart): render v2 custom bouquet line items (build + photo)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

### Task 18: Final verification pass

**Files:** none (verification + fix-forward only).

- [ ] **Step 1: Clean typecheck**

Run: `npx tsc --noEmit`
Expected: exactly the 2 baseline errors, nothing else.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exactly the ~6 baseline problems (all in untouched files).

- [ ] **Step 3: Targeted Prettier**

Run `npx prettier --check` on every file this branch created or modified (list them from `git diff --name-only master...HEAD -- . ':!docs' ':!prisma/generated'`). If any fail, `npx prettier --write` them and commit as `style(custom-bouquet): prettier` + trailers. Do **not** run repo-wide `npm run format`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds; `ƒ /custom-bouquet` (dynamic) in the route table.

- [ ] **Step 5: Seed unaffected**

Run: `npm run db:seed`
Expected: same summary line as before (no schema/seed change) — confirms nothing in the shared entity layer broke.

- [ ] **Step 6: Dev-server smoke script**

Start `npm run dev` (background). Then:
- `curl -s http://localhost:3000/custom-bouquet` → 200, contains "Bạn muốn đặt hoa theo cách nào", "Tự thiết kế", "Đặt theo ảnh mẫu", no error overlay.
- `curl -s http://localhost:3000/cart` → 200, no error overlay (cart-line-item change didn't break the cart page's server render).
Kill the dev server.

- [ ] **Step 7: Manual checklist for a human (record in the report; cannot be curl'd)**

- Mode select → "Tự thiết kế": occasion → budget → colours (Next disabled until ≥1) → style → flowers (filtered by colour, cap = tier max, disabled cards past cap) → wrapping (both required) → review: bloom loader ~1.2s, SVG whose petals track the chosen colours, total = tier price. "Thêm vào giỏ" with empty message → dialog → "Nhập lời nhắn" focuses the textarea; reopen → "Tiếp tục" → `/cart` with a correct build line.
- Back button present on step 4 and on review (regression check from v1).
- "Đặt nhanh" on the colours step → jumps to review, "florist sẽ chọn…" copy shown, no flowers/wrapping lines; add to cart works.
- Style "Lẵng / Kệ" → Next from flowers goes straight to review (wrapping skipped); review shows no wrap/ribbon lines.
- Mode select → "Đặt theo ảnh": with real `NEXT_PUBLIC_CLOUDINARY_*` in `.env.local`, upload 1–2 images (thumbnails, remove works, "+ Thêm ảnh" disabled at 3) → occasion → budget → note → review (images shown, disclaimer, total = tier price) → add to cart → `/cart` photo line correct. Without the env vars: the upload step shows "Cloudinary chưa được cấu hình" and Next stays disabled — expected.
- `/cart`: build line, photo line, and (if any pre-existing v1 item) v1 line all render; quantity stepper + line total still work; checkout → success dialog → cart clears.
- Revisit `/custom-bouquet` → back at the mode-select screen (store reset on mount).
- OS reduced-motion → bloom loader static.

- [ ] **Step 8: Docs**

If `README.md` gained a feature list since v1, add a line; otherwise skip (v1 verification found none). Commit any doc change as `docs: note custom bouquet v2`.

- [ ] **Step 9: Final commit (if fixes were made)**

```bash
git add -A
git commit -m "chore(custom-bouquet): v2 final verification fixes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J1AoCu5WHPNBLBUFNGwWJ1"
```

---

## Notes for the executor

- **v1 is on `master` and stays working during the build.** Tasks 1, 4, 8 intentionally break the v1 widgets (`bouquet-builder.widget`, old steps) mid-plan; Task 16 is where the tree returns to green. Between those tasks, "clean" means "no new diagnostics outside `src/widgets/custom-bouquet/**`". If a task's tsc/lint shows breakage **outside** that directory, stop — something is wrong.
- **Read the current file for every "rework" task** — v1's code is the starting point, not a blank page. This is especially true for `review-step.tsx` (keep the post-`3c760dd` effect shape — no `ignore` flag) and `cart-line-item.tsx` (keep the standard-product path untouched).
- **`crypto.randomUUID()`**, plain `<img>` for data/Cloudinary URLs, and the local `vnd()` helper are all deliberate and match repo/v1 convention — not findings.
- **No schema/migration/seed changes.** If a task seems to need one, stop and re-read the spec.
- **Cloudinary** cannot be end-to-end tested without the user's `NEXT_PUBLIC_CLOUDINARY_*` in `.env.local`; the helper and step degrade to a clear error, which is the correct behaviour to verify in that case.
- The **real image provider** stays out of scope — the STUB seam in `generate-bouquet-image.action.ts` carries the checklist (Zod, auth/rate-limit, cost cap).

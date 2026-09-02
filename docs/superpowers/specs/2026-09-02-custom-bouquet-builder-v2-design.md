# Custom Bouquet Builder v2 — Design Spec

**Date:** 2026-09-02
**Status:** Approved for planning
**Route:** `/custom-bouquet` (inside the `(store-front)` route group)
**Supersedes:** `docs/superpowers/specs/2026-09-01-custom-bouquet-builder-design.md` (v1, merged to `master`)

---

## 1. Goal

Rework `/custom-bouquet` into an occasion-driven ordering experience with
two modes chosen up front:

- **Tự thiết kế (build):** a 7-step guided wizard — occasion → budget tier
  → colours → style → flower types (+ arrangement note) → wrapping →
  review. Plus a **Quick mode** shortcut (occasion → budget → colours →
  review, florist picks the rest).
- **Đặt theo ảnh (photo):** a 5-step flow where the customer uploads 1–3
  reference photos and the florist crafts something similar within budget.

Both modes end by adding a custom-bouquet line item to the cart and going
through the existing faked checkout.

## 2. Non-goals

- **Real order persistence.** Checkout stays faked exactly like v1: the
  bouquet lives entirely in `useCartStore` (`localStorage`), "checkout"
  clears the cart and shows the success dialog, nothing is written to the
  DB. `Order` / `CustomBouquet` persistence, recipient address, and
  delivery date/slot are deferred to a later checkout project.
- **Schema changes / migrations.** No Prisma model or migration changes in
  v2. `Stem`, `WrapPaper`, `Ribbon` are reused as-is. `Stem.pricePerStem`,
  `WrapPaper.price`, `Ribbon.price` remain in the schema but are **not
  used** in any customer-facing v2 math or display (florist-cost data
  only).
- **Real AI image generation.** The build-mode preview stays a
  deterministic inline-SVG stub, adapted to v2's inputs. The provider seam
  is kept for later. The photo mode has **no** generated preview — the
  uploaded photo is the preview.
- **Automated tests.** The project has no test runner and none is added.
  Verification is tsc + lint + build + manual, as in v1.
- **Auth / rate-limiting** on the image-gen server action or the upload
  path (matches current app norms; the stub is offline so there is no cost
  risk yet — the STUB seam comment records this as a prerequisite for a
  real provider).
- **Occasion-driven functional filtering.** Occasion is metadata + prompt
  input only; it does not restrict colours, styles, or flowers this pass.

## 3. Decisions (resolved)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Checkout | Faked, client-only, as v1. Everything in `useCartStore.customDetails`. |
| 2 | Route strategy | Single `/custom-bouquet` route; a `mode` value in the store switches between the mode-select screen, the build wizard, and the photo wizard. No sub-routes. |
| 3 | Mode entry | A dedicated **mode-select screen** (step 0): two large cards, "Tự thiết kế" and "Đặt theo ảnh mẫu". A "← Đổi cách đặt" control in each wizard returns to it. |
| 4 | Quick mode | In scope this pass. Offered as a button on the colours step (step 3) of the build wizard. |
| 5 | Pricing | Hardcoded fixed price tiers (not ranges), smallest 100 000₫. The tier price is the whole bouquet price — wrap paper, ribbon, and everything else are folded in. |
| 6 | Wrap paper / ribbon | Customer still **chooses** them (aesthetic preference), but they carry **no individual price**. `WrapPaper` / `Ribbon` models + the `bouquet-option` slice are reused unchanged; only the price display and price math are dropped. |
| 7 | Flowers | No quantities. The customer picks flower **types**; the number of types they may pick is capped by the selected budget tier. The flower list is filtered by the selected colours. |
| 8 | Colours | The customer multi-selects raw colours (`red` / `pink` / `white` / `yellow` / `purple`, matching `Stem.color`). Stored as a string array. At least one required. |
| 9 | Arrangement note | A free-text `<textarea>` on the flower step, with a Vietnamese placeholder example. Passed to the florist and used in the AI prompt. |
| 10 | Card message | Entered on the review step (build) / a note step (photo). On "Add to cart", if the message is empty, a dialog offers "Nhập lời nhắn" / "Tiếp tục". Address/recipient deferred to checkout. |
| 11 | Reference photos (photo mode) | 1–3 images, uploaded to Cloudinary via an **unsigned upload preset** (no backend). Only the resulting `secure_url` is stored in the cart. |
| 12 | Both modes | Delivered together in this one spec / plan. |

## 4. Architecture overview

### 4.1 Route & state

`/custom-bouquet` stays one route. The route entry
(`app/(store-front)/custom-bouquet/page.tsx`) already carries
`export const dynamic = "force-dynamic"` (a v1 fix) and re-exports
`CustomBouquetPage`.

`CustomBouquetPage` (server component) fetches the three catalogue lists
in parallel and hands them to the client orchestrator:

```
CustomBouquetPage (async server)
  ├─ getStems()               → StemVM[]           (@/src/entites/stem/actions)
  ├─ getWrapPapers()          → BouquetOptionVM[]   (@/src/entites/bouquet-option/actions)
  ├─ getRibbons()             → BouquetOptionVM[]   (@/src/entites/bouquet-option/actions)
  └─ <BouquetBuilderWidget stems wraps ribbons />   [client]
       reads useCustomBouquetStore.mode:
         null      → <ModeSelectWidget />
         "build"   → <BuildWizardWidget stems wraps ribbons />
         "photo"   → <PhotoWizardWidget />
```

`BouquetBuilderWidget` calls `resetBuilder()` once on mount (fresh every
visit).

### 4.2 Reuse from v1 (on `master`)

| Kept unchanged | Reworked | New |
|----------------|----------|-----|
| `Stem` model + seed | `useCustomBouquetStore` | `shared/ui/dialog.tsx` |
| `WrapPaper` / `Ribbon` models + seed | `custom-bouquet.const.ts` | `shared/lib/cloudinary.ts` |
| `entites/stem` slice | `generate-bouquet-image` feature (stub) | `mode-select.widget.tsx` |
| `entites/bouquet-option` slice | `custom-bouquet.page.tsx` | `build-wizard.widget.tsx` |
| `cart-line-item.tsx` custom-bouquet render (v1 branch kept for back-compat) | `bouquet-builder.widget.tsx` | `photo-wizard.widget.tsx` |
| `useCartStore` (extended `customDetails` only, no code change to the store) | `builder-stepper.tsx`, `bouquet-summary.tsx` | build steps: occasion / budget / color / style / flower (from v1 stem-step) / wrapping (merge of v1 wrap+ribbon) / review (from v1) |
| | | photo steps: photo-upload / photo-note / photo-review |
| | | `card-message-field.tsx` (+ `useCardMessageGate` hook) |

FSD dependency direction is unchanged: pages → widgets → features →
entities → shared. Widgets importing `@/_app/store/*` follows the
pre-existing house convention.

## 5. Flows

### 5.1 Step 0 — mode select

`<ModeSelectWidget>` renders a heading and two cards:

- **Tự thiết kế** — copy: *"Chọn dịp, ngân sách, màu sắc, loại hoa — florist dựng bó theo ý bạn."* Button → `setMode("build")`.
- **Đặt theo ảnh mẫu** — copy: *"Có sẵn ảnh bó hoa bạn thích? Tải lên, florist làm phỏng theo."* Button → `setMode("photo")`.

### 5.2 Build wizard (`mode === "build"`)

Full flow, 7 steps:

| Step | Screen | Proceed requires |
|------|--------|------------------|
| 1 | Occasion — single-select card grid of `OCCASIONS` | `occasion !== null` |
| 2 | Budget — single-select list of `BUDGET_TIERS` (price + "chọn tối đa N loại hoa") | `tier !== null` |
| 3 | Colours — multi-select swatch grid of `FLOWER_COLORS` | `colors.length > 0` |
| 4 | Style — single-select list of `BOUQUET_STYLES` | `style !== null` |
| 5 | Flowers — toggle-select card grid of stems whose `color ∈ colors`; cap = `tier.maxFlowerTypes`; plus an arrangement-note `<textarea>` | `selectedFlowers.length > 0` |
| 6 | Wrapping — wrap-paper grid + ribbon grid on one screen, no prices | `selectedWrap !== null && selectedRibbon !== null` |
| 7 | Review — AI preview + summary + card-message field + "Thêm vào giỏ" (via gate) | — |

**Step 3 also shows a "Đặt nhanh" button** → sets `quick = true`,
`step = 7`. In quick mode steps 4–6 are skipped; `style`,
`selectedFlowers`, `arrangementNote`, `selectedWrap`, `selectedRibbon`
stay at their defaults (null / [] / "") and the review copy notes
"florist sẽ chọn hoa, kiểu dáng và cách gói phù hợp".

**Step 6 is skipped** (full flow) when the chosen style has
`hidesWrapping: true` (`basket`). `nextStep` from 5 goes to 7;
`prevStep` from 7 goes to 5. `selectedWrap` / `selectedRibbon` stay null;
review omits the wrapping line.

Back / Next footer: Back is present on every step (invisible on step 1),
"← Đổi cách đặt" sits above the stepper. Next is hidden on the review
step. Next label is "Xem lại" on the last pre-review step, else "Tiếp
theo".

### 5.3 Photo wizard (`mode === "photo"`)

5 steps:

| Step | Screen | Proceed requires |
|------|--------|------------------|
| 1 | Upload — drag-drop / file input, up to `MAX_REFERENCE_IMAGES` (3); each file → `uploadImageToCloudinary`; thumbnails with remove buttons; per-file uploading / error state | `referenceImages.length >= 1` |
| 2 | Occasion — reuses `<OccasionStep>` | `occasion !== null` |
| 3 | Budget — reuses `<BudgetStep>` | `tier !== null` |
| 4 | Note — florist-note `<textarea>` (placeholder: what matters most about the photo — colours / shape / specific flowers, and whether substitutions are OK) + card-message field | — |
| 5 | Review — shows the uploaded images + summary + a strong disclaimer + "Thêm vào giỏ" (via gate) | — |

Disclaimer text (step 5), verbatim:
> *"Bó thật được florist phỏng theo ảnh bạn cung cấp, có thể khác biệt do mùa vụ và nguyên liệu sẵn có. Nếu sai khác lớn, shop sẽ liên hệ trước khi giao."*

No AI preview is generated in this flow.

### 5.4 Add to cart (both modes)

On "Thêm vào giỏ", the card-message gate runs (§10). Once it proceeds:

1. Build a `CartItem` (§8) with `id = \`CUSTOM-${crypto.randomUUID()}\``,
   `price = getTotalPrice()`, `isCustomBouquet: true`, `customDetails`
   populated per mode.
2. `useCartStore.addToCart(item, 1)`.
3. `router.push("/cart")`.
4. `resetBuilder()`.

(Order: push before reset, per the v1 fix, to avoid a step-0 flash.)

## 6. Hardcoded data — `src/shared/lib/constants/custom-bouquet.const.ts`

The v1 file is reworked. **Removed:** `MIN_STEMS`, `BUILDER_STEPS`.
**Kept:** `STEM_EMOJI`, `STEM_EMOJI_FALLBACK`, `stemEmoji`.
**Added:**

```ts
export const MAX_REFERENCE_IMAGES = 3;

export interface BudgetTier {
    id: string;
    price: number;        // VND
    maxFlowerTypes: number;
    label: string;        // "100.000₫"
}
export const BUDGET_TIERS: BudgetTier[] = [
    { id: "t100",  price: 100_000,   maxFlowerTypes: 2, label: "100.000₫" },
    { id: "t200",  price: 200_000,   maxFlowerTypes: 3, label: "200.000₫" },
    { id: "t350",  price: 350_000,   maxFlowerTypes: 3, label: "350.000₫" },
    { id: "t500",  price: 500_000,   maxFlowerTypes: 4, label: "500.000₫" },
    { id: "t800",  price: 800_000,   maxFlowerTypes: 5, label: "800.000₫" },
    { id: "t1200", price: 1_200_000, maxFlowerTypes: 6, label: "1.200.000₫" },
];

export const OCCASIONS = [
    { id: "birthday",      label: "Sinh nhật",           emoji: "🎂" },
    { id: "love",          label: "Tình yêu / Kỷ niệm",  emoji: "💕" },
    { id: "grand-opening", label: "Khai trương",         emoji: "🎉" },
    { id: "congrats",      label: "Chúc mừng",           emoji: "🌟" },
    { id: "sympathy",      label: "Chia buồn",           emoji: "🕊️" },
    { id: "thanks",        label: "Cảm ơn",              emoji: "🙏" },
    { id: "sorry",         label: "Xin lỗi",             emoji: "🌷" },
] as const;

// id matches Stem.color values in the seed
export const FLOWER_COLORS = [
    { id: "red",    label: "Đỏ",    swatch: "#C0392B" },
    { id: "pink",   label: "Hồng",  swatch: "#F7C9D6" },
    { id: "white",  label: "Trắng", swatch: "#FFFFFF" },
    { id: "yellow", label: "Vàng",  swatch: "#F1C40F" },
    { id: "purple", label: "Tím",   swatch: "#8E7CC3" },
] as const;

export const BOUQUET_STYLES = [
    { id: "round",   label: "Bó tròn (hand-tied)" },
    { id: "korean",  label: "Bó dài kiểu Hàn" },
    { id: "rustic",  label: "Rustic / tự nhiên" },
    { id: "minimal", label: "Tối giản" },
    { id: "basket",  label: "Lẵng / Kệ", hidesWrapping: true },
] as const;

export const BUILD_STEPS       = ["Dịp", "Ngân sách", "Màu sắc", "Kiểu dáng", "Chọn hoa", "Gói hoa", "Xem lại"];
export const BUILD_STEPS_QUICK = ["Dịp", "Ngân sách", "Màu sắc", "Xem lại"];
export const PHOTO_STEPS       = ["Tải ảnh", "Dịp", "Ngân sách", "Ghi chú", "Xem lại"];
```

`white`'s swatch needs a visible border in the UI.

## 7. Store — `src/_app/store/useCustomBouquetStore.ts` (reworked)

Session-only (`create`, not `persist`). Full rewrite; the only external
consumers are the v2 widgets built in this plan.

```ts
export type BouquetMode = "build" | "photo";

export interface SelectedFlower {
    id: string;
    name: string;
    color: string;
}

// reused from v1
export interface SelectedOption {
    id: string;
    name: string;
    color: string;
    price: number; // present but unused in v2 math
}

interface CustomBouquetState {
    mode: BouquetMode | null;
    step: number;
    quick: boolean;

    // build
    occasion: string | null;
    tier: BudgetTier | null;
    colors: string[];
    style: string | null;
    selectedFlowers: SelectedFlower[];
    arrangementNote: string;
    selectedWrap: SelectedOption | null;
    selectedRibbon: SelectedOption | null;
    generatedImage: string | null;

    // photo
    referenceImages: string[];
    floristNote: string;

    // shared
    cardMessage: string;

    // mode + nav
    setMode: (mode: BouquetMode) => void;      // also step = 1, quick = false
    resetMode: () => void;                     // mode = null + wipe wizard state
    nextStep: () => void;                      // clamp to active branch length; honours quick + hidesWrapping skips
    prevStep: () => void;                      // clamp to 1; honours skips
    setStep: (step: number) => void;
    setQuick: (quick: boolean) => void;        // true also sets step = 7 (the review step)

    // build setters
    setOccasion: (id: string) => void;
    setTier: (tier: BudgetTier) => void;       // if selectedFlowers.length > tier.maxFlowerTypes, trim; clear generatedImage
    toggleColor: (color: string) => void;      // add/remove; clear generatedImage; drop now-invalid selectedFlowers
    setStyle: (id: string) => void;            // clear generatedImage
    toggleFlower: (flower: SelectedFlower) => void;  // add if under cap, else no-op; remove if present; clear generatedImage
    setArrangementNote: (text: string) => void;     // clear generatedImage
    setWrap: (opt: SelectedOption) => void;    // clear generatedImage
    setRibbon: (opt: SelectedOption) => void;  // clear generatedImage
    setGeneratedImage: (url: string | null) => void;

    // photo setters
    addReferenceImage: (url: string) => void;   // cap at MAX_REFERENCE_IMAGES
    removeReferenceImage: (url: string) => void;
    setFloristNote: (text: string) => void;

    // shared
    setCardMessage: (text: string) => void;
    resetBuilder: () => void;                   // full wipe incl. mode

    // computed
    getTotalPrice: () => number;               // tier?.price ?? 0
    canProceed: (step: number) => boolean;     // per-step + mode + quick aware
}
```

The internal `step` value is always numbered against the **full** build
flow (review = 7), regardless of quick / skipped steps. The stepper's
displayed index is derived by `build-wizard.widget.tsx` (§14.3).
`nextStep` / `prevStep` arithmetic:
- **quick** (build): `setQuick(true)` sets `step = 7`. While `quick`,
  `nextStep` from 3 lands on 7 and `prevStep` from 7 returns to 3; steps
  4–6 are unreachable.
- **hidesWrapping** (build, non-quick): step 6 is skipped when
  `BOUQUET_STYLES.find(s => s.id === style)?.hidesWrapping` — `nextStep`
  from 5 lands on 7, `prevStep` from 7 returns to 5.

`canProceed(step)` returns the "Proceed requires" condition from the flow
tables in §5.2 / §5.3 for the active `mode`/`quick`.

## 8. Cart item — `useCartStore` `customDetails` (extended)

`useCartStore.ts` itself is **not changed** — `CartItem.customDetails` is
already `Record`-ish and optional. v2 writes a superset:

```ts
customDetails: {
    mode: "build" | "photo";

    // build
    occasion?: string;          // OCCASIONS id
    tierLabel?: string;         // "500.000₫"
    colors?: string[];
    style?: string;             // BOUQUET_STYLES id
    flowers?: { name: string; color: string }[];
    arrangementNote?: string;
    wrapPaper?: string;         // name
    ribbon?: string;            // name

    // photo
    referenceImages?: string[]; // Cloudinary secure URLs

    // shared
    floristNote?: string;       // photo only in practice, but allowed for build too
    cardMessage?: string;
}
```

`CartItem.price = getTotalPrice()` (the tier price) for both modes.
`CartItem.image`: the generated SVG data URL for build; the first
reference image URL for photo (falls back to `""` → 💐 placeholder).
`CartItem.slug = "custom-bouquet"`, `name = "Bó hoa tự thiết kế"` (build)
/ `"Bó hoa đặt theo ảnh"` (photo).

### 8.1 Back-compat

v1 cart items already in a shopper's `localStorage` have
`customDetails.stems: CartStem[]` and **no** `mode`. `cart-line-item.tsx`
must branch: `customDetails?.mode` present → render the v2 summary for
that mode; else if `customDetails?.stems` present → render the v1 summary
(kept verbatim from `master`); else → standard product.

## 9. Cloudinary — `src/shared/lib/cloudinary.ts`

Client-side helper, no `"server-only"`, no backend route.

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

- `.env.example` gains `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=` and
  `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=` with a one-line comment.
- Both values are safe to expose (`NEXT_PUBLIC_`) for unsigned uploads.
- **Setup note for the reader:** on the Cloudinary dashboard, create an
  **unsigned** upload preset and restrict it — max file size (e.g. 10 MB),
  allowed formats (`jpg,png,webp`), and a dedicated folder
  (e.g. `flower-store/custom-bouquet`).
- The photo-upload step catches the thrown error and shows it inline
  (per-file), keeps other files, and does not advance until at least one
  upload succeeded.

## 10. Card-message gate — `src/widgets/custom-bouquet/card-message-field.tsx`

Exports:

- `<CardMessageField />` — a labelled `<textarea>` bound to
  `store.cardMessage` / `store.setCardMessage`, `id="card-message"`.
- `useCardMessageGate(onProceed: () => void)` — returns
  `{ attemptAddToCart: () => void, dialogProps }`.
  - `attemptAddToCart`: if `store.cardMessage.trim()` is non-empty, call
    `onProceed()` immediately. Else open the dialog.
  - `dialogProps` drives `<CardMessageDialog>`:
    - Title: **"Bạn chưa nhập lời nhắn"**
    - Body: "Bạn muốn thêm lời nhắn cho tấm thiệp không?"
    - **"Nhập lời nhắn"** (primary) → close, focus `#card-message`
      (`document.getElementById("card-message")?.focus()`), do **not**
      proceed.
    - **"Tiếp tục"** (secondary) → close, call `onProceed()`.
- `<CardMessageDialog {...dialogProps} />` — built on the new
  `shared/ui/dialog.tsx`.

Used by `review-step.tsx` (build) and `photo-review-step.tsx` (photo).
The photo `photo-note-step` also renders a `<CardMessageField />` so the
customer can type it earlier; the gate still runs at "Add to cart".

## 11. `shared/ui/dialog.tsx` (new shadcn primitive)

A standard shadcn Dialog wrapper over `radix-ui`'s `Dialog` namespace
(match the import + styling conventions already in `sheet.tsx` /
`popover.tsx`): `Dialog`, `DialogTrigger`, `DialogContent` (with overlay +
close button), `DialogHeader`, `DialogFooter`, `DialogTitle`,
`DialogDescription`. Exported from `src/shared/ui/index.ts`. Centered
modal, `max-w-sm` for this use, backdrop, `Esc`/overlay-click closes.

## 12. AI preview stub rework — `src/features/generate-bouquet-image/`

### 12.1 `model/build-prompt.ts`

```ts
export interface BouquetSelection {
    occasion: string | null;         // OCCASIONS id
    colors: string[];
    style: string | null;            // BOUQUET_STYLES id
    flowers: { name: string; color: string }[];
    arrangementNote: string;
    wrapPaper: { name: string; color: string } | null;
    ribbon: { name: string; color: string } | null;
}

export function buildBouquetPrompt(sel: BouquetSelection): string;
```

Composes English text, e.g.:
> `a hand-tied birthday bouquet in pink and white tones, featuring roses
> and lilies, arranged with roses at the centre and baby's breath around
> the edge, wrapped in kraft brown paper with a blush satin ribbon,
> professional studio flower photography, soft natural light, plain
> background`

Rules:
- Occasion → a human word from `OCCASIONS` label map (English-ish:
  birthday / anniversary / grand opening / congratulations / sympathy /
  thanks / apology); omit the clause if `null`.
- Colours → join `FLOWER_COLORS` labels in English ("pink and white").
- Style → phrase per id (round → "hand-tied", korean → "long Korean-style",
  rustic → "loose rustic", minimal → "minimalist", basket → "in a
  basket"); omit if `null`.
- Flowers → "featuring X and Y" from names; if empty (quick mode):
  "a florist's-choice arrangement".
- `arrangementNote` (trimmed, non-empty) → "arranged {note}", else "arranged
  in a natural rounded shape".
- Wrap / ribbon clauses only when present.
- Fixed style suffix.

### 12.2 `actions/generate-bouquet-image.action.ts`

`"use server"`. Signature unchanged in shape:
`generateBouquetImage(sel: BouquetSelection): Promise<{ imageUrl: string; prompt: string }>`.

- Keep the `if (!sel || !Array.isArray(sel.colors)) throw` shape guard
  (v1 guarded `sel.stems`; v2 guards `sel.colors`).
- Keep the `SAFE_COLOR` / `safeColor` guard and the expanded STUB seam
  comment (zod validation / auth-or-rate-limit / cost cap) from the v1
  fixes, verbatim.
- `await` ~1200ms.
- `svgBouquet(sel)`: pick the palette source — `sel.flowers.map(f => f.color)`
  if non-empty, else `sel.colors`, else `["#F7C9D6"]`. Render a fixed
  ~16 petal circles cycling that palette (no quantities), a wrap cone in
  `safeColor(sel.wrapPaper?.color ?? "#E7DFD3")`, a ribbon band in
  `safeColor(sel.ribbon?.color ?? "#E8A0B4")`. Cap total shapes at 16.
- Return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`.

## 13. FSD file structure

**New:**
```
docs/superpowers/specs/2026-09-02-custom-bouquet-builder-v2-design.md
src/shared/ui/dialog.tsx
src/shared/lib/cloudinary.ts
src/widgets/custom-bouquet/mode-select.widget.tsx
src/widgets/custom-bouquet/build-wizard.widget.tsx
src/widgets/custom-bouquet/photo-wizard.widget.tsx
src/widgets/custom-bouquet/card-message-field.tsx
src/widgets/custom-bouquet/steps/occasion-step.tsx
src/widgets/custom-bouquet/steps/budget-step.tsx
src/widgets/custom-bouquet/steps/color-step.tsx
src/widgets/custom-bouquet/steps/style-step.tsx
src/widgets/custom-bouquet/steps/wrapping-step.tsx
src/widgets/custom-bouquet/steps/photo-upload-step.tsx
src/widgets/custom-bouquet/steps/photo-note-step.tsx
src/widgets/custom-bouquet/steps/photo-review-step.tsx
```

**Reworked:**
```
src/_app/store/useCustomBouquetStore.ts
src/shared/lib/constants/custom-bouquet.const.ts
src/shared/ui/index.ts                       (add dialog exports)
src/features/generate-bouquet-image/model/build-prompt.ts
src/features/generate-bouquet-image/actions/generate-bouquet-image.action.ts
src/widgets/custom-bouquet/bouquet-builder.widget.tsx
src/widgets/custom-bouquet/builder-stepper.tsx        (steps: string[] prop)
src/widgets/custom-bouquet/bouquet-summary.tsx        (mode-aware)
src/widgets/custom-bouquet/index.ts                   (add new widget exports)
src/widgets/custom-bouquet/steps/flower-step.tsx      (git-rename of v1 stem-step.tsx, then rework: no qty, toggle-select, cap, colour filter, + arrangement textarea)
src/widgets/custom-bouquet/steps/review-step.tsx      (v2 inputs; CardMessageField + gate; quick-mode + no-wrapping copy)
src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx  (header copy only; still fetches the 3 lists)
src/_pages/cart/ui/cart-line-item.tsx                 (v2 mode branches; keep v1 branch for back-compat)
.env.example                                          (Cloudinary vars)
```

**Deleted:**
```
src/widgets/custom-bouquet/steps/wrap-step.tsx        (merged into wrapping-step.tsx)
src/widgets/custom-bouquet/steps/ribbon-step.tsx      (merged into wrapping-step.tsx)
```
(`stem-step.tsx` is git-renamed to `flower-step.tsx`, listed under Reworked.)

## 14. Component detail

### 14.1 `bouquet-builder.widget.tsx` (rework)
`"use client"`. Props `{ stems, wraps, ribbons }`. `resetBuilder()` on
mount. Switch on `mode`: `null` → `<ModeSelectWidget />`; `"build"` →
`<BuildWizardWidget stems wraps ribbons />`; `"photo"` →
`<PhotoWizardWidget />`.

### 14.2 `mode-select.widget.tsx` (new)
Heading + two `<button>` cards (see §5.1). Each calls `store.setMode(...)`.

### 14.3 `build-wizard.widget.tsx` (new)
`"use client"`. Props `{ stems, wraps, ribbons }`. Reads
`mode`/`step`/`quick`/`style`/selection getters. Layout:
`grid lg:grid-cols-[1fr_320px]`.
- Left: "← Đổi cách đặt" (`resetMode()`), `<BuilderStepper steps={quick ? BUILD_STEPS_QUICK : BUILD_STEPS} current={displayStep} />`, a `key={step}` fade wrapper with the active step, a Back/Next footer.
- `displayStep`: in quick mode map internal `step` (1,2,3,7) → stepper index (1,2,3,4).
- Step render map: 1 `<OccasionStep>` · 2 `<BudgetStep>` · 3 `<ColorStep>` (+ the "Đặt nhanh" button) · 4 `<StyleStep>` · 5 `<FlowerStep stems={stems} />` · 6 `<WrappingStep wraps={wraps} ribbons={ribbons} />` · 7 `<ReviewStep />`.
- Next disabled when `!canProceed(step)`. Next hidden on step 7. Label "Xem lại" when the next advance lands on 7.
- Right: `<BouquetSummary />`.

### 14.4 `photo-wizard.widget.tsx` (new)
Same skeleton, `PHOTO_STEPS`, steps: 1 `<PhotoUploadStep>` · 2
`<OccasionStep>` · 3 `<BudgetStep>` · 4 `<PhotoNoteStep>` · 5
`<PhotoReviewStep>`. "← Đổi cách đặt" via `resetMode()`.

### 14.5 build steps
- `occasion-step.tsx` — card grid from `OCCASIONS` (emoji + label), single-select, active ring, `store.setOccasion`.
- `budget-step.tsx` — vertical list of `BUDGET_TIERS` (label + "Tối đa {maxFlowerTypes} loại hoa"), single-select, `store.setTier`.
- `color-step.tsx` — swatch grid from `FLOWER_COLORS` (dot + label), multi-select via `store.toggleColor`, checkmark on selected, `white` dot has a border. Header hint: "Chọn ít nhất 1 màu".
- `style-step.tsx` — list of `BOUQUET_STYLES` (label), single-select, `store.setStyle`.
- `flower-step.tsx` — grid of stems where `colors.includes(stem.color)`; each card = swatch + `stemEmoji(name)` + name; whole card is a toggle (`store.toggleFlower({ id, name, color })`); a card is disabled (not click-to-add) when `selectedFlowers.length >= (tier?.maxFlowerTypes ?? 0)` and it is not already selected; header shows `{selectedFlowers.length} / {tier?.maxFlowerTypes ?? 0}` (the flow guarantees `tier` is set by this step, but read it defensively). Below the grid: a `<textarea id="arrangement-note">` bound to `store.arrangementNote` / `setArrangementNote`, `placeholder="Ví dụ: hồng làm trung tâm, baby's breath viền quanh, điểm vài nhành lá bạch đàn rủ xuống..."`. Empty-state `<p>` when the filtered list is empty.
- `wrapping-step.tsx` — two labelled sections on one screen: "Giấy gói" (grid of `wraps`) and "Ruy băng" (grid of `ribbons`). Each is a single-select card (swatch + name, **no price**). `store.setWrap` / `store.setRibbon`. Empty-state per section.
- `review-step.tsx` (rework) — left: AI preview box (bloom loader → `<img>`), same 3 visual states and the v1-fixed effect (`startedRef`, no `ignore` flag, regen deps include the selection). `BouquetSelection` assembled from the store. In quick mode / hidden-wrapping, pass `flowers: []` / `wrapPaper: null` etc. Right: summary lines (occasion, tier label, colours, style, flowers, arrangement note, wrap, ribbon — omit the ones that are empty), total price, `<CardMessageField />`, and a primary "Thêm vào giỏ" button wired through `useCardMessageGate` → the §5.4 add-to-cart. Button disabled while generating or (non-quick) while `generatedImage` is null.

### 14.6 photo steps
- `photo-upload-step.tsx` — a dropzone (`<input type="file" accept="image/*" multiple>` + drag handlers). On select: for each file up to the remaining cap, push a placeholder, call `uploadImageToCloudinary`, on success `store.addReferenceImage(url)`, on failure show an inline error for that slot and drop the placeholder. Thumbnails (plain `<img>`) with a remove "×" → `store.removeReferenceImage`. Header: `{referenceImages.length} / {MAX_REFERENCE_IMAGES}`. Disable the input at the cap.
- `photo-note-step.tsx` — a `<textarea id="florist-note">` bound to `store.floristNote` / `setFloristNote` with the §5.3-step-4 placeholder, then `<CardMessageField />`.
- `photo-review-step.tsx` — grid of the uploaded `<img>`s, summary (occasion, tier label, florist note, card message), total price, the disclaimer block (§5.3), and "Thêm vào giỏ" via `useCardMessageGate` → §5.4 (build the photo-mode `CartItem`, `image = referenceImages[0] ?? ""`).

### 14.7 `builder-stepper.tsx` (rework)
Props `{ steps: string[]; current: number }`. Same dot + connector +
check-icon rendering as v1, driven by `steps.length`.

### 14.8 `bouquet-summary.tsx` (rework)
Reads `mode` + the relevant fields. Build: occasion label, tier label,
colour dots, style label, flower chips, wrap/ribbon names, and
`getTotalPrice()`. Photo: occasion label, tier label, "{n} ảnh mẫu",
`getTotalPrice()`. Hidden entirely when `mode === null` (mode-select
screen has no sidebar).

### 14.9 `cart-line-item.tsx` (rework — additive)
Add, before the existing v1 `isCustom` block:
`const cd = item.customDetails;`
- `cd?.mode === "build"` → thumbnail = `<img src={item.image}>` (SVG data URL); title plain text; details `<ul>`: `Dịp`, `Ngân sách` (tierLabel), `Màu` (colour names), `Kiểu` (style label), flowers joined, `Sắp xếp` (arrangementNote, if any), `Gói` (wrapPaper), `Ruy băng` (ribbon), `Lời nhắn` (cardMessage, if any) — omit empty lines.
- `cd?.mode === "photo"` → thumbnail = `<img src={item.image}>` (first reference URL); title plain text; details: `Dịp`, `Ngân sách`, `{n} ảnh mẫu`, `Ghi chú` (floristNote), `Lời nhắn` (cardMessage).
- else if `cd?.stems` (v1 item) → the existing v1 branch, unchanged.
- else → standard product, unchanged.
All custom modes use a plain `<img>` (never `next/image`) and render the
name as plain text (no `/catalog/[slug]` link).

## 15. Verification

No test runner. Run:

1. `npx tsc --noEmit` — only the 2 known baseline errors (`next.config.ts`,
   `src/shared/ui/sidebar.tsx`).
2. `npm run lint` — only the ~6 known baseline problems (untouched files).
3. `npx prettier --write <touched files>` then `npx prettier --check
   <touched files>` — clean. (Do **not** run repo-wide `npm run format`.)
4. `npm run build` — succeeds; `/custom-bouquet` listed as `ƒ` (dynamic).
5. `npm run db:seed` — still runs green (no schema/seed change).
6. Dev-server smoke: `curl -s http://localhost:3000/custom-bouquet` → 200,
   contains the mode-select copy ("Tự thiết kế", "Đặt theo ảnh"), no error
   overlay.
7. Manual (human, dev server) — cannot be done via curl:
   - Build full flow: occasion → budget → colours → style → flowers (cap
     enforced, filtered by colour) → wrapping → review (preview renders,
     colours track selection) → "Thêm vào giỏ" with an empty message →
     dialog → "Tiếp tục" → lands on `/cart` with a correct build line.
   - Build quick: colours step → "Đặt nhanh" → review (florist-choice
     copy) → cart.
   - Build with style = "Lẵng / Kệ" → wrapping step skipped.
   - Photo flow: upload (needs real `NEXT_PUBLIC_CLOUDINARY_*` in
     `.env.local`; without it the step shows the config error) → occasion
     → budget → note → review (disclaimer, uploaded images) → cart.
   - `/cart`: both custom line types render; quantity stepper + line total
     still work; a pre-existing v1 cart item (if any) still renders.
   - Checkout → existing success dialog, cart clears.
   - Revisit `/custom-bouquet` → back to the mode-select screen.
   - Reduced-motion OS setting → bloom loader static.

## 16. Risks / notes

- **Cloudinary env not set in CI/other clones.** The upload helper throws a
  clear Vietnamese error and the photo-upload step surfaces it; the build
  and quick flows are unaffected. Document the `.env.local` requirement.
- **Unsigned preset is a public credential.** Safe in `NEXT_PUBLIC_`, but
  must be restricted on the Cloudinary side (size / formats / folder) —
  called out in §9.
- **Reference image size in the cart.** Only the Cloudinary `secure_url`
  (a short string) is stored in the `localStorage` cart, not the image
  bytes — no size concern.
- **v1 localStorage carts.** Handled by the `cart-line-item.tsx`
  back-compat branch (§8.1). No migration of persisted cart state.
- **`/custom-bouquet` is `force-dynamic`** (from a v1 fix) — the 3 Prisma
  queries run per request, reflecting live catalogue data; `next build`
  needs DB connectivity (already true on `master`).
- **Store rewrite is a breaking interface change** — every consumer is a
  v2 widget built in this plan; grep before editing to confirm nothing on
  `master` outside `src/widgets/custom-bouquet/**` imports the store.
- **`crypto.randomUUID()`** needs a secure context (fine on https +
  `localhost`).
- **`dialog.tsx`** must follow the repo's existing shadcn conventions
  (`radix-ui` namespace import, `cn`, `data-slot` attributes) — mirror
  `sheet.tsx`.

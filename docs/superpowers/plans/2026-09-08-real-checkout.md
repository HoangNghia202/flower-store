# Real Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the faked checkout with a real flow that persists `Order` rows, supports COD and PayOS sandbox payment, applies coupons, and gives the signed-in user an order history.

**Architecture:** One `createOrderAction` server action validates the checkout form, re-prices the cart against the DB, and creates the `Order` (+ items + custom bouquets + coupon increment + optional address-book save) in a single `prisma.$transaction`. For PayOS it then creates a payment link and returns its URL; the client redirects. A `/checkout/return` server page verifies the real payment status via the PayOS API and flips `paymentStatus`; a webhook route is a best-effort backup. The cart (client-only Zustand) is cleared on the order-detail page after placement.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Prisma 7 (Postgres, client generated to `prisma/generated/`), Auth.js v5, Zustand, Zod v4, Tailwind v4, shadcn primitives, `@payos/node` (new), `vitest` (new, for pure-function unit tests).

**Spec:** `docs/superpowers/specs/2026-09-08-real-checkout-design.md` — read it alongside this plan.

## Global Constraints

- **Next.js 16 / React 19.** Request APIs are async: `await params`, `await searchParams`, `await cookies()`, `await headers()` in pages/route handlers/metadata.
- **Prisma:** import types from `@/prisma/generated/client`; import the singleton from `@/prisma/prisma-instance`. Never import from `@prisma/client`.
- **FSD imports:** `@/shared/*`, `@/_app/*`, `@/_pages/*`, `@/widgets/*` are aliased. Entities and features have **no alias** — import as `@/src/entites/…` and `@/src/features/…`.
- **`src/entites` is misspelled on purpose** — do not rename it.
- **Server actions:** file starts with `"use server"`; form actions have the shape `(prevState, formData) => Promise<ActionState>` and are consumed with `useActionState`; validate with Zod; field errors via `error.flatten().fieldErrors`.
- **Prettier:** 4-space indent, double quotes, semicolons, trailing commas. Run `npm run format` before each commit.
- **Verification:** `npm run lint` and `npx tsc --noEmit` must not introduce **new** errors (the build ignores type/lint errors, so these are the real gates). `npm test` runs vitest.
- **Auth:** `import { auth } from "@/auth"`. `session.user.id` and `session.user.role` are populated by the JWT/session callbacks (both typed `string | undefined`).
- **Money** is integer VND. Format as `n.toLocaleString("vi-VN") + "₫"`.
- **PayOS:** sandbox only. `orderCode` must be a positive integer — use `Order.orderSeq`. `amount` must be an integer. `description` must be ≤ 25 characters — `FLW-000123` fits.
- **New env vars** (add to `.env` and `.env.example`): `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `NEXT_PUBLIC_APP_URL`.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/entites/order/model/order-number.util.ts` | `formatOrderNumber` / `parseOrderNumber` (pure) |
| `src/entites/order/model/delivery.const.ts` | `DELIVERY_SLOTS`, `isDeliverySlot`, `isValidDeliveryDate` (pure) |
| `src/entites/order/model/coupon.util.ts` | `validateCoupon`, `computeDiscount` (pure) |
| `src/entites/order/model/totals.util.ts` | `computeSubtotal`, `computeOrderTotals` (pure) |
| `src/entites/order/model/order.model.ts` | `OrderActionState`, `CartSnapshotItem` types |
| `src/entites/order/model/order.schema.ts` | `checkoutFormSchema`, `getOrderFieldErrors` |
| `src/entites/order/model/index.ts` | model barrel |
| `src/entites/order/actions/create-order.action.ts` | the core order-creation action |
| `src/entites/order/actions/validate-coupon.action.ts` | coupon check for the summary UI |
| `src/entites/order/actions/get-address-book.action.ts` | `AddressBookEntry[]` for the signed-in user |
| `src/entites/order/actions/get-my-orders.action.ts` | order list for the signed-in user |
| `src/entites/order/actions/get-order-by-number.action.ts` | owner-scoped single order |
| `src/entites/order/actions/start-payment.action.ts` | recreate a PayOS link for an existing UNPAID order |
| `src/entites/order/actions/index.ts` | actions barrel |
| `src/entites/order/index.ts` | entity barrel |
| `src/shared/lib/payos/payos-client.ts` | `@payos/node` singleton from env |
| `src/shared/lib/payos/create-payment-link.ts` | `createPaymentLink()` thin wrapper |
| `src/shared/lib/payos/verify-payment.ts` | `normalizePayosStatus` (pure) + `getPaymentStatus()` |
| `src/features/checkout/ui/address-book-select.tsx` | saved-recipient `<select>` |
| `src/features/checkout/ui/order-summary.tsx` | line items + coupon field + totals + submit button |
| `src/features/checkout/ui/start-payment-button.tsx` | "Complete payment" button |
| `src/features/checkout/ui/checkout-form.tsx` | the client form shell (`useActionState`) |
| `src/_pages/checkout/ui/checkout.page.tsx` | checkout page composition |
| `src/_pages/checkout/index.ts` | page barrel |
| `src/_pages/orders/ui/order-list.page.tsx` | `/orders` list |
| `src/_pages/orders/ui/order-detail.page.tsx` | `/orders/[slug]` detail |
| `src/_pages/orders/ui/clear-cart-on-mount.tsx` | clears the cart on mount |
| `src/_pages/orders/index.ts` | page barrel |
| `app/(store-front)/checkout/page.tsx` | route entry |
| `app/(store-front)/checkout/return/page.tsx` | PayOS return verification |
| `app/(store-front)/orders/page.tsx` | route entry |
| `app/(store-front)/orders/[slug]/page.tsx` | route entry |
| `app/api/payment/payos/webhook/route.ts` | PayOS webhook |
| `vitest.config.ts` | vitest config |
| `*.test.ts` next to each pure util | unit tests |

**Modified:** `prisma/schema.prisma`, `package.json`, `.env`, `.env.example`, `proxy.ts`, `src/features/checkout/index.ts`, `src/_pages/cart/ui/cart.page.tsx`.

**Deleted:** `src/features/checkout/ui/checkout-button.tsx`, `src/features/checkout/ui/payment-success-dialog.tsx`.

---

## Task 1: Schema migration, dependencies, env

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json`
- Modify: `.env`, `.env.example`

**Interfaces:**
- Produces: `Order.orderSeq: Int` (unique, autoincrement), `Order.couponCode: String?`, `Order.discountAmount: Float` (default 0), `OrderItem.addons: Json?`, `CustomBouquet.wrapPaper: String?`, `CustomBouquet.ribbon: String?`, `CustomBouquet.name: String?`, `CustomBouquet.imageUrl: String?`, `CustomBouquet.meta: Json?`. New dependency `@payos/node`.

- [ ] **Step 1: Edit `Order` in `prisma/schema.prisma`**

Add these fields to `model Order` (anywhere inside the block):

```prisma
    orderSeq       Int     @unique @default(autoincrement())
    couponCode     String?
    discountAmount Float   @default(0)
```

- [ ] **Step 2: Edit `OrderItem` in `prisma/schema.prisma`**

Add to `model OrderItem`:

```prisma
    addons Json?
```

- [ ] **Step 3: Edit `CustomBouquet` in `prisma/schema.prisma`**

Change `wrapPaper` and `ribbon` to nullable and add three fields:

```prisma
    wrapPaper String? // Loại giấy gói chọn (null cho bó theo ảnh)
    ribbon    String? // Loại ruy băng chọn (null cho bó theo ảnh)
    name      String? // Tên hiển thị chốt tại thời điểm đặt
    imageUrl  String? // Ảnh preview / ảnh mẫu đầu tiên
    meta      Json?   // Toàn bộ customDetails từ giỏ hàng cho florist
```

- [ ] **Step 4: Run the migration**

Run: `npx prisma migrate dev --name real_checkout`
Expected: migration created under `prisma/migrations/`, applied, and `prisma generate` runs automatically (client regenerated into `prisma/generated/`).

- [ ] **Step 5: Install dependencies**

Run: `npm install @payos/node@^1 && npm install -D vitest`
Expected: both appear in `package.json`. (`@payos/node` v1 exposes `default` export `PayOS` with `createPaymentLink`, `getPaymentLinkInformation`, `verifyPaymentWebhookData`. If the installed major differs, adjust only the two wrapper files in Task 7.)

- [ ] **Step 6: Add scripts to `package.json`**

In `"scripts"`, add:

```json
        "test": "vitest run",
        "test:watch": "vitest"
```

- [ ] **Step 7: Add env vars**

Append to `.env` (fill real sandbox values locally) **and** `.env.example` (placeholder values):

```
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 8: Verify the client picked up the new fields**

Run: `npx tsc --noEmit`
Expected: no new errors. If `prisma/generated` types lack the new fields, re-run `npx prisma generate`.

- [ ] **Step 9: Commit**

```bash
npm run format
git add prisma/schema.prisma prisma/migrations package.json package-lock.json .env.example
git commit -m "feat(checkout): schema migration + payos/vitest deps for real checkout"
```

---

## Task 2: `order-number.util.ts` + vitest setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/entites/order/model/order-number.util.ts`
- Test: `src/entites/order/model/order-number.util.test.ts`

**Interfaces:**
- Produces:
  - `formatOrderNumber(seq: number): string` — `123 → "FLW-000123"`
  - `parseOrderNumber(slug: string): number | null` — inverse; `null` on any non-matching input

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/**/*.test.ts"],
    },
});
```

- [ ] **Step 2: Write the failing test**

`src/entites/order/model/order-number.util.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatOrderNumber, parseOrderNumber } from "./order-number.util";

describe("formatOrderNumber", () => {
    it("zero-pads to 6 digits with an FLW- prefix", () => {
        expect(formatOrderNumber(123)).toBe("FLW-000123");
    });
    it("does not truncate numbers longer than 6 digits", () => {
        expect(formatOrderNumber(1234567)).toBe("FLW-1234567");
    });
});

describe("parseOrderNumber", () => {
    it("reverses formatOrderNumber", () => {
        expect(parseOrderNumber("FLW-000123")).toBe(123);
    });
    it("trims surrounding whitespace", () => {
        expect(parseOrderNumber("  FLW-000042  ")).toBe(42);
    });
    it("returns null for anything that is not an FLW number", () => {
        expect(parseOrderNumber("FLW-abc")).toBeNull();
        expect(parseOrderNumber("123")).toBeNull();
        expect(parseOrderNumber("")).toBeNull();
        expect(parseOrderNumber("FLW-000000")).toBeNull();
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- order-number`
Expected: FAIL — `order-number.util` has no such exports.

- [ ] **Step 4: Write the implementation**

`src/entites/order/model/order-number.util.ts`:

```ts
export function formatOrderNumber(seq: number): string {
    return `FLW-${String(seq).padStart(6, "0")}`;
}

export function parseOrderNumber(slug: string): number | null {
    const match = /^FLW-(\d{1,10})$/.exec(slug.trim());
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isInteger(n) && n > 0 ? n : null;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- order-number`
Expected: PASS (5 assertions).

- [ ] **Step 6: Commit**

```bash
npm run format
git add vitest.config.ts src/entites/order/model/order-number.util.ts src/entites/order/model/order-number.util.test.ts
git commit -m "feat(checkout): order-number util + vitest setup"
```

---

## Task 3: `delivery.const.ts`

**Files:**
- Create: `src/entites/order/model/delivery.const.ts`
- Test: `src/entites/order/model/delivery.const.test.ts`

**Interfaces:**
- Produces:
  - `DELIVERY_SLOTS: readonly string[]` — the five fixed slots
  - `type DeliverySlot = (typeof DELIVERY_SLOTS)[number]`
  - `isDeliverySlot(v: unknown): v is DeliverySlot`
  - `isValidDeliveryDate(date: Date, now: Date): boolean` — true iff `date` (date-part, local) is on or after the day after `now`

- [ ] **Step 1: Write the failing test**

`src/entites/order/model/delivery.const.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
    DELIVERY_SLOTS,
    isDeliverySlot,
    isValidDeliveryDate,
} from "./delivery.const";

describe("isDeliverySlot", () => {
    it("accepts a known slot", () => {
        expect(isDeliverySlot(DELIVERY_SLOTS[0])).toBe(true);
    });
    it("rejects unknown values", () => {
        expect(isDeliverySlot("07:00 - 09:00")).toBe(false);
        expect(isDeliverySlot(123)).toBe(false);
        expect(isDeliverySlot(undefined)).toBe(false);
    });
});

describe("isValidDeliveryDate", () => {
    const now = new Date("2026-09-08T15:00:00");
    it("rejects today", () => {
        expect(isValidDeliveryDate(new Date("2026-09-08T00:00:00"), now)).toBe(
            false,
        );
    });
    it("rejects yesterday", () => {
        expect(isValidDeliveryDate(new Date("2026-09-07T00:00:00"), now)).toBe(
            false,
        );
    });
    it("accepts tomorrow", () => {
        expect(isValidDeliveryDate(new Date("2026-09-09T00:00:00"), now)).toBe(
            true,
        );
    });
    it("accepts a date next week", () => {
        expect(isValidDeliveryDate(new Date("2026-09-15T00:00:00"), now)).toBe(
            true,
        );
    });
    it("rejects an invalid date", () => {
        expect(isValidDeliveryDate(new Date("nope"), now)).toBe(false);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- delivery.const`
Expected: FAIL — module not found / no exports.

- [ ] **Step 3: Write the implementation**

`src/entites/order/model/delivery.const.ts`:

```ts
export const DELIVERY_SLOTS = [
    "08:00 - 10:00",
    "10:00 - 12:00",
    "14:00 - 16:00",
    "16:00 - 18:00",
    "18:00 - 20:00",
] as const;

export type DeliverySlot = (typeof DELIVERY_SLOTS)[number];

export function isDeliverySlot(v: unknown): v is DeliverySlot {
    return (
        typeof v === "string" &&
        (DELIVERY_SLOTS as readonly string[]).includes(v)
    );
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isValidDeliveryDate(date: Date, now: Date): boolean {
    if (Number.isNaN(date.getTime())) return false;
    const tomorrow = startOfDay(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return startOfDay(date).getTime() >= tomorrow.getTime();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- delivery.const`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/entites/order/model/delivery.const.ts src/entites/order/model/delivery.const.test.ts
git commit -m "feat(checkout): delivery slots + lead-time rule"
```

---

## Task 4: `coupon.util.ts`

**Files:**
- Create: `src/entites/order/model/coupon.util.ts`
- Test: `src/entites/order/model/coupon.util.test.ts`

**Interfaces:**
- Produces:
  - `interface CouponRow { code: string; discountType: "PERCENTAGE" | "FIXED"; value: number; maxUses: number | null; usedCount: number; active: boolean; expiresAt: Date | null }`
  - `type CouponCheck = { ok: true; discountType: "PERCENTAGE" | "FIXED"; value: number } | { ok: false; reason: string }`
  - `validateCoupon(coupon: CouponRow | null, now: Date): CouponCheck`
  - `computeDiscount(args: { discountType: "PERCENTAGE" | "FIXED"; value: number }, subtotal: number): number` — integer VND, clamped to `[0, subtotal]`

- [ ] **Step 1: Write the failing test**

`src/entites/order/model/coupon.util.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeDiscount, validateCoupon, type CouponRow } from "./coupon.util";

const base: CouponRow = {
    code: "SAVE10",
    discountType: "PERCENTAGE",
    value: 10,
    maxUses: 100,
    usedCount: 5,
    active: true,
    expiresAt: new Date("2027-01-01T00:00:00"),
};
const now = new Date("2026-09-08T00:00:00");

describe("validateCoupon", () => {
    it("rejects a missing coupon", () => {
        expect(validateCoupon(null, now)).toEqual({
            ok: false,
            reason: expect.any(String),
        });
    });
    it("rejects an inactive coupon", () => {
        expect(validateCoupon({ ...base, active: false }, now).ok).toBe(false);
    });
    it("rejects an expired coupon", () => {
        expect(
            validateCoupon(
                { ...base, expiresAt: new Date("2026-01-01T00:00:00") },
                now,
            ).ok,
        ).toBe(false);
    });
    it("rejects a fully-used coupon", () => {
        expect(
            validateCoupon({ ...base, maxUses: 5, usedCount: 5 }, now).ok,
        ).toBe(false);
    });
    it("accepts a valid coupon and returns its terms", () => {
        expect(validateCoupon(base, now)).toEqual({
            ok: true,
            discountType: "PERCENTAGE",
            value: 10,
        });
    });
    it("treats null maxUses as unlimited", () => {
        expect(
            validateCoupon({ ...base, maxUses: null, usedCount: 9999 }, now).ok,
        ).toBe(true);
    });
});

describe("computeDiscount", () => {
    it("computes a rounded percentage", () => {
        expect(
            computeDiscount({ discountType: "PERCENTAGE", value: 10 }, 12345),
        ).toBe(1235);
    });
    it("applies a fixed amount", () => {
        expect(
            computeDiscount({ discountType: "FIXED", value: 50000 }, 200000),
        ).toBe(50000);
    });
    it("never exceeds the subtotal", () => {
        expect(
            computeDiscount({ discountType: "FIXED", value: 999999 }, 100000),
        ).toBe(100000);
    });
    it("is zero for a non-positive subtotal", () => {
        expect(
            computeDiscount({ discountType: "PERCENTAGE", value: 10 }, 0),
        ).toBe(0);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- coupon.util`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

`src/entites/order/model/coupon.util.ts`:

```ts
export interface CouponRow {
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    value: number;
    maxUses: number | null;
    usedCount: number;
    active: boolean;
    expiresAt: Date | null;
}

export type CouponCheck =
    | { ok: true; discountType: "PERCENTAGE" | "FIXED"; value: number }
    | { ok: false; reason: string };

export function validateCoupon(
    coupon: CouponRow | null,
    now: Date,
): CouponCheck {
    if (!coupon) return { ok: false, reason: "That coupon code isn't valid." };
    if (!coupon.active)
        return { ok: false, reason: "That coupon is no longer active." };
    if (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime())
        return { ok: false, reason: "That coupon has expired." };
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
        return { ok: false, reason: "That coupon has reached its usage limit." };
    return { ok: true, discountType: coupon.discountType, value: coupon.value };
}

export function computeDiscount(
    args: { discountType: "PERCENTAGE" | "FIXED"; value: number },
    subtotal: number,
): number {
    if (subtotal <= 0) return 0;
    const raw =
        args.discountType === "PERCENTAGE"
            ? Math.round((subtotal * args.value) / 100)
            : args.value;
    return Math.max(0, Math.min(raw, subtotal));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- coupon.util`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/entites/order/model/coupon.util.ts src/entites/order/model/coupon.util.test.ts
git commit -m "feat(checkout): coupon validation + discount math"
```

---

## Task 5: `totals.util.ts`

**Files:**
- Create: `src/entites/order/model/totals.util.ts`
- Test: `src/entites/order/model/totals.util.test.ts`

**Interfaces:**
- Produces:
  - `interface PricedLine { unitPrice: number; quantity: number }`
  - `computeSubtotal(lines: PricedLine[], addonsTotal: number): number`
  - `interface OrderTotals { subtotal: number; discountAmount: number; totalAmount: number }`
  - `computeOrderTotals(subtotal: number, discountAmount: number): OrderTotals` — clamps `discountAmount` to `[0, subtotal]`; `totalAmount = subtotal - clampedDiscount`

- [ ] **Step 1: Write the failing test**

`src/entites/order/model/totals.util.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeOrderTotals, computeSubtotal } from "./totals.util";

describe("computeSubtotal", () => {
    it("sums unitPrice * quantity plus the add-ons total", () => {
        expect(
            computeSubtotal(
                [
                    { unitPrice: 100000, quantity: 2 },
                    { unitPrice: 50000, quantity: 1 },
                ],
                20000,
            ),
        ).toBe(270000);
    });
    it("is the add-ons total when there are no lines", () => {
        expect(computeSubtotal([], 15000)).toBe(15000);
    });
});

describe("computeOrderTotals", () => {
    it("subtracts the discount", () => {
        expect(computeOrderTotals(200000, 30000)).toEqual({
            subtotal: 200000,
            discountAmount: 30000,
            totalAmount: 170000,
        });
    });
    it("clamps a discount larger than the subtotal", () => {
        expect(computeOrderTotals(100000, 999999)).toEqual({
            subtotal: 100000,
            discountAmount: 100000,
            totalAmount: 0,
        });
    });
    it("clamps a negative discount to zero", () => {
        expect(computeOrderTotals(100000, -5)).toEqual({
            subtotal: 100000,
            discountAmount: 0,
            totalAmount: 100000,
        });
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- totals.util`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

`src/entites/order/model/totals.util.ts`:

```ts
export interface PricedLine {
    unitPrice: number;
    quantity: number;
}

export function computeSubtotal(
    lines: PricedLine[],
    addonsTotal: number,
): number {
    return (
        lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) + addonsTotal
    );
}

export interface OrderTotals {
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
}

export function computeOrderTotals(
    subtotal: number,
    discountAmount: number,
): OrderTotals {
    const clamped = Math.max(0, Math.min(discountAmount, subtotal));
    return { subtotal, discountAmount: clamped, totalAmount: subtotal - clamped };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- totals.util`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/entites/order/model/totals.util.ts src/entites/order/model/totals.util.test.ts
git commit -m "feat(checkout): order totals math"
```

---

## Task 6: `order.model.ts` + `order.schema.ts` + model barrel

**Files:**
- Create: `src/entites/order/model/order.model.ts`
- Create: `src/entites/order/model/order.schema.ts`
- Create: `src/entites/order/model/index.ts`
- Test: `src/entites/order/model/order.schema.test.ts`

**Interfaces:**
- Consumes: `DELIVERY_SLOTS` from `./delivery.const`
- Produces:
  - `type OrderActionState = { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean; redirect?: string; external?: boolean }`
  - `interface CartSnapshotItem { id: string; quantity: number; isCustomBouquet: boolean; price: number; name: string; image?: string | null; customDetails?: Record<string, unknown> | null; addons?: { id: string; name: string; price: number; quantity: number }[] | null }`
  - `checkoutFormSchema` (Zod object) and `type CheckoutFormValues = z.infer<typeof checkoutFormSchema>`
  - `getOrderFieldErrors(error: z.ZodError): Record<string, string[]>`
  - Barrel `src/entites/order/model/index.ts` re-exports everything from the five model files.

- [ ] **Step 1: Create `order.model.ts`**

```ts
export type OrderActionState = {
    error?: string;
    fieldErrors?: Record<string, string[]>;
    ok?: boolean;
    redirect?: string;
    external?: boolean;
};

export interface CartSnapshotItem {
    id: string;
    quantity: number;
    isCustomBouquet: boolean;
    price: number;
    name: string;
    image?: string | null;
    customDetails?: Record<string, unknown> | null;
    addons?:
        | { id: string; name: string; price: number; quantity: number }[]
        | null;
}
```

- [ ] **Step 2: Write the failing test**

`src/entites/order/model/order.schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkoutFormSchema } from "./order.schema";

const valid = {
    recipientName: "Nguyen Van A",
    recipientPhone: "0912345678",
    recipientAddress: "123 Le Loi, District 1, HCMC",
    isAnonymous: false,
    deliveryDate: "2026-09-20",
    deliverySlot: "08:00 - 10:00",
    cardMessage: "",
    paymentMethod: "COD",
    saveRecipient: false,
};

describe("checkoutFormSchema", () => {
    it("accepts a well-formed payload", () => {
        expect(checkoutFormSchema.safeParse(valid).success).toBe(true);
    });
    it("rejects an empty recipient name", () => {
        const r = checkoutFormSchema.safeParse({ ...valid, recipientName: "" });
        expect(r.success).toBe(false);
    });
    it("rejects a non-Vietnamese phone number", () => {
        const r = checkoutFormSchema.safeParse({
            ...valid,
            recipientPhone: "12345",
        });
        expect(r.success).toBe(false);
    });
    it("rejects an unknown delivery slot", () => {
        const r = checkoutFormSchema.safeParse({
            ...valid,
            deliverySlot: "07:00 - 09:00",
        });
        expect(r.success).toBe(false);
    });
    it("rejects an unknown payment method", () => {
        const r = checkoutFormSchema.safeParse({
            ...valid,
            paymentMethod: "BITCOIN",
        });
        expect(r.success).toBe(false);
    });
    it("rejects a card message over 500 chars", () => {
        const r = checkoutFormSchema.safeParse({
            ...valid,
            cardMessage: "x".repeat(501),
        });
        expect(r.success).toBe(false);
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- order.schema`
Expected: FAIL — `order.schema` not found.

- [ ] **Step 4: Create `order.schema.ts`**

```ts
import { z } from "zod";
import { DELIVERY_SLOTS } from "./delivery.const";

export const checkoutFormSchema = z.object({
    recipientName: z.string().trim().min(1, "Recipient name is required."),
    recipientPhone: z
        .string()
        .trim()
        .regex(
            /^(0\d{9}|\+84\d{9})$/,
            "Enter a valid Vietnamese phone number.",
        ),
    recipientAddress: z.string().trim().min(1, "Delivery address is required."),
    isAnonymous: z.boolean(),
    deliveryDate: z.string().min(1, "Choose a delivery date."),
    deliverySlot: z.enum(DELIVERY_SLOTS),
    cardMessage: z.string().trim().max(500, "Card message is too long."),
    paymentMethod: z.enum(["COD", "PAYOS"]),
    saveRecipient: z.boolean(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export function getOrderFieldErrors(
    error: z.ZodError,
): Record<string, string[]> {
    return error.flatten().fieldErrors as Record<string, string[]>;
}
```

- [ ] **Step 5: Create the model barrel `src/entites/order/model/index.ts`**

```ts
export * from "./order-number.util";
export * from "./delivery.const";
export * from "./coupon.util";
export * from "./totals.util";
export * from "./order.model";
export * from "./order.schema";
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- order.schema`
Expected: PASS.

- [ ] **Step 7: Verify types**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
npm run format
git add src/entites/order/model
git commit -m "feat(checkout): order model types + checkout form schema"
```

---

## Task 7: PayOS library

**Files:**
- Create: `src/shared/lib/payos/payos-client.ts`
- Create: `src/shared/lib/payos/create-payment-link.ts`
- Create: `src/shared/lib/payos/verify-payment.ts`
- Test: `src/shared/lib/payos/verify-payment.test.ts`

**Interfaces:**
- Produces:
  - `payos` — configured `@payos/node` client singleton
  - `interface CreatePaymentLinkArgs { orderCode: number; amount: number; description: string; returnUrl: string; cancelUrl: string }`
  - `interface PaymentLink { checkoutUrl: string; paymentLinkId: string }`
  - `createPaymentLink(args: CreatePaymentLinkArgs): Promise<PaymentLink>`
  - `type PayosPaymentStatus = "PAID" | "PENDING" | "CANCELLED" | "EXPIRED" | "UNKNOWN"`
  - `normalizePayosStatus(raw: string | null | undefined): PayosPaymentStatus`
  - `getPaymentStatus(orderCode: number): Promise<PayosPaymentStatus>`

- [ ] **Step 1: Create `payos-client.ts`**

```ts
import "server-only";
import PayOS from "@payos/node";

function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required env var: ${name}`);
    return value;
}

export const payos = new PayOS(
    required("PAYOS_CLIENT_ID"),
    required("PAYOS_API_KEY"),
    required("PAYOS_CHECKSUM_KEY"),
);
```

- [ ] **Step 2: Create `create-payment-link.ts`**

```ts
import "server-only";
import { payos } from "./payos-client";

export interface CreatePaymentLinkArgs {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
}

export interface PaymentLink {
    checkoutUrl: string;
    paymentLinkId: string;
}

export async function createPaymentLink(
    args: CreatePaymentLinkArgs,
): Promise<PaymentLink> {
    const res = await payos.createPaymentLink({
        orderCode: args.orderCode,
        amount: args.amount,
        description: args.description.slice(0, 25),
        returnUrl: args.returnUrl,
        cancelUrl: args.cancelUrl,
    });
    return {
        checkoutUrl: res.checkoutUrl,
        paymentLinkId: res.paymentLinkId,
    };
}
```

- [ ] **Step 3: Write the failing test**

`src/shared/lib/payos/verify-payment.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizePayosStatus } from "./verify-payment";

describe("normalizePayosStatus", () => {
    it("maps known statuses case-insensitively", () => {
        expect(normalizePayosStatus("PAID")).toBe("PAID");
        expect(normalizePayosStatus("paid")).toBe("PAID");
        expect(normalizePayosStatus("PENDING")).toBe("PENDING");
        expect(normalizePayosStatus("CANCELLED")).toBe("CANCELLED");
        expect(normalizePayosStatus("EXPIRED")).toBe("EXPIRED");
    });
    it("maps anything else to UNKNOWN", () => {
        expect(normalizePayosStatus("PROCESSING")).toBe("UNKNOWN");
        expect(normalizePayosStatus(null)).toBe("UNKNOWN");
        expect(normalizePayosStatus(undefined)).toBe("UNKNOWN");
    });
});
```

Note: this test imports only `normalizePayosStatus`, which does not touch `payos-client` (no env needed). Do **not** import `getPaymentStatus` here.

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- verify-payment`
Expected: FAIL.

- [ ] **Step 5: Create `verify-payment.ts`**

```ts
import "server-only";
import { payos } from "./payos-client";

export type PayosPaymentStatus =
    | "PAID"
    | "PENDING"
    | "CANCELLED"
    | "EXPIRED"
    | "UNKNOWN";

export function normalizePayosStatus(
    raw: string | null | undefined,
): PayosPaymentStatus {
    switch ((raw ?? "").toUpperCase()) {
        case "PAID":
            return "PAID";
        case "PENDING":
            return "PENDING";
        case "CANCELLED":
            return "CANCELLED";
        case "EXPIRED":
            return "EXPIRED";
        default:
            return "UNKNOWN";
    }
}

export async function getPaymentStatus(
    orderCode: number,
): Promise<PayosPaymentStatus> {
    try {
        const info = await payos.getPaymentLinkInformation(orderCode);
        return normalizePayosStatus(info.status);
    } catch {
        return "UNKNOWN";
    }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- verify-payment`
Expected: PASS.

- [ ] **Step 7: Verify types**

Run: `npx tsc --noEmit`
Expected: no new errors. If `@payos/node` types differ (e.g. constructor takes an options object, or `createPaymentLink` returns a different shape), adjust `payos-client.ts` / `create-payment-link.ts` / `verify-payment.ts` **only** — the exported signatures above must stay stable. Consult `node_modules/@payos/node/README.md`.

- [ ] **Step 8: Commit**

```bash
npm run format
git add src/shared/lib/payos
git commit -m "feat(checkout): payos client + payment link + status wrappers"
```

---

## Task 8: `proxy.ts` auth guard for `/checkout` and `/orders`

**Files:**
- Modify: `proxy.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: unauthenticated requests to `/checkout*` and `/orders*` redirect to `/login?redirectTo=<path>`.

- [ ] **Step 1: Add the guard block**

In `proxy.ts`, immediately before the final `return NextResponse.next();`, add:

```ts
    if (
        url.pathname.startsWith("/checkout") ||
        url.pathname.startsWith("/orders")
    ) {
        if (!session) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set(
                "redirectTo",
                url.pathname + url.search,
            );
            return NextResponse.redirect(loginUrl);
        }
    }
```

- [ ] **Step 2: Manual check**

Run: `npm run dev`, sign out, visit `http://localhost:3000/checkout`.
Expected: redirected to `/login?redirectTo=%2Fcheckout`. Sign in → bounced back toward the store.

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
npm run format
git add proxy.ts
git commit -m "feat(checkout): require auth for /checkout and /orders"
```

---

## Task 9: `validate-coupon.action.ts` + `get-address-book.action.ts`

**Files:**
- Create: `src/entites/order/actions/validate-coupon.action.ts`
- Create: `src/entites/order/actions/get-address-book.action.ts`

**Interfaces:**
- Consumes: `validateCoupon`, `computeDiscount` from `@/src/entites/order/model`; `auth` from `@/auth`; `prisma` from `@/prisma/prisma-instance`.
- Produces:
  - `validateCouponAction(code: string, subtotal: number): Promise<{ ok: true; code: string; discountAmount: number } | { ok: false; reason: string }>`
  - `interface AddressBookOption { id: string; label: string; recipientName: string; recipientPhone: string; recipientAddress: string }`
  - `getAddressBookAction(): Promise<AddressBookOption[]>`

- [ ] **Step 1: Create `validate-coupon.action.ts`**

```ts
"use server";

import { prisma } from "@/prisma/prisma-instance";
import {
    computeDiscount,
    validateCoupon,
    type CouponRow,
} from "@/src/entites/order/model";

export async function validateCouponAction(
    code: string,
    subtotal: number,
): Promise<
    | { ok: true; code: string; discountAmount: number }
    | { ok: false; reason: string }
> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false, reason: "Enter a coupon code." };

    const row = await prisma.coupon.findUnique({ where: { code: normalized } });
    const coupon: CouponRow | null = row
        ? {
              code: row.code,
              discountType: row.discountType as "PERCENTAGE" | "FIXED",
              value: row.value,
              maxUses: row.maxUses,
              usedCount: row.usedCount,
              active: row.active,
              expiresAt: row.expiresAt,
          }
        : null;

    const check = validateCoupon(coupon, new Date());
    if (!check.ok) return { ok: false, reason: check.reason };

    const discountAmount = computeDiscount(
        { discountType: check.discountType, value: check.value },
        Math.max(0, Math.round(subtotal)),
    );
    return { ok: true, code: normalized, discountAmount };
}
```

- [ ] **Step 2: Create `get-address-book.action.ts`**

```ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";

export interface AddressBookOption {
    id: string;
    label: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
}

export async function getAddressBookAction(): Promise<AddressBookOption[]> {
    const session = await auth();
    if (!session?.user?.id) return [];

    const rows = await prisma.addressBookEntry.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => ({
        id: r.id,
        label: r.label,
        recipientName: r.recipientName,
        recipientPhone: r.recipientPhone,
        recipientAddress: r.recipientAddress,
    }));
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
npm run format
git add src/entites/order/actions/validate-coupon.action.ts src/entites/order/actions/get-address-book.action.ts
git commit -m "feat(checkout): coupon-validate + address-book server actions"
```

---

## Task 10: `create-order.action.ts` (core)

**Files:**
- Create: `src/entites/order/actions/create-order.action.ts`

**Interfaces:**
- Consumes: `checkoutFormSchema`, `getOrderFieldErrors`, `isValidDeliveryDate`, `validateCoupon`, `computeDiscount`, `computeSubtotal`, `computeOrderTotals`, `formatOrderNumber`, `OrderActionState`, `CartSnapshotItem` from `@/src/entites/order/model`; `createPaymentLink` from `@/src/shared/lib/payos/create-payment-link`; `auth`, `prisma`, `Prisma`.
- Produces: `createOrderAction(prevState: OrderActionState | null, formData: FormData): Promise<OrderActionState>`.
  - Reads form fields plus two hidden fields: `cartSnapshot` (JSON string of `CartSnapshotItem[]`) and `couponCode` (string, may be empty).
  - On success returns `{ ok: true, redirect, external? }`. `external: true` means the client must use `window.location.href`.

- [ ] **Step 1: Create the action**

```ts
"use server";

import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/prisma-instance";
import {
    checkoutFormSchema,
    computeDiscount,
    computeOrderTotals,
    computeSubtotal,
    formatOrderNumber,
    getOrderFieldErrors,
    isValidDeliveryDate,
    validateCoupon,
    type CartSnapshotItem,
    type CouponRow,
    type OrderActionState,
    type PricedLine,
} from "@/src/entites/order/model";
import { createPaymentLink } from "@/src/shared/lib/payos/create-payment-link";

const APP_URL =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
const MIN_PAYOS_AMOUNT = 1000;

export async function createOrderAction(
    _prevState: OrderActionState | null,
    formData: FormData,
): Promise<OrderActionState> {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Please sign in to place your order." };
    }

    // 1. Validate the form fields
    const parsed = checkoutFormSchema.safeParse({
        recipientName: formData.get("recipientName"),
        recipientPhone: formData.get("recipientPhone"),
        recipientAddress: formData.get("recipientAddress"),
        isAnonymous: formData.get("isAnonymous") === "on",
        deliveryDate: formData.get("deliveryDate"),
        deliverySlot: formData.get("deliverySlot"),
        cardMessage: formData.get("cardMessage") ?? "",
        paymentMethod: formData.get("paymentMethod"),
        saveRecipient: formData.get("saveRecipient") === "on",
    });
    if (!parsed.success) {
        return {
            error: "Please correct the highlighted fields.",
            fieldErrors: getOrderFieldErrors(parsed.error),
        };
    }
    const form = parsed.data;

    const deliveryDate = new Date(`${form.deliveryDate}T00:00:00`);
    if (!isValidDeliveryDate(deliveryDate, new Date())) {
        return {
            fieldErrors: {
                deliveryDate: ["Choose a date from tomorrow onward."],
            },
        };
    }

    // 2. Parse the cart snapshot
    let snapshot: CartSnapshotItem[];
    try {
        snapshot = JSON.parse(String(formData.get("cartSnapshot") ?? "[]"));
    } catch {
        snapshot = [];
    }
    if (!Array.isArray(snapshot) || snapshot.length === 0) {
        return { error: "Your cart is empty." };
    }

    const standard = snapshot.filter((i) => !i.isCustomBouquet);
    const custom = snapshot.filter((i) => i.isCustomBouquet);

    // 3. Re-price standard items against the DB
    const productIds = standard.map((i) => i.id);
    const products = productIds.length
        ? await prisma.product.findMany({ where: { id: { in: productIds } } })
        : [];
    const priceById = new Map(products.map((p) => [p.id, p.price]));
    if (standard.some((i) => !priceById.has(i.id))) {
        return {
            error: "Some items are no longer available. Please review your cart.",
        };
    }
    for (const i of custom) {
        if (
            typeof i.price !== "number" ||
            !Number.isFinite(i.price) ||
            i.price <= 0
        ) {
            return {
                error: "One of your custom bouquets is invalid. Please rebuild it.",
            };
        }
    }

    const pricedLines: PricedLine[] = [
        ...standard.map((i) => ({
            unitPrice: priceById.get(i.id) as number,
            quantity: i.quantity,
        })),
        ...custom.map((i) => ({ unitPrice: i.price, quantity: i.quantity })),
    ];
    const addonsTotal = snapshot.reduce(
        (sum, i) =>
            sum +
            (i.addons ?? []).reduce(
                (s, a) => s + a.price * a.quantity,
                0,
            ) *
                i.quantity,
        0,
    );
    const subtotal = computeSubtotal(pricedLines, addonsTotal);

    // 4. Coupon
    const couponCode = String(formData.get("couponCode") ?? "")
        .trim()
        .toUpperCase();
    let discountArgs: {
        discountType: "PERCENTAGE" | "FIXED";
        value: number;
    } | null = null;
    if (couponCode) {
        const row = await prisma.coupon.findUnique({
            where: { code: couponCode },
        });
        const coupon: CouponRow | null = row
            ? {
                  code: row.code,
                  discountType: row.discountType as "PERCENTAGE" | "FIXED",
                  value: row.value,
                  maxUses: row.maxUses,
                  usedCount: row.usedCount,
                  active: row.active,
                  expiresAt: row.expiresAt,
              }
            : null;
        const check = validateCoupon(coupon, new Date());
        if (!check.ok) {
            return { fieldErrors: { couponCode: [check.reason] } };
        }
        discountArgs = {
            discountType: check.discountType,
            value: check.value,
        };
    }

    const discountAmount = discountArgs
        ? computeDiscount(discountArgs, subtotal)
        : 0;
    const totals = computeOrderTotals(subtotal, discountAmount);

    if (
        form.paymentMethod === "PAYOS" &&
        Math.round(totals.totalAmount) < MIN_PAYOS_AMOUNT
    ) {
        return {
            error: "This order total is too low for online payment. Please choose cash on delivery.",
        };
    }

    // 5. Persist
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });
    if (!user) return { error: "Please sign in to place your order." };

    let orderNumber: string;
    let orderSeq: number;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    orderNumber: `TMP-${randomUUID()}`,
                    status: "PENDING",
                    paymentStatus: "UNPAID",
                    paymentMethod: form.paymentMethod,
                    totalAmount: totals.totalAmount,
                    discountAmount: totals.discountAmount,
                    couponCode: couponCode || null,
                    buyerName: user.name || form.recipientName,
                    buyerPhone: form.recipientPhone,
                    buyerEmail: user.email,
                    recipientName: form.recipientName,
                    recipientPhone: form.recipientPhone,
                    recipientAddress: form.recipientAddress,
                    isAnonymous: form.isAnonymous,
                    cardMessage: form.cardMessage || null,
                    deliveryDate,
                    deliverySlot: form.deliverySlot,
                    userId: user.id,
                    items: {
                        create: standard.map((i) => ({
                            productId: i.id,
                            quantity: i.quantity,
                            price: priceById.get(i.id) as number,
                            addons:
                                i.addons && i.addons.length
                                    ? (i.addons as Prisma.InputJsonValue)
                                    : Prisma.DbNull,
                        })),
                    },
                    customBouquets: {
                        create: custom.map((i) => {
                            const cd = (i.customDetails ?? {}) as Record<
                                string,
                                unknown
                            >;
                            const rawStems = Array.isArray(cd["stems"])
                                ? (cd["stems"] as Array<{
                                      stemId?: unknown;
                                      quantity?: unknown;
                                  }>)
                                : [];
                            const stems = rawStems.filter(
                                (s) => typeof s.stemId === "string",
                            );
                            const refs = Array.isArray(cd["referenceImages"])
                                ? (cd["referenceImages"] as string[])
                                : [];
                            return {
                                price: i.price,
                                quantity: i.quantity,
                                wrapPaper:
                                    typeof cd["wrapPaper"] === "string"
                                        ? (cd["wrapPaper"] as string)
                                        : null,
                                ribbon:
                                    typeof cd["ribbon"] === "string"
                                        ? (cd["ribbon"] as string)
                                        : null,
                                name: i.name || null,
                                imageUrl: refs[0] || i.image || null,
                                meta: cd as Prisma.InputJsonValue,
                                stems: stems.length
                                    ? {
                                          create: stems.map((s) => ({
                                              stemId: s.stemId as string,
                                              quantity:
                                                  typeof s.quantity === "number"
                                                      ? s.quantity
                                                      : 1,
                                          })),
                                      }
                                    : undefined,
                            };
                        }),
                    },
                },
            });

            if (discountArgs) {
                const fresh = await tx.coupon.findUnique({
                    where: { code: couponCode },
                });
                if (
                    !fresh ||
                    (fresh.maxUses != null &&
                        fresh.usedCount >= fresh.maxUses)
                ) {
                    throw new Error("COUPON_EXHAUSTED");
                }
                await tx.coupon.update({
                    where: { code: couponCode },
                    data: { usedCount: { increment: 1 } },
                });
            }

            const finalNumber = formatOrderNumber(order.orderSeq);
            await tx.order.update({
                where: { id: order.id },
                data: { orderNumber: finalNumber },
            });

            if (form.saveRecipient) {
                await tx.addressBookEntry.create({
                    data: {
                        userId: user.id,
                        label: form.recipientName,
                        recipientName: form.recipientName,
                        recipientPhone: form.recipientPhone,
                        recipientAddress: form.recipientAddress,
                    },
                });
            }

            return { orderNumber: finalNumber, orderSeq: order.orderSeq };
        });
        orderNumber = result.orderNumber;
        orderSeq = result.orderSeq;
    } catch (e) {
        if (e instanceof Error && e.message === "COUPON_EXHAUSTED") {
            return {
                fieldErrors: {
                    couponCode: ["That coupon is no longer available."],
                },
            };
        }
        console.error("createOrderAction failed:", e);
        return { error: "We couldn't place your order. Please try again." };
    }

    // 6. Payment branch
    if (form.paymentMethod === "COD") {
        return { ok: true, redirect: `/orders/${orderNumber}?placed=1` };
    }

    try {
        const link = await createPaymentLink({
            orderCode: orderSeq,
            amount: Math.round(totals.totalAmount),
            description: orderNumber,
            returnUrl: `${APP_URL}/checkout/return`,
            cancelUrl: `${APP_URL}/checkout?payment=cancelled`,
        });
        await prisma.order.update({
            where: { orderSeq },
            data: { paymentSessionId: link.paymentLinkId },
        });
        return { ok: true, redirect: link.checkoutUrl, external: true };
    } catch (e) {
        console.error("PayOS link creation failed:", e);
        return {
            ok: true,
            redirect: `/orders/${orderNumber}?placed=1&payment=failed`,
        };
    }
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no new errors. If `Prisma.DbNull` / `Prisma.InputJsonValue` names differ in the generated client, check `prisma/generated/client` exports and adjust the JSON-null sentinel (some versions use `Prisma.JsonNull`).

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
npm run format
git add src/entites/order/actions/create-order.action.ts
git commit -m "feat(checkout): createOrderAction — re-price, persist, PayOS link"
```

---

## Task 11: read actions + `start-payment.action.ts` + entity barrels

**Files:**
- Create: `src/entites/order/actions/get-my-orders.action.ts`
- Create: `src/entites/order/actions/get-order-by-number.action.ts`
- Create: `src/entites/order/actions/start-payment.action.ts`
- Create: `src/entites/order/actions/index.ts`
- Create: `src/entites/order/index.ts`

**Interfaces:**
- Consumes: `parseOrderNumber` from `@/src/entites/order/model`; `createPaymentLink`; `auth`; `prisma`.
- Produces:
  - `interface OrderListItemVM { orderNumber: string; createdAt: string; status: string; paymentStatus: string; paymentMethod: string; totalAmount: number; itemCount: number }`
  - `getMyOrdersAction(): Promise<OrderListItemVM[]>`
  - `getOrderByNumberAction(orderNumber: string): Promise<OrderWithRelations | null>` where `OrderWithRelations` is the Prisma order including `items.product` and `customBouquets.stems.stem`; returns `null` if not found or not owned by the caller.
  - `startPaymentAction(orderNumber: string): Promise<{ ok: true; redirect: string } | { ok: false; error: string }>`
  - Barrels: `actions/index.ts` re-exports the five action files; `order/index.ts` re-exports `./model` and `./actions`.

- [ ] **Step 1: Create `get-my-orders.action.ts`**

```ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";

export interface OrderListItemVM {
    orderNumber: string;
    createdAt: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    totalAmount: number;
    itemCount: number;
}

export async function getMyOrdersAction(): Promise<OrderListItemVM[]> {
    const session = await auth();
    if (!session?.user?.id) return [];

    const rows = await prisma.order.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { items: true, customBouquets: true },
    });

    return rows.map((o) => ({
        orderNumber: o.orderNumber,
        createdAt: o.createdAt.toISOString(),
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        totalAmount: o.totalAmount,
        itemCount:
            o.items.reduce((n, i) => n + i.quantity, 0) +
            o.customBouquets.reduce((n, c) => n + c.quantity, 0),
    }));
}
```

- [ ] **Step 2: Create `get-order-by-number.action.ts`**

```ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";
import { parseOrderNumber } from "@/src/entites/order/model";

export async function getOrderByNumberAction(orderNumber: string) {
    const session = await auth();
    if (!session?.user?.id) return null;

    const seq = parseOrderNumber(orderNumber);
    if (seq == null) return null;

    const order = await prisma.order.findUnique({
        where: { orderSeq: seq },
        include: {
            items: { include: { product: true } },
            customBouquets: {
                include: { stems: { include: { stem: true } } },
            },
        },
    });
    if (!order || order.userId !== session.user.id) return null;
    return order;
}

export type OrderWithRelations = NonNullable<
    Awaited<ReturnType<typeof getOrderByNumberAction>>
>;
```

- [ ] **Step 3: Create `start-payment.action.ts`**

```ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";
import { parseOrderNumber } from "@/src/entites/order/model";
import { createPaymentLink } from "@/src/shared/lib/payos/create-payment-link";

const APP_URL =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export async function startPaymentAction(
    orderNumber: string,
): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Please sign in." };

    const seq = parseOrderNumber(orderNumber);
    if (seq == null) return { ok: false, error: "Order not found." };

    const order = await prisma.order.findUnique({ where: { orderSeq: seq } });
    if (!order || order.userId !== session.user.id) {
        return { ok: false, error: "Order not found." };
    }
    if (order.paymentMethod !== "PAYOS" || order.paymentStatus !== "UNPAID") {
        return { ok: false, error: "This order can't be paid online." };
    }

    try {
        const link = await createPaymentLink({
            orderCode: order.orderSeq,
            amount: Math.round(order.totalAmount),
            description: order.orderNumber,
            returnUrl: `${APP_URL}/checkout/return`,
            cancelUrl: `${APP_URL}/orders/${order.orderNumber}?payment=cancelled`,
        });
        await prisma.order.update({
            where: { id: order.id },
            data: { paymentSessionId: link.paymentLinkId },
        });
        return { ok: true, redirect: link.checkoutUrl };
    } catch (e) {
        console.error("startPaymentAction failed:", e);
        return { ok: false, error: "Couldn't start payment. Please try again." };
    }
}
```

- [ ] **Step 4: Create `src/entites/order/actions/index.ts`**

```ts
export * from "./create-order.action";
export * from "./validate-coupon.action";
export * from "./get-address-book.action";
export * from "./get-my-orders.action";
export * from "./get-order-by-number.action";
export * from "./start-payment.action";
```

- [ ] **Step 5: Create `src/entites/order/index.ts`**

```ts
export * from "./model";
export * from "./actions";
```

- [ ] **Step 6: Verify types**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
npm run format
git add src/entites/order/actions src/entites/order/index.ts
git commit -m "feat(checkout): order read actions + start-payment + barrels"
```

---

## Task 12: checkout feature UI

**Files:**
- Create: `src/features/checkout/ui/address-book-select.tsx`
- Create: `src/features/checkout/ui/order-summary.tsx`
- Create: `src/features/checkout/ui/start-payment-button.tsx`
- Create: `src/features/checkout/ui/checkout-form.tsx`
- Modify: `src/features/checkout/index.ts`

**Interfaces:**
- Consumes: `useCartStore` from `@/_app/store/useCartStore`; `createOrderAction`, `validateCouponAction`, `getAddressBookAction`, `startPaymentAction`, `AddressBookOption`, `OrderActionState` from `@/src/entites/order`; `DELIVERY_SLOTS` from `@/src/entites/order/model`; `Button`, `Input`, `Label` from `@/shared/ui`.
- Produces: `<CheckoutForm />`, `<OrderSummary couponCode onCouponChange pending />`, `<AddressBookSelect onSelect />`, `<StartPaymentButton orderNumber />`; all re-exported from `src/features/checkout/index.ts`.

- [ ] **Step 1: Create `address-book-select.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import {
    getAddressBookAction,
    type AddressBookOption,
} from "@/src/entites/order";

export function AddressBookSelect({
    onSelect,
}: {
    onSelect: (option: AddressBookOption) => void;
}) {
    const [options, setOptions] = useState<AddressBookOption[]>([]);

    useEffect(() => {
        getAddressBookAction()
            .then(setOptions)
            .catch(() => setOptions([]));
    }, []);

    if (options.length === 0) return null;

    return (
        <div className="space-y-1">
            <label className="text-sm text-gray-600">
                Use a saved recipient
            </label>
            <select
                defaultValue=""
                onChange={(e) => {
                    const option = options.find(
                        (o) => o.id === e.target.value,
                    );
                    if (option) onSelect(option);
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
            >
                <option value="">— New recipient —</option>
                {options.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.label} · {o.recipientName}
                    </option>
                ))}
            </select>
        </div>
    );
}
```

- [ ] **Step 2: Create `order-summary.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button, Input } from "@/shared/ui";
import { useCartStore } from "@/_app/store/useCartStore";
import { validateCouponAction } from "@/src/entites/order";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function OrderSummary({
    couponCode,
    onCouponChange,
    pending,
}: {
    couponCode: string;
    onCouponChange: (code: string) => void;
    pending: boolean;
}) {
    const items = useCartStore((s) => s.items);
    const subtotal = items.reduce((sum, i) => {
        const addons = (i.addons ?? []).reduce(
            (a, x) => a + x.price * x.quantity,
            0,
        );
        return sum + (i.price + addons) * i.quantity;
    }, 0);

    const [draft, setDraft] = useState(couponCode);
    const [checking, setChecking] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [couponError, setCouponError] = useState<string | null>(null);

    async function apply() {
        setChecking(true);
        setCouponError(null);
        const res = await validateCouponAction(draft, subtotal);
        setChecking(false);
        if (!res.ok) {
            setDiscount(0);
            onCouponChange("");
            setCouponError(res.reason);
            return;
        }
        setDiscount(res.discountAmount);
        onCouponChange(res.code);
    }

    const total = Math.max(0, subtotal - discount);

    return (
        <aside className="h-fit rounded-2xl border border-pink-100 bg-white p-5">
            <h2 className="font-semibold text-gray-800">Order summary</h2>

            <ul className="mt-4 space-y-2 text-sm">
                {items.map((i) => (
                    <li
                        key={i.id}
                        className="flex justify-between gap-2 text-gray-600"
                    >
                        <span className="line-clamp-1">
                            {i.quantity}× {i.name}
                        </span>
                        <span>{vnd(i.price * i.quantity)}</span>
                    </li>
                ))}
            </ul>

            <div className="mt-4 flex gap-2">
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Coupon code"
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={apply}
                    disabled={checking || !draft.trim()}
                >
                    Apply
                </Button>
            </div>
            {couponError && (
                <p className="mt-1 text-xs text-red-500">{couponError}</p>
            )}

            <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between text-gray-500">
                    <dt>Subtotal</dt>
                    <dd>{vnd(subtotal)}</dd>
                </div>
                {discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                        <dt>Discount</dt>
                        <dd>-{vnd(discount)}</dd>
                    </div>
                )}
                <div className="flex justify-between text-base font-semibold text-gray-900">
                    <dt>Total</dt>
                    <dd>{vnd(total)}</dd>
                </div>
            </dl>

            <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="mt-5 w-full bg-pink-500 hover:bg-pink-600"
            >
                {pending ? "Placing order…" : "Place order"}
            </Button>
        </aside>
    );
}
```

- [ ] **Step 3: Create `start-payment-button.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/shared/ui";
import { startPaymentAction } from "@/src/entites/order";

export function StartPaymentButton({ orderNumber }: { orderNumber: string }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function pay() {
        setBusy(true);
        setError(null);
        const res = await startPaymentAction(orderNumber);
        if (res.ok) {
            window.location.href = res.redirect;
            return;
        }
        setBusy(false);
        setError(res.error);
    }

    return (
        <div>
            <Button
                type="button"
                disabled={busy}
                onClick={pay}
                className="bg-pink-500 hover:bg-pink-600"
            >
                {busy ? "Starting…" : "Complete payment"}
            </Button>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
```

- [ ] **Step 4: Create `checkout-form.tsx`**

```tsx
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/shared/ui";
import { useCartStore } from "@/_app/store/useCartStore";
import {
    createOrderAction,
    DELIVERY_SLOTS,
    type OrderActionState,
} from "@/src/entites/order";
import { AddressBookSelect } from "./address-book-select";
import { OrderSummary } from "./order-summary";

function minDeliveryDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

function FormField({
    label,
    error,
    children,
}: {
    label: string;
    error?: string[];
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <Label>{label}</Label>
            {children}
            {error?.length ? (
                <p className="text-xs text-red-500">{error[0]}</p>
            ) : null}
        </div>
    );
}

export function CheckoutForm() {
    const router = useRouter();
    const items = useCartStore((s) => s.items);
    const [state, formAction, pending] = useActionState<
        OrderActionState | null,
        FormData
    >(createOrderAction, null);

    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");
    const [recipientAddress, setRecipientAddress] = useState("");
    const [couponCode, setCouponCode] = useState("");

    const soleMessage =
        items.length === 1
            ? ((items[0].customDetails?.cardMessage as string | undefined) ??
              "")
            : "";

    const redirectedRef = useRef(false);
    useEffect(() => {
        if (!state?.ok || !state.redirect || redirectedRef.current) return;
        redirectedRef.current = true;
        if (state.external) {
            window.location.href = state.redirect;
        } else {
            router.push(state.redirect);
        }
    }, [state, router]);

    const errors = state?.fieldErrors ?? {};

    return (
        <form
            action={formAction}
            className="grid gap-8 lg:grid-cols-[1fr_320px]"
        >
            <input
                type="hidden"
                name="cartSnapshot"
                value={JSON.stringify(
                    items.map((i) => ({
                        id: i.id,
                        quantity: i.quantity,
                        isCustomBouquet: Boolean(i.isCustomBouquet),
                        price: i.price,
                        name: i.name,
                        image: i.image,
                        customDetails: i.customDetails ?? null,
                        addons: i.addons ?? null,
                    })),
                )}
            />
            <input type="hidden" name="couponCode" value={couponCode} />

            <div className="space-y-8">
                {state?.error && (
                    <p
                        role="alert"
                        className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                    >
                        {state.error}
                    </p>
                )}

                <section className="space-y-4">
                    <h2 className="font-playfair text-lg font-bold text-gray-900">
                        Recipient
                    </h2>
                    <AddressBookSelect
                        onSelect={(o) => {
                            setRecipientName(o.recipientName);
                            setRecipientPhone(o.recipientPhone);
                            setRecipientAddress(o.recipientAddress);
                        }}
                    />
                    <FormField
                        label="Full name"
                        error={errors["recipientName"]}
                    >
                        <Input
                            name="recipientName"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                        />
                    </FormField>
                    <FormField label="Phone" error={errors["recipientPhone"]}>
                        <Input
                            name="recipientPhone"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                        />
                    </FormField>
                    <FormField
                        label="Delivery address"
                        error={errors["recipientAddress"]}
                    >
                        <textarea
                            name="recipientAddress"
                            rows={3}
                            value={recipientAddress}
                            onChange={(e) =>
                                setRecipientAddress(e.target.value)
                            }
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </FormField>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" name="isAnonymous" />
                        Send anonymously (hide my name from the recipient)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" name="saveRecipient" />
                        Save this recipient to my address book
                    </label>
                </section>

                <section className="space-y-4">
                    <h2 className="font-playfair text-lg font-bold text-gray-900">
                        Delivery
                    </h2>
                    <FormField
                        label="Delivery date"
                        error={errors["deliveryDate"]}
                    >
                        <Input
                            type="date"
                            name="deliveryDate"
                            min={minDeliveryDate()}
                            defaultValue={minDeliveryDate()}
                        />
                    </FormField>
                    <FormField
                        label="Time slot"
                        error={errors["deliverySlot"]}
                    >
                        <select
                            name="deliverySlot"
                            defaultValue={DELIVERY_SLOTS[0]}
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        >
                            {DELIVERY_SLOTS.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </FormField>
                </section>

                <section className="space-y-4">
                    <h2 className="font-playfair text-lg font-bold text-gray-900">
                        Card message
                    </h2>
                    <FormField
                        label="Message (optional)"
                        error={errors["cardMessage"]}
                    >
                        <textarea
                            name="cardMessage"
                            rows={3}
                            defaultValue={soleMessage}
                            maxLength={500}
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </FormField>
                </section>

                <section className="space-y-3">
                    <h2 className="font-playfair text-lg font-bold text-gray-900">
                        Payment
                    </h2>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name="paymentMethod"
                            value="COD"
                            defaultChecked
                        />
                        Cash on delivery
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name="paymentMethod"
                            value="PAYOS"
                        />
                        Pay online (PayOS)
                    </label>
                </section>
            </div>

            <OrderSummary
                couponCode={couponCode}
                onCouponChange={setCouponCode}
                pending={pending}
            />
        </form>
    );
}
```

- [ ] **Step 5: Replace `src/features/checkout/index.ts`**

```ts
export * from "./ui/checkout-form";
export * from "./ui/order-summary";
export * from "./ui/address-book-select";
export * from "./ui/start-payment-button";
```

- [ ] **Step 6: Verify types & lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: errors only from `cart.page.tsx` (it still imports the now-removed `CheckoutButton` / `PaymentSuccessDialog` — fixed in Task 16). No other new errors.

- [ ] **Step 7: Commit**

```bash
npm run format
git add src/features/checkout
git commit -m "feat(checkout): checkout form, order summary, address-book select, pay button"
```

---

## Task 13: checkout page + route entry

**Files:**
- Create: `src/_pages/checkout/ui/checkout.page.tsx`
- Create: `src/_pages/checkout/index.ts`
- Create: `app/(store-front)/checkout/page.tsx`

**Interfaces:**
- Consumes: `useHydrated` from `@/shared/hooks`; `useCartStore`; `CheckoutForm` from `@/src/features/checkout`.
- Produces: `<CheckoutPage />` exported from `@/_pages/checkout`; `/checkout` route.

- [ ] **Step 1: Create `checkout.page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useHydrated } from "@/shared/hooks";
import { useCartStore } from "@/_app/store/useCartStore";
import { CheckoutForm } from "@/src/features/checkout";

export function CheckoutPage() {
    const hydrated = useHydrated();
    const items = useCartStore((s) => s.items);

    if (!hydrated) {
        return (
            <div className="py-10">
                <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
                <p className="text-lg font-medium text-gray-700">
                    Your cart is empty
                </p>
                <Link
                    href="/catalog"
                    className="mt-2 rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-600"
                >
                    Browse the catalog
                </Link>
            </div>
        );
    }

    return (
        <div className="py-8">
            <h1 className="font-playfair text-2xl font-bold text-gray-900">
                Checkout
            </h1>
            <div className="mt-6">
                <CheckoutForm />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create `src/_pages/checkout/index.ts`**

```ts
export * from "./ui/checkout.page";
```

- [ ] **Step 3: Create `app/(store-front)/checkout/page.tsx`**

```tsx
import type { Metadata } from "next";

export { CheckoutPage as default } from "@/_pages/checkout";

export const metadata: Metadata = {
    title: "Checkout | Bloom",
};
```

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: no new errors (besides the known `cart.page.tsx` one until Task 16).

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/_pages/checkout "app/(store-front)/checkout/page.tsx"
git commit -m "feat(checkout): /checkout page + route entry"
```

---

## Task 14: PayOS return page + webhook route

**Files:**
- Create: `app/(store-front)/checkout/return/page.tsx`
- Create: `app/api/payment/payos/webhook/route.ts`

**Interfaces:**
- Consumes: `auth`; `prisma`; `getPaymentStatus`, `normalizePayosStatus` from `@/src/shared/lib/payos/verify-payment`; `payos` from `@/src/shared/lib/payos/payos-client`.
- Produces: `/checkout/return` (verifies + redirects to `/orders/<n>`); `POST /api/payment/payos/webhook` (idempotent paid update).

- [ ] **Step 1: Create `app/(store-front)/checkout/return/page.tsx`**

```tsx
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";
import { getPaymentStatus } from "@/src/shared/lib/payos/verify-payment";

export const dynamic = "force-dynamic";

export default async function CheckoutReturnPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const session = await auth();
    if (!session?.user?.id) redirect("/login?redirectTo=/orders");

    const raw = Array.isArray(sp["orderCode"])
        ? sp["orderCode"][0]
        : sp["orderCode"];
    const orderSeq = Number(raw);
    if (!Number.isInteger(orderSeq) || orderSeq <= 0) notFound();

    const order = await prisma.order.findUnique({ where: { orderSeq } });
    if (!order || order.userId !== session.user.id) notFound();

    const status = await getPaymentStatus(orderSeq);
    if (status === "PAID" && order.paymentStatus !== "PAID") {
        await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: "PAID", status: "CONFIRMED" },
        });
    }

    const suffix =
        status === "PAID" ? "?placed=1" : "?placed=1&payment=pending";
    redirect(`/orders/${order.orderNumber}${suffix}`);
}
```

- [ ] **Step 2: Create `app/api/payment/payos/webhook/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma-instance";
import { payos } from "@/src/shared/lib/payos/payos-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
    let orderSeq: number | null = null;
    let paid = false;
    try {
        const body = await request.json();
        const data = payos.verifyPaymentWebhookData(body);
        orderSeq = Number(data.orderCode);
        paid = data.code === "00";
    } catch {
        return NextResponse.json({ received: true });
    }

    if (paid && orderSeq != null && Number.isInteger(orderSeq)) {
        await prisma.order.updateMany({
            where: { orderSeq, paymentStatus: "UNPAID" },
            data: { paymentStatus: "PAID", status: "CONFIRMED" },
        });
    }

    return NextResponse.json({ received: true });
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no new errors. If `verifyPaymentWebhookData`'s return type lacks `code` / `orderCode`, cast the parsed value to `{ code?: string; orderCode?: number | string }` and adjust — keep the "paid → idempotent updateMany" logic.

- [ ] **Step 4: Commit**

```bash
npm run format
git add "app/(store-front)/checkout/return/page.tsx" app/api/payment/payos/webhook/route.ts
git commit -m "feat(checkout): PayOS return verification page + webhook route"
```

---

## Task 15: orders list + detail pages

**Files:**
- Create: `src/_pages/orders/ui/order-list.page.tsx`
- Create: `src/_pages/orders/ui/order-detail.page.tsx`
- Create: `src/_pages/orders/ui/clear-cart-on-mount.tsx`
- Create: `src/_pages/orders/index.ts`
- Create: `app/(store-front)/orders/page.tsx`
- Create: `app/(store-front)/orders/[slug]/page.tsx`

**Interfaces:**
- Consumes: `auth`; `getMyOrdersAction`, `getOrderByNumberAction` from `@/src/entites/order`; `StartPaymentButton` from `@/src/features/checkout`; `useCartStore`.
- Produces: `<OrderListPage />`, `<OrderDetailPage orderNumber placed paymentFlag />`, `<ClearCartOnMount />` from `@/_pages/orders`; `/orders` and `/orders/[slug]` routes.

- [ ] **Step 1: Create `clear-cart-on-mount.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useCartStore } from "@/_app/store/useCartStore";

export function ClearCartOnMount() {
    const clearCart = useCartStore((s) => s.clearCart);
    useEffect(() => {
        clearCart();
    }, [clearCart]);
    return null;
}
```

- [ ] **Step 2: Create `order-list.page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyOrdersAction } from "@/src/entites/order";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export async function OrderListPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login?redirectTo=/orders");

    const orders = await getMyOrdersAction();

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
                <p className="text-lg font-medium text-gray-700">
                    No orders yet
                </p>
                <Link
                    href="/catalog"
                    className="mt-2 rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-600"
                >
                    Browse the catalog
                </Link>
            </div>
        );
    }

    return (
        <div className="py-8">
            <h1 className="font-playfair text-2xl font-bold text-gray-900">
                Your Orders
            </h1>
            <ul className="mt-6 space-y-3">
                {orders.map((o) => (
                    <li key={o.orderNumber}>
                        <Link
                            href={`/orders/${o.orderNumber}`}
                            className="flex items-center justify-between rounded-xl border border-pink-100 bg-white p-4 hover:border-pink-300"
                        >
                            <div>
                                <p className="font-semibold text-gray-900">
                                    {o.orderNumber}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {new Date(
                                        o.createdAt,
                                    ).toLocaleDateString("vi-VN")}{" "}
                                    · {o.itemCount} item(s)
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                    {vnd(o.totalAmount)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {o.status} · {o.paymentStatus}
                                </p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

- [ ] **Step 3: Create `order-detail.page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getOrderByNumberAction } from "@/src/entites/order";
import { StartPaymentButton } from "@/src/features/checkout";
import { ClearCartOnMount } from "./clear-cart-on-mount";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export async function OrderDetailPage({
    orderNumber,
    placed,
    paymentFlag,
}: {
    orderNumber: string;
    placed: boolean;
    paymentFlag?: string;
}) {
    const order = await getOrderByNumberAction(orderNumber);
    if (!order) notFound();

    return (
        <div className="py-8">
            {placed && <ClearCartOnMount />}
            {placed && (
                <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                    Order placed. We&apos;ll confirm it shortly.
                </p>
            )}
            {(paymentFlag === "pending" ||
                paymentFlag === "failed" ||
                paymentFlag === "cancelled") && (
                <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    Payment isn&apos;t complete yet. You can pay now below.
                </p>
            )}

            <h1 className="mt-4 font-playfair text-2xl font-bold text-gray-900">
                {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500">
                {order.status} · {order.paymentMethod} · {order.paymentStatus}
            </p>

            {order.paymentMethod === "PAYOS" &&
                order.paymentStatus === "UNPAID" && (
                    <div className="mt-4">
                        <StartPaymentButton
                            orderNumber={order.orderNumber}
                        />
                    </div>
                )}

            <section className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                    <h2 className="font-semibold text-gray-800">Recipient</h2>
                    {order.isAnonymous && (
                        <p className="text-sm text-gray-500">
                            (sent anonymously)
                        </p>
                    )}
                    <p className="text-sm text-gray-600">
                        {order.recipientName}
                    </p>
                    <p className="text-sm text-gray-600">
                        {order.recipientPhone}
                    </p>
                    <p className="text-sm text-gray-600">
                        {order.recipientAddress}
                    </p>
                </div>
                <div>
                    <h2 className="font-semibold text-gray-800">Delivery</h2>
                    <p className="text-sm text-gray-600">
                        {new Date(order.deliveryDate).toLocaleDateString(
                            "vi-VN",
                        )}{" "}
                        · {order.deliverySlot}
                    </p>
                    {order.cardMessage && (
                        <p className="mt-2 text-sm text-gray-600">
                            Card: &ldquo;{order.cardMessage}&rdquo;
                        </p>
                    )}
                </div>
            </section>

            <section className="mt-6">
                <h2 className="font-semibold text-gray-800">Items</h2>
                <ul className="mt-2 divide-y text-sm">
                    {order.items.map((i) => (
                        <li
                            key={i.id}
                            className="flex justify-between py-2 text-gray-600"
                        >
                            <span>
                                {i.quantity}× {i.product.name}
                            </span>
                            <span>{vnd(i.price * i.quantity)}</span>
                        </li>
                    ))}
                    {order.customBouquets.map((c) => (
                        <li
                            key={c.id}
                            className="flex justify-between py-2 text-gray-600"
                        >
                            <span>
                                {c.quantity}× {c.name ?? "Custom bouquet"}
                            </span>
                            <span>{vnd(c.price * c.quantity)}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <dl className="mt-4 space-y-1 border-t pt-4 text-sm">
                {order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                        <dt>
                            Discount
                            {order.couponCode
                                ? ` (${order.couponCode})`
                                : ""}
                        </dt>
                        <dd>-{vnd(order.discountAmount)}</dd>
                    </div>
                )}
                <div className="flex justify-between text-base font-semibold text-gray-900">
                    <dt>Total</dt>
                    <dd>{vnd(order.totalAmount)}</dd>
                </div>
            </dl>
        </div>
    );
}
```

- [ ] **Step 4: Create `src/_pages/orders/index.ts`**

```ts
export * from "./ui/order-list.page";
export * from "./ui/order-detail.page";
```

- [ ] **Step 5: Create `app/(store-front)/orders/page.tsx`**

```tsx
import type { Metadata } from "next";

export { OrderListPage as default } from "@/_pages/orders";

export const metadata: Metadata = {
    title: "Your Orders | Bloom",
};
```

- [ ] **Step 6: Create `app/(store-front)/orders/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { OrderDetailPage } from "@/_pages/orders";

export const metadata: Metadata = {
    title: "Order | Bloom",
};

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { slug } = await params;
    const sp = await searchParams;
    const placed = sp["placed"] === "1";
    const paymentFlag =
        typeof sp["payment"] === "string" ? sp["payment"] : undefined;
    return (
        <OrderDetailPage
            orderNumber={slug}
            placed={placed}
            paymentFlag={paymentFlag}
        />
    );
}
```

- [ ] **Step 7: Verify types & lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors (besides the known `cart.page.tsx` one until Task 16).

- [ ] **Step 8: Commit**

```bash
npm run format
git add src/_pages/orders "app/(store-front)/orders"
git commit -m "feat(checkout): /orders list + detail pages"
```

---

## Task 16: cart page cleanup + delete placeholders

**Files:**
- Modify: `src/_pages/cart/ui/cart.page.tsx`
- Delete: `src/features/checkout/ui/checkout-button.tsx`
- Delete: `src/features/checkout/ui/payment-success-dialog.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: cart page links to `/checkout` instead of faking payment.

- [ ] **Step 1: Delete the placeholder files**

```bash
git rm src/features/checkout/ui/checkout-button.tsx src/features/checkout/ui/payment-success-dialog.tsx
```

- [ ] **Step 2: Rewrite `src/_pages/cart/ui/cart.page.tsx`**

Replace the whole file with:

```tsx
"use client";

import Link from "next/link";
import { useHydrated } from "@/shared/hooks";
import { useCartStore } from "@/_app/store/useCartStore";
import { CartLineItem } from "./cart-line-item";

export function CartPage() {
    const hydrated = useHydrated();
    const items = useCartStore((s) => s.items);
    const subtotal = useCartStore((s) =>
        s.items.reduce((sum, item) => {
            const addons = (item.addons ?? []).reduce(
                (a, x) => a + x.price * x.quantity,
                0,
            );
            return sum + (item.price + addons) * item.quantity;
        }, 0),
    );

    if (!hydrated) {
        return (
            <div className="py-10">
                <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
                <p className="text-lg font-medium text-gray-700">
                    Your cart is empty
                </p>
                <p className="text-sm text-gray-500">
                    Find something beautiful to send.
                </p>
                <Link
                    href="/catalog"
                    className="mt-2 rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-600"
                >
                    Browse the catalog
                </Link>
            </div>
        );
    }

    const totalItems = items.reduce((n, i) => n + i.quantity, 0);

    return (
        <div className="py-8">
            <h1 className="font-playfair text-2xl font-bold text-gray-900">
                Your Cart
            </h1>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="divide-y">
                    {items.map((item) => (
                        <CartLineItem key={item.id} item={item} />
                    ))}
                </div>

                <aside className="h-fit rounded-2xl border border-pink-100 bg-white p-5">
                    <h2 className="font-semibold text-gray-800">
                        Order summary
                    </h2>
                    <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between text-gray-500">
                            <dt>Items</dt>
                            <dd>{totalItems}</dd>
                        </div>
                        <div className="flex justify-between text-base font-semibold text-gray-900">
                            <dt>Subtotal</dt>
                            <dd>{subtotal.toLocaleString("vi-VN")}₫</dd>
                        </div>
                    </dl>
                    <p className="mt-2 text-xs text-gray-400">
                        Shipping &amp; taxes calculated at checkout.
                    </p>
                    <Link
                        href="/checkout"
                        className="mt-5 flex w-full items-center justify-center rounded-md bg-pink-500 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-600"
                    >
                        Proceed to checkout
                    </Link>
                </aside>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify types, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass with no new errors. (`npm run build` uses Turbopack; it should compile all the new routes.)

- [ ] **Step 4: Commit**

```bash
npm run format
git add src/_pages/cart/ui/cart.page.tsx src/features/checkout
git commit -m "feat(checkout): cart page links to real /checkout; remove fake checkout"
```

---

## Task 17: full verification + manual QA

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all unit tests pass (order-number, delivery.const, coupon.util, totals.util, order.schema, verify-payment).

- [ ] **Step 2: Lint + types + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: no new errors; build succeeds.

- [ ] **Step 3: Seed a coupon for testing**

Open `npx prisma studio`, add a `Coupon` row: `code = "BLOOM10"`, `discountType = PERCENTAGE`, `value = 10`, `maxUses = null`, `usedCount = 0`, `active = true`, `expiresAt = null`.

- [ ] **Step 4: Manual QA script** (`npm run dev`, signed in as a CUSTOMER)

1. **COD happy path:** add a catalog product → `/cart` → Proceed to checkout → fill recipient, pick a date ≥ tomorrow + a slot, leave payment on COD → Place order. Expect redirect to `/orders/FLW-XXXXXX?placed=1`, a green banner, the cart badge back to 0, and a new `Order` row (`PENDING` / `UNPAID` / `COD`) in Studio.
2. **Coupon:** repeat, enter `BLOOM10` + Apply in the summary → discount row appears; place order → `Order.discountAmount` and `Order.couponCode` set; `Coupon.usedCount` incremented.
3. **PayOS paid:** repeat with "Pay online (PayOS)" → redirected to `checkout.payos.vn` sandbox → complete the sandbox payment → returned via `/checkout/return` → lands on `/orders/...?placed=1`, order is `CONFIRMED` / `PAID`, cart cleared.
4. **PayOS cancelled:** repeat, cancel on the PayOS page → returned to `/checkout?payment=cancelled`, cart intact, order left `PENDING` / `UNPAID`. Go to `/orders/<that order>` → "Complete payment" button → pays successfully.
5. **Empty cart:** visit `/checkout` with an empty cart → "Your cart is empty", no form.
6. **Expired coupon:** set the coupon `expiresAt` to a past date in Studio → Apply → inline "expired" error; placing the order also refuses with a `couponCode` field error.
7. **Price drift:** change a product's `price` in Studio, then check out with that product → the order total and `OrderItem.price` reflect the **new** DB price, not the cart price.
8. **Non-owner 404:** copy another user's order number, sign in as a different user, visit `/orders/<that number>` → 404.
9. **Custom bouquet:** build a v2 build bouquet and a v2 photo bouquet → add both to cart → check out → `CustomBouquet` rows created with `meta` populated, `wrapPaper`/`ribbon` null for the photo one, and **no** `CustomBouquetStem` rows.
10. **Save recipient:** tick "Save this recipient" at checkout → an `AddressBookEntry` is created → on the next checkout the "Use a saved recipient" select shows it and fills the fields.
11. **Auth guard:** sign out → visit `/checkout` and `/orders` → both redirect to `/login?redirectTo=…`.

- [ ] **Step 5: Commit any fixes discovered during QA, then finish**

```bash
git add -A
git commit -m "fix(checkout): address manual QA findings"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task(s) |
|---|---|
| §3 schema migration | Task 1 |
| §4 file layout | Tasks 2–16 (all files) |
| §5 route guard | Task 8 |
| §6 checkout page & form, `DELIVERY_SLOTS` | Tasks 3, 6, 12, 13 |
| §6 address-book prefill + save | Tasks 9, 12 (select + `saveRecipient`), 10 (persist) |
| §6 coupon UI | Tasks 9, 12 (`order-summary`) |
| §7 `createOrderAction` (auth, validate, re-price, coupon, transaction, order number, payment branch) | Task 10 (+ pure helpers Tasks 2–6) |
| §8 `/checkout/return` | Task 14 |
| §8 webhook | Task 14 |
| §8 `start-payment.action` + button | Tasks 11, 12 |
| §9 `/orders` list | Tasks 11, 15 |
| §9 `/orders/[slug]` detail + owner 404 + query flags | Tasks 11, 15 |
| §9 `ClearCartOnMount` | Task 15 |
| §9 cart page change | Task 16 |
| §10 error handling | Task 10 (action branches), Task 15 (detail flags) |
| §11 testing (pure fns + vitest + manual QA) | Tasks 2–7, 17 |
| §12 known limitations | Carried as-is; nothing to implement |

No gaps.

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Every code step has full code. The only conditional instructions are the "if `@payos/node` types differ, adjust the wrappers" notes in Tasks 7/10/14 — these are deliberate, bounded fallbacks with the exact files and stable signatures named.

**3. Type consistency:**
- `OrderActionState` shape (`error` / `fieldErrors` / `ok` / `redirect` / `external`) — defined Task 6, consumed Tasks 10, 12.
- `CartSnapshotItem` — defined Task 6, produced by the form (Task 12), consumed by the action (Task 10).
- `formatOrderNumber` / `parseOrderNumber` — defined Task 2, used Tasks 10, 11, 14.
- `validateCoupon` returns `{ ok: true; discountType; value }` — used consistently in Tasks 9 and 10; `computeDiscount` takes `{ discountType; value }` in both.
- `computeSubtotal(lines, addonsTotal)` + `computeOrderTotals(subtotal, discountAmount)` — defined Task 5, used Task 10.
- `createPaymentLink` args (`orderCode` / `amount` / `description` / `returnUrl` / `cancelUrl`) → `{ checkoutUrl; paymentLinkId }` — defined Task 7, used Tasks 10, 11.
- `getPaymentStatus` / `normalizePayosStatus` names — defined Task 7, used Task 14.
- `AddressBookOption` — defined Task 9, consumed Task 12.
- `OrderListItemVM` (with `paymentMethod`, `itemCount`) — defined Task 11, consumed Task 15.
- `getOrderByNumberAction` returns the included-relations order or `null` — defined Task 11, consumed Tasks 14 (not used — 14 uses `prisma` directly), 15.
- `StartPaymentButton` prop `orderNumber` — defined Task 12, used Task 15.
- Barrel `@/src/entites/order` re-exports both model and actions (Task 11) — every `from "@/src/entites/order"` import in Tasks 12/15 resolves.

Consistent.

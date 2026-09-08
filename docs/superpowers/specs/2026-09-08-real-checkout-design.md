# Real Checkout — Design

**Date:** 2026-09-08
**Status:** Approved, ready for implementation planning
**Approach:** A — one server action persists the order before payment; PayOS link created inline; `/checkout/return` verifies status via the PayOS API; webhook is a best-effort backup.

## 1. Goal & Scope

Replace the faked checkout (`CheckoutButton` clears the cart and shows a countdown
`PaymentSuccessDialog`; nothing is persisted) with a real flow that creates
`Order` / `OrderItem` / `CustomBouquet` rows, supports **COD** and **PayOS
sandbox** online payment, and gives the signed-in user an order history.

### In scope

- Auth-required checkout (no guest checkout; every order has a `userId`).
- Single-page `/checkout` form: recipient, delivery, card message, payment method.
- Server-side re-pricing of the cart against the DB.
- Coupon / discount code applied at checkout.
- COD and PayOS sandbox payment methods.
- PayOS: create payment link, redirect, `/checkout/return` verification page,
  webhook route, "Complete payment" recovery on the order-detail page.
- Order history: `/orders` list + `/orders/[slug]` detail (slug = order number),
  owner-scoped.
- Address book: prefill recipient from a saved `AddressBookEntry`, and an
  opt-in "save this recipient" checkbox at checkout.
- One additive Prisma migration.

### Out of scope (known limitations, documented not fixed)

- No stock decrement or sold-out guard at checkout.
- Add-ons: total-only, no catalog re-pricing (nothing in the app creates them yet).
- `buyerPhone` reuses the recipient phone (no separate field in the form).
- Address-book management page (only prefill + save-on-checkout).
- Coupons apply on subtotal only; not stackable.
- No automated test runner (see §10).

## 2. Current State

- **Cart** — client-only Zustand (`useCartStore`), persisted to `localStorage`
  key `flower-cart-storage`. Holds standard products, v1/v2 custom bouquets, and
  an add-ons array. `useHydrated` gates rendering because SSR sees an empty cart.
- **Checkout today** — `src/features/checkout/ui/checkout-button.tsx` and
  `payment-success-dialog.tsx` are placeholders. `cart.page.tsx` `handleCheckout()`
  calls `clearCart()` + `setPaid(true)`; nothing hits the DB.
- **`Order` model** — already rich: `orderNumber` (unique), `status`
  (`OrderStatus`), `totalAmount`, buyer (`buyerName/buyerPhone/buyerEmail`),
  recipient (`recipientName/recipientPhone/recipientAddress`), `isAnonymous`,
  `cardMessage?`, `deliveryDate`, `deliverySlot`, `paymentMethod` (free string;
  values COD/VNPAY/MOMO/PAYOS), `paymentStatus` (`PaymentStatus`),
  `paymentSessionId?`, nullable `userId`, `items OrderItem[]`,
  `customBouquets CustomBouquet[]`.
- **`OrderItem`** — `quantity`, `price` (price at purchase), `productId` (required
  FK). No add-on field.
- **`CustomBouquet`** — `price`, `quantity`, `wrapPaper String` (required),
  `ribbon String` (required), `orderId`, `stems CustomBouquetStem[]`
  (`stemId` is a real FK). No field for occasion/tier/colors/style/flowers/
  reference-images/florist-note/name/image.
- **`Coupon`** — `code` (@id), `discountType` (`PERCENTAGE|FIXED`), `value`,
  `maxUses?`, `usedCount`, `active`, `expiresAt?`.
- **`AddressBookEntry`** — `userId`, `label`, `recipientName`, `recipientPhone`,
  `recipientAddress`. No UI today.
- **Server-action convention** — `"use server"`, Zod schema in `model/`,
  `(prevState, formData) => ActionState` used with `useActionState`; field errors
  via a `getAuthFieldErrors`-style helper. See
  `src/entites/user/actions/user.action.ts`.
- **`proxy.ts`** — guards `/admin`; bounces signed-in users off `/login`,
  `/register`. `nodejs` runtime.
- **Cart custom-bouquet shapes** (from `review-step.tsx` / `photo-review-step.tsx`):
  - **v2 build** — `customDetails.mode = "build"`, `occasion`, `tierLabel`,
    `colors[]`, `style`, `flowers[] {name,color}`, `arrangementNote`,
    `wrapPaper` (name string), `ribbon` (name string), `cardMessage`. **No stem IDs.**
  - **v2 photo** — `mode = "photo"`, `occasion`, `tierLabel`,
    `referenceImages[]` (Cloudinary URLs), `floristNote`, `cardMessage`.
    **No wrap/ribbon, no stems.**
  - **v1** — `customDetails.stems[] {stemId,name,pricePerStem,quantity,color}`,
    `wrapPaper`, `ribbon`; no `mode`.
- **Add-ons** — `useCartStore` models `item.addons[] {id,name,price,quantity}`,
  rendered by `cart-line-item.tsx`, but no catalog and no UI creates them.

## 3. Schema Migration (one `npx prisma migrate dev`)

All changes are additive or relax a constraint; low risk.

| Model | Change | Reason |
|---|---|---|
| `Order` | `orderSeq Int @unique @default(autoincrement())` | Source of the human order number (`FLW-000123`) and the PayOS `orderCode` (must be a positive int ≤ 2^53) |
| `Order` | `couponCode String?` | Record the applied coupon code |
| `Order` | `discountAmount Float @default(0)` | Record the discount applied |
| `CustomBouquet` | `wrapPaper String?` (was `String`) | Photo-mode bouquets have no wrap paper |
| `CustomBouquet` | `ribbon String?` (was `String`) | Photo-mode bouquets have no ribbon |
| `CustomBouquet` | `meta Json?` | Full `customDetails` blob so the florist keeps occasion/tier/colors/style/flowers/reference-images/notes |
| `CustomBouquet` | `name String?` | Display name captured at order time ("Bó hoa tự thiết kế" / "Bó hoa đặt theo ảnh") |
| `CustomBouquet` | `imageUrl String?` | Preview / first reference image captured at order time |
| `OrderItem` | `addons Json?` | Defensive — cart models add-ons even though nothing creates them yet |

`orderNumber` remains a required unique `String`; it is derived and written at
create time as `"FLW-" + String(orderSeq).padStart(6, "0")`.

## 4. File Layout (FSD)

```
src/entites/order/
  model/
    order.schema.ts        Zod: checkout form fields (recipient, delivery, payment)
    order.model.ts          VMs + types: CheckoutInput, CartSnapshotItem, OrderVM,
                            OrderListItemVM, OrderActionState
    delivery.const.ts       DELIVERY_SLOTS, delivery-date lead-time rule
    totals.util.ts          pure computeOrderTotals(pricedLines, discount)
    coupon.util.ts          pure validateCoupon(coupon, subtotal, now)
    order-number.util.ts    formatOrderNumber(seq) / parseOrderNumber(slug)
  actions/
    create-order.action.ts        "use server" (prevState, formData) => OrderActionState
    start-payment.action.ts       "use server" recreate a PayOS link for an existing UNPAID PAYOS order
    validate-coupon.action.ts     "use server" coupon check for the summary UI
    get-my-orders.action.ts       list for the signed-in user
    get-order-by-number.action.ts owner-scoped single order
    get-address-book.action.ts    AddressBookEntry[] for the signed-in user
  index.ts                  barrel

src/shared/lib/payos/
  payos-client.ts           @payos/node singleton from env
  create-payment-link.ts    createPaymentLink({ orderCode, amount, description, returnUrl, cancelUrl })
  verify-payment.ts         getPaymentLinkInformation(orderCode) -> normalized status

src/features/checkout/                    (replace the two placeholder files)
  ui/checkout-form.tsx                    client, useActionState(createOrderAction)
  ui/recipient-section.tsx
  ui/delivery-section.tsx
  ui/card-message-section.tsx
  ui/payment-method-section.tsx
  ui/order-summary.tsx                    line items + coupon field + totals
  ui/address-book-select.tsx
  index.ts

src/_pages/checkout/ui/checkout.page.tsx  client; cart hydration + empty-state gate
src/_pages/orders/ui/order-list.page.tsx  server
src/_pages/orders/ui/order-detail.page.tsx server
src/_pages/orders/ui/clear-cart-on-mount.tsx client helper

app/(store-front)/checkout/page.tsx           re-export CheckoutPage
app/(store-front)/checkout/return/page.tsx    PayOS return verification (server)
app/(store-front)/orders/page.tsx             re-export OrderListPage
app/(store-front)/orders/[slug]/page.tsx      re-export OrderDetailPage
app/api/payment/payos/webhook/route.ts        runtime nodejs
```

**Deleted:** `src/features/checkout/ui/checkout-button.tsx`,
`src/features/checkout/ui/payment-success-dialog.tsx`.

**New dependency:** `@payos/node`.

**New env vars:** `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`,
`NEXT_PUBLIC_APP_URL` (used for PayOS `returnUrl` / `cancelUrl`).

## 5. Route Guard

`proxy.ts` gains, before the `NextResponse.next()`:

```ts
if (url.pathname.startsWith("/checkout") || url.pathname.startsWith("/orders")) {
    if (!session) {
        const to = new URL("/login", request.url);
        to.searchParams.set("redirectTo", url.pathname + url.search);
        return NextResponse.redirect(to);
    }
}
```

`loginAction` / `signUpAction` already read `redirectTo` from the form.

## 6. Checkout Page & Form

### `checkout.page.tsx` (client)

- Reads `items` from `useCartStore`, gated on `useHydrated` (same pattern as
  `cart.page.tsx`).
- Empty cart ⇒ "Your cart is empty" + catalog link, no form.
- Otherwise `<CheckoutForm>` + `<OrderSummary>` in the `lg:grid-cols-[1fr_320px]`
  layout the cart page uses.

### `CheckoutForm` (client, `useActionState(createOrderAction, null)`)

| Section | Fields |
|---|---|
| Recipient | `recipientName`, `recipientPhone`, `recipientAddress` (textarea), `isAnonymous` (checkbox); **"Use a saved recipient"** `<select>` populated from `getAddressBookAction()` that fills the three fields on change; **"Save this recipient to my address book"** checkbox |
| Delivery | `deliveryDate` — native `<input type="date">`, `min` = tomorrow (local); `deliverySlot` — radio group over `DELIVERY_SLOTS` |
| Card message | `cardMessage` — optional textarea; prefilled from the single cart item's `customDetails.cardMessage` when exactly one cart item carries one |
| Payment | radio: **COD** (default) / **Online (PayOS)** |

- On submit the form includes a hidden `cartSnapshot` field: JSON array of
  `{ id, quantity, isCustomBouquet, price, customDetails, addons }` for every cart
  item, plus a hidden `couponCode` field holding the code the summary validated.
- Client-side Zod (`order.schema.ts`) drives inline field errors; **the server
  re-validates everything** — client validation is UX only.
- Rendering `OrderActionState.fieldErrors` / `.error` mirrors the auth forms.

### `OrderSummary` (client)

- Line items reuse the cart's rendering (extract the shared bits from
  `cart-line-item.tsx` if practical; otherwise a lean read-only variant).
- Subtotal, a **coupon code** input + **Apply** button calling
  `validateCouponAction(code, subtotal)` → shows the computed discount or an
  inline error; the accepted code is written to the form's hidden `couponCode`.
- Discount row (when present), then total.
- Purely display/UX; the authoritative coupon check is inside `createOrderAction`.

### `delivery.const.ts`

```ts
export const DELIVERY_SLOTS = [
    "08:00 - 10:00",
    "10:00 - 12:00",
    "14:00 - 16:00",
    "16:00 - 18:00",
    "18:00 - 20:00",
] as const;
// Lead time: deliveryDate must be >= tomorrow (local date).
```

## 7. `createOrderAction` (core)

`"use server"`, `(prevState: OrderActionState | null, formData: FormData) => Promise<OrderActionState>`.

`OrderActionState = { error?: string; fieldErrors?: Record<string,string[]>; ok?: boolean; redirect?: string; external?: boolean }`.

1. **Auth** — `await auth()`; no session ⇒ `{ error: "Please sign in to place your order." }`.
   Capture `userId`; `buyerName` / `buyerEmail` from the `User` record;
   `buyerPhone` = recipient phone (documented limitation).
2. **Validate** — Zod parse recipient + delivery + payment fields:
   - `recipientName` non-empty; `recipientPhone` matches a VN phone pattern;
     `recipientAddress` non-empty.
   - `deliveryDate` parseable and `>= tomorrow`.
   - `deliverySlot ∈ DELIVERY_SLOTS`.
   - `paymentMethod ∈ {"COD","PAYOS"}`.
   - `cardMessage` optional, length-capped (e.g. 500).
   Failure ⇒ `{ error: "Please correct the highlighted fields.", fieldErrors }`.
   Parse `cartSnapshot` JSON; empty/parse-fail ⇒ `{ error: "Your cart is empty." }`.
3. **Re-price** (`computeOrderTotals`, pure):
   - Split snapshot into standard (`!isCustomBouquet`) and custom lines.
   - `prisma.product.findMany({ where: { id: { in: standardIds } } })`. Any id
     missing ⇒ `{ error: "Some items are no longer available. Please review your cart." }`.
   - Standard unit price = **DB `Product.price`** (snapshot price ignored).
     `Product.stock` is not checked.
   - Custom line price = snapshot `price`; reject if not a finite number `> 0`.
   - Add-ons total = sum of snapshot `addons[].price * qty` as given.
   - `subtotal = Σ(unitPrice * qty) + addonsTotal`.
4. **Coupon** (only if `couponCode` present) — `coupon.findUnique`; `validateCoupon`
   (pure) checks `active`, `expiresAt == null || expiresAt > now`,
   `maxUses == null || usedCount < maxUses`. Invalid ⇒
   `{ fieldErrors: { couponCode: ["…"] } }`, no order.
   `discountAmount = discountType === "PERCENTAGE" ? Math.round(subtotal * value / 100) : Math.min(value, subtotal)`.
5. **`totalAmount = Math.max(0, subtotal - discountAmount)`**.
6. **`prisma.$transaction`:**
   - `order.create`:
     - Scalars: buyer*, recipient*, `isAnonymous`, `cardMessage`, `deliveryDate`
       (Date), `deliverySlot`, `status: "PENDING"`, `paymentStatus: "UNPAID"`,
       `paymentMethod`, `couponCode ?? null`, `discountAmount`, `totalAmount`,
       `userId`, and `orderNumber` (see step 7 — write it in the same create using
       a nested read is not possible, so create first, then `update` the
       `orderNumber` from the returned `orderSeq` **inside the same transaction**).
     - Nested `items`: one `OrderItem` per standard line — `productId`,
       `quantity`, `price` = DB price, `addons` = snapshot addons JSON or `null`.
     - Nested `customBouquets`: one per custom line — `price`, `quantity`,
       `wrapPaper` = `customDetails.wrapPaper ?? null`, `ribbon` =
       `customDetails.ribbon ?? null`, `name` = snapshot `name`, `imageUrl` =
       `customDetails.referenceImages?.[0] ?? snapshot.image ?? null`, `meta` =
       full `customDetails`. Nested `stems` **only** when the line is v1
       (`customDetails.stems` present with real `stemId`s):
       `{ stemId, quantity }` each.
   - If coupon used:
     `coupon.update({ where: { code }, data: { usedCount: { increment: 1 } } })`
     — re-read within the txn and throw if `maxUses != null && usedCount >= maxUses`
     so the whole transaction rolls back ⇒ caught as
     `{ error: "That coupon is no longer available." }`.
   - If "save this recipient": `addressBookEntry.create({ userId, label: recipientName, recipientName, recipientPhone, recipientAddress })`.
7. **Order number** — `orderNumber = "FLW-" + String(order.orderSeq).padStart(6, "0")`,
   persisted via the in-transaction `update` in step 6.
8. **Branch on payment method:**
   - **COD** ⇒ `{ ok: true, redirect: "/orders/" + orderNumber + "?placed=1" }`.
   - **PAYOS** ⇒ `createPaymentLink({ orderCode: order.orderSeq, amount: totalAmount, description: orderNumber, returnUrl: `${APP_URL}/checkout/return`, cancelUrl: `${APP_URL}/checkout?payment=cancelled` })`.
     Persist `order.paymentSessionId = paymentLinkId`. Return
     `{ ok: true, redirect: checkoutUrl, external: true }`.
     If the PayOS call throws: the order already exists as `PENDING`; return
     `{ ok: true, redirect: "/orders/" + orderNumber + "?placed=1&payment=failed" }`.

**Client** (`checkout-form.tsx`) on `state.ok`:
`state.external` ⇒ `window.location.href = state.redirect`;
else `router.push(state.redirect)`. The cart is **not** cleared here.

## 8. Payment Confirmation

### `/checkout/return` (server page)

PayOS redirects here with `?code=&id=&status=&orderCode=&cancel=`.

1. `await auth()` (guard already applied by `proxy.ts`).
2. `orderSeq = Number(searchParams.orderCode)`;
   `order.findUnique({ where: { orderSeq } })`. Missing or
   `order.userId !== session.user.id` ⇒ `notFound()`.
3. `verifyPayment(orderSeq)` → PayOS `getPaymentLinkInformation`; **trust the API
   response, not the query string.**
4. Status `PAID` and `order.paymentStatus !== "PAID"` ⇒
   `order.update({ paymentStatus: "PAID", status: "CONFIRMED" })`.
5. `redirect("/orders/" + orderNumber + "?placed=1")` when paid; otherwise
   `redirect("/orders/" + orderNumber + "?placed=1&payment=pending")`.

### `/api/payment/payos/webhook` (`route.ts`, `runtime = "nodejs"`)

- `verifyPaymentWebhookData(await req.json())`; on `PAID`, the same idempotent
  `order.update`. Always return `200` so PayOS stops retrying.
- Best-effort backup for a user who closes the tab before the return redirect.
  Requires a public URL (tunnel) in sandbox; on localhost the return page is the
  reliable path.

### `start-payment.action.ts`

For the detail-page **"Complete payment"** button. Reload the order (owner-scoped);
require `paymentMethod === "PAYOS" && paymentStatus === "UNPAID"`. Create a fresh
payment link for the same `orderSeq` / `totalAmount`, update `paymentSessionId`,
return `{ ok: true, redirect: checkoutUrl, external: true }`.

## 9. Order History

### `/orders` — `order-list.page.tsx` (server)

- `await auth()` guard (defense in depth on top of `proxy.ts`).
- `getMyOrdersAction`: `order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { items: { include: { product: true } }, customBouquets: true } })`.
- One card per order: `orderNumber`, `createdAt`, `status` badge,
  `paymentStatus` badge, first item thumbnail + item count, `totalAmount`.
- Empty state links to `/catalog`.

### `/orders/[slug]` — `order-detail.page.tsx` (server)

- `slug` is the order number; `parseOrderNumber` → `orderSeq`.
- `order.findUnique({ where: { orderSeq }, include: { items: { include: { product: true } }, customBouquets: { include: { stems: { include: { stem: true } } } } } })`.
- **`notFound()` if `order.userId !== session.user.id`.**
- Renders: recipient block (+ "anonymous delivery" flag), delivery date + slot,
  card message, line items (standard: product name/image/qty/price; custom: name,
  image, and details read from `meta`), coupon code + discount, `totalAmount`,
  `paymentMethod`, `paymentStatus`, `status`.
- If `paymentMethod === "PAYOS" && paymentStatus === "UNPAID"` ⇒ **"Complete
  payment"** button wired to `startPaymentAction` (then
  `window.location.href = redirect`).
- Query flags:
  - `?placed=1` ⇒ green "Order placed" banner **and** renders
    `<ClearCartOnMount>`.
  - `&payment=pending` or `&payment=failed` ⇒ amber "Payment not completed — you
    can pay now" note.

### `ClearCartOnMount` (client)

Rendered by the detail page only when `?placed=1`. Calls `useCartStore.clearCart()`
once in a mount effect. PayOS **cancel** lands on `/checkout?payment=cancelled`
(cart intact); PayOS **paid** always routes through `/checkout/return` →
`/orders/[slug]?placed=1`.

### Cart page change

Remove `CheckoutButton` import, the `paid` state, `handleCheckout`, and the
`PaymentSuccessDialog` branch. The summary aside gets a `next/link` to `/checkout`
styled as the existing pink button ("Proceed to checkout").

## 10. Error Handling (consolidated)

| Situation | Behavior |
|---|---|
| Not signed in | `proxy.ts` → `/login?redirectTo=`; action re-checks → `{ error }` |
| Empty / unparseable cart snapshot | `{ error: "Your cart is empty." }`, no order |
| Standard product missing from DB | `{ error: "Some items are no longer available. Please review your cart." }`, no order |
| Product price changed since add-to-cart | Silently re-priced to the DB value; order proceeds at the correct price |
| Custom bouquet price ≤ 0 / not finite | `{ error }`, no order |
| Coupon invalid / inactive / expired / exhausted | `{ fieldErrors: { couponCode } }`, no order |
| Coupon `maxUses` reached mid-transaction | Transaction rolls back → `{ error: "That coupon is no longer available." }` |
| PayOS link creation throws | Order persists as `PENDING`; redirect to `/orders/[slug]?placed=1&payment=failed`; user retries via "Complete payment" |
| PayOS webhook unreachable (localhost) | `/checkout/return` verifies via the PayOS API instead (primary path) |
| `/checkout/return` or `/orders/[slug]` accessed by non-owner | `notFound()` |
| PayOS return status not `PAID` | Order stays `UNPAID`; detail page shows the amber note + "Complete payment" |

## 11. Testing

No test runner is configured (`CLAUDE.md`). Pure functions are deliberately
extracted so they can be unit-tested later: `computeOrderTotals`,
`validateCoupon`, `formatOrderNumber` / `parseOrderNumber`, and the
delivery-date lead-time predicate. The plan will include an **optional** step to
add `vitest` + tests for these.

Primary verification is a **manual QA script** against the PayOS sandbox:

1. COD happy path → order row created, `PENDING`/`UNPAID`, redirect to detail,
   cart cleared.
2. PayOS happy path → redirect to PayOS, pay in sandbox, return →
   `PAID`/`CONFIRMED`, cart cleared.
3. PayOS cancel → back to `/checkout?payment=cancelled`, cart intact, order left
   `PENDING`; "Complete payment" from `/orders/[slug]` works.
4. Expired / exhausted coupon → inline error, no order.
5. Empty cart → no form.
6. Price drift (edit `Product.price` in Studio, then check out) → charged the DB
   price.
7. Non-owner visits `/orders/[slug]` → 404.
8. Custom bouquet (v2 build and v2 photo) in cart → `CustomBouquet` row with
   `meta`, nullable wrap/ribbon, no stray `CustomBouquetStem` rows.
9. "Save this recipient" → `AddressBookEntry` created; appears in the select on
   the next checkout.

## 12. Known Limitations

- No stock decrement / sold-out guard at checkout.
- Add-ons: folded into the total only; no catalog, no server re-pricing.
- `buyerPhone` reuses the recipient phone.
- Address book is prefill + save-on-checkout only; no management page.
- Coupons: subtotal-only, single, non-stackable.
- PayOS webhook needs a public tunnel in sandbox; the return page is the
  reliable confirmation path for local development.
- Custom-bouquet line prices are taken from the client cart snapshot (validated only as a finite number > 0); they are not re-derived server-side from Stem/tier data. A crafted snapshot can create a CustomBouquet order row at an arbitrary price. Follow-up: re-price custom lines server-side.

# Feature: View Cart

**Date**: 2026-09-01
**Status**: Implemented (branch `view-cart-feature`, commits `4b40fca` + `de7cbd1`)
**Depends on**: `useCartStore` (already present), the catalog feature (`/catalog`, `/catalog/[slug]`)

---

## 1. Scope

A cart-viewing surface on top of the existing `useCartStore`:

1. A **cart button** (icon + live item-count badge) reused in the landing header and the store-front header, linking to `/cart`.
2. A **`/cart` page** listing cart items with quantity controls, a remove action, and an order summary.
3. A **faked checkout**: clicking *Checkout* clears the cart and shows a "payment successful" popup that counts down 5s and navigates to `/catalog`.

### Out of scope

- Real payment / order persistence. Checkout only `clearCart()`s and shows the popup.
- Deep-link-back after checkout — it always lands on `/catalog`.
- Cart button in the landing **mobile** menu (desktop actions only).
- Wishlist / saved items.
- Fixing the pre-existing `<Initializer>` SSR-spinner gate on `(store-front)` routes (`/cart` inherits it, like `/catalog`).

---

## 2. User flow

```
[header cart icon + badge]  ──click──▶  /cart
                                          │
                    ┌─────────────────────┼─────────────────────┐
              cart empty              cart has items        checkout clicked
                    │                     │                      │
          "Your cart is empty"     item list + summary     clearCart() + setPaid(true)
           + link to /catalog       (− qty + / remove)            │
                                          │                       ▼
                                     [ Checkout ] ──────▶  PaymentSuccessDialog
                                                           5s countdown ─▶ router.push("/catalog")
                                                           "Back to Catalog" ─▶ immediate push
```

---

## 3. Architecture (Feature-Sliced Design)

| Path | Layer | Responsibility |
|---|---|---|
| `src/features/view-cart/ui/view-cart-button.tsx` | feature | `"use client"`. `<Link href="/cart">` styled as an icon button: `ShoppingBag` + an absolute pink badge with the total item quantity (`99+` cap, hidden at 0). Optional `className` passthrough. |
| `src/features/view-cart/index.ts` | feature | barrel |
| `src/features/checkout/ui/checkout-button.tsx` | feature | `"use client"`. A plain `<Button>` that calls its `onCheckout` prop. Owns no state. |
| `src/features/checkout/ui/payment-success-dialog.tsx` | feature | `"use client"`. Self-contained modal (`fixed inset-0` overlay, `role="dialog"`, body-scroll lock). Effect 1 = `setInterval` counting `5 → 0`; effect 2 = `router.push("/catalog")` when it reaches 0. "Back to Catalog" button pushes immediately. |
| `src/features/checkout/index.ts` | feature | barrel (exports both) |
| `src/_pages/cart/ui/cart.page.tsx` | pages | `"use client"`. Orchestrates the state machine (see §4.3) and composes the layout. |
| `src/_pages/cart/ui/cart-line-item.tsx` | pages | `"use client"`. One row: image (placeholder → 💐), name → `/catalog/[slug]`, `− n +` stepper (`updateQuantity`), `X` (`removeFromCart`), line total. Add-ons render as sub-lines. |
| `src/_pages/cart/index.ts` | pages | barrel |
| `src/shared/hooks/use-hydrated.ts` | shared | `useHydrated()` — `useSyncExternalStore` returning `false` on the server / first client render, `true` after hydration. |
| `app/(store-front)/cart/page.tsx` | app | re-exports `CartPage` + `metadata`. Route lives under `(store-front)` (sidebar + shell, like `/catalog`). |

### Modified

| Path | Change |
|---|---|
| `src/_pages/home/ui/landing-navbar.tsx` | The dead `<button aria-label="Cart">` replaced with `<ViewCartButton className="text-gray-400 hover:text-pink-500" />`; unused `ShoppingBag` import dropped. |
| `src/_app/layout/store-front.layout.tsx` | `<ViewCartButton />` added to the `<header>`, right-aligned (`ml-auto`). |
| `src/shared/hooks/index.ts` | export `./use-hydrated` |

---

## 4. Key behaviours & decisions

### 4.1 Hydration gate (`useHydrated`)

The cart lives in a `persist`ed (localStorage) Zustand store. **Client components still server-render** in the App Router, and the server has no `localStorage`, so the server render (and the first client render) see an empty cart.

Without a gate:
- the header badge would render `0`, then flip to the real count after `persist` rehydrates → visible `0 → N` flash;
- `/cart` would render "empty", then flip to the item list.

`useHydrated()` returns `false` during SSR + the first client render (so both agree), then `true`. Count-dependent UI is held back until then:
- `ViewCartButton`: no badge until hydrated;
- `CartPage`: a skeleton until hydrated.

### 4.2 `useSyncExternalStore`, not `useEffect(() => setMounted(true))`

This repo's ESLint config treats `react-hooks/set-state-in-effect` as an **error** (it also flags `src/shared/components/scroll-reveal.tsx`). The idiomatic effect-based "have I mounted" pattern is therefore not allowed. `useHydrated` uses `useSyncExternalStore` with distinct server/client snapshots — the purpose-built, lint-clean way to detect hydration.

### 4.3 `CartPage` state machine — order matters

```tsx
if (paid)              return <PaymentSuccessDialog />;   // ← must be first
if (!hydrated)         return <skeleton />;
if (items.length === 0) return <empty state />;
return <item list + order summary + <CheckoutButton onCheckout={handleCheckout} /> />;

handleCheckout = () => { clearCart(); setPaid(true); };
```

**Why `paid` is checked first (bug `de7cbd1`):** the popup originally lived inside `CheckoutButton`, which only renders in the non-empty branch. `clearCart()` empties `items` → `CartPage` re-renders into the empty-state branch → `CheckoutButton` (and the `paid` flag + dialog it held) is **unmounted** before the popup can commit. Lifting `paid` + `<PaymentSuccessDialog />` into `CartPage`, ahead of the hydration/empty checks, keeps the dialog mounted through the cart being cleared. `CheckoutButton` became a dumb button taking `onCheckout`.

### 4.4 Hand-rolled modal

`npx shadcn add dialog` wanted to overwrite existing UI files, and a payment-success popup with a countdown is feature-specific, not a reusable primitive — so `PaymentSuccessDialog` is a plain `fixed inset-0` overlay in the `checkout` feature rather than `src/shared/ui/dialog.tsx`.

### 4.5 Checkout is a placeholder

`CheckoutButton` → `onCheckout` → `clearCart()` + `setPaid(true)`. No payment, no order record. When real checkout lands, `handleCheckout` in `CartPage` (and/or a new checkout feature) gets the real logic; `PaymentSuccessDialog` can stay as the confirmation step.

---

## 5. Totals

Subtotal and line totals fold in add-on prices:

```
lineTotal = (item.price + Σ addon.price * addon.quantity) * item.quantity
subtotal  = Σ lineTotal
```

Displayed as `value.toLocaleString("vi-VN") + "₫"`. No shipping/tax (placeholder note only).

---

## 6. Verification

No test runner in this repo. As-built checks (all green on `de7cbd1`):

- `npx tsc --noEmit` — only the 2 known pre-existing baseline errors (`next.config.ts`, `src/shared/ui/sidebar.tsx`), 0 new.
- `npm run lint` — baseline problems only, 0 in cart/checkout files.
- `npx prettier --check` — clean on all new/changed files.
- `npm run build` — green; `/cart` compiles as a static shell.

Manual (browser) checklist:

1. `/catalog` → *Add* a product → header badge count increments.
2. Cart icon → `/cart`; `− / +` change quantity + line total + subtotal; `X` removes a row.
3. *Checkout* → cart clears, popup shows, counts `5 → 0`, auto-navigates to `/catalog`; *Back to Catalog* navigates immediately.
4. After checkout, `localStorage["flower-cart-storage"]` has empty `items`; `/cart` shows the empty state.
5. Reload `/cart` with items present → no console hydration warning, no empty-state flash.

---

## 7. Follow-ups

- Add `<ViewCartButton />` to the landing mobile menu.
- Real checkout (payment gateway, order creation) replacing the faked `clearCart()` + popup.
- Deep-link return after login/checkout (ties into the `redirectUrl` work in `2026-08-30` auth changes).
- `next/image` `remotePatterns` for real product images (shared with the catalog follow-up) — `cart-line-item.tsx` already has the `<Image>` branch gated behind `hasImage`.

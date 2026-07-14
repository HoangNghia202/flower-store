# System Design: Flower Store Web Application (Updated)

**Date**: 2026-07-13
**Status**: Active (supersedes `2026-06-19-flower-store-design.md`)
**Author**: Copilot CLI
**Technologies**: Next.js 16, React 19, Prisma ORM, PostgreSQL, Zustand, Auth.js v5 (NextAuth), Tailwind CSS v4, Shadcn UI

---

## 🏛️ 1. Architectural Approach

A **Fully Integrated Next.js Full-Stack Monolith** with the storefront operating as a fluid SPA after the initial shell loads. All subsequent navigations, product filtrations, and bouquet builder steps execute via client-side routing and in-memory state.

### 🏢 Feature-Sliced Design (FSD) Structure

The codebase adheres to **Feature-Sliced Design (FSD)**. All FSD source lives under `src/`, while `app/` is reserved exclusively for Next.js App Router routing entrypoints.

| FSD Layer | Actual Path | Responsibility |
|-----------|-------------|----------------|
| `app` | `src/_app/` | Global stores, layouts, providers, initializer, API route handlers |
| `pages` | `src/_pages/` | Full route page compositions |
| `widgets` | `src/widgets/` | Large self-contained UI blocks *(scaffold only — not yet implemented)* |
| `features` | `src/features/` | User actions with business value (e.g., auth logout) |
| `entities` | `src/entites/` | Core domain logic and view models *(note: folder name has a typo — `entites` not `entities`)* |
| `shared` | `src/shared/` | Reusable infrastructure: UI primitives, utilities, lib integrations |

> **Note:** `src/_app/` and `src/_pages/` use underscore-prefixed names to avoid collision with Next.js built-in reserved directories (`app/`, `pages/`).

#### Next.js `app/` vs FSD `src/_pages/`

- **`app/`** — Contains only Next.js route files: `layout.tsx`, `page.tsx`, and route group folders. Pages in `app/` are thin entry points that import and render the corresponding FSD page component from `src/_pages/`.
- **`src/_pages/`** — Contains the actual assembled page UI components (heavy logic, data fetching coordination, layout composition).

### Directory Tree

```
flower-store/
├── app/                          # Next.js App Router (routing only)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (store-front)/
│   │   ├── catalog/
│   │   ├── custom-bouquet/
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/
│   │   └── auth/                 # Auth.js catch-all handler
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── src/                          # FSD source layers
│   ├── _app/                     # FSD: app layer
│   │   ├── api-routes/           # Auth route handler wiring
│   │   ├── initializer/          # Client-side session bootstrap component
│   │   ├── layout/               # Assembled layout components (StoreFrontLayout)
│   │   ├── providers/            # React context providers (ThemeProvider)
│   │   └── store/                # Global Zustand stores
│   │       ├── useCartStore.ts
│   │       ├── useCustomBouquetStore.ts
│   │       └── useUserStore.ts
│   │
│   ├── _pages/                   # FSD: pages layer
│   │   ├── admin/ui/admin.page.tsx
│   │   ├── auth/                 # (login/register page UIs)
│   │   ├── home/
│   │   └── store-front/
│   │       ├── catalog/ui/catalog.page.tsx
│   │       └── custom-bouquet/ui/custom-bouquet.page.tsx
│   │
│   ├── widgets/                  # FSD: widgets layer (scaffold — index.ts only)
│   │
│   ├── features/                 # FSD: features layer
│   │   └── auth/
│   │       └── logout/           # LogOutButton feature
│   │
│   ├── entites/                  # FSD: entities layer (⚠️ typo: "entites")
│   │   └── user/
│   │       ├── actions/          # Server Actions: signUp, login, googleSignIn, logout, getMe
│   │       ├── model/            # UserVM class, User type, Zod schemas
│   │       └── ui/               # UserDropDownMenu component
│   │
│   └── shared/                   # FSD: shared layer
│       ├── components/           # App-level shared components (AppSidebar, LoginForm, etc.)
│       │   └── global-loading/
│       ├── hooks/
│       ├── lib/
│       │   ├── constants/        # app-page.const.ts (route constants)
│       │   ├── enum/             # Shared enums
│       │   └── utils/            # styling.util.ts, etc.
│       └── ui/                   # Shadcn UI primitives (button, card, input, sidebar…)
│
├── prisma/
│   ├── schema.prisma
│   ├── prisma-instance.ts        # Singleton Prisma client
│   └── generated/                # Prisma-generated client (output = "./generated")
│
├── auth.ts                       # NextAuth export: { handlers, auth, signIn, signOut }
├── auth.config.ts                # NextAuth providers + callbacks config
├── proxy.ts                      # Next.js 16 proxy (replaces middleware.ts)
└── next.config.ts
```

### System Overview Diagram

```
+--------------------------------------------------------------------------------------------------+
|                                      Next.js 16 Application                                      |
|                                                                                                  |
|   +----------------------------------------+       +--------------------------------------+     |
|   |         Storefront / Customer           |       |          Admin Dashboard              |     |
|   |  - Catalog (/(store-front)/catalog)     |       |  - Secure /admin sub-routes           |     |
|   |  - Custom Bouquet Builder               |       |  - Order / Inventory / Shipping       |     |
|   |    (/(store-front)/custom-bouquet)      |       |  - Card PDF Export (planned)          |     |
|   +----------------------------------------+       +--------------------------------------+     |
|                       |                                              |                           |
|                       v                                              v                           |
|            [ Client Router Cache ]                      [ Server Actions (Mutations) ]           |
|                       |                                              |                           |
+---------------------- | -------------------------------------------- | -------------------------+
                        |                                              |
                        +---------------------+------------------------+
                                              |
                                              v
                                  [ proxy.ts / Auth.js v5 ]
                                              |
                                              v
                                  [ Prisma Client / PostgreSQL ]
                              (generated client at prisma/generated/)
```

---

## 💾 2. Database Schema (Prisma with PostgreSQL)

The Prisma schema is at `prisma/schema.prisma`. The generated client outputs to `prisma/generated/` (not the default `node_modules`), imported via:

```typescript
import { Prisma, UserRole } from "@/prisma/generated/client";
import { prisma } from "@/prisma/prisma-instance";
```

The singleton Prisma instance lives at `prisma/prisma-instance.ts`.

### Schema Summary

```prisma
generator client {
    provider = "prisma-client"
    output   = "./generated"        // ← custom output path
}

datasource db {
    provider = "postgresql"
}

enum UserRole    { CUSTOMER | ADMIN }
enum CouponType  { PERCENTAGE | FIXED }
enum OrderStatus { PENDING | CONFIRMED | PROCESSING | DELIVERING | COMPLETED | CANCELLED }
enum PaymentStatus { UNPAID | PAID | REFUNDED }

model User           // Customer accounts; supports Credentials + Google OAuth
model Category       // Product categories (Sinh nhật, Khai trương, Hoa Hồng…)
model Product        // Flower products with price, images, stock, isFeatured
model Stem           // Raw stem inventory with criticalMin threshold alerts
model ProductStem    // Junction: Product recipe ↔ Stem quantities
model Order          // Order with buyer/recipient separation, delivery slot, card message
model OrderItem      // Line item with snapshotted price at checkout time
model CustomBouquet  // Customer-designed bouquet (wrap, ribbon, stem list)
model CustomBouquetStem  // Stems in a custom bouquet
model AddressBookEntry   // Saved recipient addresses per user
model AnniversaryReminder  // Yearly reminder triggers per user
model Coupon         // Discount codes (percentage or fixed VND)
```

**Key flower-industry fields on `Order`:**
- `buyerName / buyerPhone / buyerEmail` — gift giver info
- `recipientName / recipientPhone / recipientAddress` — delivery target
- `isAnonymous` — anonymous delivery flag
- `cardMessage` — greeting printed on card
- `deliveryDate / deliverySlot` — e.g., `"08:00 - 10:00"`
- `paymentMethod` — `"COD" | "VNPAY" | "MOMO" | "PAYOS"`

---

## ⚡ 3. State Management (Zustand)

All Zustand stores live at `src/_app/store/`. Three stores are currently implemented.

### 3.1 Cart Store (`useCartStore.ts`)

Persisted to `localStorage` under key `"flower-cart-storage"`. Tracks standard products, add-ons, and custom bouquets.

```typescript
export interface CartStem {
    stemId: string;
    name: string;
    pricePerStem: number;
    quantity: number;
    color: string;          // ← color field (not in original spec)
}

export interface CartItem {
    id: string;             // Product ID or "CUSTOM-[uuid]"
    name: string;
    slug: string;
    price: number;
    image: string;
    quantity: number;
    isCustomBouquet?: boolean;
    customDetails?: {
        wrapPaper: string;
        ribbon: string;
        stems: CartStem[];
    };
    addons?: { id: string; name: string; price: number; quantity: number }[];
}

interface CartState {
    items: CartItem[];
    addToCart: (product: CartItem, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    addAddonToItem: (productId: string, addon: { id: string; name: string; price: number }) => void;  // ← new
    removeAddonFromItem: (productId: string, addonId: string) => void;                                 // ← new
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;   // includes addons × item.quantity
}
```

### 3.2 Custom Bouquet Builder Store (`useCustomBouquetStore.ts`)

Not persisted (session-only). Tracks the multi-step builder wizard state.

```typescript
export interface SelectedStem {   // ← array-based, not Record<string, number>
    id: string;
    name: string;
    pricePerStem: number;
    quantity: number;
    color: string;
}

interface CustomBouquetState {
    step: number;
    selectedStems: SelectedStem[];
    selectedWrap: string | null;
    selectedRibbon: string | null;
    // Navigation
    nextStep: () => void;
    prevStep: () => void;
    setStep: (step: number) => void;       // ← new explicit setter
    // Stem management
    addStem: (stem: Omit<SelectedStem, 'quantity'>) => void;
    removeStem: (stemId: string) => void;
    updateStemQuantity: (stemId: string, quantity: number) => void;  // ← new
    // Selections
    setWrap: (wrap: string) => void;
    setRibbon: (ribbon: string) => void;
    resetBuilder: () => void;
    // Computed
    getBuilderTotalPrice: () => number;    // ← new: stems total + 50,000 VND base fee if wrap/ribbon
    getBuilderTotalStems: () => number;    // ← new
}
```

### 3.3 User Store (`useUserStore.ts`)

Not persisted. Caches the authenticated user's view model client-side.

```typescript
interface UserState {
    user: UserVM | null;
    setUser: (user: UserVM | null) => void;
    clearUser: () => void;
}
```

The store is populated by the `Initializer` component on app boot (see §5).

---

## 🔑 4. Authentication (Auth.js v5)

Auth configuration is split into two files:

| File | Purpose |
|------|---------|
| `auth.config.ts` | Providers, callbacks, session strategy, custom pages |
| `auth.ts` | Exports `{ handlers, auth, signIn, signOut }` from `NextAuth(authConfig)` |

### Session Strategy

- **JWT** sessions (`strategy: "jwt"`)
- Custom `signIn` page at `/login`

### Providers

1. **Credentials** — email/password verified via Prisma + bcrypt
2. **Google OAuth** — auto-upserts new users into `User` table on first login (with empty password)

### JWT / Session Callbacks

The `jwt` callback embeds `token.id` and `token.role` from the Auth.js user object. The `session` callback copies them to `session.user.id` and `session.user.role`.

### Server Actions (`src/entites/user/actions/user.action.ts`)

| Action | Description |
|--------|-------------|
| `signUpAction(prevState, formData)` | Validates with Zod, hashes password, creates User in DB, auto-signs in |
| `loginAction(prevState, formData)` | Validates with Zod, calls `signIn("credentials", …)` |
| `signInWithGoogle(redirectUrl?)` | Calls `signIn("google", …)` |
| `logoutAction(redirectTo?)` | Calls `signOut(…)` |
| `getMeAction()` | Reads current session, fetches full user from DB, returns `UserVM` |

### User View Model (`src/entites/user/model/`)

```typescript
export class UserVM {
    id: string;
    name: string;
    email: string;
    avatar: string;
    constructor(init: Partial<UserVM>) { Object.assign(this, init); }
}

export type User = { id: string; name: string; email: string; avatar: string; };
```

Input validation uses **Zod** schemas (`loginFormSchema`, `signupFormSchema`) also defined in the model layer.

---

## 🔒 5. Proxy / Route Protection (`proxy.ts`)

`proxy.ts` in the project root handles route-level authorization (Next.js 16 replaces `middleware.ts`).

```typescript
export async function proxy(request: Request) {
    const session = await auth();
    const url = new URL(request.url);

    // Redirect unauthenticated users away from /admin
    if (url.pathname.startsWith("/admin")) {
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // Redirect already-authenticated users away from /login and /register
    if (url.pathname.startsWith("/login") || url.pathname.startsWith("/register")) {
        if (session) {
            const dest = session.user.role === "ADMIN" ? "/admin" : "/catalog";
            return NextResponse.redirect(new URL(dest, request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## 🚀 6. Initializer Pattern (`src/_app/initializer/initializer.tsx`)

On first client render, the `<Initializer>` component bootstraps user session state into Zustand, blocking the UI with a full-screen `<GlobalLoading />` spinner until the session resolves.

```
Mount → useUserStore.user is null?
    YES → call getMeAction() → setUser(data) → render children
    NO  → render children immediately
```

This prevents authenticated-dependent components (e.g., `UserDropDownMenu`) from flashing unauthenticated states on page load. `<Initializer>` wraps the `<SidebarProvider>` in `StoreFrontLayout`.

---

## 🌐 7. Routing Structure

### Route Groups

| Route | Group | FSD Page Component |
|-------|-------|--------------------|
| `/` | (root) | `app/page.tsx` |
| `/login` | `(auth)` | `src/_pages/auth/…` |
| `/register` | `(auth)` | `src/_pages/auth/…` |
| `/catalog` | `(store-front)` | `src/_pages/store-front/catalog/ui/catalog.page.tsx` |
| `/custom-bouquet` | `(store-front)` | `src/_pages/store-front/custom-bouquet/ui/custom-bouquet.page.tsx` |
| `/admin` | (root) | `src/_pages/admin/ui/admin.page.tsx` |

### Storefront Layout (`src/_app/layout/store-front.layout.tsx`)

`(store-front)` routes share `StoreFrontLayout` which provides:
- `<SidebarProvider>` + `<AppSidebar>` (collapsible sidebar)
- `<ThemeSwitcher>` (dark/light mode toggle)
- `<UserDropDownMenu>` with injected `<LogOutButton>` slot
- `<Initializer>` wrapping for session hydration

---

## 📦 8. Admin Dashboard

Currently at early scaffold stage (`src/_pages/admin/ui/admin.page.tsx`). Planned features:

- **Real-time order tracker** — Server Actions + client-side polling (10s interval)
- **Greeting card PDF printing** — `pdfkit` server-side PDF generation for `/admin/orders/[id]`
- **Recipe-based inventory checks** — Validate stem availability before order confirmation; auto-mark products out-of-stock when stem levels fall below recipe requirements

---

## 🎨 9. Webhooks & Integrations *(Planned)*

### Payment Gateways

| Gateway | Use Case |
|---------|----------|
| **PayOS** | Primary — domestic NAPAS 247 QR code payments, 0% fee |
| **VNPAY / MOMO** | Alternative domestic options |
| **Stripe** | Secondary — international credit card payments |

Webhook handler at `app/api/webhook/route.ts` (planned):
1. Verify signature (PayOS secret or Stripe signing secret)
2. Match order by `orderNumber`
3. Update `Order.status → CONFIRMED`, `PaymentStatus → PAID`
4. Deduct raw stem stocks per recipe formula
5. Trigger customer invoice email (Resend) + admin Telegram alert

### Notification System *(Planned)*

- **Telegram Bot** — Admin mobile alerts: new orders, payment confirmations, low-stock warnings
- **Resend + React Email** — Customer transactional emails: invoices, order summaries, delivery reminders

---

## 🧪 10. Validation & Error Handling

- **Zod** form schemas in `src/entites/user/model/auth.schema.ts` for signup/login validation
- **Checkout inventory lock** — DB transaction verifies stem availability before payment session initialization
- **Payment failure fallback** — Webhooks not triggered → stock not deducted → order auto-transitions to `CANCELLED` after 30-minute expiration
- **Prisma error handling** — `P2002` (unique constraint) caught in `signUpAction` with user-facing error message

---

## ⚠️ Known Issues / Technical Debt

| Issue | Location | Notes |
|-------|----------|-------|
| Folder name typo | `src/entites/` | Should be `entities` — fix requires updating all imports |
| Hardcoded placeholder user | `src/_app/layout/store-front.layout.tsx` | `user` object is hardcoded; should read from `useUserStore` or server session |
| `debugger` statement | `src/entites/user/actions/user.action.ts:101` | Left in `loginAction` — remove before production |
| `signUpAction` hardcodes `ADMIN` role | `src/entites/user/actions/user.action.ts:50` | New registrations create ADMIN users — likely a development artifact |
| `widgets/` layer empty | `src/widgets/` | Only `index.ts` stub exists — widgets not yet extracted from pages/layouts |

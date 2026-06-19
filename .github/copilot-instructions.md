# Copilot Instructions

This repository is a **Flower Store** full-stack application built with **Next.js 16**, **React 19**, **Prisma ORM**, and **Tailwind CSS v4**.

---

## 🚀 Build, Test, and Lint Commands

The project uses **npm** as its primary package manager.

* **Development Server**: `npm run dev`
* **Production Build**: `npm run build` (uses Turbopack by default)
* **Linting**: `npm run lint` (runs ESLint using flat config `eslint.config.mjs`)
* **Prisma Commands**:
  * Generate Client: `npx prisma generate`
  * Create/Apply Migrations: `npx prisma migrate dev`
  * Prisma Studio (DB explorer): `npx prisma studio`

---

## ⚡ Next.js 16 Crucial Conventions & Breaking Changes

Next.js 16 includes several breaking changes and unique patterns. Coding assistants **must** adhere to these rules rather than relying on legacy training data.

### 1. Strictly Asynchronous Request APIs
Synchronous access to request-time APIs is fully removed. You **must** access them asynchronously:
* Functions: `cookies()`, `headers()`, `draftMode()`
* Route / Page parameters: `params` and `searchParams` passed to Layouts, Pages, Routes, OpenGraph/Twitter/Apple-Icon generators, and Sitemaps.
```tsx
// Correct Next.js 16 pattern
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
  const query = await props.searchParams;
  return <h1>Blog Post: {slug}</h1>;
}
```

### 2. `middleware` is now `proxy`
The `middleware.ts`/`middleware.js` naming convention is deprecated and replaced by `proxy.ts`/`proxy.js`:
* **File naming**: Rename any `middleware.ts` to `proxy.ts`.
* **Export**: Use the named export `proxy` instead of `middleware`.
* **Runtime**: The `proxy` runtime is strictly `nodejs`. The Edge runtime is **not** supported.
* **Config flags**: Configuration options are renamed, e.g., `skipMiddlewareUrlNormalize` is now `skipProxyUrlNormalize`.
```ts
// proxy.ts
export function proxy(request: Request) {
  // Routing/Proxy logic here
}
```

### 3. Instant Navigations (`unstable_instant`)
To ensure responsive, instant page navigations:
* **Route segment configuration**: Export `unstable_instant` from routes that should navigate instantly:
  `export const unstable_instant = { prefetch: 'static' };`
* **Suspense Boundaries**: Wrap parameters and dynamic data fetches in local `<Suspense>` boundaries. If parameters are dynamic, resolve them inline using `.then()` so nested cached components receive plain parameters.
* **Opting out**: Set `unstable_instant = false` on highly dynamic layouts (e.g., dashboard layouts that read cookies) to exempt them from instant-shell validation.
* **Enabling devtools**: Enable `experimental.instantNavigationDevToolsToggle: true` in `next.config.ts`.

### 4. Stable Caching APIs (`cacheLife` and `cacheTag`)
* **Stable Imports**: `unstable_cacheLife` and `unstable_cacheTag` are stable. Import them directly from `next/cache`:
  `import { cacheLife, cacheTag } from 'next/cache';`
* **`revalidateTag`**: Now **requires** a second argument specifying a `cacheLife` profile. The single-argument form will cause a TypeScript compiler error.
  `revalidateTag('posts', 'max');`
* **`updateTag`**: New Server Action-only API for "read-your-writes" semantics, expiring and refreshing cached data immediately in the same request.
  `updateTag('user-profile');`
* **`refresh`**: New API to refresh the client router from within a Server Action: `refresh()`.
* **PPR (Partial Prerendering)**: Enabled via `cacheComponents: true` inside `next.config.ts` (the experimental `experimental_ppr` segment config is removed).

### 5. Turbopack by default
* Turbopack is stable and used by default for `next dev` and `next build`.
* Custom `webpack` configurations in `next.config.ts` will fail builds unless building with `next build --webpack`.
* Turbopack configuration is top-level under `turbopack` instead of `experimental.turbopack`.

---

## 🏛️ High-Level Architecture

### 1. Database Model (Prisma)
The database schema (`prisma/schema.prisma`) is configured for PostgreSQL and contains specialized entities for the flower-industry domain:
* **User**: Customer accounts supporting credential login.
* **Category**: Product categories (e.g., Birthdays, Grand Openings).
* **Product**: Flower arrangements containing pricing, standard sizing, image URLs, stock quantities, and `isFeatured` flags.
* **Order**: Captures distinct checkout information including:
  * **Gift Giver (Buyer)** info vs. **Recipient** info (with support for `isAnonymous` delivery).
  * **Card Message** (greetings printed on cards).
  * **Delivery Date and Delivery Slot** (e.g., `"08:00 - 10:00"`).
  * **Payment & Order Status** enums.
* **OrderItem**: Relation storing snapshots of product price at order time.

### 2. Client State (Zustand)
Global client state is managed in `app/store/useCartStore.ts`.
* Persistence is configured to cache cart items to `localStorage` under the key `'flower-cart-storage'`.
* Includes typical utility functions: `addToCart`, `removeFromCart`, `updateQuantity`, `clearCart`, `getTotalItems`, and `getTotalPrice`.

### 3. Styling & Configuration
* **Tailwind CSS v4**: Enabled using `@tailwindcss/postcss`. No separate `@tailwind` directives needed as configuration and styles are managed dynamically.
* **ESLint Flat Config**: Structured flat layout utilizing `defineConfig` and `globalIgnores` inside `eslint.config.mjs`.

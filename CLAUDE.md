# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Next.js 16 — read before writing any Next code

This project runs **Next.js 16 / React 19**. Several APIs differ from older training data. `.github/copilot-instructions.md` has the full list; the load-bearing ones:

- **Request APIs are async-only**: `await cookies()`, `await headers()`, and `await props.params` / `await props.searchParams` in layouts, pages, route handlers, and metadata generators.
- **`middleware.ts` is now `proxy.ts`** with a named `proxy` export (see root `proxy.ts`). Runtime is strictly `nodejs`; no Edge.
- **Turbopack is the default** for `next dev` and `next build`. Custom `webpack` config breaks the build unless you pass `next build --webpack`; Turbopack config is top-level `turbopack`, not `experimental.turbopack`.
- Caching APIs (`cacheLife`, `cacheTag`) are stable and imported from `next/cache`. `revalidateTag` now requires a second `cacheLife`-profile argument.

`next.config.ts` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`, so **the build will not catch type or lint errors** — run `npm run lint` and check types separately.

## Commands

```bash
npm run dev              # dev server (Turbopack) on :3000
npm run build            # production build (Turbopack)
npm run lint             # ESLint flat config (eslint.config.mjs)
npm run format           # Prettier write — 4-space tabs, double quotes, semis, trailing commas
npm run format:check     # Prettier check

npx prisma generate      # regenerate client into prisma/generated/ (NOT node_modules)
npx prisma migrate dev   # create + apply a migration
npx prisma studio        # DB browser

docker compose up -d     # local Postgres (db: flower-store, user/pass: postgres/12345, :5432)
```

Prisma reads `prisma.config.ts` (schema at `prisma/schema.prisma`, needs `DATABASE_URL`). There is **no test runner configured**.

## Architecture

### `app/` is routing only; `src/` holds everything else (Feature-Sliced Design)

Every file under `app/` is a thin Next.js entrypoint that re-exports the real component from `src/_pages/` or `src/_app/`:

```tsx
// app/(store-front)/catalog/page.tsx
export { CatalogPage as default } from "@/_pages/store-front/catalog";
```

FSD layers live under `src/` (in dependency order — a layer may only import from layers below it):

| Layer | Path | Contents |
|-------|------|----------|
| app | `src/_app/` | Zustand stores, assembled layouts, providers, `Initializer`, auth route handler wiring |
| pages | `src/_pages/` | Full page compositions (`*.page.tsx` under `ui/`) |
| widgets | `src/widgets/` | Landing-page sections (hero, categories, testimonials, footer, …) |
| features | `src/features/` | User actions with business value (e.g. `auth/logout`) |
| entities | `src/entites/` | Domain models + server actions (**folder is misspelled `entites` — imports depend on it**) |
| shared | `src/shared/` | `ui/` (shadcn primitives), `components/`, `hooks/`, `lib/` (utils, constants, enums) |

`_app` / `_pages` are underscore-prefixed to avoid colliding with Next's reserved `app/` and `pages/`. Each slice exposes a barrel `index.ts`; import from the barrel, not deep paths.

### Import aliases (`tsconfig.json`)

`@/*` → repo root, `@/shared/*`, `@/_app/*`, `@/_pages/*`, `@/widgets/*` → `src/…`. There is **no alias for `entites` or `features`**, so those are imported as `@/src/entites/…` and `@/src/features/…`. Both styles appear in the codebase.

### Auth (Auth.js v5 / next-auth beta)

- `auth.config.ts` — providers (Credentials via bcrypt + Prisma, Google OAuth with first-login user upsert) and JWT `jwt`/`session` callbacks that carry `id` and `role`.
- `auth.ts` — exports `{ handlers, auth, signIn, signOut }`.
- `next-auth.d.ts` — module augmentation adding `id`/`role` to `User`, `Session`, and `JWT`.
- `proxy.ts` — route guard: blocks non-`ADMIN` from `/admin`, bounces signed-in users away from `/login`/`/register`.
- Server actions in `src/entites/user/actions/user.action.ts` (`loginAction`, `signUpAction`, `getMeAction`, `logoutAction`, `signInWithGoogle`) — form actions validated with Zod schemas from `src/entites/user/model/auth.schema.ts`.

### Client session hydration — the `Initializer` pattern

`src/_app/initializer/initializer.tsx` wraps the store-front tree. On first mount, if `useUserStore` has no user it calls `getMeAction()` and blocks the UI with `<GlobalLoading />` until the session resolves, preventing auth-dependent components from flashing a signed-out state.

### State (Zustand, in `src/_app/store/`)

- `useCartStore` — persisted to `localStorage` key `flower-cart-storage`; handles standard products, add-ons, and custom bouquets.
- `useCustomBouquetStore` — session-only; multi-step bouquet-builder wizard state.
- `useUserStore` — session-only; cached `UserVM`, populated by `Initializer`.

### Prisma

Client is generated to `prisma/generated/` (custom `output`), not `node_modules`. Always import types from `@/prisma/generated/client` and the singleton from `@/prisma/prisma-instance` (uses the `PrismaPg` adapter over `DATABASE_URL`). Schema models the flower-gifting domain: `Order` separates buyer vs. recipient, carries `cardMessage`, `deliveryDate`/`deliverySlot`, `isAnonymous`; `Stem`/`ProductStem`/`CustomBouquetStem` track stem-level inventory and bouquet recipes.

## Known rough edges

- `src/entites/` misspelling is load-bearing — renaming means updating every import.
- `store-front.layout.tsx` renders a hardcoded placeholder `user` object instead of reading the store/session.
- `signUpAction` creates users with `role: ADMIN` and leaves a `debugger` in `loginAction` — dev artifacts.
- `docs/superpowers/specs/2026-07-13-flower-store-design-updated.md` is a fuller design doc but predates the landing-page widgets; treat it as background, not current truth.

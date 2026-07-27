# Landing Page Design: Flower Store Storefront

**Date**: 2026-07-27  
**Status**: Approved  
**Author**: Copilot CLI

---

## 1. Overview

Design and implement the customer-facing landing page (`/`) for the flower store. The page uses its own full-width layout (sticky top navbar, no sidebar, no footer). The existing `StoreFrontLayout` with sidebar is **not modified** — it continues to serve `/catalog` and `/custom-bouquet`.

---

## 2. Color System

Four brand colors are registered as Tailwind v4 CSS custom properties in `app/globals.css` for convenient utility-class usage throughout the entire site.

| Token class suffix | Hex | Usage |
|---|---|---|
| `brand-navy` | `#0A2947` | Navbar background, primary CTA buttons, section headings |
| `brand-cream` | `#F3E4C9` | Page background, hero, card surfaces |
| `brand-sage` | `#D3D4C0` | Featured Products section background, input borders |
| `brand-earth` | `#8B5E3C` | Accent badges, category pills hover, warm highlight text |

Implementation: added under `@theme inline` in `app/globals.css`:

```css
@theme inline {
  /* ... existing tokens ... */
  --color-brand-navy:  #0A2947;
  --color-brand-cream: #F3E4C9;
  --color-brand-sage:  #D3D4C0;
  --color-brand-earth: #8B5E3C;
}
```

This enables classes like `bg-brand-navy`, `text-brand-cream`, `border-brand-sage`, `hover:bg-brand-earth`, etc.

---

## 3. Layout Architecture

### 3.1 Home Page Layout

The landing page (`/`) has its own standalone layout. It is **not** wrapped in `StoreFrontLayout`. Instead, the layout is composed directly inside `home.page.tsx`:

```
<Navbar />              ← sticky, full-width
<main>
  <HeroSection />
  <CategoriesSection />
  <FeaturedProductsSection />
  <WhyChooseUsSection />
</main>
```

### 3.2 Navbar (`src/widgets/navbar/`)

A sticky, full-width navbar with three zones:

- **Left**: Logo text ("🌸 BloomStore")
- **Center**: Nav links — Home (`/`), Catalog (`/catalog`), Custom Bouquet (`/custom-bouquet`)
- **Right**: Cart icon with item-count badge (from `useCartStore`), Login link or User Avatar dropdown (from `useUserStore`)

Styling: `bg-brand-navy text-brand-cream`. Sticky via `sticky top-0 z-50`. The `UserDropDownMenu` entity and `LogOutButton` feature are reused here.

### 3.3 Existing StoreFrontLayout

`src/_app/layout/store-front.layout.tsx` is **not modified**. The sidebar layout continues unchanged for all `(store-front)` route pages.

---

## 4. Landing Page Sections (`src/_pages/home/`)

The home page composes four sections in order:

### 4.1 Hero Section

**File**: `src/_pages/home/ui/sections/hero.section.tsx`

- **Layout**: 2-column split on desktop (text left / image right), stacked on mobile
- **Background**: `bg-brand-cream`
- **Left column**:
  - Small badge: "Free delivery on orders over 500k" (`bg-brand-earth text-white rounded-full`)
  - H1 headline: "Fresh Flowers, Delivered with Love"
  - Subtext: 1–2 sentences about same-day delivery and custom bouquets
  - Two CTA buttons:
    - Primary: "Shop Now" → `/catalog` (`bg-brand-navy text-brand-cream`)
    - Secondary: "Build Custom Bouquet" → `/custom-bouquet` (outlined, `border-brand-navy text-brand-navy`)
- **Right column**: `<Image>` with a placeholder (`/hero-flowers.jpg`), rounded-2xl, `object-cover`

### 4.2 Categories Section

**File**: `src/_pages/home/ui/sections/categories.section.tsx`

- **Background**: `bg-brand-cream`
- Section heading: "Shop by Occasion"
- **Layout**: horizontal scrollable row of pill/chip buttons
- Category data: static array for now — Birthday, Grand Opening, Anniversary, Sympathy, Just Because, Wedding
- Each pill links to `/catalog?category=<slug>`
- Default style: `border border-brand-sage bg-white text-brand-navy`
- Hover: `bg-brand-earth text-white`

### 4.3 Featured Products Section

**File**: `src/_pages/home/ui/sections/featured-products.section.tsx`

- **Background**: `bg-brand-sage`
- Section heading: "Our Picks for You"
- **Layout**: responsive grid (1 col mobile → 2 col tablet → 3 col desktop)
- Data source: static mock array of 6 products (real DB integration deferred)
- Each product card:
  - Square image area, `object-cover`, rounded-xl
  - Product name (bold, `text-brand-navy`)
  - Price (`text-brand-earth`)
  - "Add to Cart" button (`bg-brand-navy text-brand-cream hover:bg-brand-earth`)

### 4.4 Why Choose Us Section

**File**: `src/_pages/home/ui/sections/why-choose-us.section.tsx`

- **Background**: `bg-brand-navy`
- Section heading: "Why Choose BloomStore?" (`text-brand-cream`)
- **Layout**: 3-column grid on desktop, stacked on mobile
- Three feature cards (emoji icon + title + description):
  1. 🌿 "Fresh Daily" — "Stems sourced fresh every morning from local growers"
  2. 🚀 "Same-Day Delivery" — "Order before 2 PM for delivery the same day"
  3. 🎁 "Anonymous Gifting" — "Send anonymously — the recipient never knows unless you want them to"
- Card styling: `bg-white/10 rounded-2xl text-brand-cream`

---

## 5. File Structure

```
src/
  widgets/
    navbar/
      index.ts
      ui/
        navbar.tsx
    index.ts              ← MODIFIED: export Navbar
  _pages/
    home/
      index.ts
      ui/
        home.page.tsx     ← MODIFIED: composes Navbar + all sections
        sections/
          hero.section.tsx
          categories.section.tsx
          featured-products.section.tsx
          why-choose-us.section.tsx
app/
  globals.css             ← MODIFIED: add 4 brand color tokens
```

---

## 6. Routing Impact

- `app/page.tsx` (home) uses `app/layout.tsx` (root) only — the sidebar layout is **not** inherited
- `app/(store-front)/layout.tsx` (catalog, custom-bouquet) is **unaffected**
- `app/(auth)/` (login, register) is **unaffected**
- `app/admin/` is **unaffected**

---

## 7. Constraints & Decisions

- **Static data only**: Featured products and categories use hardcoded mock data. DB integration is deferred.
- **No footer**: Explicitly out of scope per user decision.
- **No dark mode**: The brand palette is defined for light mode only.
- **No testimonials / newsletter**: Deferred to keep scope focused.
- **Image placeholders**: Hero image uses a placeholder. Product images in cards use placeholder URLs.
- **Responsive**: Mobile-first, breakpoints at `md` and `lg`.

# Flower Store Implementation Plan (Skip Testing Phase)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete full-stack Feature-Sliced Design flower store storefront and admin panel on Next.js 16, React 19, Prisma with PostgreSQL, and Zustand without automated test suites.

**Architecture:** Full-stack Next.js monolith with client-side SPA storefront. Business features are layered under FSD directories (shared, entities, features, widgets, pages, app).

**Tech Stack:** Next.js 16, React 19, Zustand, Tailwind CSS v4, Auth.js v5, Prisma ORM, PostgreSQL.

## Global Constraints
*   **Operating System**: Windows NT (use backslashes `\` for paths).
*   **Next.js Version**: 16.2.9 (strictly async request-time parameters, proxy.ts instead of middleware.ts).
*   **React Version**: 19.2.4 (uses `React.use` or Promises for async properties).
*   **Tailwind CSS**: v4 (utility-first styles managed via `@tailwindcss/postcss`).
*   **Linting**: Strict explicit-any rules (`@typescript-eslint/no-explicit-any` is disallowed).

---

### Task 1: Core Shared Setup & Database Connection

**Files:**
- Create: `shared/lib/prisma.ts`
- Create: `shared/ui/Button.tsx`
- Create: `shared/ui/Input.tsx`

**Interfaces:**
- Consumes: None
- Produces: `db` Prisma client, `Button` UI component, `Input` UI component.

- [ ] **Step 1: Implement `shared/lib/prisma.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 2: Implement `shared/ui/Button.tsx`**

```tsx
import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50";
  const variants = {
    primary: "bg-rose-600 text-white hover:bg-rose-700",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Implement `shared/ui/Input.tsx`**

```tsx
import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Run build validation check**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add shared/lib/prisma.ts shared/ui/Button.tsx shared/ui/Input.tsx
git commit -m "feat: add shared db client and baseline Button/Input UI components"
```

---

### Task 2: Product Card & Catalog Filter (Entities & Features)

**Files:**
- Create: `entities/product/ui/ProductCard.tsx`
- Create: `features/catalog-filter/ui/CatalogFilter.tsx`

**Interfaces:**
- Consumes: `Button` from `shared/ui/Button.tsx`
- Produces: `ProductCard` component, `CatalogFilter` sidebar selector.

- [ ] **Step 1: Implement `entities/product/ui/ProductCard.tsx`**

```tsx
import { Button } from "@/shared/ui/Button";
import { useCartStore } from "@/app/store/useCartStore";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  stock: number;
}

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAdd = () => {
    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.images[0] || "/placeholder.jpg",
      quantity: 1,
    });
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col h-full">
      <div className="h-48 bg-slate-100 relative">
        <img
          src={product.images[0] || "/placeholder.jpg"}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-lg text-slate-900 mb-1">{product.name}</h3>
        <p className="text-sm text-slate-500 line-clamp-2 flex-grow mb-4">{product.description}</p>
        <div className="flex items-center justify-between mt-auto">
          <span className="font-semibold text-rose-600">{product.price.toLocaleString()} VND</span>
          <Button variant="outline" onClick={handleAdd}>
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `features/catalog-filter/ui/CatalogFilter.tsx`**

```tsx
import * as React from "react";

interface FilterProps {
  onOccasionChange: (occasion: string) => void;
  onColorChange: (color: string) => void;
}

export function CatalogFilter({ onOccasionChange, onColorChange }: FilterProps) {
  const occasions = ["All", "Birthday", "Grand Opening", "Valentine's Day", "Condolence"];
  const colors = ["All", "Red", "Pink", "Yellow", "White", "Purple"];

  return (
    <div className="space-y-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div>
        <h4 className="font-semibold text-slate-900 mb-2">Occasions</h4>
        <div className="flex flex-col gap-2">
          {occasions.map((o) => (
            <button
              key={o}
              onClick={() => onOccasionChange(o === "All" ? "" : o)}
              className="text-left text-sm text-slate-600 hover:text-rose-600 transition-colors text-slate-700 font-medium"
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 mb-2">Colors</h4>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c === "All" ? "" : c)}
              className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-rose-500 hover:text-rose-600 transition-colors"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run build validation check**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add entities/product/ui/ProductCard.tsx features/catalog-filter/ui/CatalogFilter.tsx
git commit -m "feat: add product card entity and sidebar catalog filter"
```

---

### Task 3: Storefront Header & Cart Sidebar Widget

**Files:**
- Create: `widgets/header/ui/Header.tsx`

**Interfaces:**
- Consumes: `useCartStore` from `app/store/useCartStore.ts`, `Button` from `shared/ui/Button.tsx`.
- Produces: `Header` layout widget with cart dropdown and dynamic item tally.

- [ ] **Step 1: Implement `widgets/header/ui/Header.tsx`**

```tsx
import { useCartStore } from "@/app/store/useCartStore";
import { Button } from "@/shared/ui/Button";

export function Header() {
  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="font-black text-2xl text-rose-600 tracking-tight">
          FlowerStore
        </a>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Button variant="outline" className="flex items-center gap-2">
              🛒 Cart ({totalItems})
            </Button>
            
            {/* Hover cart summary dropdown */}
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-4 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-150">
              <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Cart Summary</h4>
              {cartItems.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Your cart is empty.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="truncate pr-4">
                        <p className="font-medium text-slate-800 truncate">{item.name}</p>
                        <p className="text-slate-400 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-semibold text-slate-900">{(item.price * item.quantity).toLocaleString()} VND</span>
                    </div>
                  ))}
                </div>
              )}
              {cartItems.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Total:</span>
                    <span>{totalPrice.toLocaleString()} VND</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="w-full text-xs py-1" onClick={clearCart}>
                      Clear
                    </Button>
                    <a href="/checkout" className="w-full">
                      <Button className="w-full text-xs py-1 text-center">
                        Checkout
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Run build validation check**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add widgets/header/ui/Header.tsx
git commit -m "feat: add global layout Header widget with cart state dropdown"
```

---

### Task 4: Custom Bouquet Builder (Features & Pages)

**Files:**
- Create: `features/bouquet-builder/ui/BouquetBuilderWizard.tsx`
- Create: `app/(storefront)/custom-builder/page.tsx`

**Interfaces:**
- Consumes: `useCustomBouquetStore` from `app/store/useCustomBouquetStore.ts`, `useCartStore` from `app/store/useCartStore.ts`.
- Produces: Step-by-step interactive custom builder interface.

- [ ] **Step 1: Implement `features/bouquet-builder/ui/BouquetBuilderWizard.tsx`**

```tsx
import { useCustomBouquetStore } from "@/app/store/useCustomBouquetStore";
import { useCartStore } from "@/app/store/useCartStore";
import { Button } from "@/shared/ui/Button";

const availableStems = [
  { id: "s1", name: "Red Rose", pricePerStem: 20000, color: "Red" },
  { id: "s2", name: "Yellow Tulip", pricePerStem: 25000, color: "Yellow" },
  { id: "s3", name: "Sun Flower", pricePerStem: 35000, color: "Yellow" },
  { id: "s4", name: "White Lily", pricePerStem: 30000, color: "White" },
];

const wraps = ["Kraft Paper", "Pink Matte Film", "Luxury Black Box", "Clear Cellophane"];
const ribbons = ["Silk Red Ribbon", "Satin Gold Ribbon", "Pink Cotton String", "No Ribbon"];

export function BouquetBuilderWizard() {
  const {
    step,
    selectedStems,
    selectedWrap,
    selectedRibbon,
    nextStep,
    prevStep,
    addStem,
    updateStemQuantity,
    setWrap,
    setRibbon,
    resetBuilder,
    getBuilderTotalPrice,
    getBuilderTotalStems,
  } = useCustomBouquetStore();

  const addToCart = useCartStore((state) => state.addToCart);

  const handleAddToCart = () => {
    const total = getBuilderTotalPrice();
    const uniqueId = `CUSTOM-${Date.now()}`;
    addToCart({
      id: uniqueId,
      name: `Custom Bouquet (${getBuilderTotalStems()} stems)`,
      slug: "custom-bouquet",
      price: total,
      image: "/custom-bouquet-placeholder.jpg",
      quantity: 1,
      isCustomBouquet: true,
      customDetails: {
        wrapPaper: selectedWrap || "None",
        ribbon: selectedRibbon || "None",
        stems: selectedStems.map((s) => ({
          stemId: s.id,
          name: s.name,
          pricePerStem: s.pricePerStem,
          quantity: s.quantity,
          color: s.color,
        })),
      },
    });
    resetBuilder();
    window.location.href = "/";
  };

  return (
    <div className="max-w-3xl mx-auto bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
        <h2 className="font-bold text-2xl text-slate-900">Custom Bouquet Builder</h2>
        <span className="text-sm font-semibold text-rose-600">Step {step} of 3</span>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h3 className="font-semibold text-lg text-slate-800">1. Choose your flower stems</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableStems.map((stem) => {
              const count = selectedStems.find((s) => s.id === stem.id)?.quantity || 0;
              return (
                <div key={stem.id} className="border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{stem.name}</p>
                    <p className="text-sm text-rose-500">{stem.pricePerStem.toLocaleString()} VND / stem</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => updateStemQuantity(stem.id, count - 1)}>-</Button>
                    <span className="font-bold text-slate-800">{count}</span>
                    <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => addStem(stem)}>+</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg text-slate-800 mb-4">2. Select Wrapping Paper</h3>
            <div className="grid grid-cols-2 gap-3">
              {wraps.map((wrap) => (
                <button
                  key={wrap}
                  onClick={() => setWrap(wrap)}
                  className={`p-4 border rounded-xl text-left font-medium transition-all ${selectedWrap === wrap ? "border-rose-500 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                >
                  {wrap}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-800 mb-4">3. Select Satin Ribbon</h3>
            <div className="grid grid-cols-2 gap-3">
              {ribbons.map((ribbon) => (
                <button
                  key={ribbon}
                  onClick={() => setRibbon(ribbon)}
                  className={`p-4 border rounded-xl text-left font-medium transition-all ${selectedRibbon === ribbon ? "border-rose-500 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                >
                  {ribbon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h3 className="font-semibold text-lg text-slate-800">3. Review Your Composition</h3>
          <div className="border border-slate-200 p-6 rounded-xl space-y-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-2">Selected Stems</p>
              {selectedStems.length === 0 ? (
                <p className="text-sm text-slate-500">No stems selected yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedStems.map((stem) => (
                    <div key={stem.id} className="flex justify-between text-sm">
                      <span className="text-slate-700">{stem.name} x {stem.quantity}</span>
                      <span className="font-medium text-slate-900">{(stem.pricePerStem * stem.quantity).toLocaleString()} VND</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Packaging</p>
              <p className="text-sm text-slate-800">Wrap: {selectedWrap || "None"} | Ribbon: {selectedRibbon || "None"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
        {step > 1 ? (
          <Button variant="outline" onClick={prevStep}>Back</Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg text-rose-600">{getBuilderTotalPrice().toLocaleString()} VND</span>
          {step < 3 ? (
            <Button onClick={nextStep} disabled={step === 1 && selectedStems.length === 0}>Next Step</Button>
          ) : (
            <Button onClick={handleAddToCart}>Add Bouquet to Cart</Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `/app/(storefront)/custom-builder/page.tsx`**

```tsx
import { Header } from "@/widgets/header/ui/Header";
import { BouquetBuilderWizard } from "@/features/bouquet-builder/ui/BouquetBuilderWizard";

export default async function CustomBuilderPage() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <BouquetBuilderWizard />
      </main>
    </>
  );
}
```

- [ ] **Step 3: Run build validation check**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add features/bouquet-builder/ui/BouquetBuilderWizard.tsx app/\(storefront\)/custom-builder/page.tsx
git commit -m "feat: implement custom bouquet builder 3-step wizard and route page"
```

---

### Task 5: Gifting Checkout Flow (Features & Pages)

**Files:**
- Create: `features/checkout/ui/CheckoutForm.tsx`
- Create: `app/(storefront)/checkout/page.tsx`

**Interfaces:**
- Consumes: `useCartStore` from `app/store/useCartStore.ts`, `Button` and `Input` from `shared/ui/`.
- Produces: Gifting-specialized checkout form page.

- [ ] **Step 1: Implement `features/checkout/ui/CheckoutForm.tsx`**

```tsx
"use client";

import * as React from "react";
import { useCartStore } from "@/app/store/useCartStore";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

const preMadeCards = [
  { id: "bday", title: "Happy Birthday", message: "Wishing you a wonderful day filled with love, laughter, and beautiful moments. Happy Birthday!" },
  { id: "anniv", title: "Wedding Anniversary", message: "To many more years of love, devotion, and sharing wonderful adventures together. Happy Anniversary!" },
  { id: "congrats", title: "Congratulations", message: "So incredibly proud of your accomplishments! May this mark the beginning of many more successes." },
];

export function CheckoutForm() {
  const cartItems = useCartStore((state) => state.items);
  const totalPrice = useCartStore((state) => state.getTotalPrice());

  const [buyerName, setBuyerName] = React.useState("");
  const [buyerPhone, setBuyerPhone] = React.useState("");
  const [buyerEmail, setBuyerEmail] = React.useState("");

  const [recipientName, setRecipientName] = React.useState("");
  const [recipientPhone, setRecipientPhone] = React.useState("");
  const [recipientAddress, setRecipientAddress] = React.useState("");
  const [isAnonymous, setIsAnonymous] = React.useState(false);

  const [cardMessage, setCardMessage] = React.useState("");
  const [deliveryDate, setDeliveryDate] = React.useState("");
  const [deliverySlot, setDeliverySlot] = React.useState("08:00 - 10:00");

  const selectCardTemplate = (msg: string) => {
    setCardMessage(msg);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !recipientName || !recipientAddress) {
      alert("Please fill in all mandatory fields.");
      return;
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName, buyerPhone, buyerEmail,
        recipientName, recipientPhone, recipientAddress, isAnonymous,
        cardMessage, deliveryDate, deliverySlot,
        items: cartItems,
        totalAmount: totalPrice,
      }),
    });

    const result = await response.json();
    if (result.success && result.paymentUrl) {
      window.location.href = result.paymentUrl;
    } else {
      alert("Failed to initiate payment. Please try again.");
    }
  };

  return (
    <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
      <div className="space-y-8 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
        <div>
          <h3 className="font-bold text-xl text-slate-900 border-b border-slate-100 pb-3 mb-4">Giver (Buyer) Information</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Your Name *</label>
              <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Full Name" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Phone Number *</label>
                <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="0901234567" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Email *</label>
                <Input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-xl text-slate-900 border-b border-slate-100 pb-3 mb-4">Recipient Information</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="anonymous-chk" className="text-sm font-semibold text-slate-700 block">Recipient's Name *</label>
              <label className="flex items-center gap-2 text-sm text-rose-600 cursor-pointer">
                <input
                  id="anonymous-chk"
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 bg-white"
                />
                Anonymous Delivery
              </label>
            </div>
            <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Full Name" required />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Recipient Phone *</label>
                <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="0909876543" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Delivery Slot *</label>
                <select
                  value={deliverySlot}
                  onChange={(e) => setDeliverySlot(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  <option>08:00 - 10:00</option>
                  <option>10:00 - 12:00</option>
                  <option>14:00 - 16:00</option>
                  <option>16:00 - 18:00</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Recipient Address *</label>
              <Input value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="123 Street Name, Ward, District, Da Nang" required />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Delivery Date *</label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 bg-slate-50 border border-slate-200 p-8 rounded-2xl">
        <div>
          <h3 className="font-bold text-xl text-slate-900 border-b border-slate-200 pb-3 mb-4">Gifting Cards Message</h3>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {preMadeCards.map((card) => (
                <Button
                  key={card.id}
                  type="button"
                  variant="outline"
                  className="text-xs py-1 px-3"
                  onClick={() => selectCardTemplate(card.message)}
                >
                  {card.title}
                </Button>
              ))}
            </div>
            <textarea
              value={cardMessage}
              onChange={(e) => setCardMessage(e.target.value)}
              placeholder="Enter card message card here..."
              className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white text-sm p-3"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="font-bold text-lg text-slate-900 mb-4">Order Summary</h3>
          <div className="space-y-3 mb-6">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-slate-700 font-medium">{item.name} x {item.quantity}</span>
                <span className="font-bold text-slate-900">{(item.price * item.quantity).toLocaleString()} VND</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-black text-xl text-rose-600 border-t border-slate-200 pt-4 mb-8">
            <span>Total:</span>
            <span>{totalPrice.toLocaleString()} VND</span>
          </div>
          <Button type="submit" className="w-full py-3 text-center text-lg font-black tracking-wide">
            Initiate Transaction & Pay
          </Button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Implement `/app/(storefront)/checkout/page.tsx`**

```tsx
import { Header } from "@/widgets/header/ui/Header";
import { CheckoutForm } from "@/features/checkout/ui/CheckoutForm";

export default async function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="font-black text-3xl text-slate-900 text-center mb-12">Secure Order Checkout</h2>
        <CheckoutForm />
      </main>
    </>
  );
}
```

- [ ] **Step 3: Run build validation check**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add features/checkout/ui/CheckoutForm.tsx app/\(storefront\)/checkout/page.tsx
git commit -m "feat: implement gifting checkout form feature and route page"
```

---

### Task 6: Payment API Route Hook (Webhooks)

**Files:**
- Create: `app/api/webhook/route.ts`

**Interfaces:**
- Consumes: None (receives external POST webhooks).
- Produces: REST Endpoint `/api/webhook` updating DB and launching alerts.

- [ ] **Step 1: Implement `app/api/webhook/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/shared/lib/prisma";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const signature = request.headers.get("x-signature") || request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ success: false, error: "Missing signature" }, { status: 400 });
    }

    const { orderNumber, status, paymentSessionId } = payload;

    const order = await db.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (status === "PAID") {
      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
            paymentSessionId,
          },
        }),
      ]);

      const message = `🌸 *New Payment Finalized!*\nOrder: #${orderNumber}\nAmount: ${order.totalAmount.toLocaleString()} VND`;
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run build validation check**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add app/api/webhook/route.ts
git commit -m "feat: implement webhooks API handler with transaction updates and telegram alert actions"
```

---

### Task 7: Admin Panel Real-time Stock & Cards PDF Hook

**Files:**
- Create: `app/(admin)/admin/page.tsx`
- Create: `app/api/admin/order/[id]/pdf/route.ts`

**Interfaces:**
- Consumes: `db` Prisma client, `pdfkit` (or simple text buffers).
- Produces: Secure admin dashboard order portal and printable cards generator.

- [ ] **Step 1: Implement `/app/(admin)/admin/page.tsx`**

```tsx
import * as React from "react";
import { db } from "@/shared/lib/prisma";
import { Button } from "@/shared/ui/Button";

export default async function AdminDashboard() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <h2 className="font-black text-3xl text-slate-900">Florist Order Console</h2>
        <span className="text-sm bg-rose-50 text-rose-600 font-bold px-3 py-1 rounded-full">
          Active Store Orders
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {orders.length === 0 ? (
          <p className="text-slate-500 text-center py-12">No orders placed yet.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="border border-slate-200 bg-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2 flex-grow">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">#{order.orderNumber}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${order.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Recipient: <span className="font-semibold text-slate-800">{order.recipientName}</span> | Address: {order.recipientAddress}
                </p>
                {order.cardMessage && (
                  <p className="text-xs bg-slate-50 p-2.5 border border-slate-100 rounded-lg text-slate-600 italic">
                    Card message: "{order.cardMessage}"
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <a href={`/api/admin/order/${order.id}/pdf`} target="_blank" className="w-full md:w-auto">
                  <Button variant="outline" className="w-full">
                    Print Greeting Card PDF
                  </Button>
                </a>
                <Button className="w-full md:w-auto">
                  Mark Delivered
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `/app/api/admin/order/[id]/pdf/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/shared/lib/prisma";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const order = await db.order.findUnique({
      where: { id },
    });

    if (!order) {
      return new Response("Order not found", { status: 404 });
    }

    const cardContent = `
========================================
         FLOWER GREETING CARD
========================================
Order: #${order.orderNumber}
Recipient: ${order.recipientName}
Phone: ${order.recipientPhone}
Address: ${order.recipientAddress}
Anonymous Sender: ${order.isAnonymous ? "YES" : "NO"}
----------------------------------------
MESSAGE CARD GREETINGS:

${order.cardMessage || "No message greetings printed."}
========================================
`;

    return new Response(cardContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="greeting-card-${order.orderNumber}.txt"`,
      },
    });
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}
```

- [ ] **Step 3: Run build validation check**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/admin/page.tsx app/api/admin/order/\[id\]/pdf/route.ts
git commit -m "feat: implement admin dashboard console order list and order card print raw text hook"
```

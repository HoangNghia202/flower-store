# System Design: Flower Store Web Application

**Date**: 2026-06-19  
**Status**: Proposed  
**Author**: Copilot CLI  
**Technologies**: Next.js 16, React 19, Prisma ORM, PostgreSQL, Zustand, Auth.js (NextAuth.js v5), Tailwind CSS v4, Shadcn UI  

---

## 🏛️ 1. Architectural Approach

We propose a **Fully Integrated Next.js Full-Stack Monolith** (Approach 1) as the optimal design. It minimizes deployment complexity, eliminates cross-origin security concerns, provides a unified codebase with shared types, and delivers the highest performance.

### System Overview Diagram

```
+-------------------------------------------------------------------------------------------------+
|                                     Next.js 16 Application                                       |
|                                                                                                 |
|   +---------------------------------------+           +-------------------------------------+   |
|   |         Storefront / Customer         |           |           Admin Dashboard           |   |
|   |  - Product Catalog (ISR cached)       |           |  - Secure `/admin` sub-routes       |   |
|   |  - Custom Bouquet Builder (Zustand)   |           |  - Order / Inventory / Shipping     |   |
|   |  - Gifting Checkout Flow              |           |  - Card PDF Export (pdfkit)         |   |
|   +---------------------------------------+           +-------------------------------------+   |
|                       |                                                  |                      |
|                       v                                                  v                      |
|            [ Client Router Cache ]                            [ Server Actions (Mutations) ]    |
|                       |                                                  |                      |
+-----------------------|--------------------------------------------------|----------------------+
                        |                                                  |
                        +------------------------+-------------------------+
                                                 |
                                                 v
                                     [ Next.js proxy.ts / Auth ]
                                                 |
                                                 v
                                   [ Prisma Client / PostgreSQL ]
```

---

## 💾 2. Enhanced Database Schema (Prisma)

We will expand `prisma/schema.prisma` to cover all storefront and admin requirements.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  CUSTOMER
  ADMIN
}

model User {
  id                  String                @id @default(cuid())
  name                String?
  email               String                @unique
  password            String // Hashed credential password
  role                UserRole              @default(CUSTOMER)
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt
  orders              Order[]
  addressBook         AddressBookEntry[]
  reminders           AnniversaryReminder[]
}

model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  description String?
  products    Product[]
  createdAt   DateTime  @default(now())
}

model Product {
  id          String         @id @default(cuid())
  name        String
  slug        String         @unique
  description String
  price       Float // Base price for standard design
  images      String[] // Cloudinary or AWS S3 URLs
  stock       Int            @default(0) // Prefabricated bouquet stock
  isFeatured  Boolean        @default(false)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  categoryId  String
  category    Category       @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]
  stems       ProductStem[] // Recipe formulas
}

// Raw stem inventory for flower-by-stem calculations
model Stem {
  id          String         @id @default(cuid())
  name        String         @unique // e.g., "Red Rose", "Yellow Tulip", "Sunflower"
  color       String // Primary color for filtering
  stock       Int            @default(0) // Available stem count in fridge
  criticalMin Int            @default(10) // Threshold for alerts
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  products    ProductStem[]
  customItems CustomBouquetStem[]
}

// Junction table for Product recipe stem formulas
model ProductStem {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  stemId      String
  stem        Stem     @relation(fields: [stemId], references: [id], onDelete: Cascade)
  quantity    Int      // Number of stems required for this product
  
  @@unique([productId, stemId])
}

model Order {
  id                String         @id @default(cuid())
  orderNumber       String         @unique // Display code (e.g., FLW-20260619-XXXX)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  status            OrderStatus    @default(PENDING)
  totalAmount       Float

  // Buyer Info
  buyerName         String
  buyerPhone        String
  buyerEmail        String

  // Recipient Info
  recipientName     String
  recipientPhone    String
  recipientAddress  String
  isAnonymous       Boolean        @default(false)

  // Flower-industry Gifting Additions
  cardMessage       String?
  deliveryDate      DateTime
  deliverySlot      String // e.g., "08:00 - 10:00"

  // Payments
  paymentMethod     String // "PAYOS" | "MOMO" | "COD" | "STRIPE"
  paymentStatus     PaymentStatus  @default(UNPAID)
  paymentSessionId  String?        // Webhook tracking ID

  userId            String?
  user              User?          @relation(fields: [userId], references: [id], onDelete: SetNull)
  items             OrderItem[]
  customBouquets    CustomBouquet[]
}

model OrderItem {
  id        String   @id @default(cuid())
  quantity  Int
  price     Float    // Snapshotted price at checkout

  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
}

// Custom client-built bouquet details associated with an order
model CustomBouquet {
  id          String              @id @default(cuid())
  price       Float
  quantity    Int                 @default(1)
  wrapPaper   String              // Type/Color of wrapping
  ribbon      String              // Type/Color of ribbon
  orderId     String
  order       Order               @relation(fields: [orderId], references: [id], onDelete: Cascade)
  stems       CustomBouquetStem[]
}

model CustomBouquetStem {
  id              String         @id @default(cuid())
  customBouquetId String
  customBouquet   CustomBouquet  @relation(fields: [customBouquetId], references: [id], onDelete: Cascade)
  stemId          String
  stem            Stem           @relation(fields: [stemId], references: [id])
  quantity        Int            // Stem count selected by user
}

model AddressBookEntry {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  label            String   // e.g., "Wife", "Mother", "Office"
  recipientName    String
  recipientPhone   String
  recipientAddress String
  createdAt        DateTime @default(now())
}

model AnniversaryReminder {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title            String   // e.g., "Wife's Birthday", "Wedding Anniversary"
  recipientName    String
  date             DateTime // Day/Month for yearly triggers
  lastTriggeredYear Int?
  createdAt        DateTime @default(now())
}

model Coupon {
  code          String      @id
  discountType  CouponType  @default(PERCENTAGE)
  value         Float       // Percentage or fixed amount
  maxUses       Int?
  usedCount     Int         @default(0)
  active        Boolean     @default(true)
  expiresAt     DateTime?
}

enum CouponType {
  PERCENTAGE
  FIXED
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  DELIVERING
  COMPLETED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PAID
  REFUNDED
}
```

---

## ⚡ 3. Storefront Subsystem Details & State Management

### State Management (Zustand)
We will leverage **Zustand** with local persistence for the general shopping cart and the multi-step bouquet builder.

#### 1. General Cart Store (`app/store/useCartStore.ts`)
Tracks Standard Products, Add-ons (cards, bears, chocolates), and Custom Bouquets.

```typescript
export interface CartItem {
  id: string; // Product ID or "CUSTOM-[uuid]"
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  isCustomBouquet?: boolean;
  customDetails?: {
    wrapPaper: string;
    ribbon: string;
    stems: { stemId: string; name: string; quantity: number; pricePerStem: number }[];
  };
  addons?: { id: string; name: string; price: number; quantity: number }[];
}
```

#### 2. Custom Bouquet Store (`app/store/useCustomBouquetStore.ts`)
Tracks active design configuration inside the multi-step builder.

```typescript
interface CustomBouquetState {
  step: number;
  selectedStems: Record<string, number>; // stemId -> quantity
  selectedWrap: string;
  selectedRibbon: string;
  nextStep: () => void;
  prevStep: () => void;
  addStem: (stemId: string) => void;
  removeStem: (stemId: string) => void;
  setWrap: (wrap: string) => void;
  setRibbon: (ribbon: string) => void;
  resetBuilder: () => void;
}
```

### Routing & Instant Navigation Strategy
For an instant user experience, highly interactive routes will export `unstable_instant`:
* `/product/[slug]`: Cached using stable `cacheLife` configuration with local `<Suspense>` wrapping dynamic stem stock details.
* `/category/[slug]`: Uses Incremental Static Regeneration (ISR) with revalidation parameters.

---

## 🛡️ 4. Security & Authentication (Auth.js & proxy.ts)

Authentication is handled via **Auth.js v5 (NextAuth)**.

### Session Strategy
1. **Credentials Provider**: Verify email and password via direct Prisma DB match with bcrypt hashing.
2. **Google OAuth Provider**: Secure social sign-in. User profiles are automatically upserted into the Prisma `User` table upon first-time login.

### Middleware/Proxy Routing
To secure the admin dashboard, we implement `proxy.ts` (Next.js 16 native structure) in the root of the project to check user role authentication.

```typescript
// proxy.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Standard Auth.js configuration

export async function proxy(request: Request) {
  const session = await auth();
  const url = new URL(request.url);

  // Secure admin dashboard
  if (url.pathname.startsWith("/admin")) {
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}
```

---

## 📦 5. Admin Dashboard Features

### Real-Time Order & Shipping Tracker
We use **Next.js Server Actions** together with client-side polling every 10 seconds to fetch real-time updates.

### Automatic Tag & Card Card PDF Printing
In the admin panel `/admin/orders/[id]`, a "Print Greeting Card" button invokes a Server Action or API Route handler. It returns a cleanly formatted PDF file of the message card (custom dimensions like 4" x 6") using `pdfkit` to direct-stream raw buffers back to the client.

### Recipe-Based Inventory Verification
Before confirming an order:
* Standard products have recipe dependencies (`ProductStem`).
* The system checks if raw stems are available (`Stem.stock >= required_qty`).
* If stem counts drop below requirements, the prefabricated bouquets are marked as **out of stock** dynamically in storefront rendering queries.

---

## 🎨 6. Webhooks & Integrations

### Webhook Route Handler (`app/api/webhook/route.ts`)
Listens to success payloads from PayOS, Momo, or Stripe. It updates the database transactionally:
```typescript
export async function POST(request: Request) {
  const payload = await request.json();
  const signature = request.headers.get("x-signature");

  // 1. Verify signatures 
  // 2. Locate order in DB matching transactional code
  // 3. Complete transaction: update Order to CONFIRMED, update PaymentStatus to PAID
  // 4. Deduct raw stem stocks based on recipe formula or custom bouquet stem list
  // 5. Send Telegram notification & confirmation email
}
```

### Discord / Telegram Bot Notification
A lightweight notification utility triggered in Server Actions or Webhooks to push order details instantly to the admin's messaging channel:
```typescript
export async function sendAdminNotification(orderNumber: string, amount: number) {
  const message = `🌸 *New Order Placed!*\nOrder: #${orderNumber}\nAmount: ${amount.toLocaleString()} VND`;
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" }),
  });
}
```

---

## 🧪 7. Validation & Error Handling

* **Checkout Verification**: Create a database lock/transaction when checkout is initiated to verify that raw `Stem` inventory satisfies the order quantity before accepting payment session initialization.
* **Fallback Behavior**: In case payment fails, webhooks will not trigger stock reductions, and order status automatically transitions to `CANCELLED` after a 30-minute expiration interval.

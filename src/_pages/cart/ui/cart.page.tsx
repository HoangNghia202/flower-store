"use client";

import { useState } from "react";
import Link from "next/link";
import { useHydrated } from "@/shared/hooks";
import { useCartStore } from "@/_app/store/useCartStore";
import { CheckoutButton, PaymentSuccessDialog } from "@/src/features/checkout";
import { CartLineItem } from "./cart-line-item";

export function CartPage() {
    const hydrated = useHydrated();
    const items = useCartStore((s) => s.items);
    const clearCart = useCartStore((s) => s.clearCart);
    const [paid, setPaid] = useState(false);
    const subtotal = useCartStore((s) =>
        s.items.reduce((sum, item) => {
            const addons = (item.addons ?? []).reduce(
                (a, x) => a + x.price * x.quantity,
                0,
            );
            return sum + (item.price + addons) * item.quantity;
        }, 0),
    );

    function handleCheckout() {
        clearCart();
        setPaid(true);
    }

    // Once paid, this must win over every other branch: `clearCart()` empties
    // `items`, which would otherwise drop us into the empty state and unmount
    // the dialog before it can show.
    if (paid) {
        return <PaymentSuccessDialog />;
    }

    // Cart state lives in a persisted (localStorage) store, so the server and
    // first client paint see an empty cart. Wait for hydration before deciding
    // between the empty state and the item list.
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
                    <div className="mt-5">
                        <CheckoutButton onCheckout={handleCheckout} />
                    </div>
                </aside>
            </div>
        </div>
    );
}

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

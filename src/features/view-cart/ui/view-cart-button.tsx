"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useHydrated } from "@/shared/hooks";
import { useCartStore } from "@/_app/store/useCartStore";

/**
 * Cart icon + item-count badge, links to `/cart`.
 *
 * The count is only rendered after hydration: the cart store is `persist`ed to
 * localStorage, so on the server (and the first client paint) it is empty.
 * Gating on {@link useHydrated} keeps SSR and hydration in agreement and avoids
 * a 0 → N flash once the store rehydrates.
 */
export function ViewCartButton({ className }: { className?: string }) {
    const hydrated = useHydrated();
    const count = useCartStore((s) =>
        s.items.reduce((total, item) => total + item.quantity, 0),
    );

    const showBadge = hydrated && count > 0;

    return (
        <Link
            href="/cart"
            aria-label={
                hydrated
                    ? `Cart, ${count} item${count === 1 ? "" : "s"}`
                    : "Cart"
            }
            className={cn(
                "relative inline-flex items-center justify-center rounded-full p-2 text-gray-500 transition-colors hover:bg-pink-50 hover:text-pink-600",
                className,
            )}
        >
            <ShoppingBag size={20} />
            {showBadge && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-semibold leading-none text-white">
                    {count > 99 ? "99+" : count}
                </span>
            )}
        </Link>
    );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogParams, ProductCardVM } from "@/src/entites/product/model";
import {
    ProductCard,
    ProductCardSkeleton,
    ProductGrid,
} from "@/src/entites/product";
import { Button } from "@/shared/ui";
import { loadMoreProducts } from "../actions/load-more.action";

interface ProductFeedProps {
    initialItems: ProductCardVM[];
    initialCursor: string | null;
    total: number;
    params: CatalogParams;
}

export function ProductFeed({
    initialItems,
    initialCursor,
    total,
    params,
}: ProductFeedProps) {
    const [items, setItems] = useState(initialItems);
    const [cursor, setCursor] = useState(initialCursor);
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    // guard against overlapping loads / stale closures
    const loadingRef = useRef(false);

    const loadMore = useCallback(async () => {
        if (loadingRef.current || cursor === null) return;
        loadingRef.current = true;
        setStatus("loading");
        try {
            const page = await loadMoreProducts(params, cursor);
            setItems((prev) => {
                const seen = new Set(prev.map((p) => p.id));
                return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
            });
            setCursor(page.nextCursor);
            setStatus("idle");
        } catch {
            setStatus("error");
        } finally {
            loadingRef.current = false;
        }
    }, [cursor, params]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || cursor === null) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) void loadMore();
            },
            { rootMargin: "600px 0px" },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [loadMore, cursor]);

    return (
        <div className="space-y-6">
            <ProductGrid>
                {items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                ))}
                {status === "loading" &&
                    Array.from({ length: 5 }).map((_, i) => (
                        <ProductCardSkeleton key={`sk-${i}`} />
                    ))}
            </ProductGrid>

            {cursor !== null && status !== "error" && (
                <div ref={sentinelRef} aria-hidden className="h-px" />
            )}

            {status === "error" && (
                <div className="flex flex-col items-center gap-2 py-6 text-sm text-gray-500">
                    <p>Couldn&apos;t load more products.</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void loadMore()}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {cursor === null && (
                <p className="py-8 text-center text-sm text-gray-400">
                    You&apos;ve seen all {total} arrangements.
                </p>
            )}
        </div>
    );
}

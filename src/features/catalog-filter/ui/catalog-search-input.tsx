"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui";
import {
    buildCatalogHref,
    type CatalogParams,
} from "@/src/entites/product/model";

export function CatalogSearchInput({ params }: { params: CatalogParams }) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [value, setValue] = useState(params.q ?? "");
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Re-sync local state when the URL changes elsewhere (pills "clear all",
    // browser back/forward). Compare against the previous prop during render
    // instead of writing state from an effect body.
    const [syncedQ, setSyncedQ] = useState(params.q);
    if (params.q !== syncedQ) {
        setSyncedQ(params.q);
        setValue(params.q ?? "");
    }

    useEffect(() => {
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, []);

    function onChange(next: string) {
        setValue(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            const q = next.trim() === "" ? undefined : next.trim();
            startTransition(() => {
                router.push(buildCatalogHref(params, { q }), { scroll: false });
            });
        }, 400);
    }

    return (
        <div className="relative w-full max-w-xs">
            <Search
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
            />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search arrangements…"
                className="pl-9"
                aria-label="Search products"
            />
        </div>
    );
}

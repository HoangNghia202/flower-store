"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Button,
    Input,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/shared/ui";
import {
    buildCatalogHref,
    type CatalogParams,
} from "@/src/entites/product/model";

export function CatalogPriceFilter({ params }: { params: CatalogParams }) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [min, setMin] = useState(params.minPrice?.toString() ?? "");
    const [max, setMax] = useState(params.maxPrice?.toString() ?? "");

    // Re-sync local state when the URL changes elsewhere (the ✕ on the price
    // pill, "Clear all", browser back/forward). Compare against the previous
    // prop during render instead of writing state from an effect body.
    const [syncedMin, setSyncedMin] = useState(params.minPrice);
    if (params.minPrice !== syncedMin) {
        setSyncedMin(params.minPrice);
        setMin(params.minPrice?.toString() ?? "");
    }
    const [syncedMax, setSyncedMax] = useState(params.maxPrice);
    if (params.maxPrice !== syncedMax) {
        setSyncedMax(params.maxPrice);
        setMax(params.maxPrice?.toString() ?? "");
    }

    function apply() {
        const toNum = (s: string) => {
            const n = Number(s);
            return s.trim() !== "" && Number.isFinite(n) && n >= 0
                ? Math.trunc(n)
                : undefined;
        };
        startTransition(() => {
            router.push(
                buildCatalogHref(params, {
                    minPrice: toNum(min),
                    maxPrice: toNum(max),
                }),
                { scroll: false },
            );
        });
    }

    const label =
        params.minPrice !== undefined || params.maxPrice !== undefined
            ? `${params.minPrice?.toLocaleString("vi-VN") ?? "0"}–${
                  params.maxPrice?.toLocaleString("vi-VN") ?? "∞"
              }₫`
            : "Price";

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[110px]">
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-3">
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={min}
                        onChange={(e) => setMin(e.target.value)}
                    />
                    <span className="text-gray-400">–</span>
                    <Input
                        type="number"
                        min={0}
                        placeholder="Max"
                        value={max}
                        onChange={(e) => setMax(e.target.value)}
                    />
                </div>
                <Button className="w-full" onClick={apply}>
                    Apply
                </Button>
            </PopoverContent>
        </Popover>
    );
}

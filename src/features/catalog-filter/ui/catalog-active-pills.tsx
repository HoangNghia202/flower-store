"use client";

import Link from "next/link";
import { X } from "lucide-react";
import {
    buildCatalogHref,
    hasActiveFilters,
    type CatalogFacets,
    type CatalogParams,
} from "@/src/entites/product/model";

export function CatalogActivePills({
    params,
    categories,
}: {
    params: CatalogParams;
    categories: CatalogFacets["categories"];
}) {
    if (!hasActiveFilters(params)) return null;

    const chips: {
        key: keyof CatalogParams;
        label: string;
        patch: Partial<CatalogParams>;
    }[] = [];

    if (params.q) {
        chips.push({
            key: "q",
            label: `“${params.q}”`,
            patch: { q: undefined },
        });
    }
    if (params.category) {
        const name =
            categories.find((c) => c.slug === params.category)?.name ??
            params.category;
        chips.push({
            key: "category",
            label: name,
            patch: { category: undefined },
        });
    }
    if (params.color) {
        chips.push({
            key: "color",
            label: params.color,
            patch: { color: undefined },
        });
    }
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
        chips.push({
            key: "minPrice",
            label: `${params.minPrice?.toLocaleString("vi-VN") ?? "0"}–${
                params.maxPrice?.toLocaleString("vi-VN") ?? "∞"
            }₫`,
            patch: { minPrice: undefined, maxPrice: undefined },
        });
    }

    return (
        <div className="flex flex-wrap items-center gap-2 pt-2">
            {chips.map((chip) => (
                <Link
                    key={chip.key}
                    href={buildCatalogHref(params, chip.patch)}
                    scroll={false}
                    className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs text-pink-700 hover:bg-pink-100"
                >
                    {chip.label}
                    <X size={12} />
                </Link>
            ))}
            <Link
                href="/catalog"
                scroll={false}
                className="text-xs text-gray-500 underline hover:text-gray-700"
            >
                Clear all
            </Link>
        </div>
    );
}

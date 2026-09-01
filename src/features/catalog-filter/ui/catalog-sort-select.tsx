"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui";
import {
    buildCatalogHref,
    CATALOG_SORTS,
    type CatalogParams,
    type CatalogSort,
} from "@/src/entites/product/model";

export function CatalogSortSelect({ params }: { params: CatalogParams }) {
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <Select
            value={params.sort}
            onValueChange={(v) =>
                startTransition(() => {
                    router.push(
                        buildCatalogHref(params, { sort: v as CatalogSort }),
                        { scroll: false },
                    );
                })
            }
        >
            <SelectTrigger className="w-[180px]" aria-label="Sort products">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {CATALOG_SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                        {s.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

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
    type CatalogFacets,
    type CatalogParams,
} from "@/src/entites/product/model";

export function CatalogCategorySelect({
    params,
    categories,
}: {
    params: CatalogParams;
    categories: CatalogFacets["categories"];
}) {
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <Select
            value={params.category ?? "all"}
            onValueChange={(v) =>
                startTransition(() => {
                    router.push(
                        buildCatalogHref(params, {
                            category: v === "all" ? undefined : v,
                        }),
                        { scroll: false },
                    );
                })
            }
        >
            <SelectTrigger
                className="w-[170px]"
                aria-label="Filter by occasion"
            >
                <SelectValue placeholder="All occasions" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All occasions</SelectItem>
                {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
    buildCatalogHref,
    type CatalogParams,
} from "@/src/entites/product/model";

const SWATCH: Record<string, string> = {
    red: "bg-red-400",
    pink: "bg-pink-300",
    white: "bg-gray-100 border border-gray-300",
    yellow: "bg-amber-300",
    purple: "bg-violet-400",
};

export function CatalogColorSwatches({
    params,
    colors,
}: {
    params: CatalogParams;
    colors: string[];
}) {
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <div className="flex items-center gap-1.5">
            {colors.map((color) => {
                const active =
                    params.color?.toLowerCase() === color.toLowerCase();
                return (
                    <button
                        key={color}
                        type="button"
                        aria-label={color}
                        aria-pressed={active}
                        onClick={() =>
                            startTransition(() => {
                                router.push(
                                    buildCatalogHref(params, {
                                        color: active ? undefined : color,
                                    }),
                                    { scroll: false },
                                );
                            })
                        }
                        className={cn(
                            "h-6 w-6 rounded-full transition",
                            SWATCH[color.toLowerCase()] ?? "bg-gray-300",
                            active && "ring-2 ring-pink-500 ring-offset-1",
                        )}
                    />
                );
            })}
        </div>
    );
}

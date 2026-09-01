"use client";

import { Check } from "lucide-react";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { cn } from "@/shared/lib/utils";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function RibbonStep({ ribbons }: { ribbons: BouquetOptionVM[] }) {
    const selected = useCustomBouquetStore((s) => s.selectedRibbon);
    const setRibbon = useCustomBouquetStore((s) => s.setRibbon);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Choose a ribbon
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                {ribbons.map((ribbon) => {
                    const active = selected?.id === ribbon.id;
                    return (
                        <button
                            key={ribbon.id}
                            type="button"
                            onClick={() => setRibbon(ribbon)}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span
                                className="h-10 w-10 shrink-0 rounded-full border"
                                style={{ background: ribbon.color }}
                                aria-hidden
                            />
                            <span className="flex-1">
                                <span className="block font-medium text-gray-800">
                                    {ribbon.name}
                                </span>
                                <span className="block text-sm text-gray-500">
                                    {vnd(ribbon.price)}
                                </span>
                            </span>
                            {active && (
                                <Check
                                    size={18}
                                    className="text-pink-500"
                                    aria-hidden
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

"use client";

import { Check } from "lucide-react";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { cn } from "@/shared/lib/utils";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function WrapStep({ wraps }: { wraps: BouquetOptionVM[] }) {
    const selected = useCustomBouquetStore((s) => s.selectedWrap);
    const setWrap = useCustomBouquetStore((s) => s.setWrap);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Choose wrap paper
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                {wraps.map((wrap) => {
                    const active = selected?.id === wrap.id;
                    return (
                        <button
                            key={wrap.id}
                            type="button"
                            onClick={() => setWrap(wrap)}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span
                                className="h-10 w-10 shrink-0 rounded-full border"
                                style={{ background: wrap.color }}
                                aria-hidden
                            />
                            <span className="flex-1">
                                <span className="block font-medium text-gray-800">
                                    {wrap.name}
                                </span>
                                <span className="block text-sm text-gray-500">
                                    {vnd(wrap.price)}
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

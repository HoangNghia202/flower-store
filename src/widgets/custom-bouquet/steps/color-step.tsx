"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { FLOWER_COLORS } from "@/shared/lib/constants/custom-bouquet.const";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function ColorStep() {
    const colors = useCustomBouquetStore((s) => s.colors);
    const toggleColor = useCustomBouquetStore((s) => s.toggleColor);

    return (
        <div>
            <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-playfair text-xl font-bold text-gray-900">
                    Tông màu
                </h2>
                <span
                    className={cn(
                        "text-sm font-medium",
                        colors.length > 0 ? "text-pink-600" : "text-gray-400",
                    )}
                >
                    Chọn ít nhất 1 màu
                </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {FLOWER_COLORS.map((c) => {
                    const active = colors.includes(c.id);
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleColor(c.id)}
                            className={cn(
                                "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span
                                className="relative h-10 w-10 rounded-full border border-gray-300"
                                style={{ background: c.swatch }}
                                aria-hidden
                            >
                                {active && (
                                    <Check
                                        size={16}
                                        className="absolute inset-0 m-auto text-pink-600"
                                    />
                                )}
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                                {c.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

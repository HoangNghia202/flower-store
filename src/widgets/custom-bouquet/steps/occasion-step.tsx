"use client";

import { cn } from "@/shared/lib/utils";
import { OCCASIONS } from "@/shared/lib/constants/custom-bouquet.const";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function OccasionStep() {
    const occasion = useCustomBouquetStore((s) => s.occasion);
    const setOccasion = useCustomBouquetStore((s) => s.setOccasion);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Dịp tặng hoa
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {OCCASIONS.map((o) => {
                    const active = occasion === o.id;
                    return (
                        <button
                            key={o.id}
                            type="button"
                            onClick={() => setOccasion(o.id)}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span className="text-2xl" aria-hidden>
                                {o.emoji}
                            </span>
                            <span className="font-medium text-gray-800">
                                {o.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

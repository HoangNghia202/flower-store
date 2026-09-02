"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { BOUQUET_STYLES } from "@/shared/lib/constants/custom-bouquet.const";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function StyleStep() {
    const style = useCustomBouquetStore((s) => s.style);
    const setStyle = useCustomBouquetStore((s) => s.setStyle);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Kiểu dáng
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                {BOUQUET_STYLES.map((st) => {
                    const active = style === st.id;
                    return (
                        <button
                            key={st.id}
                            type="button"
                            onClick={() => setStyle(st.id)}
                            className={cn(
                                "flex items-center justify-between rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span className="font-medium text-gray-800">
                                {st.label}
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

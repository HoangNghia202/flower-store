"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { BUDGET_TIERS } from "@/shared/lib/constants/custom-bouquet.const";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function BudgetStep() {
    const tier = useCustomBouquetStore((s) => s.tier);
    const setTier = useCustomBouquetStore((s) => s.setTier);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Ngân sách
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                {BUDGET_TIERS.map((t) => {
                    const active = tier?.id === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTier(t)}
                            className={cn(
                                "flex items-center justify-between rounded-2xl border p-4 text-left transition-all",
                                active
                                    ? "border-pink-400 ring-2 ring-pink-400"
                                    : "border-gray-200 hover:border-pink-200",
                            )}
                        >
                            <span>
                                <span className="block text-lg font-semibold text-gray-900">
                                    {t.label}
                                </span>
                                <span className="block text-sm text-gray-500">
                                    Tối đa {t.maxFlowerTypes} loại hoa
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

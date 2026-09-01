"use client";

import { Minus, Plus } from "lucide-react";
import type { StemVM } from "@/src/entites/stem/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import {
    MIN_STEMS,
    stemEmoji,
} from "@/shared/lib/constants/custom-bouquet.const";
import { cn } from "@/shared/lib/utils";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function StemStep({ stems }: { stems: StemVM[] }) {
    const selected = useCustomBouquetStore((s) => s.selectedStems);
    const addStem = useCustomBouquetStore((s) => s.addStem);
    const updateStemQuantity = useCustomBouquetStore(
        (s) => s.updateStemQuantity,
    );
    const totalStems = useCustomBouquetStore((s) => s.getBuilderTotalStems());

    const qtyOf = (id: string) =>
        selected.find((s) => s.id === id)?.quantity ?? 0;

    return (
        <div>
            <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-playfair text-xl font-bold text-gray-900">
                    Pick your stems
                </h2>
                <span
                    className={cn(
                        "text-sm font-medium",
                        totalStems >= MIN_STEMS
                            ? "text-pink-600"
                            : "text-gray-400",
                    )}
                >
                    {totalStems} / {MIN_STEMS}
                </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stems.map((stem) => {
                    const qty = qtyOf(stem.id);
                    return (
                        <div
                            key={stem.id}
                            className={cn(
                                "rounded-2xl border p-4 transition-colors",
                                qty > 0
                                    ? "border-pink-300 bg-pink-50/50"
                                    : "border-gray-200 bg-white",
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="h-4 w-4 shrink-0 rounded-full border"
                                    style={{ background: stem.color }}
                                    aria-hidden
                                />
                                <span className="text-lg" aria-hidden>
                                    {stemEmoji(stem.name)}
                                </span>
                                <span className="font-medium text-gray-800">
                                    {stem.name}
                                </span>
                            </div>

                            <p className="mt-1 text-sm text-gray-500">
                                {vnd(stem.pricePerStem)} / stem
                            </p>

                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center rounded-md border">
                                    <button
                                        type="button"
                                        aria-label={`Remove one ${stem.name}`}
                                        className="px-2 py-1 disabled:opacity-40"
                                        disabled={qty <= 0}
                                        onClick={() =>
                                            updateStemQuantity(stem.id, qty - 1)
                                        }
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center text-sm">
                                        {qty}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={`Add one ${stem.name}`}
                                        className="px-2 py-1"
                                        onClick={() =>
                                            qty === 0
                                                ? addStem({
                                                      id: stem.id,
                                                      name: stem.name,
                                                      pricePerStem:
                                                          stem.pricePerStem,
                                                      color: stem.color,
                                                  })
                                                : updateStemQuantity(
                                                      stem.id,
                                                      qty + 1,
                                                  )
                                        }
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

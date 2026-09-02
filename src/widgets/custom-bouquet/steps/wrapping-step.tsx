"use client";

import { Check } from "lucide-react";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { cn } from "@/shared/lib/utils";

function OptionGrid({
    title,
    options,
    selectedId,
    onSelect,
}: {
    title: string;
    options: BouquetOptionVM[];
    selectedId: string | undefined;
    onSelect: (opt: BouquetOptionVM) => void;
}) {
    return (
        <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-800">
                {title}
            </h3>
            {options.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có lựa chọn.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {options.map((opt) => {
                        const active = selectedId === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => onSelect(opt)}
                                className={cn(
                                    "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                                    active
                                        ? "border-pink-400 ring-2 ring-pink-400"
                                        : "border-gray-200 hover:border-pink-200",
                                )}
                            >
                                <span
                                    className="h-8 w-8 shrink-0 rounded-full border"
                                    style={{ background: opt.color }}
                                    aria-hidden
                                />
                                <span className="flex-1 font-medium text-gray-800">
                                    {opt.name}
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
            )}
        </div>
    );
}

export function WrappingStep({
    wraps,
    ribbons,
}: {
    wraps: BouquetOptionVM[];
    ribbons: BouquetOptionVM[];
}) {
    const selectedWrap = useCustomBouquetStore((s) => s.selectedWrap);
    const selectedRibbon = useCustomBouquetStore((s) => s.selectedRibbon);
    const setWrap = useCustomBouquetStore((s) => s.setWrap);
    const setRibbon = useCustomBouquetStore((s) => s.setRibbon);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Gói hoa
            </h2>
            <div className="space-y-6">
                <OptionGrid
                    title="Giấy gói"
                    options={wraps}
                    selectedId={selectedWrap?.id}
                    onSelect={setWrap}
                />
                <OptionGrid
                    title="Ruy băng"
                    options={ribbons}
                    selectedId={selectedRibbon?.id}
                    onSelect={setRibbon}
                />
            </div>
        </div>
    );
}

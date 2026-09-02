"use client";

import type { StemVM } from "@/src/entites/stem/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { stemEmoji } from "@/shared/lib/constants/custom-bouquet.const";
import { cn } from "@/shared/lib/utils";

export function FlowerStep({ stems }: { stems: StemVM[] }) {
    const colors = useCustomBouquetStore((s) => s.colors);
    const tier = useCustomBouquetStore((s) => s.tier);
    const selected = useCustomBouquetStore((s) => s.selectedFlowers);
    const toggleFlower = useCustomBouquetStore((s) => s.toggleFlower);
    const arrangementNote = useCustomBouquetStore((s) => s.arrangementNote);
    const setArrangementNote = useCustomBouquetStore(
        (s) => s.setArrangementNote,
    );

    const cap = tier?.maxFlowerTypes ?? 0;
    const list = stems.filter((f) => colors.includes(f.color));
    const isSelected = (id: string) => selected.some((f) => f.id === id);

    return (
        <div>
            <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-playfair text-xl font-bold text-gray-900">
                    Chọn loại hoa
                </h2>
                <span
                    className={cn(
                        "text-sm font-medium",
                        selected.length > 0 ? "text-pink-600" : "text-gray-400",
                    )}
                >
                    {selected.length} / {cap}
                </span>
            </div>

            {list.length === 0 ? (
                <p className="text-sm text-gray-500">
                    Không có loại hoa nào khớp màu đã chọn.
                </p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((flower) => {
                        const on = isSelected(flower.id);
                        const atCap = !on && selected.length >= cap;
                        return (
                            <button
                                key={flower.id}
                                type="button"
                                aria-pressed={on}
                                disabled={atCap}
                                onClick={() =>
                                    toggleFlower({
                                        id: flower.id,
                                        name: flower.name,
                                        color: flower.color,
                                    })
                                }
                                className={cn(
                                    "flex items-center gap-2 rounded-2xl border p-4 text-left transition-colors",
                                    on
                                        ? "border-pink-400 bg-pink-50/50 ring-2 ring-pink-400"
                                        : "border-gray-200 bg-white hover:border-pink-200",
                                    atCap && "opacity-40",
                                )}
                            >
                                <span
                                    className="h-4 w-4 shrink-0 rounded-full border"
                                    style={{ background: flower.color }}
                                    aria-hidden
                                />
                                <span className="text-lg" aria-hidden>
                                    {stemEmoji(flower.name)}
                                </span>
                                <span className="font-medium text-gray-800">
                                    {flower.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <label
                htmlFor="arrangement-note"
                className="mt-6 block text-sm font-semibold text-gray-800"
            >
                Mô tả cách sắp xếp (không bắt buộc)
            </label>
            <textarea
                id="arrangement-note"
                value={arrangementNote}
                onChange={(e) => setArrangementNote(e.target.value)}
                rows={3}
                placeholder="Ví dụ: hồng làm trung tâm, baby's breath viền quanh, điểm vài nhành lá bạch đàn rủ xuống..."
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
        </div>
    );
}

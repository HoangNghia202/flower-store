"use client";

import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import {
    OCCASIONS,
    FLOWER_COLORS,
    BOUQUET_STYLES,
} from "@/shared/lib/constants/custom-bouquet.const";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function BouquetSummary() {
    const s = useCustomBouquetStore();
    if (s.mode === null) return null;

    const occasion = OCCASIONS.find((o) => o.id === s.occasion)?.label;
    const style = BOUQUET_STYLES.find((st) => st.id === s.style)?.label;
    const colorLabels = s.colors
        .map((id) => FLOWER_COLORS.find((c) => c.id === id)?.label ?? id)
        .join(", ");

    return (
        <aside className="h-fit rounded-2xl border border-pink-100 bg-white p-5 lg:sticky lg:top-6">
            <h2 className="font-semibold text-gray-800">Tóm tắt</h2>
            <dl className="mt-3 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between gap-2">
                    <dt>Dịp</dt>
                    <dd>{occasion ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                    <dt>Ngân sách</dt>
                    <dd>{s.tier?.label ?? "—"}</dd>
                </div>

                {s.mode === "build" && (
                    <>
                        <div className="flex justify-between gap-2">
                            <dt>Màu</dt>
                            <dd className="text-right">{colorLabels || "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt>Kiểu</dt>
                            <dd>{style ?? "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt>Hoa</dt>
                            <dd className="text-right">
                                {s.selectedFlowers.length > 0
                                    ? s.selectedFlowers
                                          .map((f) => f.name)
                                          .join(", ")
                                    : "—"}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt>Gói</dt>
                            <dd className="text-right">
                                {[s.selectedWrap?.name, s.selectedRibbon?.name]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                            </dd>
                        </div>
                    </>
                )}

                {s.mode === "photo" && (
                    <div className="flex justify-between gap-2">
                        <dt>Ảnh mẫu</dt>
                        <dd>{s.referenceFiles.length} ảnh</dd>
                    </div>
                )}
            </dl>

            <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold text-gray-900">
                <span>Tổng</span>
                <span>{vnd(s.getTotalPrice())}</span>
            </div>
        </aside>
    );
}

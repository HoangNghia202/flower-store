"use client";

import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import {
    MIN_STEMS,
    stemEmoji,
} from "@/shared/lib/constants/custom-bouquet.const";
import { cn } from "@/shared/lib/utils";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function BouquetSummary() {
    const stems = useCustomBouquetStore((s) => s.selectedStems);
    const wrap = useCustomBouquetStore((s) => s.selectedWrap);
    const ribbon = useCustomBouquetStore((s) => s.selectedRibbon);
    const totalStems = useCustomBouquetStore((s) => s.getBuilderTotalStems());
    const totalPrice = useCustomBouquetStore((s) => s.getBuilderTotalPrice());

    const remaining = Math.max(0, MIN_STEMS - totalStems);

    return (
        <aside className="h-fit rounded-2xl border border-pink-100 bg-white p-5 lg:sticky lg:top-6">
            <h2 className="font-semibold text-gray-800">Your bouquet</h2>

            <p
                className={cn(
                    "mt-1 text-sm",
                    totalStems >= MIN_STEMS ? "text-pink-600" : "text-gray-400",
                )}
            >
                {totalStems} stem{totalStems === 1 ? "" : "s"}
                {remaining > 0 && ` · ${remaining} more to continue`}
            </p>

            <ul className="mt-3 space-y-1 text-sm text-gray-600">
                {stems.length === 0 && (
                    <li className="text-gray-400">No stems yet</li>
                )}
                {stems.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                        <span>
                            {stemEmoji(s.name)} {s.quantity}× {s.name}
                        </span>
                        <span>{vnd(s.pricePerStem * s.quantity)}</span>
                    </li>
                ))}
            </ul>

            <dl className="mt-3 space-y-1 border-t pt-3 text-sm text-gray-600">
                <div className="flex justify-between">
                    <dt>Wrap</dt>
                    <dd>{wrap ? `${wrap.name} · ${vnd(wrap.price)}` : "—"}</dd>
                </div>
                <div className="flex justify-between">
                    <dt>Ribbon</dt>
                    <dd>
                        {ribbon ? `${ribbon.name} · ${vnd(ribbon.price)}` : "—"}
                    </dd>
                </div>
            </dl>

            <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{vnd(totalPrice)}</span>
            </div>
        </aside>
    );
}

"use client";

import { useState } from "react";
import { Button, Input } from "@/shared/ui";
import { useCartStore } from "@/_app/store/useCartStore";
import { validateCouponAction } from "@/src/entites/order/actions/validate-coupon.action";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function OrderSummary({
    couponCode,
    onCouponChange,
    pending,
}: {
    couponCode: string;
    onCouponChange: (code: string) => void;
    pending: boolean;
}) {
    const items = useCartStore((s) => s.items);
    const subtotal = items.reduce((sum, i) => {
        const addons = (i.addons ?? []).reduce(
            (a, x) => a + x.price * x.quantity,
            0,
        );
        return sum + (i.price + addons) * i.quantity;
    }, 0);

    const [draft, setDraft] = useState(couponCode);
    const [checking, setChecking] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [couponError, setCouponError] = useState<string | null>(null);

    async function apply() {
        setChecking(true);
        setCouponError(null);
        const res = await validateCouponAction(draft, subtotal);
        setChecking(false);
        if (!res.ok) {
            setDiscount(0);
            onCouponChange("");
            setCouponError(res.reason);
            return;
        }
        setDiscount(res.discountAmount);
        onCouponChange(res.code);
    }

    const total = Math.max(0, subtotal - discount);

    return (
        <aside className="h-fit rounded-2xl border border-pink-100 bg-white p-5">
            <h2 className="font-semibold text-gray-800">Order summary</h2>

            <ul className="mt-4 space-y-2 text-sm">
                {items.map((i) => (
                    <li
                        key={i.id}
                        className="flex justify-between gap-2 text-gray-600"
                    >
                        <span className="line-clamp-1">
                            {i.quantity}× {i.name}
                        </span>
                        <span>{vnd(i.price * i.quantity)}</span>
                    </li>
                ))}
            </ul>

            <div className="mt-4 flex gap-2">
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Coupon code"
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={apply}
                    disabled={checking || !draft.trim()}
                >
                    Apply
                </Button>
            </div>
            {couponError && (
                <p className="mt-1 text-xs text-red-500">{couponError}</p>
            )}

            <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between text-gray-500">
                    <dt>Subtotal</dt>
                    <dd>{vnd(subtotal)}</dd>
                </div>
                {discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                        <dt>Discount</dt>
                        <dd>-{vnd(discount)}</dd>
                    </div>
                )}
                <div className="flex justify-between text-base font-semibold text-gray-900">
                    <dt>Total</dt>
                    <dd>{vnd(total)}</dd>
                </div>
            </dl>

            <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="mt-5 w-full bg-pink-500 hover:bg-pink-600"
            >
                {pending ? "Placing order…" : "Place order"}
            </Button>
        </aside>
    );
}

export interface CouponRow {
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    value: number;
    maxUses: number | null;
    usedCount: number;
    active: boolean;
    expiresAt: Date | null;
}

export type CouponCheck =
    | { ok: true; discountType: "PERCENTAGE" | "FIXED"; value: number }
    | { ok: false; reason: string };

export function validateCoupon(
    coupon: CouponRow | null,
    now: Date,
): CouponCheck {
    if (!coupon) return { ok: false, reason: "That coupon code isn't valid." };
    if (!coupon.active)
        return { ok: false, reason: "That coupon is no longer active." };
    if (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime())
        return { ok: false, reason: "That coupon has expired." };
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
        return {
            ok: false,
            reason: "That coupon has reached its usage limit.",
        };
    return { ok: true, discountType: coupon.discountType, value: coupon.value };
}

export function computeDiscount(
    args: { discountType: "PERCENTAGE" | "FIXED"; value: number },
    subtotal: number,
): number {
    if (subtotal <= 0) return 0;
    const raw =
        args.discountType === "PERCENTAGE"
            ? Math.round((subtotal * args.value) / 100)
            : args.value;
    return Math.max(0, Math.min(raw, subtotal));
}

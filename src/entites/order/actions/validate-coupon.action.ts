"use server";

import { prisma } from "@/prisma/prisma-instance";
import {
    computeDiscount,
    validateCoupon,
    type CouponRow,
} from "@/src/entites/order/model";

export async function validateCouponAction(
    code: string,
    subtotal: number,
): Promise<
    | { ok: true; code: string; discountAmount: number }
    | { ok: false; reason: string }
> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false, reason: "Enter a coupon code." };

    const row = await prisma.coupon.findUnique({ where: { code: normalized } });
    const coupon: CouponRow | null = row
        ? {
              code: row.code,
              discountType: row.discountType as "PERCENTAGE" | "FIXED",
              value: row.value,
              maxUses: row.maxUses,
              usedCount: row.usedCount,
              active: row.active,
              expiresAt: row.expiresAt,
          }
        : null;

    const check = validateCoupon(coupon, new Date());
    if (!check.ok) return { ok: false, reason: check.reason };

    const discountAmount = computeDiscount(
        { discountType: check.discountType, value: check.value },
        Math.max(0, Math.round(subtotal)),
    );
    return { ok: true, code: normalized, discountAmount };
}

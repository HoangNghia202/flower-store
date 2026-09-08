import { describe, expect, it } from "vitest";
import { computeDiscount, validateCoupon, type CouponRow } from "./coupon.util";

const base: CouponRow = {
    code: "SAVE10",
    discountType: "PERCENTAGE",
    value: 10,
    maxUses: 100,
    usedCount: 5,
    active: true,
    expiresAt: new Date("2027-01-01T00:00:00"),
};
const now = new Date("2026-09-08T00:00:00");

describe("validateCoupon", () => {
    it("rejects a missing coupon", () => {
        expect(validateCoupon(null, now)).toEqual({
            ok: false,
            reason: expect.any(String),
        });
    });
    it("rejects an inactive coupon", () => {
        expect(validateCoupon({ ...base, active: false }, now).ok).toBe(false);
    });
    it("rejects an expired coupon", () => {
        expect(
            validateCoupon(
                { ...base, expiresAt: new Date("2026-01-01T00:00:00") },
                now,
            ).ok,
        ).toBe(false);
    });
    it("rejects a fully-used coupon", () => {
        expect(
            validateCoupon({ ...base, maxUses: 5, usedCount: 5 }, now).ok,
        ).toBe(false);
    });
    it("accepts a valid coupon and returns its terms", () => {
        expect(validateCoupon(base, now)).toEqual({
            ok: true,
            discountType: "PERCENTAGE",
            value: 10,
        });
    });
    it("treats null maxUses as unlimited", () => {
        expect(
            validateCoupon({ ...base, maxUses: null, usedCount: 9999 }, now).ok,
        ).toBe(true);
    });
});

describe("computeDiscount", () => {
    it("computes a rounded percentage", () => {
        expect(
            computeDiscount({ discountType: "PERCENTAGE", value: 10 }, 12345),
        ).toBe(1235);
    });
    it("applies a fixed amount", () => {
        expect(
            computeDiscount({ discountType: "FIXED", value: 50000 }, 200000),
        ).toBe(50000);
    });
    it("never exceeds the subtotal", () => {
        expect(
            computeDiscount({ discountType: "FIXED", value: 999999 }, 100000),
        ).toBe(100000);
    });
    it("is zero for a non-positive subtotal", () => {
        expect(
            computeDiscount({ discountType: "PERCENTAGE", value: 10 }, 0),
        ).toBe(0);
    });
});

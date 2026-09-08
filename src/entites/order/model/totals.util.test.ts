import { describe, expect, it } from "vitest";
import { computeOrderTotals, computeSubtotal } from "./totals.util";

describe("computeSubtotal", () => {
    it("sums unitPrice * quantity plus the add-ons total", () => {
        expect(
            computeSubtotal(
                [
                    { unitPrice: 100000, quantity: 2 },
                    { unitPrice: 50000, quantity: 1 },
                ],
                20000,
            ),
        ).toBe(270000);
    });
    it("is the add-ons total when there are no lines", () => {
        expect(computeSubtotal([], 15000)).toBe(15000);
    });
});

describe("computeOrderTotals", () => {
    it("subtracts the discount", () => {
        expect(computeOrderTotals(200000, 30000)).toEqual({
            subtotal: 200000,
            discountAmount: 30000,
            totalAmount: 170000,
        });
    });
    it("clamps a discount larger than the subtotal", () => {
        expect(computeOrderTotals(100000, 999999)).toEqual({
            subtotal: 100000,
            discountAmount: 100000,
            totalAmount: 0,
        });
    });
    it("clamps a negative discount to zero", () => {
        expect(computeOrderTotals(100000, -5)).toEqual({
            subtotal: 100000,
            discountAmount: 0,
            totalAmount: 100000,
        });
    });
});

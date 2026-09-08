import { describe, expect, it } from "vitest";
import { checkoutFormSchema } from "./order.schema";

const valid = {
    recipientName: "Nguyen Van A",
    recipientPhone: "0912345678",
    recipientAddress: "123 Le Loi, District 1, HCMC",
    isAnonymous: false,
    deliveryDate: "2026-09-20",
    deliverySlot: "08:00 - 10:00",
    cardMessage: "",
    paymentMethod: "COD",
    saveRecipient: false,
};

describe("checkoutFormSchema", () => {
    it("accepts a well-formed payload", () => {
        expect(checkoutFormSchema.safeParse(valid).success).toBe(true);
    });
    it("rejects an empty recipient name", () => {
        const r = checkoutFormSchema.safeParse({ ...valid, recipientName: "" });
        expect(r.success).toBe(false);
    });
    it("rejects a non-Vietnamese phone number", () => {
        const r = checkoutFormSchema.safeParse({
            ...valid,
            recipientPhone: "12345",
        });
        expect(r.success).toBe(false);
    });
    it("rejects an unknown delivery slot", () => {
        const r = checkoutFormSchema.safeParse({
            ...valid,
            deliverySlot: "07:00 - 09:00",
        });
        expect(r.success).toBe(false);
    });
    it("rejects an unknown payment method", () => {
        const r = checkoutFormSchema.safeParse({
            ...valid,
            paymentMethod: "BITCOIN",
        });
        expect(r.success).toBe(false);
    });
    it("rejects a card message over 500 chars", () => {
        const r = checkoutFormSchema.safeParse({
            ...valid,
            cardMessage: "x".repeat(501),
        });
        expect(r.success).toBe(false);
    });
});

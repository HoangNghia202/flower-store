import { describe, expect, it } from "vitest";
import {
    DELIVERY_SLOTS,
    isDeliverySlot,
    isValidDeliveryDate,
} from "./delivery.const";

describe("isDeliverySlot", () => {
    it("accepts a known slot", () => {
        expect(isDeliverySlot(DELIVERY_SLOTS[0])).toBe(true);
    });
    it("rejects unknown values", () => {
        expect(isDeliverySlot("07:00 - 09:00")).toBe(false);
        expect(isDeliverySlot(123)).toBe(false);
        expect(isDeliverySlot(undefined)).toBe(false);
    });
});

describe("isValidDeliveryDate", () => {
    const now = new Date("2026-09-08T15:00:00");
    it("rejects today", () => {
        expect(isValidDeliveryDate(new Date("2026-09-08T00:00:00"), now)).toBe(
            false,
        );
    });
    it("rejects yesterday", () => {
        expect(isValidDeliveryDate(new Date("2026-09-07T00:00:00"), now)).toBe(
            false,
        );
    });
    it("accepts tomorrow", () => {
        expect(isValidDeliveryDate(new Date("2026-09-09T00:00:00"), now)).toBe(
            true,
        );
    });
    it("accepts a date next week", () => {
        expect(isValidDeliveryDate(new Date("2026-09-15T00:00:00"), now)).toBe(
            true,
        );
    });
    it("rejects an invalid date", () => {
        expect(isValidDeliveryDate(new Date("nope"), now)).toBe(false);
    });
});

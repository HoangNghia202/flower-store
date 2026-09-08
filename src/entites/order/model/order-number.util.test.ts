import { describe, expect, it } from "vitest";
import { formatOrderNumber, parseOrderNumber } from "./order-number.util";

describe("formatOrderNumber", () => {
    it("zero-pads to 6 digits with an FLW- prefix", () => {
        expect(formatOrderNumber(123)).toBe("FLW-000123");
    });
    it("does not truncate numbers longer than 6 digits", () => {
        expect(formatOrderNumber(1234567)).toBe("FLW-1234567");
    });
});

describe("parseOrderNumber", () => {
    it("reverses formatOrderNumber", () => {
        expect(parseOrderNumber("FLW-000123")).toBe(123);
    });
    it("trims surrounding whitespace", () => {
        expect(parseOrderNumber("  FLW-000042  ")).toBe(42);
    });
    it("returns null for anything that is not an FLW number", () => {
        expect(parseOrderNumber("FLW-abc")).toBeNull();
        expect(parseOrderNumber("123")).toBeNull();
        expect(parseOrderNumber("")).toBeNull();
        expect(parseOrderNumber("FLW-000000")).toBeNull();
    });
});

import { describe, expect, it } from "vitest";
import { normalizePayosStatus } from "./payos-status";

describe("normalizePayosStatus", () => {
    it("maps known statuses case-insensitively", () => {
        expect(normalizePayosStatus("PAID")).toBe("PAID");
        expect(normalizePayosStatus("paid")).toBe("PAID");
        expect(normalizePayosStatus("PENDING")).toBe("PENDING");
        expect(normalizePayosStatus("CANCELLED")).toBe("CANCELLED");
        expect(normalizePayosStatus("EXPIRED")).toBe("EXPIRED");
    });
    it("maps anything else to UNKNOWN", () => {
        expect(normalizePayosStatus("PROCESSING")).toBe("UNKNOWN");
        expect(normalizePayosStatus(null)).toBe("UNKNOWN");
        expect(normalizePayosStatus(undefined)).toBe("UNKNOWN");
    });
});

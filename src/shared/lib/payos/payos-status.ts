export type PayosPaymentStatus =
    | "PAID"
    | "PENDING"
    | "CANCELLED"
    | "EXPIRED"
    | "UNKNOWN";

export function normalizePayosStatus(
    raw: string | null | undefined,
): PayosPaymentStatus {
    switch ((raw ?? "").toUpperCase()) {
        case "PAID":
            return "PAID";
        case "PENDING":
            return "PENDING";
        case "CANCELLED":
            return "CANCELLED";
        case "EXPIRED":
            return "EXPIRED";
        default:
            return "UNKNOWN";
    }
}

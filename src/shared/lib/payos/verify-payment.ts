import "server-only";
import { getPayos } from "./payos-client";
import { normalizePayosStatus, type PayosPaymentStatus } from "./payos-status";

export * from "./payos-status";

export async function getPaymentStatus(
    orderCode: number,
): Promise<PayosPaymentStatus> {
    try {
        const info = await getPayos().getPaymentLinkInformation(orderCode);
        return normalizePayosStatus(info.status);
    } catch {
        return "UNKNOWN";
    }
}

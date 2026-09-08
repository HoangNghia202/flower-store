export interface PricedLine {
    unitPrice: number;
    quantity: number;
}

export function computeSubtotal(
    lines: PricedLine[],
    addonsTotal: number,
): number {
    return (
        lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) +
        addonsTotal
    );
}

export interface OrderTotals {
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
}

export function computeOrderTotals(
    subtotal: number,
    discountAmount: number,
): OrderTotals {
    const clamped = Math.max(0, Math.min(discountAmount, subtotal));
    return {
        subtotal,
        discountAmount: clamped,
        totalAmount: subtotal - clamped,
    };
}

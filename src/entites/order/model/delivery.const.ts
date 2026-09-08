export const DELIVERY_SLOTS = [
    "08:00 - 10:00",
    "10:00 - 12:00",
    "14:00 - 16:00",
    "16:00 - 18:00",
    "18:00 - 20:00",
] as const;

export type DeliverySlot = (typeof DELIVERY_SLOTS)[number];

export function isDeliverySlot(v: unknown): v is DeliverySlot {
    return (
        typeof v === "string" &&
        (DELIVERY_SLOTS as readonly string[]).includes(v)
    );
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isValidDeliveryDate(date: Date, now: Date): boolean {
    if (Number.isNaN(date.getTime())) return false;
    const tomorrow = startOfDay(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return startOfDay(date).getTime() >= tomorrow.getTime();
}

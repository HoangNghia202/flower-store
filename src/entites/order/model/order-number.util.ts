export function formatOrderNumber(seq: number): string {
    return `FLW-${String(seq).padStart(6, "0")}`;
}

export function parseOrderNumber(slug: string): number | null {
    const match = /^FLW-(\d{1,10})$/.exec(slug.trim());
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isInteger(n) && n > 0 ? n : null;
}

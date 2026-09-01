export interface BouquetSelection {
    stems: { name: string; color: string; quantity: number }[];
    wrapPaper: { name: string; color: string } | null;
    ribbon: { name: string; color: string } | null;
}

function pluralize(name: string, qty: number): string {
    if (qty === 1) return name.toLowerCase();
    return `${name.toLowerCase()}s`;
}

export function buildBouquetPrompt(sel: BouquetSelection): string {
    const stemPhrases = sel.stems
        .filter((s) => s.quantity > 0)
        .map((s) => `${s.quantity} ${pluralize(s.name, s.quantity)}`);

    const parts: string[] = [
        `a hand-tied bouquet of ${stemPhrases.join(", ") || "assorted flowers"}`,
    ];
    if (sel.wrapPaper) {
        parts.push(`wrapped in ${sel.wrapPaper.name.toLowerCase()} paper`);
    }
    if (sel.ribbon) {
        parts.push(`tied with a ${sel.ribbon.name.toLowerCase()} ribbon`);
    }
    parts.push(
        "professional studio flower photography, soft natural light, plain background",
    );
    return parts.join(", ");
}

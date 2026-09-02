export interface BouquetSelection {
    occasion: string | null;
    colors: string[];
    style: string | null;
    flowers: { name: string; color: string }[];
    arrangementNote: string;
    wrapPaper: { name: string; color: string } | null;
    ribbon: { name: string; color: string } | null;
}

const OCCASION_EN: Record<string, string> = {
    birthday: "birthday",
    love: "anniversary",
    "grand-opening": "grand opening",
    congrats: "congratulations",
    sympathy: "sympathy",
    thanks: "thank-you",
    sorry: "apology",
};

const COLOR_EN: Record<string, string> = {
    red: "red",
    pink: "pink",
    white: "white",
    yellow: "yellow",
    purple: "purple",
};

const STYLE_EN: Record<string, string> = {
    round: "hand-tied",
    korean: "long Korean-style",
    rustic: "loose rustic",
    minimal: "minimalist",
    basket: "arranged in a basket",
};

function joinEn(parts: string[]): string {
    if (parts.length <= 1) return parts.join("");
    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function pluralFlower(name: string): string {
    const n = name.toLowerCase();
    return n.endsWith("s") ? n : `${n}s`;
}

export function buildBouquetPrompt(sel: BouquetSelection): string {
    const occasion = sel.occasion ? OCCASION_EN[sel.occasion] : null;
    const styleWord = sel.style ? STYLE_EN[sel.style] : null;
    const colorWords = sel.colors.map((c) => COLOR_EN[c] ?? c);

    const head =
        `a ${styleWord ? styleWord + " " : ""}` +
        `${occasion ? occasion + " " : ""}bouquet`;

    const parts: string[] = [head];
    if (colorWords.length) {
        parts.push(`in ${joinEn(colorWords)} tones`);
    }
    if (sel.flowers.length) {
        parts.push(
            `featuring ${joinEn(sel.flowers.map((f) => pluralFlower(f.name)))}`,
        );
    } else {
        parts.push("a florist's-choice arrangement");
    }
    const note = sel.arrangementNote.trim();
    parts.push(
        note ? `arranged ${note}` : "arranged in a natural rounded shape",
    );
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

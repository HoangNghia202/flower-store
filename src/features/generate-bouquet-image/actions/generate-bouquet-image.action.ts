"use server";

import {
    buildBouquetPrompt,
    type BouquetSelection,
} from "@/src/features/generate-bouquet-image/model/build-prompt";

export interface GenerateBouquetImageResult {
    imageUrl: string;
    prompt: string;
}

const CANVAS = 480;
const MAX_SHAPES = 16;

const SAFE_COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/;
const safeColor = (c: string): string => (SAFE_COLOR.test(c) ? c : "#F7C9D6");

function svgBouquet(sel: BouquetSelection): string {
    const palette =
        sel.flowers.length > 0
            ? sel.flowers.map((f) => f.color)
            : sel.colors.length > 0
              ? sel.colors
              : ["#F7C9D6"];

    const cx = CANVAS / 2;
    const petals = Array.from({ length: MAX_SHAPES }, (_, i) => {
        const color = safeColor(palette[i % palette.length]);
        const angle = (i / MAX_SHAPES) * Math.PI * 2;
        const radius = 70 + (i % 3) * 26;
        const x = cx + Math.cos(angle) * radius;
        const y = 170 + Math.sin(angle) * radius * 0.7;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="26" fill="${color}" fill-opacity="0.92" />`;
    }).join("");

    const wrapColor = safeColor(sel.wrapPaper?.color ?? "#E7DFD3");
    const ribbonColor = safeColor(sel.ribbon?.color ?? "#E8A0B4");

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">`,
        `<rect width="${CANVAS}" height="${CANVAS}" fill="#FFF7FA" />`,
        `<path d="M${cx} 250 L${cx - 120} 460 L${cx + 120} 460 Z" fill="${wrapColor}" />`,
        petals,
        `<rect x="${cx - 130}" y="330" width="260" height="26" rx="13" fill="${ribbonColor}" />`,
        `</svg>`,
    ].join("");
}

export async function generateBouquetImage(
    sel: BouquetSelection,
): Promise<GenerateBouquetImageResult> {
    if (!sel || !Array.isArray(sel.colors)) {
        throw new Error("Invalid bouquet selection");
    }

    const prompt = buildBouquetPrompt(sel);

    // --- STUB: swap this block for a real image API call. ------------------
    // Select the implementation via process.env.BOUQUET_IMAGE_PROVIDER and
    // read the provider key from .env. Keep the signature and return type.
    // Before wiring a metered image provider here, this endpoint needs:
    //   - full payload validation with a Zod schema (not just the shape guard
    //     above), rejecting unknown occasions/colours/styles;
    //   - auth or rate-limiting — this is an anonymous, unauthenticated
    //     server action reachable by anyone;
    //   - a per-request cost cap, since a metered image API will sit here and
    //     each call spends real money.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const svg = svgBouquet(sel);
    const imageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    // ---------------------------------------------------------------------

    return { imageUrl, prompt };
}

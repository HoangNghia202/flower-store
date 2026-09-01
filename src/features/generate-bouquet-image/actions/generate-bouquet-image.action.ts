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

function svgBouquet(sel: BouquetSelection): string {
    // Expand each stem colour by its quantity, cap the shape count so the
    // resulting data URL stays small enough for a localStorage-persisted cart.
    const dots: string[] = [];
    for (const stem of sel.stems) {
        for (let i = 0; i < stem.quantity && dots.length < 24; i++) {
            dots.push(stem.color);
        }
    }
    if (dots.length === 0) dots.push("#F7C9D6");

    const cx = CANVAS / 2;
    const petals = dots
        .map((color, i) => {
            const angle = (i / dots.length) * Math.PI * 2;
            const radius = 70 + (i % 3) * 26;
            const x = cx + Math.cos(angle) * radius;
            const y = 170 + Math.sin(angle) * radius * 0.7;
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="26" fill="${color}" fill-opacity="0.92" />`;
        })
        .join("");

    const wrapColor = sel.wrapPaper?.color ?? "#E7DFD3";
    const ribbonColor = sel.ribbon?.color ?? "#E8A0B4";

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
    const prompt = buildBouquetPrompt(sel);

    // --- STUB: swap this block for a real image API call. ------------------
    // Select the implementation via process.env.BOUQUET_IMAGE_PROVIDER and
    // read the provider key from .env. Keep the signature and return type.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const svg = svgBouquet(sel);
    const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    // ---------------------------------------------------------------------

    return { imageUrl, prompt };
}

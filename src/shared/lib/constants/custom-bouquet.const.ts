export const MIN_STEMS = 5;

export const BUILDER_STEPS = ["Stems", "Wrap", "Ribbon", "Review"] as const;

export const STEM_EMOJI: Record<string, string> = {
    "Red Rose": "🌹",
    "Pink Rose": "🌷",
    "White Lily": "🌼",
    "Yellow Tulip": "🌷",
    "Purple Orchid": "🪻",
    Sunflower: "🌻",
    "Baby's Breath": "🤍",
    Peony: "🌸",
    Lavender: "💜",
    Carnation: "🌺",
};

export const STEM_EMOJI_FALLBACK = "🌿";

export function stemEmoji(name: string): string {
    return STEM_EMOJI[name] ?? STEM_EMOJI_FALLBACK;
}

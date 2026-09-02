export const MAX_REFERENCE_IMAGES = 3;

export interface BudgetTier {
    id: string;
    price: number;
    maxFlowerTypes: number;
    label: string;
}

export const BUDGET_TIERS: BudgetTier[] = [
    { id: "t100", price: 100_000, maxFlowerTypes: 2, label: "100.000₫" },
    { id: "t200", price: 200_000, maxFlowerTypes: 3, label: "200.000₫" },
    { id: "t350", price: 350_000, maxFlowerTypes: 3, label: "350.000₫" },
    { id: "t500", price: 500_000, maxFlowerTypes: 4, label: "500.000₫" },
    { id: "t800", price: 800_000, maxFlowerTypes: 5, label: "800.000₫" },
    { id: "t1200", price: 1_200_000, maxFlowerTypes: 6, label: "1.200.000₫" },
];

export const OCCASIONS = [
    { id: "birthday", label: "Sinh nhật", emoji: "🎂" },
    { id: "love", label: "Tình yêu / Kỷ niệm", emoji: "💕" },
    { id: "grand-opening", label: "Khai trương", emoji: "🎉" },
    { id: "congrats", label: "Chúc mừng", emoji: "🌟" },
    { id: "sympathy", label: "Chia buồn", emoji: "🕊️" },
    { id: "thanks", label: "Cảm ơn", emoji: "🙏" },
    { id: "sorry", label: "Xin lỗi", emoji: "🌷" },
] as const;

// id values match Stem.color in the seed
export const FLOWER_COLORS = [
    { id: "red", label: "Đỏ", swatch: "#C0392B" },
    { id: "pink", label: "Hồng", swatch: "#F7C9D6" },
    { id: "white", label: "Trắng", swatch: "#FFFFFF" },
    { id: "yellow", label: "Vàng", swatch: "#F1C40F" },
    { id: "purple", label: "Tím", swatch: "#8E7CC3" },
] as const;

export const BOUQUET_STYLES = [
    { id: "round", label: "Bó tròn (hand-tied)" },
    { id: "korean", label: "Bó dài kiểu Hàn" },
    { id: "rustic", label: "Rustic / tự nhiên" },
    { id: "minimal", label: "Tối giản" },
    { id: "basket", label: "Lẵng / Kệ", hidesWrapping: true },
] as const;

export const BUILD_STEPS = [
    "Dịp",
    "Ngân sách",
    "Màu sắc",
    "Kiểu dáng",
    "Chọn hoa",
    "Gói hoa",
    "Xem lại",
];
export const BUILD_STEPS_QUICK = ["Dịp", "Ngân sách", "Màu sắc", "Xem lại"];
export const PHOTO_STEPS = [
    "Tải ảnh",
    "Dịp",
    "Ngân sách",
    "Ghi chú",
    "Xem lại",
];

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

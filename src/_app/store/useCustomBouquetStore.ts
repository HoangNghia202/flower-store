import { create } from "zustand";
import {
    MAX_REFERENCE_IMAGES,
    styleHidesWrapping,
    type BudgetTier,
} from "@/shared/lib/constants/custom-bouquet.const";

export type BouquetMode = "build" | "photo";

export interface SelectedFlower {
    id: string;
    name: string;
    color: string;
}

export interface SelectedOption {
    id: string;
    name: string;
    color: string;
    price: number;
}

const BUILD_REVIEW_STEP = 7;
const PHOTO_LAST_STEP = 5;

interface CustomBouquetState {
    mode: BouquetMode | null;
    step: number;
    quick: boolean;

    occasion: string | null;
    tier: BudgetTier | null;
    colors: string[];
    style: string | null;
    selectedFlowers: SelectedFlower[];
    arrangementNote: string;
    selectedWrap: SelectedOption | null;
    selectedRibbon: SelectedOption | null;
    generatedImage: string | null;

    referenceFiles: File[];
    floristNote: string;

    cardMessage: string;

    setMode: (mode: BouquetMode) => void;
    resetMode: () => void;
    nextStep: () => void;
    prevStep: () => void;
    setStep: (step: number) => void;
    setQuick: (quick: boolean) => void;

    setOccasion: (id: string) => void;
    setTier: (tier: BudgetTier) => void;
    toggleColor: (color: string) => void;
    setStyle: (id: string) => void;
    toggleFlower: (flower: SelectedFlower) => void;
    setArrangementNote: (text: string) => void;
    setWrap: (opt: SelectedOption) => void;
    setRibbon: (opt: SelectedOption) => void;
    setGeneratedImage: (url: string | null) => void;

    addReferenceFile: (file: File) => void;
    removeReferenceFile: (file: File) => void;
    setFloristNote: (text: string) => void;

    setCardMessage: (text: string) => void;
    resetBuilder: () => void;

    getTotalPrice: () => number;
    canProceed: (step: number) => boolean;
}

const WIZARD_DEFAULTS = {
    step: 1,
    quick: false,
    occasion: null,
    tier: null,
    colors: [] as string[],
    style: null,
    selectedFlowers: [] as SelectedFlower[],
    arrangementNote: "",
    selectedWrap: null,
    selectedRibbon: null,
    generatedImage: null,
    referenceFiles: [] as File[],
    floristNote: "",
    cardMessage: "",
};

export const useCustomBouquetStore = create<CustomBouquetState>((set, get) => ({
    mode: null,
    ...WIZARD_DEFAULTS,

    setMode: (mode) => set({ mode, step: 1, quick: false }),
    resetMode: () => set({ mode: null, ...WIZARD_DEFAULTS }),

    nextStep: () => {
        const { mode, step, quick, style } = get();
        if (mode === "photo") {
            set({ step: Math.min(PHOTO_LAST_STEP, step + 1) });
            return;
        }
        // build
        if (quick && step === 3) {
            set({ step: BUILD_REVIEW_STEP });
            return;
        }
        if (step === 5 && styleHidesWrapping(style)) {
            set({ step: BUILD_REVIEW_STEP });
            return;
        }
        set({ step: Math.min(BUILD_REVIEW_STEP, step + 1) });
    },

    prevStep: () => {
        const { mode, step, quick, style } = get();
        if (mode === "photo") {
            set({ step: Math.max(1, step - 1) });
            return;
        }
        if (quick && step === BUILD_REVIEW_STEP) {
            set({ step: 3, quick: false });
            return;
        }
        if (step === BUILD_REVIEW_STEP && styleHidesWrapping(style)) {
            set({ step: 5 });
            return;
        }
        set({ step: Math.max(1, step - 1) });
    },

    setStep: (step) =>
        set({ step: Math.max(1, Math.min(BUILD_REVIEW_STEP, step)) }),
    setQuick: (quick) =>
        set(
            quick ? { quick: true, step: BUILD_REVIEW_STEP } : { quick: false },
        ),

    setOccasion: (id) => set({ occasion: id, generatedImage: null }),

    setTier: (tier) => {
        const current = get().selectedFlowers;
        set({
            tier,
            selectedFlowers: current.slice(0, tier.maxFlowerTypes),
            generatedImage: null,
        });
    },

    toggleColor: (color) => {
        const has = get().colors.includes(color);
        const colors = has
            ? get().colors.filter((c) => c !== color)
            : [...get().colors, color];
        set({
            colors,
            selectedFlowers: get().selectedFlowers.filter((f) =>
                colors.includes(f.color),
            ),
            generatedImage: null,
        });
    },

    setStyle: (id) => set({ style: id, generatedImage: null }),

    toggleFlower: (flower) => {
        const current = get().selectedFlowers;
        const has = current.some((f) => f.id === flower.id);
        if (has) {
            set({
                selectedFlowers: current.filter((f) => f.id !== flower.id),
                generatedImage: null,
            });
            return;
        }
        const cap = get().tier?.maxFlowerTypes ?? 0;
        if (current.length >= cap) return;
        set({
            selectedFlowers: [...current, flower],
            generatedImage: null,
        });
    },

    setArrangementNote: (text) =>
        set({ arrangementNote: text, generatedImage: null }),
    setWrap: (opt) => set({ selectedWrap: opt, generatedImage: null }),
    setRibbon: (opt) => set({ selectedRibbon: opt, generatedImage: null }),
    setGeneratedImage: (url) => set({ generatedImage: url }),

    addReferenceFile: (file) => {
        const current = get().referenceFiles;
        if (current.length >= MAX_REFERENCE_IMAGES) return;
        const duplicate = current.some(
            (f) =>
                f.name === file.name &&
                f.size === file.size &&
                f.lastModified === file.lastModified,
        );
        if (duplicate) return;
        set({ referenceFiles: [...current, file] });
    },
    removeReferenceFile: (file) =>
        set({
            referenceFiles: get().referenceFiles.filter((f) => f !== file),
        }),
    setFloristNote: (text) => set({ floristNote: text }),

    setCardMessage: (text) => set({ cardMessage: text }),
    resetBuilder: () => get().resetMode(),

    getTotalPrice: () => get().tier?.price ?? 0,

    canProceed: (step) => {
        const s = get();
        if (s.mode === "photo") {
            switch (step) {
                case 1:
                    return s.referenceFiles.length >= 1;
                case 2:
                    return s.occasion !== null;
                case 3:
                    return s.tier !== null;
                default:
                    return true; // steps 4, 5
            }
        }
        // build
        switch (step) {
            case 1:
                return s.occasion !== null;
            case 2:
                return s.tier !== null;
            case 3:
                return s.colors.length > 0;
            case 4:
                return s.style !== null;
            case 5:
                return s.selectedFlowers.length > 0;
            case 6:
                return s.selectedWrap !== null && s.selectedRibbon !== null;
            default:
                return true; // step 7
        }
    },
}));

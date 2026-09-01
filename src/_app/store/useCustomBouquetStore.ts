import { create } from "zustand";

export interface SelectedStem {
    id: string;
    name: string;
    pricePerStem: number;
    quantity: number;
    color: string;
}

export interface SelectedOption {
    id: string;
    name: string;
    color: string;
    price: number;
}

const LAST_STEP = 4;

interface CustomBouquetState {
    step: number;
    selectedStems: SelectedStem[];
    selectedWrap: SelectedOption | null;
    selectedRibbon: SelectedOption | null;
    generatedImage: string | null;

    nextStep: () => void;
    prevStep: () => void;
    setStep: (step: number) => void;

    addStem: (stem: Omit<SelectedStem, "quantity">) => void;
    removeStem: (stemId: string) => void;
    updateStemQuantity: (stemId: string, quantity: number) => void;

    setWrap: (wrap: SelectedOption) => void;
    setRibbon: (ribbon: SelectedOption) => void;
    setGeneratedImage: (url: string | null) => void;

    resetBuilder: () => void;

    getBuilderTotalPrice: () => number;
    getBuilderTotalStems: () => number;
}

export const useCustomBouquetStore = create<CustomBouquetState>((set, get) => ({
    step: 1,
    selectedStems: [],
    selectedWrap: null,
    selectedRibbon: null,
    generatedImage: null,

    nextStep: () =>
        set((state) => ({ step: Math.min(LAST_STEP, state.step + 1) })),
    prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
    setStep: (step) => set({ step: Math.min(LAST_STEP, Math.max(1, step)) }),

    addStem: (stem) => {
        const current = get().selectedStems;
        const existing = current.find((s) => s.id === stem.id);
        if (existing) {
            set({
                selectedStems: current.map((s) =>
                    s.id === stem.id ? { ...s, quantity: s.quantity + 1 } : s,
                ),
            });
        } else {
            set({ selectedStems: [...current, { ...stem, quantity: 1 }] });
        }
    },

    removeStem: (stemId) => {
        set({
            selectedStems: get().selectedStems.filter((s) => s.id !== stemId),
        });
    },

    updateStemQuantity: (stemId, quantity) => {
        if (quantity <= 0) {
            get().removeStem(stemId);
            return;
        }
        set({
            selectedStems: get().selectedStems.map((s) =>
                s.id === stemId ? { ...s, quantity } : s,
            ),
        });
    },

    setWrap: (wrap) => set({ selectedWrap: wrap }),
    setRibbon: (ribbon) => set({ selectedRibbon: ribbon }),
    setGeneratedImage: (url) => set({ generatedImage: url }),

    resetBuilder: () =>
        set({
            step: 1,
            selectedStems: [],
            selectedWrap: null,
            selectedRibbon: null,
            generatedImage: null,
        }),

    getBuilderTotalPrice: () => {
        const stemsPrice = get().selectedStems.reduce(
            (total, stem) => total + stem.pricePerStem * stem.quantity,
            0,
        );
        const wrapPrice = get().selectedWrap?.price ?? 0;
        const ribbonPrice = get().selectedRibbon?.price ?? 0;
        return stemsPrice + wrapPrice + ribbonPrice;
    },

    getBuilderTotalStems: () => {
        return get().selectedStems.reduce(
            (total, stem) => total + stem.quantity,
            0,
        );
    },
}));

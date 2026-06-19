import { create } from 'zustand';

export interface SelectedStem {
  id: string;
  name: string;
  pricePerStem: number;
  quantity: number;
  color: string;
}

interface CustomBouquetState {
  step: number;
  selectedStems: SelectedStem[];
  selectedWrap: string | null;
  selectedRibbon: string | null;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  addStem: (stem: { id: string; name: string; pricePerStem: number; color: string }) => void;
  removeStem: (stemId: string) => void;
  updateStemQuantity: (stemId: string, quantity: number) => void;
  setWrap: (wrap: string) => void;
  setRibbon: (ribbon: string) => void;
  resetBuilder: () => void;
  getBuilderTotalPrice: () => number;
  getBuilderTotalStems: () => number;
}

export const useCustomBouquetStore = create<CustomBouquetState>((set, get) => ({
  step: 1,
  selectedStems: [],
  selectedWrap: null,
  selectedRibbon: null,

  nextStep: () => set((state) => ({ step: state.step + 1 })),
  prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
  setStep: (step) => set({ step }),

  addStem: (stem) => {
    const current = get().selectedStems;
    const existing = current.find((s) => s.id === stem.id);
    if (existing) {
      set({
        selectedStems: current.map((s) =>
          s.id === stem.id ? { ...s, quantity: s.quantity + 1 } : s
        ),
      });
    } else {
      set({
        selectedStems: [...current, { ...stem, quantity: 1 }],
      });
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
        s.id === stemId ? { ...s, quantity } : s
      ),
    });
  },

  setWrap: (wrap) => set({ selectedWrap: wrap }),
  setRibbon: (ribbon) => set({ selectedRibbon: ribbon }),

  resetBuilder: () =>
    set({
      step: 1,
      selectedStems: [],
      selectedWrap: null,
      selectedRibbon: null,
    }),

  getBuilderTotalPrice: () => {
    const stemsPrice = get().selectedStems.reduce(
      (total, stem) => total + stem.pricePerStem * stem.quantity,
      0
    );
    // Base cost for paper wrapping & ribbon (e.g., 50,000 VND base fee)
    const baseFee = get().selectedWrap || get().selectedRibbon ? 50000 : 0;
    return stemsPrice + baseFee;
  },

  getBuilderTotalStems: () => {
    return get().selectedStems.reduce((total, stem) => total + stem.quantity, 0);
  },
}));

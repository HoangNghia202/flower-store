import { create } from "zustand";
import { type UserVM } from "@/src/entites/user/model";

interface UserState {
    user: UserVM | null;
    setUser: (user: UserVM | null) => void;
    clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    setUser: (user: UserVM | null) => set({ user }),
    clearUser: () => set({ user: null }),
}));

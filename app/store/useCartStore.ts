import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartStem {
    stemId: string;
    name: string;
    pricePerStem: number;
    quantity: number;
    color: string;
}

export interface CartItem {
    id: string; // Product ID or custom unique ID "CUSTOM-[uuid]"
    name: string;
    slug: string;
    price: number;
    image: string;
    quantity: number;
    isCustomBouquet?: boolean;
    customDetails?: {
        wrapPaper: string;
        ribbon: string;
        stems: CartStem[];
    };
    addons?: {
        id: string;
        name: string;
        price: number;
        quantity: number;
    }[];
}

interface CartState {
    items: CartItem[];
    addToCart: (product: CartItem, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    addAddonToItem: (
        productId: string,
        addon: { id: string; name: string; price: number },
    ) => void;
    removeAddonFromItem: (productId: string, addonId: string) => void;
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addToCart: (product, quantity = 1) => {
                const currentItems = get().items;
                // Identify matching items. For custom bouquets, we check if details match or if id is identical.
                const existingItem = currentItems.find((item) => {
                    if (product.isCustomBouquet) {
                        return item.id === product.id;
                    }
                    return item.id === product.id && !item.isCustomBouquet;
                });

                if (existingItem) {
                    set({
                        items: currentItems.map((item) =>
                            item.id === product.id
                                ? {
                                      ...item,
                                      quantity: item.quantity + quantity,
                                  }
                                : item,
                        ),
                    });
                } else {
                    set({ items: [...currentItems, { ...product, quantity }] });
                }
            },

            removeFromCart: (productId) => {
                set({
                    items: get().items.filter((item) => item.id !== productId),
                });
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeFromCart(productId);
                    return;
                }
                set({
                    items: get().items.map((item) =>
                        item.id === productId ? { ...item, quantity } : item,
                    ),
                });
            },

            addAddonToItem: (productId, addon) => {
                set({
                    items: get().items.map((item) => {
                        if (item.id !== productId) return item;

                        const existingAddons = item.addons || [];
                        const existingAddon = existingAddons.find(
                            (a) => a.id === addon.id,
                        );

                        let updatedAddons;
                        if (existingAddon) {
                            updatedAddons = existingAddons.map((a) =>
                                a.id === addon.id
                                    ? { ...a, quantity: a.quantity + 1 }
                                    : a,
                            );
                        } else {
                            updatedAddons = [
                                ...existingAddons,
                                { ...addon, quantity: 1 },
                            ];
                        }

                        return { ...item, addons: updatedAddons };
                    }),
                });
            },

            removeAddonFromItem: (productId, addonId) => {
                set({
                    items: get().items.map((item) => {
                        if (item.id !== productId || !item.addons) return item;
                        return {
                            ...item,
                            addons: item.addons.filter((a) => a.id !== addonId),
                        };
                    }),
                });
            },

            clearCart: () => set({ items: [] }),

            getTotalItems: () => {
                return get().items.reduce(
                    (total, item) => total + item.quantity,
                    0,
                );
            },

            getTotalPrice: () => {
                return get().items.reduce((total, item) => {
                    const itemPrice = item.price * item.quantity;
                    const addonsPrice = (item.addons || []).reduce(
                        (sum, addon) => sum + addon.price * addon.quantity,
                        0,
                    );
                    return total + itemPrice + addonsPrice * item.quantity;
                }, 0);
            },
        }),
        {
            name: "flower-cart-storage", // Key saved in localStorage
        },
    ),
);

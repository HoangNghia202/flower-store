"use client";

import { useEffect } from "react";
import { useCartStore } from "@/_app/store/useCartStore";

export function ClearCartOnMount() {
    const clearCart = useCartStore((s) => s.clearCart);
    useEffect(() => {
        clearCart();
    }, [clearCart]);
    return null;
}

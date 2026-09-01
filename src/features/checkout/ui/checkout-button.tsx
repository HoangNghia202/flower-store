"use client";

import { CreditCard } from "lucide-react";
import { Button } from "@/shared/ui";

/**
 * Placeholder checkout trigger. The parent owns the "paid" state and renders
 * {@link PaymentSuccessDialog}, because clearing the cart unmounts whatever
 * lives inside the cart's item-list subtree.
 */
export function CheckoutButton({ onCheckout }: { onCheckout: () => void }) {
    return (
        <Button
            type="button"
            size="lg"
            className="w-full bg-pink-500 hover:bg-pink-600"
            onClick={onCheckout}
        >
            <CreditCard size={16} className="mr-2" />
            Checkout
        </Button>
    );
}

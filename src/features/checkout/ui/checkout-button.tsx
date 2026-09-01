"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/shared/ui";
import { useCartStore } from "@/_app/store/useCartStore";
import { PaymentSuccessDialog } from "./payment-success-dialog";

/**
 * Placeholder checkout. Real payment is a later feature; for now it clears the
 * cart and shows {@link PaymentSuccessDialog}.
 */
export function CheckoutButton() {
    const clearCart = useCartStore((s) => s.clearCart);
    const [paid, setPaid] = useState(false);

    function handleCheckout() {
        clearCart();
        setPaid(true);
    }

    return (
        <>
            <Button
                type="button"
                size="lg"
                className="w-full bg-pink-500 hover:bg-pink-600"
                onClick={handleCheckout}
            >
                <CreditCard size={16} className="mr-2" />
                Checkout
            </Button>
            {paid && <PaymentSuccessDialog />}
        </>
    );
}

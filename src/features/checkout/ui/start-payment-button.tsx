"use client";

import { useState } from "react";
import { Button } from "@/shared/ui";
import { startPaymentAction } from "@/src/entites/order/actions/start-payment.action";

export function StartPaymentButton({ orderNumber }: { orderNumber: string }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function pay() {
        setBusy(true);
        setError(null);
        const res = await startPaymentAction(orderNumber);
        if (res.ok) {
            window.location.href = res.redirect;
            return;
        }
        setBusy(false);
        setError(res.error);
    }

    return (
        <div>
            <Button
                type="button"
                disabled={busy}
                onClick={pay}
                className="bg-pink-500 hover:bg-pink-600"
            >
                {busy ? "Starting…" : "Complete payment"}
            </Button>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

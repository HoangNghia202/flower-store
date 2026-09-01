"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui";

const COUNTDOWN_SECONDS = 5;

/**
 * Placeholder "payment successful" modal. Real checkout lands later; for now it
 * confirms the (faked) payment, counts down from 5s, then sends the user to the
 * catalog. Mounted only while it should be visible, so its countdown state
 * resets naturally on each open.
 */
export function PaymentSuccessDialog() {
    const router = useRouter();
    const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const tick = setInterval(() => {
            setSeconds((s) => Math.max(s - 1, 0));
        }, 1000);
        return () => {
            clearInterval(tick);
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        if (seconds === 0) {
            router.push("/catalog");
        }
    }, [seconds, router]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-success-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
                <h2
                    id="payment-success-title"
                    className="mt-4 font-playfair text-xl font-bold text-gray-900"
                >
                    Payment successful
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    Your order has been placed. Redirecting to the catalog in{" "}
                    <span className="font-semibold text-gray-700">
                        {seconds}s
                    </span>
                    …
                </p>
                <Button
                    type="button"
                    className="mt-5 w-full bg-pink-500 hover:bg-pink-600"
                    onClick={() => router.push("/catalog")}
                >
                    Back to Catalog
                </Button>
            </div>
        </div>
    );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/shared/ui";
import { useCartStore } from "@/_app/store/useCartStore";
import { createOrderAction } from "@/src/entites/order/actions/create-order.action";
import { DELIVERY_SLOTS } from "@/src/entites/order/model/delivery.const";
import type { OrderActionState } from "@/src/entites/order/model/order.model";
import { AddressBookSelect } from "./address-book-select";
import { OrderSummary } from "./order-summary";

function minDeliveryDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function FormField({
    label,
    error,
    children,
}: {
    label: string;
    error?: string[];
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <Label>{label}</Label>
            {children}
            {error?.length ? (
                <p className="text-xs text-red-500">{error[0]}</p>
            ) : null}
        </div>
    );
}

export function CheckoutForm() {
    const router = useRouter();
    const items = useCartStore((s) => s.items);
    const [state, formAction, pending] = useActionState<
        OrderActionState | null,
        FormData
    >(createOrderAction, null);

    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");
    const [recipientAddress, setRecipientAddress] = useState("");
    const [couponCode, setCouponCode] = useState("");

    const soleMessage =
        items.length === 1 ? (items[0].customDetails?.cardMessage ?? "") : "";

    const redirectedRef = useRef(false);
    useEffect(() => {
        if (!state?.ok || !state.redirect || redirectedRef.current) return;
        redirectedRef.current = true;
        if (state.external) {
            window.location.href = state.redirect;
        } else {
            router.push(state.redirect);
        }
    }, [state, router]);

    const errors = state?.fieldErrors ?? {};

    return (
        <form
            action={formAction}
            className="grid gap-8 lg:grid-cols-[1fr_320px]"
        >
            <input
                type="hidden"
                name="cartSnapshot"
                value={JSON.stringify(
                    items.map((i) => ({
                        id: i.id,
                        quantity: i.quantity,
                        isCustomBouquet: Boolean(i.isCustomBouquet),
                        price: i.price,
                        name: i.name,
                        image: i.image,
                        customDetails: i.customDetails ?? null,
                        addons: i.addons ?? null,
                    })),
                )}
            />
            <input type="hidden" name="couponCode" value={couponCode} />

            <div className="space-y-8">
                {state?.error && (
                    <p
                        role="alert"
                        className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                    >
                        {state.error}
                    </p>
                )}

                <section className="space-y-4">
                    <h2 className="font-playfair text-lg font-bold text-gray-900">
                        Recipient
                    </h2>
                    <AddressBookSelect
                        onSelect={(o) => {
                            setRecipientName(o.recipientName);
                            setRecipientPhone(o.recipientPhone);
                            setRecipientAddress(o.recipientAddress);
                        }}
                    />
                    <FormField
                        label="Full name"
                        error={errors["recipientName"]}
                    >
                        <Input
                            name="recipientName"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                        />
                    </FormField>
                    <FormField label="Phone" error={errors["recipientPhone"]}>
                        <Input
                            name="recipientPhone"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                        />
                    </FormField>
                    <FormField
                        label="Delivery address"
                        error={errors["recipientAddress"]}
                    >
                        <textarea
                            name="recipientAddress"
                            rows={3}
                            value={recipientAddress}
                            onChange={(e) =>
                                setRecipientAddress(e.target.value)
                            }
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </FormField>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" name="isAnonymous" />
                        Send anonymously (hide my name from the recipient)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" name="saveRecipient" />
                        Save this recipient to my address book
                    </label>
                </section>

                <section className="space-y-4">
                    <h2 className="font-playfair text-lg font-bold text-gray-900">
                        Delivery
                    </h2>
                    <FormField
                        label="Delivery date"
                        error={errors["deliveryDate"]}
                    >
                        <Input
                            type="date"
                            name="deliveryDate"
                            min={minDeliveryDate()}
                            defaultValue={minDeliveryDate()}
                        />
                    </FormField>
                    <FormField label="Time slot" error={errors["deliverySlot"]}>
                        <select
                            name="deliverySlot"
                            defaultValue={DELIVERY_SLOTS[0]}
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        >
                            {DELIVERY_SLOTS.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </FormField>
                </section>

                <section className="space-y-4">
                    <h2 className="font-playfair text-lg font-bold text-gray-900">
                        Card message
                    </h2>
                    <FormField
                        label="Message (optional)"
                        error={errors["cardMessage"]}
                    >
                        <textarea
                            name="cardMessage"
                            rows={3}
                            defaultValue={soleMessage}
                            maxLength={500}
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </FormField>
                </section>

                <section className="space-y-3">
                    <h2 className="font-playfair text-lg font-bold text-gray-900">
                        Payment
                    </h2>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name="paymentMethod"
                            value="COD"
                            defaultChecked
                        />
                        Cash on delivery
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name="paymentMethod"
                            value="PAYOS"
                        />
                        Pay online (PayOS)
                    </label>
                </section>
            </div>

            <OrderSummary
                couponCode={couponCode}
                onCouponChange={setCouponCode}
                pending={pending}
            />
        </form>
    );
}

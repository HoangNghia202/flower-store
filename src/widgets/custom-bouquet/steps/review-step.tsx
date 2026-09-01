"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { useCartStore } from "@/_app/store/useCartStore";
import {
    generateBouquetImage,
    type BouquetSelection,
} from "@/src/features/generate-bouquet-image";
import { stemEmoji } from "@/shared/lib/constants/custom-bouquet.const";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function ReviewStep() {
    const router = useRouter();

    const stems = useCustomBouquetStore((s) => s.selectedStems);
    const wrap = useCustomBouquetStore((s) => s.selectedWrap);
    const ribbon = useCustomBouquetStore((s) => s.selectedRibbon);
    const generatedImage = useCustomBouquetStore((s) => s.generatedImage);
    const setGeneratedImage = useCustomBouquetStore(
        (s) => s.setGeneratedImage,
    );
    const totalPrice = useCustomBouquetStore((s) => s.getBuilderTotalPrice());
    const resetBuilder = useCustomBouquetStore((s) => s.resetBuilder);

    const addToCart = useCartStore((s) => s.addToCart);

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(false);
    const startedRef = useRef(false);

    useEffect(() => {
        if (generatedImage || startedRef.current) return;
        startedRef.current = true;

        let ignore = false;
        const selection: BouquetSelection = {
            stems: stems.map((s) => ({
                name: s.name,
                color: s.color,
                quantity: s.quantity,
            })),
            wrapPaper: wrap
                ? { name: wrap.name, color: wrap.color }
                : null,
            ribbon: ribbon
                ? { name: ribbon.name, color: ribbon.color }
                : null,
        };

        setIsGenerating(true);
        setError(false);
        generateBouquetImage(selection)
            .then((res) => {
                if (ignore) return;
                setGeneratedImage(res.imageUrl);
            })
            .catch(() => {
                if (!ignore) setError(true);
            })
            .finally(() => {
                if (!ignore) setIsGenerating(false);
            });

        return () => {
            ignore = true;
        };
    }, [generatedImage, stems, wrap, ribbon, setGeneratedImage]);

    function retry() {
        startedRef.current = false;
        setGeneratedImage(null);
    }

    function addToCartAndCheckout() {
        const id = `CUSTOM-${crypto.randomUUID()}`;
        addToCart(
            {
                id,
                name: "Custom Bouquet",
                slug: "custom-bouquet",
                price: totalPrice,
                image: generatedImage ?? "",
                quantity: 1,
                isCustomBouquet: true,
                customDetails: {
                    wrapPaper: wrap?.name ?? "",
                    ribbon: ribbon?.name ?? "",
                    stems: stems.map((s) => ({
                        stemId: s.id,
                        name: s.name,
                        pricePerStem: s.pricePerStem,
                        quantity: s.quantity,
                        color: s.color,
                    })),
                },
            },
            1,
        );
        resetBuilder();
        router.push("/cart");
    }

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Review your bouquet
            </h2>

            <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-pink-100 bg-pink-50/40">
                    {isGenerating && (
                        <div className="flex flex-col items-center gap-3 text-center">
                            <span
                                className="animate-bouquet-bloom text-5xl select-none"
                                aria-hidden
                            >
                                💐
                            </span>
                            <p className="text-sm text-gray-500">
                                Arranging your bouquet…
                            </p>
                        </div>
                    )}

                    {!isGenerating && error && (
                        <div className="flex flex-col items-center gap-3 text-center">
                            <p className="text-sm text-gray-500">
                                Couldn&apos;t generate the preview.
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                onClick={retry}
                            >
                                Try again
                            </Button>
                        </div>
                    )}

                    {!isGenerating && !error && generatedImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={generatedImage}
                            alt="Your custom bouquet preview"
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>

                <div>
                    <ul className="space-y-1 text-sm text-gray-600">
                        {stems.map((s) => (
                            <li key={s.id}>
                                {stemEmoji(s.name)} {s.quantity}× {s.name}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-sm text-gray-600">
                        Wrap: {wrap?.name ?? "—"}
                    </p>
                    <p className="text-sm text-gray-600">
                        Ribbon: {ribbon?.name ?? "—"}
                    </p>
                    <p className="mt-4 text-2xl font-bold text-gray-900">
                        {vnd(totalPrice)}
                    </p>

                    <Button
                        type="button"
                        size="lg"
                        className="mt-4 w-full bg-pink-500 hover:bg-pink-600"
                        disabled={isGenerating || !generatedImage}
                        onClick={addToCartAndCheckout}
                    >
                        Add to cart &amp; checkout
                    </Button>
                </div>
            </div>
        </div>
    );
}

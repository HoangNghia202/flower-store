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
import {
    OCCASIONS,
    FLOWER_COLORS,
    BOUQUET_STYLES,
} from "@/shared/lib/constants/custom-bouquet.const";
import {
    CardMessageField,
    CardMessageDialog,
    useCardMessageGate,
} from "../card-message-field";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

const occasionLabel = (id: string | null) =>
    OCCASIONS.find((o) => o.id === id)?.label ?? "—";
const styleLabel = (id: string | null) =>
    BOUQUET_STYLES.find((s) => s.id === id)?.label ?? null;
const colorLabels = (ids: string[]) =>
    ids
        .map((id) => FLOWER_COLORS.find((c) => c.id === id)?.label ?? id)
        .join(", ");

export function ReviewStep() {
    const router = useRouter();
    const s = useCustomBouquetStore();
    const addToCart = useCartStore((c) => c.addToCart);

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const startedRef = useRef(false);

    const selection: BouquetSelection = {
        occasion: s.occasion,
        colors: s.colors,
        style: s.style,
        flowers: s.selectedFlowers.map((f) => ({
            name: f.name,
            color: f.color,
        })),
        arrangementNote: s.arrangementNote,
        wrapPaper: s.selectedWrap
            ? { name: s.selectedWrap.name, color: s.selectedWrap.color }
            : null,
        ribbon: s.selectedRibbon
            ? { name: s.selectedRibbon.name, color: s.selectedRibbon.color }
            : null,
    };

    useEffect(() => {
        if (s.generatedImage || startedRef.current) return;
        startedRef.current = true;
        setIsGenerating(true);
        setError(false);
        generateBouquetImage(selection)
            .then((res) => s.setGeneratedImage(res.imageUrl))
            .catch(() => setError(true))
            .finally(() => setIsGenerating(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [s.generatedImage, attempt]);

    function retry() {
        startedRef.current = false;
        setError(false);
        setAttempt((n) => n + 1);
    }

    function proceed() {
        const id = `CUSTOM-${crypto.randomUUID()}`;
        addToCart(
            {
                id,
                name: "Bó hoa tự thiết kế",
                slug: "custom-bouquet",
                price: s.getTotalPrice(),
                image: s.generatedImage ?? "",
                quantity: 1,
                isCustomBouquet: true,
                customDetails: {
                    mode: "build",
                    occasion: s.occasion ?? undefined,
                    tierLabel: s.tier?.label,
                    colors: s.colors,
                    style: s.style ?? undefined,
                    flowers: s.selectedFlowers.map((f) => ({
                        name: f.name,
                        color: f.color,
                    })),
                    arrangementNote: s.arrangementNote || undefined,
                    wrapPaper: s.selectedWrap?.name,
                    ribbon: s.selectedRibbon?.name,
                    cardMessage: s.cardMessage || undefined,
                },
            },
            1,
        );
        router.push("/cart");
        s.resetBuilder();
    }

    const gate = useCardMessageGate(proceed);

    return (
        <div>
            <h2 className="mb-4 font-playfair text-xl font-bold text-gray-900">
                Xem lại
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
                                Đang dựng bó hoa…
                            </p>
                        </div>
                    )}
                    {!isGenerating && error && (
                        <div className="flex flex-col items-center gap-3 text-center">
                            <p className="text-sm text-gray-500">
                                Không tạo được ảnh xem trước.
                            </p>
                            <Button type="button" size="sm" onClick={retry}>
                                Thử lại
                            </Button>
                        </div>
                    )}
                    {!isGenerating && !error && s.generatedImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={s.generatedImage}
                            alt="Ảnh xem trước bó hoa"
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                    {s.quick && (
                        <p className="text-gray-500">
                            Florist sẽ chọn hoa, kiểu dáng và cách gói phù hợp.
                        </p>
                    )}
                    <p>Dịp: {occasionLabel(s.occasion)}</p>
                    <p>Ngân sách: {s.tier?.label ?? "—"}</p>
                    <p>Màu: {colorLabels(s.colors) || "—"}</p>
                    {styleLabel(s.style) && <p>Kiểu: {styleLabel(s.style)}</p>}
                    {s.selectedFlowers.length > 0 && (
                        <p>
                            Hoa:{" "}
                            {s.selectedFlowers.map((f) => f.name).join(", ")}
                        </p>
                    )}
                    {s.arrangementNote.trim() && (
                        <p>Sắp xếp: {s.arrangementNote}</p>
                    )}
                    {s.selectedWrap && <p>Giấy gói: {s.selectedWrap.name}</p>}
                    {s.selectedRibbon && (
                        <p>Ruy băng: {s.selectedRibbon.name}</p>
                    )}

                    <p className="pt-3 text-2xl font-bold text-gray-900">
                        {vnd(s.getTotalPrice())}
                    </p>

                    <div className="pt-3">
                        <CardMessageField />
                    </div>

                    <Button
                        type="button"
                        size="lg"
                        className="mt-4 w-full bg-pink-500 hover:bg-pink-600"
                        disabled={isGenerating || !s.generatedImage}
                        onClick={gate.attemptAddToCart}
                    >
                        Thêm vào giỏ
                    </Button>
                </div>
            </div>

            <CardMessageDialog
                open={gate.dialogOpen}
                onOpenChange={gate.setDialogOpen}
                onWriteMessage={gate.onWriteMessage}
                onContinue={gate.onContinue}
            />
        </div>
    );
}

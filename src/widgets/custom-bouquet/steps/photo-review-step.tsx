"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { useCartStore } from "@/_app/store/useCartStore";
import { OCCASIONS } from "@/shared/lib/constants/custom-bouquet.const";
import { CardMessageDialog, useCardMessageGate } from "../card-message-field";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export function PhotoReviewStep() {
    const router = useRouter();
    const s = useCustomBouquetStore();
    const addToCart = useCartStore((c) => c.addToCart);

    const occasionLabel =
        OCCASIONS.find((o) => o.id === s.occasion)?.label ?? "—";

    function proceed() {
        const id = `CUSTOM-${crypto.randomUUID()}`;
        addToCart(
            {
                id,
                name: "Bó hoa đặt theo ảnh",
                slug: "custom-bouquet",
                price: s.getTotalPrice(),
                image: s.referenceImages[0] ?? "",
                quantity: 1,
                isCustomBouquet: true,
                customDetails: {
                    mode: "photo",
                    occasion: s.occasion ?? undefined,
                    tierLabel: s.tier?.label,
                    referenceImages: s.referenceImages,
                    floristNote: s.floristNote || undefined,
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

            <div className="grid grid-cols-3 gap-3">
                {s.referenceImages.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={url}
                        src={url}
                        alt="Ảnh mẫu"
                        className="aspect-square w-full rounded-xl border object-cover"
                    />
                ))}
            </div>

            <div className="mt-4 space-y-1 text-sm text-gray-600">
                <p>Dịp: {occasionLabel}</p>
                <p>Ngân sách: {s.tier?.label ?? "—"}</p>
                {s.floristNote.trim() && <p>Ghi chú: {s.floristNote}</p>}
                {s.cardMessage.trim() && <p>Lời nhắn: {s.cardMessage}</p>}
                <p className="pt-3 text-2xl font-bold text-gray-900">
                    {vnd(s.getTotalPrice())}
                </p>
            </div>

            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                Bó thật được florist phỏng theo ảnh bạn cung cấp, có thể khác
                biệt do mùa vụ và nguyên liệu sẵn có. Nếu sai khác lớn, shop sẽ
                liên hệ trước khi giao.
            </p>

            <Button
                type="button"
                size="lg"
                className="mt-4 w-full bg-pink-500 hover:bg-pink-600"
                onClick={gate.attemptAddToCart}
            >
                Thêm vào giỏ
            </Button>

            <CardMessageDialog
                open={gate.dialogOpen}
                onOpenChange={gate.setDialogOpen}
                onWriteMessage={gate.onWriteMessage}
                onContinue={gate.onContinue}
            />
        </div>
    );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { PLACEHOLDER_IMAGE } from "@/src/entites/product/model";
import { useCartStore, type CartItem } from "@/_app/store/useCartStore";

export function CartLineItem({ item }: { item: CartItem }) {
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const removeFromCart = useCartStore((s) => s.removeFromCart);

    const addonsTotal = (item.addons ?? []).reduce(
        (sum, a) => sum + a.price * a.quantity,
        0,
    );
    const lineTotal = (item.price + addonsTotal) * item.quantity;
    const hasImage = Boolean(item.image) && item.image !== PLACEHOLDER_IMAGE;

    const cd = item.customDetails;
    const isV2Build = cd?.mode === "build";
    const isV2Photo = cd?.mode === "photo";
    const isV1Custom = !cd?.mode && Boolean(item.isCustomBouquet && cd?.stems);
    const isAnyCustom = isV2Build || isV2Photo || isV1Custom;

    return (
        <div className="flex gap-4 py-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-100 to-violet-100">
                {isAnyCustom && item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.image}
                        alt={item.name}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : hasImage ? (
                    <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                    />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-3xl select-none">
                        💐
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                    {isAnyCustom ? (
                        <span className="line-clamp-2 font-medium text-gray-800">
                            {item.name}
                        </span>
                    ) : (
                        <Link
                            href={`/catalog/${item.slug}`}
                            className="line-clamp-2 font-medium text-gray-800 hover:text-pink-600"
                        >
                            {item.name}
                        </Link>
                    )}
                    <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="mt-0.5 text-sm text-gray-500">
                    {item.price.toLocaleString("vi-VN")}₫
                </p>

                {isV2Build && cd && (
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                        {cd.occasion && <li>Dịp: {cd.occasion}</li>}
                        {cd.tierLabel && <li>Ngân sách: {cd.tierLabel}</li>}
                        {cd.colors?.length ? (
                            <li>Màu: {cd.colors.join(", ")}</li>
                        ) : null}
                        {cd.style && <li>Kiểu: {cd.style}</li>}
                        {cd.flowers?.length ? (
                            <li>{cd.flowers.map((f) => f.name).join(" · ")}</li>
                        ) : null}
                        {cd.arrangementNote && (
                            <li>Sắp xếp: {cd.arrangementNote}</li>
                        )}
                        {cd.wrapPaper && <li>Giấy gói: {cd.wrapPaper}</li>}
                        {cd.ribbon && <li>Ruy băng: {cd.ribbon}</li>}
                        {cd.cardMessage && <li>Lời nhắn: {cd.cardMessage}</li>}
                    </ul>
                )}
                {isV2Photo && cd && (
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                        {cd.occasion && <li>Dịp: {cd.occasion}</li>}
                        {cd.tierLabel && <li>Ngân sách: {cd.tierLabel}</li>}
                        <li>{cd.referenceImages?.length ?? 0} ảnh mẫu</li>
                        {cd.floristNote && <li>Ghi chú: {cd.floristNote}</li>}
                        {cd.cardMessage && <li>Lời nhắn: {cd.cardMessage}</li>}
                    </ul>
                )}
                {isV1Custom && cd?.stems && (
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                        <li>Wrap: {cd.wrapPaper || "—"}</li>
                        <li>Ribbon: {cd.ribbon || "—"}</li>
                        <li>
                            {cd.stems
                                .map((s) => `${s.quantity}× ${s.name}`)
                                .join(" · ")}
                        </li>
                    </ul>
                )}

                {(item.addons ?? []).length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                        {item.addons!.map((a) => (
                            <li key={a.id}>
                                + {a.name} ({a.quantity}×{" "}
                                {a.price.toLocaleString("vi-VN")}₫)
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-md border">
                        <button
                            type="button"
                            aria-label="Decrease quantity"
                            className="px-2 py-1 disabled:opacity-40"
                            disabled={item.quantity <= 1}
                            onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                            }
                        >
                            <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm">
                            {item.quantity}
                        </span>
                        <button
                            type="button"
                            aria-label="Increase quantity"
                            className="px-2 py-1"
                            onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                            }
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <span className="font-semibold text-gray-900">
                        {lineTotal.toLocaleString("vi-VN")}₫
                    </span>
                </div>
            </div>
        </div>
    );
}

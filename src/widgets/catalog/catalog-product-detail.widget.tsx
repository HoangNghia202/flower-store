"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/shared/ui";
import { ProductGallery } from "@/src/entites/product";
import { AddToCartButton } from "@/src/features/add-to-cart";
import type { ProductDetailVM } from "@/src/entites/product/model";

export function CatalogProductDetailWidget({
    product,
}: {
    product: ProductDetailVM;
}) {
    const [qty, setQty] = useState(1);
    const max = Math.max(1, product.stock);

    return (
        <div className="grid gap-8 py-6 lg:grid-cols-2">
            <ProductGallery images={product.images} name={product.name} />

            <div className="space-y-4">
                <div>
                    <Link
                        href={`/catalog?category=${product.categorySlug}`}
                        className="text-xs uppercase tracking-widest text-pink-500"
                    >
                        {product.categoryName}
                    </Link>
                    <h1 className="font-playfair text-3xl font-bold text-gray-900">
                        {product.name}
                    </h1>
                </div>

                <p className="text-2xl font-bold text-gray-900">
                    {product.price.toLocaleString("vi-VN")}₫
                </p>

                <Badge variant={product.inStock ? "default" : "secondary"}>
                    {product.inStock ? "In stock" : "Out of stock"}
                </Badge>

                <p className="text-gray-600">{product.description}</p>

                {product.stems.length > 0 && (
                    <div>
                        <p className="mb-1 text-sm font-semibold text-gray-800">
                            Stems in this arrangement
                        </p>
                        <ul className="space-y-1 text-sm text-gray-600">
                            {product.stems.map((s) => (
                                <li key={s.name}>
                                    {s.quantity}× {s.name} ({s.color})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <div className="flex items-center rounded-md border">
                        <button
                            type="button"
                            className="px-3 py-2 text-lg disabled:opacity-40"
                            disabled={qty <= 1}
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                        >
                            −
                        </button>
                        <span className="w-10 text-center">{qty}</span>
                        <button
                            type="button"
                            className="px-3 py-2 text-lg disabled:opacity-40"
                            disabled={qty >= max}
                            onClick={() => setQty((q) => Math.min(max, q + 1))}
                        >
                            +
                        </button>
                    </div>
                    <AddToCartButton
                        product={product}
                        quantity={qty}
                        size="default"
                    />
                </div>
            </div>
        </div>
    );
}

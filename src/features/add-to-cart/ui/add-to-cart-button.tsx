"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/shared/ui";
import { useCartStore } from "@/_app/store/useCartStore";
import type { ProductCardVM } from "@/src/entites/product/model";

type AddToCartProduct = Pick<
    ProductCardVM,
    "id" | "name" | "slug" | "price" | "image" | "inStock"
>;

export function AddToCartButton({
    product,
    quantity,
    size = "sm",
}: {
    product: AddToCartProduct;
    quantity?: number;
    size?: "sm" | "default";
}) {
    const addToCart = useCartStore((s) => s.addToCart);
    const [added, setAdded] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );

    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    function onAdd() {
        const qty = quantity ?? 1;
        addToCart(
            {
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                image: product.image,
                quantity: qty,
            },
            qty,
        );
        setAdded(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setAdded(false), 2000);
    }

    return (
        <Button
            type="button"
            size={size}
            disabled={!product.inStock}
            onClick={onAdd}
            className="bg-pink-500 hover:bg-pink-600"
        >
            {!product.inStock ? (
                <>
                    <ShoppingBag size={15} className="mr-1" />
                    Sold out
                </>
            ) : added ? (
                <>
                    <Check size={15} className="mr-1" />
                    Added ✓
                </>
            ) : (
                <>
                    <ShoppingBag size={15} className="mr-1" />
                    Add
                </>
            )}
        </Button>
    );
}

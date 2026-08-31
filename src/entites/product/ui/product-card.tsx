import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart } from "lucide-react";
import { Badge } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import type { ProductCardVM } from "@/src/entites/product/model";

interface ProductCardProps {
    product: ProductCardVM;
    actionSlot?: React.ReactNode;
}

function ProductCardBase({ product, actionSlot }: ProductCardProps) {
    return (
        <div
            className="group flex flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-100/50"
            style={{
                contentVisibility: "auto",
                containIntrinsicSize: "auto 380px",
            }}
        >
            <Link
                href={`/catalog/${product.slug}`}
                aria-label={product.name}
                className="relative block aspect-[4/5] overflow-hidden bg-gradient-to-br from-pink-100 to-violet-100"
            >
                {product.hasImage ? (
                    <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                        className={cn(
                            "object-cover transition-transform duration-300 group-hover:scale-105",
                            !product.inStock && "opacity-60 grayscale",
                        )}
                    />
                ) : (
                    <span
                        aria-hidden="true"
                        className={cn(
                            "absolute inset-0 flex items-center justify-center text-6xl select-none",
                            !product.inStock && "opacity-50 grayscale",
                        )}
                    >
                        💐
                    </span>
                )}
                {product.isFeatured && (
                    <Badge className="absolute left-3 top-3 bg-pink-500 text-white hover:bg-pink-500">
                        Featured
                    </Badge>
                )}
                {!product.inStock && (
                    <Badge
                        variant="secondary"
                        className="absolute right-3 top-3 bg-white/90 text-gray-700"
                    >
                        Out of stock
                    </Badge>
                )}
                <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-400 backdrop-blur-sm">
                    <Heart size={14} />
                </span>
            </Link>

            <div className="flex flex-1 flex-col p-4">
                <Link
                    href={`/catalog/${product.slug}`}
                    className="line-clamp-1 font-semibold text-gray-800"
                >
                    {product.name}
                </Link>
                <p className="mt-0.5 text-xs text-gray-400">
                    {product.categoryName}
                </p>
                <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                            key={i}
                            size={11}
                            className="fill-amber-400 text-amber-400"
                        />
                    ))}
                    <span className="ml-1 text-[11px] text-gray-400">
                        (4.9)
                    </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-gray-900">
                        {product.price.toLocaleString("vi-VN")}₫
                    </span>
                    {actionSlot}
                </div>
            </div>
        </div>
    );
}

export const ProductCard = memo(ProductCardBase);

"use client";

import { useCartStore } from "@/_app/store/useCartStore";

interface MockProduct {
    id: string;
    name: string;
    slug: string;
    price: number;
    emoji: string;
}

const MOCK_PRODUCTS: MockProduct[] = [
    { id: "1", name: "Aster Bouquet", slug: "aster-bouquet", price: 350000, emoji: "🌸" },
    { id: "2", name: "Tulip Dreams", slug: "tulip-dreams", price: 280000, emoji: "🌷" },
    { id: "3", name: "Sunflower Joy", slug: "sunflower-joy", price: 320000, emoji: "🌻" },
    { id: "4", name: "Rose Romance", slug: "rose-romance", price: 420000, emoji: "🌹" },
];

function formatVND(price: number) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

export function FeaturedProductsSection() {
    const addToCart = useCartStore((s) => s.addToCart);

    return (
        <section className="bg-white">
            <div className="mx-auto max-w-7xl px-6 py-16">
                <div className="mb-8 flex items-center justify-between">
                    <h2 className="font-display text-2xl font-semibold text-gray-900">
                        Our Best Sellers
                    </h2>
                    <button className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-rose text-white text-xs shadow-sm hover:bg-brand-rose/80 transition-colors">
                        →
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {MOCK_PRODUCTS.map((product) => (
                        <div
                            key={product.id}
                            className="group flex flex-col rounded-2xl bg-gray-50 overflow-hidden transition-shadow hover:shadow-md"
                        >
                            {/* Image area */}
                            <div className="relative aspect-square bg-brand-blush/40 flex items-center justify-center overflow-hidden">
                                <span className="text-[80px] leading-none transition-transform duration-300 group-hover:scale-110 select-none">
                                    {product.emoji}
                                </span>
                                {/* Wishlist icon */}
                                <button className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-400 hover:text-brand-rose text-xs shadow transition-colors">
                                    ♡
                                </button>
                            </div>

                            {/* Info */}
                            <div className="flex flex-col gap-2 p-3">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                    {product.name}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-brand-rose">
                                        {formatVND(product.price)}
                                    </span>
                                    <button
                                        onClick={() =>
                                            addToCart({
                                                id: product.id,
                                                name: product.name,
                                                slug: product.slug,
                                                price: product.price,
                                                image: "",
                                                quantity: 1,
                                            })
                                        }
                                        className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-rose text-white text-xs hover:bg-brand-rose/80 transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

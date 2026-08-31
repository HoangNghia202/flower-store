import Link from "next/link";
import { Star, Heart, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { GradientOrb } from "@/shared/ui/gradient-orb";
import { ScrollReveal } from "@/shared/components/scroll-reveal";

const products = [
    {
        id: 1,
        name: "Rose Garden Bouquet",
        price: "320,000₫",
        originalPrice: "380,000₫",
        badge: "Bestseller",
        badgeColor: "bg-pink-500",
        gradient: "from-pink-100 to-rose-200",
        emoji: "🌹",
    },
    {
        id: 2,
        name: "Spring Tulip Mix",
        price: "280,000₫",
        badge: "Popular",
        badgeColor: "bg-amber-500",
        gradient: "from-violet-100 to-purple-200",
        emoji: "🌷",
    },
    {
        id: 3,
        name: "Sunflower Delight",
        price: "250,000₫",
        badge: "New",
        badgeColor: "bg-emerald-500",
        gradient: "from-yellow-100 to-amber-200",
        emoji: "🌻",
    },
    {
        id: 4,
        name: "Lavender Dreams",
        price: "350,000₫",
        badge: "Premium",
        badgeColor: "bg-violet-500",
        gradient: "from-indigo-100 to-violet-200",
        emoji: "💐",
    },
];

export function FeaturedProductsWidget() {
    return (
        <section className="relative overflow-hidden py-20 bg-white">
            <GradientOrb
                className="w-[450px] h-[450px] bg-rose-100/50 -top-24 -right-24"
                style={{ animationDelay: "2s" }}
            />
            <GradientOrb
                className="w-[300px] h-[300px] bg-violet-100/30 bottom-0 left-1/4"
                style={{ animationDelay: "5s" }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ScrollReveal
                    animation="fade-up"
                    className="flex items-end justify-between mb-12"
                >
                    <div>
                        <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-3">
                            Our Collection
                        </p>
                        <h2 className="font-playfair text-4xl font-bold text-gray-900">Bestsellers</h2>
                    </div>
                    <Button
                        asChild
                        variant="ghost"
                        className="text-pink-500 hover:text-pink-600 hover:bg-pink-50"
                    >
                        <Link href="/catalog">
                            View all
                            <ArrowRight size={16} className="ml-1" />
                        </Link>
                    </Button>
                </ScrollReveal>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((product, i) => (
                        <ScrollReveal key={product.id} animation="fade-up" delay={i * 100}>
                            <div className="group bg-white rounded-2xl border border-pink-100 overflow-hidden hover:shadow-xl hover:shadow-pink-100/50 transition-all duration-300 hover:-translate-y-1">
                                <div
                                    className={`bg-gradient-to-br ${product.gradient} h-52 flex items-center justify-center relative`}
                                >
                                    <span className="text-7xl select-none group-hover:scale-110 transition-transform duration-300">
                                        {product.emoji}
                                    </span>
                                    <span
                                        className={`absolute top-3 left-3 text-xs font-semibold px-3 py-1 rounded-full text-white ${product.badgeColor}`}
                                    >
                                        {product.badge}
                                    </span>
                                    <span className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 hover:text-pink-500 transition-colors cursor-pointer">
                                        <Heart size={14} />
                                    </span>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                                    <div className="flex items-center gap-1 mb-3">
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <Star
                                                key={j}
                                                size={12}
                                                className="fill-amber-400 text-amber-400"
                                            />
                                        ))}
                                        <span className="text-xs text-gray-400 ml-1">(4.9)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-bold text-gray-900">
                                                {product.price}
                                            </span>
                                            {product.originalPrice && (
                                                <span className="text-sm text-gray-400 line-through">
                                                    {product.originalPrice}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            aria-label={`Add ${product.name} to cart`}
                                            className="w-8 h-8 bg-pink-500 hover:bg-pink-600 rounded-full flex items-center justify-center text-white transition-colors"
                                        >
                                            <ShoppingBag size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

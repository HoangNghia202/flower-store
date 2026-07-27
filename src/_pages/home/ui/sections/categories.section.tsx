"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES = [
    { label: "Bouquet", slug: "bouquet" },
    { label: "Romance", slug: "romance" },
    { label: "Early Summer", slug: "early-summer" },
    { label: "Wedding", slug: "wedding" },
    { label: "Mother's Day", slug: "mothers-day" },
];

const GALLERY_ITEMS = [
    { id: 1, emoji: "🌸", bg: "bg-pink-50" },
    { id: 2, emoji: "💐", bg: "bg-rose-50" },
    { id: 3, emoji: "🌺", bg: "bg-orange-50" },
    { id: 4, emoji: "🌼", bg: "bg-yellow-50" },
    { id: 5, emoji: "🌷", bg: "bg-brand-blush/40" },
    { id: 6, emoji: "🪷", bg: "bg-purple-50" },
];

export function CategoriesSection() {
    const [active, setActive] = useState("romance");

    return (
        <section className="bg-white">
            <div className="mx-auto max-w-7xl px-6 py-16">
                <div className="mb-8 flex items-center justify-between">
                    <h2 className="font-display text-2xl font-semibold text-gray-900">
                        Popular Categories
                    </h2>
                    <Link
                        href="/catalog"
                        className="rounded-full border border-gray-200 px-4 py-1.5 text-xs text-gray-500 hover:border-brand-rose hover:text-brand-rose transition-colors"
                    >
                        All Categories
                    </Link>
                </div>

                <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
                    {/* Category pills */}
                    <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-3">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.slug}
                                onClick={() => setActive(cat.slug)}
                                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors text-left ${
                                    active === cat.slug
                                        ? "bg-brand-rose text-white"
                                        : "border border-gray-200 text-gray-600 hover:border-brand-rose hover:text-brand-rose"
                                }`}
                            >
                                <span className="text-xs">🌸</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Photo grid */}
                    <div className="grid grid-cols-3 gap-3">
                        {GALLERY_ITEMS.map((item) => (
                            <div
                                key={item.id}
                                className={`group relative aspect-square overflow-hidden rounded-2xl ${item.bg} flex items-center justify-center`}
                            >
                                <span className="text-5xl select-none transition-transform duration-300 group-hover:scale-110">
                                    {item.emoji}
                                </span>
                                <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href="/catalog"
                                        className="rounded-full bg-white px-3 py-1 text-[10px] font-medium text-gray-800 shadow"
                                    >
                                        View All
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

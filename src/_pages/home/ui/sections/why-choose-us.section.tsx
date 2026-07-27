import Link from "next/link";
import { APP_PAGE } from "@/shared/lib/constants/app-page.const";

const PHOTO_GRID = [
    { id: 1, emoji: "🌸", bg: "bg-brand-blush/50" },
    { id: 2, emoji: "💐", bg: "bg-brand-peach/30" },
    { id: 3, emoji: "🌺", bg: "bg-rose-50" },
    { id: 4, emoji: "🌷", bg: "bg-pink-50" },
];

export function WhyChooseUsSection() {
    return (
        <section className="bg-white">
            <div className="mx-auto max-w-7xl px-6 py-16">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    {/* Text */}
                    <div>
                        <h2
                            className="font-display mb-6 leading-tight text-gray-900"
                            style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
                        >
                            Find your Perfect
                            <br />
                            bouquet flower
                        </h2>
                        <p className="mb-8 max-w-sm text-sm leading-relaxed text-gray-400">
                            Flowers as a gift together with sincere interest in
                            one's ailing health is the best medicine. A
                            bouquet of pink tulips and genminas together with
                            santinis will brighten the room.
                        </p>
                        <Link
                            href={APP_PAGE.CustomBouquet}
                            className="inline-flex items-center rounded-full border border-brand-rose px-8 py-3 text-sm font-medium text-brand-rose transition-colors hover:bg-brand-rose hover:text-white"
                        >
                            Know More
                        </Link>
                    </div>

                    {/* 2×2 Photo grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {PHOTO_GRID.map((item) => (
                            <div
                                key={item.id}
                                className={`group aspect-square overflow-hidden rounded-2xl ${item.bg} flex items-center justify-center`}
                            >
                                <span className="text-6xl select-none transition-transform duration-300 group-hover:scale-110">
                                    {item.emoji}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

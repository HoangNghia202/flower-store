import Link from "next/link";
import { GradientOrb } from "@/shared/ui/gradient-orb";
import { ScrollReveal } from "@/shared/components/scroll-reveal";

const categories = [
    { id: 1, name: "Birthday", emoji: "🎂", bg: "from-pink-100 to-rose-200", count: "120+ designs" },
    { id: 2, name: "Wedding", emoji: "💍", bg: "from-violet-100 to-purple-200", count: "85+ designs" },
    { id: 3, name: "Anniversary", emoji: "💝", bg: "from-red-100 to-pink-200", count: "60+ designs" },
    { id: 4, name: "Sympathy", emoji: "🕊️", bg: "from-slate-100 to-gray-200", count: "40+ designs" },
    { id: 5, name: "Graduation", emoji: "🎓", bg: "from-emerald-100 to-teal-200", count: "35+ designs" },
    { id: 6, name: "Just Because", emoji: "🌷", bg: "from-orange-100 to-amber-200", count: "200+ designs" },
];

export function CategoriesWidget() {
    return (
        <section
            id="categories"
            className="relative overflow-hidden py-20 bg-gradient-to-br from-rose-50 via-pink-50/60 to-violet-50/40"
        >
            <GradientOrb className="w-[500px] h-[500px] bg-pink-200/25 -top-24 -left-24" />
            <GradientOrb
                className="w-[350px] h-[350px] bg-violet-200/25 bottom-0 right-0"
                style={{ animationDelay: "4s" }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ScrollReveal animation="fade-up" className="text-center mb-12">
                    <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-3">
                        Browse
                    </p>
                    <h2 className="font-playfair text-4xl font-bold text-gray-900">
                        Shop by Occasion
                    </h2>
                    <p className="text-gray-500 mt-3 max-w-md mx-auto">
                        Find the perfect arrangement for every special moment in life.
                    </p>
                </ScrollReveal>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {categories.map((cat, i) => (
                        <ScrollReveal key={cat.id} animation="fade-up" delay={i * 75}>
                            <Link
                                href={`/catalog?occasion=${cat.name.toLowerCase().replace(/ /g, "-")}`}
                                className="group block"
                            >
                                <div
                                    className={`bg-gradient-to-br ${cat.bg} rounded-2xl p-6 text-center transition-all duration-200 group-hover:-translate-y-1.5 group-hover:shadow-lg group-hover:shadow-pink-100`}
                                >
                                    <div className="text-4xl mb-3 select-none">{cat.emoji}</div>
                                    <div className="font-semibold text-gray-800 text-sm">{cat.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">{cat.count}</div>
                                </div>
                            </Link>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

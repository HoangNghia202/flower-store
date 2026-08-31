import { Star } from "lucide-react";
import { GradientOrb } from "@/shared/ui/gradient-orb";
import { ScrollReveal } from "@/shared/components/scroll-reveal";

const testimonials = [
    {
        id: 1,
        name: "Linh Nguyen",
        role: "Regular Customer",
        text: "The flowers were absolutely stunning and arrived so fresh! My mom loved the birthday bouquet. Will definitely order again and again.",
        rating: 5,
        initials: "LN",
        avatarBg: "bg-pink-200 text-pink-700",
    },
    {
        id: 2,
        name: "Minh Tran",
        role: "Corporate Client",
        text: "We use Bloom for all our office events. The quality is consistently excellent and delivery is always on time. Highly recommended!",
        rating: 5,
        initials: "MT",
        avatarBg: "bg-violet-200 text-violet-700",
    },
    {
        id: 3,
        name: "Thu Pham",
        role: "Wedding Customer",
        text: "Our wedding flowers were a dream come true! The team was incredibly helpful with custom arrangements. Best florist in the city!",
        rating: 5,
        initials: "TP",
        avatarBg: "bg-emerald-200 text-emerald-700",
    },
];

export function TestimonialsWidget() {
    return (
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-white via-pink-50/30 to-violet-50/20">
            <GradientOrb
                className="w-[500px] h-[500px] bg-pink-100/40 top-0 -right-32"
                style={{ animationDelay: "1s" }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ScrollReveal animation="fade-up" className="text-center mb-14">
                    <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-3">
                        Reviews
                    </p>
                    <h2 className="font-playfair text-4xl font-bold text-gray-900">
                        What Our Customers Say
                    </h2>
                    <p className="text-gray-500 mt-3">
                        Thousands of happy customers trust Bloom for every occasion.
                    </p>
                </ScrollReveal>

                <div className="grid md:grid-cols-3 gap-6">
                    {testimonials.map((t, i) => (
                        <ScrollReveal
                            key={t.id}
                            animation={i === 0 ? "slide-left" : i === 2 ? "slide-right" : "fade-up"}
                            delay={i * 100}
                        >
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-pink-100 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-1 mb-4">
                                    {Array.from({ length: t.rating }).map((_, j) => (
                                        <Star
                                            key={j}
                                            size={14}
                                            className="fill-amber-400 text-amber-400"
                                        />
                                    ))}
                                </div>
                                <p className="text-gray-600 leading-relaxed mb-5 text-sm">
                                    &ldquo;{t.text}&rdquo;
                                </p>
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-10 h-10 ${t.avatarBg} rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}
                                    >
                                        {t.initials}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-800 text-sm">{t.name}</div>
                                        <div className="text-xs text-gray-400">{t.role}</div>
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

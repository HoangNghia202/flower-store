import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ScrollReveal } from "@/shared/components/scroll-reveal";

export function CustomBouquetWidget() {
    return (
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-pink-500 via-rose-400 to-purple-500 animate-gradient-shift">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
            <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <ScrollReveal animation="fade-up">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                        <div className="text-white max-w-xl text-center lg:text-left">
                            <div className="text-5xl mb-4 select-none">✨</div>
                            <h2 className="font-playfair text-4xl lg:text-5xl font-bold leading-tight mb-4">
                                Create Your Dream Bouquet
                            </h2>
                            <p className="text-pink-100 text-lg leading-relaxed">
                                Can&apos;t find what you&apos;re looking for? Design a completely custom
                                arrangement tailored to your style, colour palette, and budget.
                            </p>
                        </div>
                        <div className="flex-shrink-0">
                            <Button
                                asChild
                                size="lg"
                                className="bg-white text-pink-600 hover:bg-pink-50 rounded-full px-10 py-4 text-base font-semibold shadow-xl"
                            >
                                <Link href="/custom-bouquet">
                                    Start Designing
                                    <ArrowRight size={18} className="ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

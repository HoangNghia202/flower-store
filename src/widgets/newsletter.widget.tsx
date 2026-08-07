import { Button } from "@/shared/ui/button";
import { GradientOrb } from "@/shared/ui/gradient-orb";
import { ScrollReveal } from "@/shared/components/scroll-reveal";

export function NewsletterWidget() {
    return (
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-pink-50 via-white to-rose-50/40">
            <GradientOrb
                className="w-[400px] h-[400px] bg-pink-100/50 top-0 left-1/2 -translate-x-1/2"
                style={{ animationDelay: "1.2s" }}
            />

            <div className="relative z-10 max-w-lg mx-auto px-4 text-center">
                <ScrollReveal animation="zoom-in">
                    <div className="text-4xl mb-4 select-none">🌸</div>
                    <h2 className="font-playfair text-3xl font-bold text-gray-900 mb-3">
                        Stay in Bloom
                    </h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Get seasonal inspiration, exclusive offers, and flower care tips delivered
                        to your inbox.
                    </p>
                    <form className="flex gap-3">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            className="flex-1 min-w-0 border border-pink-200 bg-white/80 backdrop-blur-sm rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                        />
                        <Button
                            type="submit"
                            className="rounded-full px-6 flex-shrink-0 bg-pink-500 hover:bg-pink-600 text-white"
                        >
                            Subscribe
                        </Button>
                    </form>
                    <p className="text-xs text-gray-400 mt-4">No spam, ever. Unsubscribe at any time.</p>
                </ScrollReveal>
            </div>
        </section>
    );
}

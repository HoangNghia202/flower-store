import { Sparkles, Heart, Leaf } from "lucide-react";
import { GradientOrb } from "@/shared/ui/gradient-orb";
import { ScrollReveal } from "@/shared/components/scroll-reveal";

const steps = [
    {
        step: "01",
        title: "Choose Your Flowers",
        desc: "Browse our curated collections or design your own custom arrangement from hundreds of varieties.",
        Icon: Sparkles,
    },
    {
        step: "02",
        title: "Personalize Your Order",
        desc: "Add a heartfelt message, choose your wrapping style, and schedule a delivery time.",
        Icon: Heart,
    },
    {
        step: "03",
        title: "We Deliver with Care",
        desc: "Your fresh flowers arrive beautifully packaged right at your doorstep.",
        Icon: Leaf,
    },
];

export function HowItWorksWidget() {
    return (
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-pink-100 via-rose-50 to-amber-50/40">
            <GradientOrb className="w-[400px] h-[400px] bg-rose-200/30 -top-20 right-1/4" />
            <GradientOrb
                className="w-[300px] h-[300px] bg-amber-100/40 bottom-0 -left-16"
                style={{ animationDelay: "2.5s" }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ScrollReveal animation="fade-up" className="text-center mb-14">
                    <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-3">
                        Simple Process
                    </p>
                    <h2 className="font-playfair text-4xl font-bold text-gray-900">
                        Order in 3 Simple Steps
                    </h2>
                    <p className="text-gray-500 mt-3">Fresh flowers at your door in no time.</p>
                </ScrollReveal>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    <div className="hidden md:block absolute top-14 left-[33%] right-[33%] h-0.5 bg-gradient-to-r from-pink-200 via-rose-200 to-pink-200" />
                    {steps.map(({ step, title, desc, Icon }, i) => (
                        <ScrollReveal key={step} animation="fade-up" delay={i * 120}>
                            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-pink-100 relative z-10 hover:shadow-md transition-shadow">
                                <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                    <Icon size={28} className="text-pink-500" />
                                </div>
                                <div className="text-xs font-bold text-pink-300 uppercase tracking-widest mb-2">
                                    Step {step}
                                </div>
                                <h3 className="font-playfair text-xl font-semibold text-gray-900 mb-2">
                                    {title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

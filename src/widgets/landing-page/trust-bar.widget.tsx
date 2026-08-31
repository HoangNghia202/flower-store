import { Truck, Flower, Clock, Gift } from "lucide-react";
import { ScrollReveal } from "@/shared/components/scroll-reveal";

const items = [
    {
        Icon: Truck,
        title: "Free Delivery",
        desc: "On orders over 500,000₫",
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-50",
    },
    {
        Icon: Flower,
        title: "Always Fresh",
        desc: "Sourced daily from local farms",
        iconColor: "text-pink-600",
        iconBg: "bg-pink-50",
    },
    {
        Icon: Clock,
        title: "Same-Day Delivery",
        desc: "Order before 12PM",
        iconColor: "text-violet-600",
        iconBg: "bg-violet-50",
    },
    {
        Icon: Gift,
        title: "Gift Cards",
        desc: "Available in any amount",
        iconColor: "text-amber-600",
        iconBg: "bg-amber-50",
    },
];

export function TrustBarWidget() {
    return (
        <section className="relative overflow-hidden py-10 bg-gradient-to-r from-pink-50/60 via-white to-rose-50/60 border-y border-pink-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {items.map((item, i) => (
                        <ScrollReveal key={item.title} animation="fade-up" delay={i * 80}>
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-12 h-12 ${item.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}
                                >
                                    <item.Icon size={20} className={item.iconColor} />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

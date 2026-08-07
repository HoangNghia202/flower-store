import Link from "next/link";
import {
    Truck,
    Clock,
    Gift,
    Star,
    ArrowRight,
    Sparkles,
    Leaf,
    Heart,
    ShoppingBag,
    Flower,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { LandingNavbar } from "./landing-navbar";
import { ScrollReveal } from "./scroll-reveal";

// ── Mock data ──────────────────────────────────────────────────────────────────

const categories = [
    { id: 1, name: "Birthday", emoji: "🎂", bg: "from-pink-100 to-rose-200", count: "120+ designs" },
    { id: 2, name: "Wedding", emoji: "💍", bg: "from-violet-100 to-purple-200", count: "85+ designs" },
    { id: 3, name: "Anniversary", emoji: "💝", bg: "from-red-100 to-pink-200", count: "60+ designs" },
    { id: 4, name: "Sympathy", emoji: "🕊️", bg: "from-slate-100 to-gray-200", count: "40+ designs" },
    { id: 5, name: "Graduation", emoji: "🎓", bg: "from-emerald-100 to-teal-200", count: "35+ designs" },
    { id: 6, name: "Just Because", emoji: "🌷", bg: "from-orange-100 to-amber-200", count: "200+ designs" },
];

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

// ── Reusable gradient orb ──────────────────────────────────────────────────────

function GradientOrb({
    className,
    style,
}: {
    className: string;
    style?: React.CSSProperties;
}) {
    return (
        <div
            aria-hidden
            className={`absolute rounded-full blur-3xl pointer-events-none animate-orb-float ${className}`}
            style={style}
        />
    );
}

// ── Sections ──────────────────────────────────────────────────────────────────

function HeroSection() {
    return (
        <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-violet-50 pt-16">
            {/* Background orbs */}
            <GradientOrb className="w-[560px] h-[560px] bg-pink-200/40 -top-32 -right-20" />
            <GradientOrb
                className="w-[400px] h-[400px] bg-violet-200/30 bottom-0 -left-20"
                style={{ animationDelay: "3.5s" }}
            />
            <GradientOrb
                className="w-[300px] h-[300px] bg-amber-100/40 top-1/2 left-1/3"
                style={{ animationDelay: "1.8s" }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left — Copy (CSS load animation) */}
                    <div>
                        <div className="hero-anim hero-anim-1 inline-flex items-center gap-2 bg-pink-100 text-pink-600 rounded-full px-4 py-1.5 text-sm font-medium mb-8 border border-pink-200/50">
                            <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                            Fresh flowers delivered daily
                        </div>
                        <h1 className="hero-anim hero-anim-2 font-playfair text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-[1.1] mb-6">
                            The Perfect
                            <br />
                            Flowers for
                            <br />
                            <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                                Every Moment
                            </span>
                        </h1>
                        <p className="hero-anim hero-anim-3 text-lg text-gray-500 leading-relaxed mb-10 max-w-md">
                            Handcrafted bouquets made with love, delivered fresh to your
                            door. Same-day delivery available across the city.
                        </p>
                        <div className="hero-anim hero-anim-4 flex flex-wrap gap-4 mb-14">
                            <Button
                                asChild
                                size="lg"
                                className="rounded-full px-8 bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-200/60"
                            >
                                <Link href="/catalog">Shop Now</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="rounded-full px-8 border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300"
                            >
                                <Link href="/custom-bouquet">
                                    Custom Bouquet
                                    <ArrowRight size={16} className="ml-2" />
                                </Link>
                            </Button>
                        </div>
                        {/* Stats */}
                        <div className="hero-anim hero-anim-5 flex gap-10">
                            {[
                                { value: "10K+", label: "Happy customers" },
                                { value: "500+", label: "Flower varieties" },
                                { value: "4.9★", label: "Average rating" },
                            ].map((s) => (
                                <div key={s.label}>
                                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                                    <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">
                                        {s.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right — Decorative visual (CSS load animation) */}
                    <div className="hero-anim-right relative hidden lg:flex items-center justify-center">
                        <div className="relative w-[420px] h-[420px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-rose-200 to-pink-300 rounded-full shadow-2xl shadow-pink-200/60" />
                            <div className="absolute inset-0 flex items-center justify-center text-[110px] select-none">
                                💐
                            </div>
                            <div className="absolute -top-6 right-10 w-24 h-24 bg-gradient-to-br from-violet-200 to-purple-200 rounded-full shadow-lg flex items-center justify-center text-4xl select-none">
                                🌷
                            </div>
                            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full shadow-lg flex items-center justify-center text-3xl select-none">
                                🍃
                            </div>
                            <div className="absolute top-14 -left-10 w-16 h-16 bg-gradient-to-br from-yellow-200 to-amber-200 rounded-full shadow-lg flex items-center justify-center text-2xl select-none">
                                🌼
                            </div>
                            <div className="absolute -bottom-8 right-10 w-14 h-14 bg-gradient-to-br from-pink-100 to-rose-200 rounded-full shadow-lg flex items-center justify-center text-2xl select-none">
                                🌹
                            </div>
                            <div className="absolute -right-8 top-1/3 bg-white rounded-2xl shadow-xl px-4 py-3 border border-pink-100">
                                <div className="text-xs text-gray-400">Starting from</div>
                                <div className="text-lg font-bold text-pink-500">199,000₫</div>
                            </div>
                            <div className="absolute -left-14 bottom-1/3 bg-white rounded-2xl shadow-xl px-4 py-3 border border-pink-100 flex items-center gap-3">
                                <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Truck size={16} className="text-emerald-600" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400">Same-day</div>
                                    <div className="text-sm font-semibold text-gray-700">Delivery</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function TrustBarSection() {
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

function CategoriesSection() {
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

function FeaturedProductsSection() {
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
                        <h2 className="font-playfair text-4xl font-bold text-gray-900">
                            Bestsellers
                        </h2>
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

function HowItWorksSection() {
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

function TestimonialsSection() {
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

function CustomBouquetBanner() {
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

function NewsletterSection() {
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

function Footer() {
    const cols = [
        { title: "Shop", links: ["All Flowers", "Seasonal Picks", "Custom Bouquets", "Gift Cards"] },
        { title: "Help", links: ["Delivery Info", "FAQ", "Flower Care Guide", "Contact Us"] },
        { title: "Company", links: ["About Us", "Blog", "Careers", "Privacy Policy"] },
    ];

    return (
        <footer className="bg-gray-900 text-gray-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                    <div className="col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center">
                                <Flower size={16} className="text-white" />
                            </div>
                            <span className="font-playfair text-xl font-semibold text-white">Bloom</span>
                        </div>
                        <p className="text-sm leading-relaxed mb-5">
                            Bringing beauty and joy through handcrafted floral arrangements.
                            Freshness guaranteed with every order.
                        </p>
                        <div className="flex gap-2">
                            {["F", "IG", "P"].map((s) => (
                                <a
                                    key={s}
                                    href="#"
                                    aria-label={s}
                                    className="w-9 h-9 bg-gray-800 hover:bg-pink-500 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                                >
                                    {s}
                                </a>
                            ))}
                        </div>
                    </div>

                    {cols.map((col) => (
                        <div key={col.title}>
                            <h4 className="font-semibold text-white mb-4 text-sm">{col.title}</h4>
                            <ul className="space-y-2.5">
                                {col.links.map((link) => (
                                    <li key={link}>
                                        <a href="#" className="text-sm hover:text-pink-400 transition-colors">
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm">© 2024 Bloom Flower Store. All rights reserved.</p>
                    <p className="text-sm">Made with 🌸 for flower lovers everywhere</p>
                </div>
            </div>
        </footer>
    );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function Home() {
    return (
        <main className="overflow-hidden">
            <LandingNavbar />
            <HeroSection />
            <TrustBarSection />
            <CategoriesSection />
            <FeaturedProductsSection />
            <HowItWorksSection />
            <TestimonialsSection />
            <CustomBouquetBanner />
            <NewsletterSection />
            <Footer />
        </main>
    );
}
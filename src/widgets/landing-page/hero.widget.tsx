import Link from "next/link";
import { Truck, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { GradientOrb } from "@/shared/ui/gradient-orb";

export function HeroWidget() {
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
                            Handcrafted bouquets made with love, delivered fresh to your door.
                            Same-day delivery available across the city.
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

                    {/* Right — Decorative visual */}
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

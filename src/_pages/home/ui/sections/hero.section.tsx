import Link from "next/link";
import { APP_PAGE } from "@/shared/lib/constants/app-page.const";

const STEPS = ["01", "02", "03", "04"];

export function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-white">
            {/* Decorative peach blobs */}
            <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-peach/50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-brand-blush/60 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-20">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    {/* Left column */}
                    <div className="flex gap-8 items-start">
                        {/* Step indicators */}
                        <div className="hidden lg:flex flex-col items-center gap-5 pt-2 select-none">
                            <div className="flex flex-col items-start gap-4 border-l-2 border-gray-200 pl-4">
                                {STEPS.map((s, i) => (
                                    <span
                                        key={s}
                                        className={`text-xs font-medium transition-colors ${
                                            i === 0
                                                ? "text-gray-900 font-semibold"
                                                : "text-gray-300"
                                        }`}
                                    >
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Text */}
                        <div className="flex-1">
                            <h1
                                className="font-display mb-6 leading-tight"
                                style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)" }}
                            >
                                <span className="block italic text-brand-rose">
                                    Rich Collection
                                </span>
                                <span className="italic text-brand-rose">of</span>
                                <span className="block text-gray-900">
                                    Flowers
                                </span>
                            </h1>

                            <p className="mb-8 max-w-xs text-sm leading-relaxed text-gray-400">
                                Where flowers are our inspiration to create
                                lasting memories. Whatever the occasion our
                                flowers will make it special.
                            </p>

                            <Link
                                href={APP_PAGE.Catalog}
                                className="inline-flex items-center rounded-full bg-gray-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                            >
                                Explore Flowers
                            </Link>
                        </div>
                    </div>

                    {/* Right column — pink panel with oval image */}
                    <div className="relative flex justify-center">
                        {/* Pink background card */}
                        <div className="relative h-120 w-full max-w-sm overflow-hidden rounded-3xl bg-brand-blush">
                            {/* Oval frame */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div
                                    className="flex items-center justify-center overflow-hidden bg-white shadow-md"
                                    style={{
                                        width: "65%",
                                        height: "75%",
                                        borderRadius: "50%",
                                    }}
                                >
                                    <span className="text-[160px] leading-none select-none">
                                        🌷
                                    </span>
                                </div>
                            </div>

                            {/* SOCIAL label — rotated on right edge */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90">
                                <span className="text-[10px] tracking-[0.3em] text-gray-400 uppercase">
                                    Social
                                </span>
                            </div>
                        </div>

                        {/* Floating delivery badge */}
                        <div className="absolute -bottom-4 left-0 rounded-2xl bg-white px-5 py-3 shadow-lg">
                            <p className="text-xs text-gray-400">
                                Same-day delivery
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                                Order by 2 PM 🕑
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

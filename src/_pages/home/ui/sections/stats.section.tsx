const STATS = [
    { value: "3000+", label: "Packages Sold" },
    { value: "5000+", label: "Bouquet Sold" },
    { value: "700+", label: "Happy Clients" },
    { value: "15+", label: "Years of Experience" },
];

export function StatsSection() {
    return (
        <section className="bg-white border-y border-gray-100">
            <div className="mx-auto max-w-7xl px-6 py-10">
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    {STATS.map((stat, i) => (
                        <div
                            key={stat.label}
                            className={`flex flex-col items-center gap-1 text-center ${
                                i < STATS.length - 1
                                    ? "sm:border-r sm:border-gray-200"
                                    : ""
                            }`}
                        >
                            <span className="font-display text-3xl font-bold text-gray-900">
                                {stat.value}
                            </span>
                            <span className="text-xs text-gray-400">
                                {stat.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
